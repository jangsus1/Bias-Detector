from transformers import InstructBlipProcessor, InstructBlipForConditionalGeneration
import torch
from PIL import Image
import requests

# for loading dataset
from data.celeba import CelebA, get_transform_celeba
from data.waterbirds import WaterbirdsDataset, load_dataloader
from data.imagenet import ImageNetDataset
from data.urbancars import UrbanCarsDataset
from function.extract_caption import extract_caption

# for various functions

# from function.extract_keyword import extract_keyword, extract_keyword_tf_idf, extract_keyword_common
# from function.print_similarity import print_similarity

from tqdm import tqdm
import os
import argparse

# ignore SourceChangeWarning when loading model
import warnings
from torch.serialization import SourceChangeWarning
warnings.filterwarnings("ignore", category=SourceChangeWarning)

def parse_args():
    parser = argparse.ArgumentParser()    
    parser.add_argument("--dataset", type = str, default = 'urbancars', help="dataset") #celeba, waterbird
    parser.add_argument("--split", type = int, default=0)
    parser.add_argument("--total", type = int, default=2)
    parser.add_argument("--dataset_split", default = "train", type=str)
    parser.add_argument("--device", type = str, default="cuda:1")
    args = parser.parse_args()
    return args


def main():
    # load dataset
    args = parse_args()

    if args.dataset == 'waterbirds':
        data_dir = "../Waterbirds"
        image_dir = ""
        caption_dir = f'data/waterbirds/{args.dataset_split}/caption/'
        val_dataset = WaterbirdsDataset(folder=data_dir, split=args.dataset_split)
    elif args.dataset == 'urbancars':
        urbancars_dir = "../UrbanCars"
        image_dir = ""
        caption_dir = f'data/urbancars/{args.dataset_split}/caption/'
        val_dataset = UrbanCarsDataset(folder=urbancars_dir, split=args.dataset_split)



    device = args.device
    image_paths, caption_paths = [], []
    for i in range(len(val_dataset)):
        path = val_dataset.data[i]
        image_path = image_dir + path
        f1, f2 = path.split("/")[-2:]
        caption_path = caption_dir + f1 + "/" + f2[:-4] + ".txt"
        if os.path.exists(caption_path): continue
        image_paths.append(image_path)
        caption_paths.append(caption_path)
        os.makedirs(os.path.dirname(caption_path), exist_ok=True)
        
    current_image_paths = image_paths
    current_caption_paths = caption_paths

    print(f"Start extracting captions for {len(current_image_paths)} images..")
    
    model = InstructBlipForConditionalGeneration.from_pretrained("Salesforce/instructblip-flan-t5-xl")
    processor = InstructBlipProcessor.from_pretrained("Salesforce/instructblip-flan-t5-xl")
    model.to(device)
    
    for image_path, caption_path in tqdm(zip(current_image_paths, current_caption_paths), total=len(current_image_paths)):
        if os.path.exists(caption_path): continue 
        caption = extract_caption(image_path, model, processor, device)
        with open(caption_path, 'w') as f:
            f.write(caption)
    print("Captions of {} images extracted".format(len(val_dataset)))


if __name__ == "__main__":
    main()
