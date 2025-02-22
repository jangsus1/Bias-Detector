import os
import pandas as pd
import numpy as np
import torch
import torchvision.transforms as transforms
from torch.utils.data import Dataset, DataLoader
from PIL import Image
import random
from glob import glob



seed_value = 41
random.seed(seed_value)
np.random.seed(seed_value)
torch.manual_seed(seed_value)
if torch.cuda.is_available():
    torch.cuda.manual_seed(seed_value)
    torch.backends.cudnn.deterministic = True
    torch.backends.cudnn.benchmark = False
    
data_dir = "../Waterbirds"

class WaterbirdsDataset(Dataset):
    def __init__(self, folder, split, max_samples=10000, augment_folder=None, augmentation_ratio = 0.5):
        
        self.classes = ["landbird", "waterbird"]
        self.targets = []
        self.data = []
        max_sample_per_class = max_samples // len(self.classes)
        for label, cls in enumerate(self.classes):
            image_paths = sorted(glob(f"{folder}/{split}/{cls}/*"))
            sampled = random.sample(image_paths, min(max_sample_per_class, len(image_paths)))
            self.data.extend(sampled)
            self.targets.extend([label] * len(sampled))
            if augment_folder:
                print(f"Augmenting data from {augment_folder}/{cls}")
                augment_paths = glob(f"{augment_folder}/{cls}/*")
                random.shuffle(augment_paths)
                sampled_paths = random.sample(augment_paths, int(augmentation_ratio*len(augment_paths)))
                if split == 'train':
                    sampled = sampled_paths[:int(0.8*len(sampled_paths))]
                elif split == 'val':
                    sampled = sampled_paths[int(0.8*len(sampled_paths)):]
                self.data.extend(sampled)
                self.targets.extend([label] * len(sampled))
        print(f"{folder}/{split}/{cls}/*")
        self.transform=transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
        ])
        
        print(f"Loaded {len(self.data)} images from {folder}/{split}")
        
    def __len__(self):
        return len(self.data)
    
    def __getitem__(self, idx):
        image_path = self.data[idx]
        target = self.targets[idx]
        
        img = Image.open(image_path).convert("RGB")  # Load image in RGB format
        img = self.transform(img)
        
        return img, (target, 0, 0), idx, image_path


def load_dataloader(bs_train=128, bs_val=128, num_workers=8, augment_folder=None, augmentation_ratio=0.5):
    """
    Default dataloader setup

    Args:
    - args (argparse): Experiment arguments
    - train_shuffle (bool): Whether to shuffle training data
    Returns:
    - (train_loader, val_loader, test_loader): Tuple of dataloaders for each split
    """
    train_dataset = WaterbirdsDataset(
        folder=data_dir, 
        augment_folder=augment_folder,
        augmentation_ratio = augmentation_ratio,
        split='train',
    )
    
    val_dataset = WaterbirdsDataset(
        folder=data_dir, 
        augment_folder=augment_folder,
        augmentation_ratio = augmentation_ratio,
        split='val',
    )
    
    test_dataset = WaterbirdsDataset(
        folder=data_dir, 
        split='test',
    )
    
    
    train_loader = DataLoader(train_dataset, batch_size=bs_train, shuffle=True, num_workers=num_workers)
    val_loader = DataLoader(val_dataset, batch_size=bs_val, shuffle=False, num_workers=num_workers)
    test_loader = DataLoader(test_dataset, batch_size=bs_val, shuffle=False, num_workers=num_workers)

    return train_loader, val_loader, test_loader
