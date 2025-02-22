"""
CelebA Dataset
- Reference code: https://github.com/kohpangwei/group_DRO/blob/master/data/celebA_dataset.py
- See Group DRO, https://arxiv.org/abs/1911.08731 for more
"""
import os
import pandas as pd
import numpy as np
import torch
import torchvision.transforms as transforms
from torch.utils.data import Dataset, DataLoader
from sklearn.model_selection import train_test_split
from PIL import Image
from torch.utils.data import Subset
import random
from glob import glob
import json



seed_value = 41
random.seed(seed_value)
np.random.seed(seed_value)
torch.manual_seed(seed_value)
if torch.cuda.is_available():
    torch.cuda.manual_seed(seed_value)
    torch.backends.cudnn.deterministic = True
    torch.backends.cudnn.benchmark = False
    
data_dir = "./data"
imagenet_dir = os.path.join(data_dir, 'imagenet')

class ImageNetDataset(Dataset):
    def __init__(self, folder, split, map_path, class_sample_path, max_samples=100):
        map_csv = pd.read_csv(map_path)
        # label_map = dict(zip(map_csv.id, map_csv.label.astype(int)))
        class_paths = glob(os.path.join(folder, split, '*'))
        
        label_json = json.load(open(class_sample_path))
        used_class_ids = list(label_json.keys())
        self.used_classes = [label_json[class_id].split(",")[0].replace(" ", "_") for class_id in used_class_ids]
        
        self.targets = []
        self.data = []
        for class_path in class_paths:
            class_id = os.path.basename(class_path)
            if class_id not in used_class_ids: continue
            label = used_class_ids.index(class_id)
            for image_path in glob(os.path.join(class_path, '*'))[:max_samples]:
                self.data.append(image_path)
                self.targets.append(label)
        
        self.transform=transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
        ])
        
    def __len__(self):
        return len(self.data)
    
    def __getitem__(self, idx):
        image_path = self.data[idx]
        target = self.targets[idx]
        
        img = Image.open(image_path).convert("RGB")  # Load image in RGB format
        img = self.transform(img)
        
        return img, (target, 0, 0), idx, image_path


def load_waterbirds(root_dir, bs_train=128, bs_val=128, num_workers=8):
    """
    Default dataloader setup for CelebA

    Args:
    - args (argparse): Experiment arguments
    - train_shuffle (bool): Whether to shuffle training data
    Returns:
    - (train_loader, val_loader, test_loader): Tuple of dataloaders for each split
    """
    train_val_dataset = ImageNetDataset(
        folder=imagenet_dir, 
        split='train',
        map_path=os.path.join(imagenet_dir, 'map_clsloc.csv'),
        class_sample_path=os.path.join(imagenet_dir, 'Labels.json'),
        max_samples=200
    )
    
    test_dataset = ImageNetDataset(
        folder=imagenet_dir, 
        split='val',
        map_path=os.path.join(imagenet_dir, 'map_clsloc.csv'),
        class_sample_path=os.path.join(imagenet_dir, 'Labels.json'),
        max_samples=50
    )
    
    targets = train_val_dataset.targets

    train_indices, val_indices = train_test_split(
        range(len(train_val_dataset)),
        test_size=0.2,  # Adjust as needed
        stratify=targets,
        random_state=seed_value  # Ensure reproducibility
    )

    val_dataset = Subset(train_val_dataset, val_indices)
    train_dataset = Subset(train_val_dataset, train_indices)
    
    
    train_loader = DataLoader(train_dataset, batch_size=bs_train, shuffle=True, num_workers=num_workers)
    val_loader = DataLoader(val_dataset, batch_size=bs_val, shuffle=False, num_workers=num_workers)
    test_loader = DataLoader(test_dataset, batch_size=bs_val, shuffle=False, num_workers=num_workers)

    return train_loader, val_loader, test_loader
