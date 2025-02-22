import torch
import torchvision
import torch.nn as nn
import torch.optim as optim
from data.imagenet import ImageNetDataset
import os
from sklearn.metrics import f1_score

from torch.utils.data import random_split
import pandas as pd
from glob import glob
import json
import argparse
import random
import numpy as np

seed = 42
random.seed(seed)
# NumPy
np.random.seed(seed)
# PyTorch
torch.manual_seed(seed)
torch.cuda.manual_seed(seed)
torch.cuda.manual_seed_all(seed)  # if you are using multi-GPU.
# CuDNN determinism
torch.backends.cudnn.deterministic = True
torch.backends.cudnn.benchmark = False

# Set up an argument parser
parser = argparse.ArgumentParser(description='Load dataset')
parser.add_argument('--dataset', default="urbancars", type=str, help='Name of the dataset')
parser.add_argument("--augmentation", action="store_true", help="Whether to use augmented data or not")
parser.add_argument("--augmentation_ratio", default = 0.1, type=float)
parser.add_argument('--device', default="cuda:3", type=str, help='Device to use')

# Parse the command-line arguments
args = parser.parse_args()

# Load the appropriate dataloader based on the dataset argument
augment_folder = "../backend/augmented_data" if args.augmentation else None
if args.dataset == 'urbancars':
    from data.urbancars import load_dataloader
    trainloader, valloader, testloader = load_dataloader(64, 64, augment_folder=augment_folder, augmentation_ratio=args.augmentation_ratio)
elif args.dataset == 'waterbirds':
    from data.waterbirds import load_dataloader
    trainloader, valloader, testloader = load_dataloader(64, 64, augment_folder=augment_folder, augmentation_ratio=args.augmentation_ratio)
else:
    raise ValueError("Unsupported dataset")


# Load the ResNet-50 model
model = torchvision.models.resnet50(pretrained=False)
num_classes = 2  # Update this to your number of classes
model.fc = nn.Linear(model.fc.in_features, num_classes)

# Define the loss function and optimizer
criterion = nn.CrossEntropyLoss()
optimizer = optim.Adam(model.parameters(), lr=0.01)
scheduler = optim.lr_scheduler.StepLR(optimizer, step_size=10, gamma=0.5)

device = args.device
model.to(device)

best_f1 = 0.0

# Train the model
for epoch in range(50):  # Update number of epochs here
    model.train()
    running_loss = 0.0
    correct = 0
    total = 0
    for data in trainloader:
        inputs, (labels, _, _), _, _ = data
        inputs, labels = inputs.to(device), labels.to(device)

        optimizer.zero_grad()

        outputs = model(inputs)
        _, predicted = torch.max(outputs.data, 1)
        total += labels.size(0)
        correct += (predicted == labels).sum().item()
        loss = criterion(outputs, labels)
        loss.backward()
        optimizer.step()

        running_loss += loss.item()

    # Validation phase
    model.eval()
    y_pred = []
    y_true = []

    with torch.no_grad():
        for data in valloader:
            inputs, (labels, _, _), _, _ = data
            inputs, labels = inputs.to(device), labels.to(device)
            outputs = model(inputs)
            _, predicted = torch.max(outputs, 1)
            y_pred.extend(predicted.cpu().numpy())
            y_true.extend(labels.cpu().numpy())

    # Calculate F1 Score
    y_true = np.array(y_true)
    y_pred = np.array(y_pred)
    val_f1_macro = f1_score(y_true, y_pred, average='macro')
    
    y_pred = []
    y_true = []

    with torch.no_grad():
        for data in testloader:
            inputs, (labels, _, _), _, _ = data
            inputs, labels = inputs.to(device), labels.to(device)
            outputs = model(inputs)
            _, predicted = torch.max(outputs, 1)
            y_pred.extend(predicted.cpu().numpy())
            y_true.extend(labels.cpu().numpy())

    # Calculation of the F1 Score
    y_true = np.array(y_true)
    y_pred = np.array(y_pred)
    test_f1_macro = f1_score(y_true, y_pred, average='macro')

    print(f'Epoch {epoch+1}, Training Loss: {running_loss / len(trainloader):.4f}, Validation F1-Score: {val_f1_macro:.4f}, Test F1-Score: {test_f1_macro:.4f}')

    # Save model if validation accuracy has increased
    if val_f1_macro > best_f1:
        print(f'Validation F1 score increased ({best_f1:.4f} --> {val_f1_macro:.4f}).  Saving model ...')
        best_f1 = val_f1_macro
        if args.augmentation:
            torch.save(model, f'model/{args.dataset}_augmented.pth')
        else:
            torch.save(model, f'model/{args.dataset}.pth')
