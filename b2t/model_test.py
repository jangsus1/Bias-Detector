import torch
import torchvision
import torch.nn as nn
import torch.optim as optim
from data.imagenet import ImageNetDataset
import os
from sklearn.metrics import f1_score
from sklearn.metrics import confusion_matrix, accuracy_score

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
# parser.add_argument("--model", default="model.pth", type=str, help="Path to the model")
parser.add_argument("--augmentation", action="store_true", help="Whether to use augmented data or not")
parser.add_argument('--device', default="cuda:3", type=str, help='Device to use')

# Parse the command-line arguments
args = parser.parse_args()

if args.augmentation:
    model_path = f"model/{args.dataset}_augmented.pth"
else:
    model_path = f"model/{args.dataset}.pth"

# Load the appropriate dataloader based on the dataset argument
if args.dataset == 'urbancars':
    from data.urbancars import load_dataloader
    trainloader, valloader, testloader = load_dataloader(32, 32)
    
elif args.dataset == 'waterbirds':
    from data.waterbirds import load_dataloader
    trainloader, valloader, testloader = load_dataloader(32, 32)
else:
    raise ValueError("Unsupported dataset")


classes = trainloader.dataset.classes

# Load the ResNet-50 model
model = torch.load(model_path)

device = args.device
model.to(device)
model.eval()


print("Train Dataset")
y_pred = []
y_true = []
for data in trainloader:
    inputs, (labels, _, _), _, _ = data
    inputs, labels = inputs.to(device), labels.to(device)
    outputs = model(inputs)
    _, predicted = torch.max(outputs.data, 1)
    y_pred.extend(predicted.cpu().numpy())
    y_true.extend(labels.cpu().numpy())
y_true = np.array(y_true)
y_pred = np.array(y_pred)
train_f1_macro = f1_score(y_true, y_pred, average='macro')
print(f"F1 Score (macro): {train_f1_macro * 100:.2f}%")
cm = confusion_matrix(y_true, y_pred)
per_class_accuracy = cm.diagonal() / cm.sum(axis=1)
for idx, acc in enumerate(per_class_accuracy):
    print(f"Accuracy of class {idx}: {acc * 100:.2f}%")
print("-------------------")

# Validation phase
print("Validation Dataset")
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
print(f"F1 Score (macro): {val_f1_macro * 100:.2f}%")
cm = confusion_matrix(y_true, y_pred)
per_class_accuracy = cm.diagonal() / cm.sum(axis=1)
for idx, acc in enumerate(per_class_accuracy):
    print(f"Accuracy of class {idx}: {acc * 100:.2f}%")
print("-------------------")


print("Test Dataset") 
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
print(f"F1 Score (macro): {test_f1_macro * 100:.2f}%")
cm = confusion_matrix(y_true, y_pred)
per_class_accuracy = cm.diagonal() / cm.sum(axis=1)
for idx, acc in enumerate(per_class_accuracy):
    print(f"Accuracy of class {idx}: {acc * 100:.2f}%")
print("-------------------")
