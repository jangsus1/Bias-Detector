import numpy as np
import torchvision.transforms as transforms
from torch.utils.data import DataLoader
import torch
import clip
import multiprocessing as mp
from multiprocessing import Process, Queue

# for loading dataset
from data.celeba import CelebA, get_transform_celeba
from data.waterbirds import WaterbirdsDataset, load_dataloader
from data.imagenet import ImageNetDataset
from data.urbancars import UrbanCarsDataset

# for various functions

from function.extract_keyword import extract_keyword, extract_keyword_tf_idf, extract_keyword_common
from function.print_similarity import print_similarity

from tqdm import tqdm
import os
import time
import pandas as pd
import json


import argparse

# ignore SourceChangeWarning when loading model
import warnings
from torch.serialization import SourceChangeWarning
warnings.filterwarnings("ignore", category=SourceChangeWarning)

def parse_args():
    parser = argparse.ArgumentParser()    
    parser.add_argument("--dataset", type = str, default = 'urbancars', help="dataset") #celeba, waterbird
    parser.add_argument("--augmentation", action="store_true", help="Whether to use augmented data or not")
    parser.add_argument("--extract_caption", default = True)
    parser.add_argument("--split", type = str, default='val')
    parser.add_argument("--save_result", default = True)
    parser.add_argument("--run_classifier", default = True)
    args = parser.parse_args()
    return args

def main():
    # load dataset
    args = parse_args()
    if args.augmentation:
        checkpoint = f"{args.dataset}_augmented.pth"
    else:
        checkpoint = f"{args.dataset}.pth"

    if args.dataset == 'waterbirds':
        data_dir = "../Waterbirds"
        image_dir = ""
        caption_dir = f'data/waterbirds/{args.split}/caption/'
        val_dataset = WaterbirdsDataset(folder=data_dir, split=args.split)
        class_names = ["landbird", "waterbird"]
    elif args.dataset == 'celeba':
        preprocess = get_transform_celeba()
        class_names = ['not blond', 'blond']
        # group_names = ['not blond_female', 'not blond_male', 'blond_female', 'blond_male']
        image_dir = 'data/celebA/data/img_align_celeba/'
        caption_dir = 'data/celebA/caption/'
        val_dataset = CelebA(data_dir='data/celebA/data/', split=args.split, transform=preprocess)
    elif args.dataset == 'imagenet':
        image_dir = ""
        caption_dir = 'data/imagenet/caption/'
        imagenet_dir = "../FACTS/data/imagenet/"
        val_dataset = ImageNetDataset(
            folder= imagenet_dir, 
            split='val',
            map_path=os.path.join(imagenet_dir, 'map_clsloc.csv'),
            class_sample_path=os.path.join(imagenet_dir, 'Labels.json'),
            max_samples=50
        )
        class_names = val_dataset.used_classes
    elif args.dataset == 'urbancars':
        urbancars_dir = "../UrbanCars"
        image_dir = ""
        caption_dir = f'data/urbancars/{args.split}/caption/'
        val_dataset = UrbanCarsDataset(folder=urbancars_dir, split=args.split)
        class_names = ["country", "urban"]

    val_dataloader = torch.utils.data.DataLoader(val_dataset, batch_size=64, num_workers=0, drop_last=False)

    result_dir = 'result/'
    model_dir = 'model/'
    diff_dir = 'diff/'
    if not os.path.exists(result_dir):
        os.makedirs(result_dir)
    if not os.path.exists(diff_dir):
        os.makedirs(diff_dir)

    # extract caption
    if args.extract_caption:
        from transformers import InstructBlipProcessor, InstructBlipForConditionalGeneration
        from function.extract_caption import extract_caption
        
        device = "cuda"
        model = InstructBlipForConditionalGeneration.from_pretrained("Salesforce/instructblip-flan-t5-xl")
        processor = InstructBlipProcessor.from_pretrained("Salesforce/instructblip-flan-t5-xl")
        model.to(device)
        
        print(f"Start extracting captions for {len(val_dataset)} images..")
        for i in tqdm(range(len(val_dataset))):
            path = val_dataset.data[i]
            image_path = image_dir + path
            f1, f2 = path.split("/")[-2:]
            caption_path = caption_dir + f1 + "/" + f2[:-4] + ".txt"
            if os.path.exists(caption_path): continue 
            os.makedirs(os.path.dirname(caption_path), exist_ok=True)
            caption = extract_caption(image_path, model, processor, device)
            with open(caption_path, 'w') as f:
                f.write(caption)
        print("Captions of {} images extracted".format(len(val_dataset)))


    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    # correctify dataset
    result_path = result_dir + args.dataset +"_" +  checkpoint.split(".")[0] + ".csv"
    if args.run_classifier:
        model = torch.load(model_dir + checkpoint)
        model = model.to(device)
        model.eval()
        print("Pretrained model \"{}\" loaded".format(checkpoint))

        result = {"image":[],
                "pred":[],
                "actual":[],
                # "group":[],
                # "spurious":[],                
                "correct":[],
                "caption":[],
                }

        with torch.no_grad():
            running_corrects = 0
            for (images, (targets, targets_g, targets_s), index, paths) in tqdm(val_dataloader):
                images = images.to(device)
                targets = targets.to(device)
                outputs = model(images)
                _, preds = torch.max(outputs, 1)
                for i in range(len(preds)):
                    image = paths[i]
                    pred = preds[i]
                    actual = targets[i]
                    # group = targets_g[i]
                    # spurious = targets_s[i]
                    f1, f2 = image.split("/")[-2:]
                    caption_path = caption_dir + f1 + "/" + f2[:-4] + ".txt"
                    with open(caption_path, "r") as f:
                        caption = f.readline()
                    caption = caption.strip()
                    result['image'].append(image)
                    result['pred'].append(pred.item())
                    result['actual'].append(actual.item())
                    # result['group'].append(group.item())
                    # result['spurious'].append(spurious.item())
                    result['caption'].append(caption)
                    if pred == actual:
                            result['correct'].append(1)
                            running_corrects += 1
                    else:
                            result['correct'].append(0)

            print("# of correct examples : ", running_corrects)
            print("# of wrong examples : ", len(val_dataset) - running_corrects)
            print("# of all examples : ", len(val_dataset))
            print("Accuracy : {:.2f} %".format(running_corrects/len(val_dataset)*100))


        df = pd.DataFrame(result)
        df.to_csv(result_path)
        print("Classified result stored")
    else:
        df = pd.read_csv(result_path)
        print("Classified result \"{}\" loaded".format(result_path))

    ## Generate prediction keyword.json files
    


    from function.calculate_similarity import calc_similarity, calc_similarity_blip
    # extract keyword
    df_wrong = df[df['correct'] == 0]
    df_correct = df[df['correct'] == 1]

    for label, class_name in enumerate(class_names):
        df_class_0 = df[df['actual'] == label] # not blond, landbird: primary class
        df_class_1 = df[df['actual'] != label] # blond, waterbird: other class
        df_wrong_class_0 = df_wrong[df_wrong['actual'] == label]
        df_wrong_class_1 = df_wrong[df_wrong['actual'] != label]
        df_correct_class_0 = df_correct[df_correct['actual'] == label]
        df_correct_class_1 = df_correct[df_correct['actual'] != label]

        caption_wrong_class_0 = df_wrong_class_0['caption'].tolist()
        caption_wrong_class_1 = df_wrong_class_1['caption'].tolist()
        caption_correct_class_0 = df_correct_class_0['caption'].tolist()
        caption_correct_class_1 = df_correct_class_1['caption'].tolist()
        keywords_class_0 = extract_keyword_common(caption_wrong_class_0, caption_correct_class_0)
        keywords_class_1 = extract_keyword_common(caption_wrong_class_1, caption_correct_class_1)

        print(f"Start calculating scores for class {class_name}..")
        similarity_wrong_class_0 = calc_similarity(image_dir, df_wrong_class_0['image'], keywords_class_0)
        similarity_correct_class_0 = calc_similarity(image_dir, df_correct_class_0['image'], keywords_class_0)
        similarity_wrong_class_1 = calc_similarity(image_dir, df_wrong_class_1['image'], keywords_class_1)
        similarity_correct_class_1 = calc_similarity(image_dir, df_correct_class_1['image'], keywords_class_1)

        dist_class_0 = similarity_wrong_class_0 - similarity_correct_class_0
        dist_class_1 = similarity_wrong_class_1 - similarity_correct_class_1

        print("Result for class :", class_name)
        diff_0 = print_similarity(keywords_class_0, keywords_class_1, dist_class_0, dist_class_1, df_class_0)

        diff_path_0 = diff_dir + args.dataset +"_" +  checkpoint.split(".")[0] + "_" +  class_name + ".csv"
        diff_0.to_csv(diff_path_0)
        diff_0 = pd.read_csv(diff_path_0)

        results_json = []

        for i in range(len(diff_0)):
            results_json.append({
                "keyword": diff_0.iloc[i]["Keyword"],
                "score": str(diff_0.iloc[i]["Score"]),
                "accuracy": str(diff_0.iloc[i]["Acc."]),
                "bias": str(diff_0.iloc[i]["Bias"]),
                "images": diff_0.iloc[i]["Images"].split(", ")
            })

        # save json file

        with open(diff_path_0[:-4] + ".json", 'w') as f:
            json.dump(results_json, f, indent=4)

if __name__ == "__main__":
    main()
