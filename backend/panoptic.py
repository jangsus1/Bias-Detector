import os
from glob import glob
import numpy as np
from tqdm import tqdm
from PIL import Image, ImageOps, ImageChops
from glob import glob
import os
import numpy as np
from detectron2.data import MetadataCatalog
import argparse

parser = argparse.ArgumentParser(description='Process the argument.')
parser.add_argument('--device', type=str, help='Device')
parser.add_argument('--batch', type=int, default=0)
args = parser.parse_args()

batch = int(args.batch)
total = 4

split = 'train'

print(f'The dataset split type specified is: {split}')


metadata = MetadataCatalog.get('coco_2017_train_panoptic')

classes = metadata.stuff_classes
colors = metadata.stuff_colors


base_folder = "static/phanoptic"
os.makedirs(base_folder, exist_ok=True)
black = np.array([0, 0, 0])  # Background color

from SEEM.demo.seem.app import inference


args = []

for base_path in ["../UrbanCars", "../Waterbirds"]:
    image_files = glob(f"{base_path}/{split}/*/*")
    for index in tqdm(range(batch, len(image_files), total)):
        image_file = image_files[index]
        new_path = image_file.replace(f"{base_path}/", "")[:-4]
        if os.path.exists(f"{base_folder}/{new_path}/"): continue
        
        image = Image.open(image_file).convert("RGB")
        
        img = {
            "image": image,
            "mask": None
        }
        pano_seg, pano_seg_info = inference(img, ["Panoptic"], None, None, None, None)
        for obj in pano_seg_info:
            id = obj['id']
            category_id = obj['category_id']
            category = classes[category_id]
            color = colors[category_id]
            mask = np.where(pano_seg == id, 255, 0).astype(np.uint8)
            mask_3d = np.stack([mask]*3, axis=-1)
            mask_color = np.where(mask_3d == 255, color, black).astype(np.uint8)
            alpha_channel = np.where(pano_seg == id, 255, 0).astype(np.uint8)
            mask_rgba = np.dstack((mask_color, alpha_channel))
            mask_img = Image.fromarray(mask_rgba)
            local_mask_path = f"{base_folder}/{new_path}/{category}.png"
            os.makedirs(os.path.dirname(local_mask_path), exist_ok=True)
            mask_img.save(local_mask_path)
            
from glob import glob
import json
from collections import Counter
import os

data = {
    "urbancars": ["urban", "country"],
    "waterbirds": ["landbird", "waterbird"]
}

for dataset, classes in data.items():
    obj_json = {}
    objects = {}
    for classname in classes:
        obj_json[classname] = {}
        object_list = []
        for folder in glob(f"static/phanoptic/{split}/{classname}/*/"):
            filename = folder.replace("static/phanoptic/", "")[:-1]+'.jpg'
            obj_json[classname][filename] = {}
            for file in glob(folder+'*'):
                object = file.split('/')[-1].split('.')[0]
                obj_json[classname][filename][object] = file
                object_list.append(object)

        object_list = Counter(object_list)
        object_list = object_list.most_common()
        object_list = [x[0] for x in object_list]
        objects[classname] = object_list
        
    os.makedirs(dataset, exist_ok=True)
        
    with open(f'{dataset}/panoptic.json', 'w') as f:
        json.dump(obj_json, f, indent=4)

    with open(f'{dataset}/panoptic_categories.json', 'w') as f:
        json.dump(objects, f, indent=4)