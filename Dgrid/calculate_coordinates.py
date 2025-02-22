import os
import clip
import torch
from pathlib import Path
import skimage.io as io
from PIL import Image
from tqdm import tqdm
import numpy as np
from glob import glob

import pandas as pd
import time
from sklearn.manifold import TSNE
from sklearn import preprocessing
from dgrid.dgrid import DGrid
import json
import math


def list_chunk(lst, n):
    return [lst[i:i+n] for i in range(0, len(lst), n)]

device = "cuda" if torch.cuda.is_available() else "cpu"
model, preprocess = clip.load('ViT-B/32', device)

def gen_embeddings(images):
    # Load the model
    images = [Image.fromarray(io.imread(image)) for image in images]
    
    embedding_list = []
    image_list_chunked = list_chunk(images, 64)
    with torch.no_grad():
        for image_list in tqdm(image_list_chunked):
            image_inputs = torch.cat([preprocess(pil_image).unsqueeze(0) for pil_image in image_list]).to(device) # (1909, 3, 224, 224)

            image_features = model.encode_image(image_inputs)

            embedding_list.append(image_features)

    embedding_list = torch.cat(embedding_list).cpu().numpy()

    return embedding_list


target_data = {
    "urbancars": {
        "path": "../UrbanCars",
        "classnames": ["country", "urban"]
    },
    
    "waterbirds": {
        "path": "../Waterbirds",
        "classnames": ["landbird", "waterbird"]
    }
}


for dataset, data_obj in target_data.items():
    save_json = {}
    for classname in data_obj['classnames']:
        save_json[classname] = {}
        basepath = data_obj['path']
        images = glob(f"{basepath}/val/{classname}/**/*.jpg", recursive=True)

        embeddings = gen_embeddings(images)
        embeddings = np.array(embeddings)

        X = preprocessing.StandardScaler().fit_transform(embeddings)
        y = TSNE(n_components=2, random_state=0).fit_transform(X)

        total_length = len(y)
        h = int(total_length ** 0.5)
        w = math.ceil(total_length / h)
        
        new_y = np.zeros((total_length, 2))
        
        # minmax scale x and y coordinates
        new_y[:,0] = preprocessing.MinMaxScaler().fit_transform(y[:,0].reshape(-1, 1)).reshape(-1) * w
        new_y[:,1] = preprocessing.MinMaxScaler().fit_transform(y[:,1].reshape(-1, 1)).reshape(-1) * h
        
        glyph_size = 1
        delta = 0.01

        # remove overlaps
        start_time = time.time()
        y_overlap_removed = DGrid(glyph_width=glyph_size, glyph_height=glyph_size, delta=delta).fit_transform(new_y)
        print("--- DGrid execution %s seconds ---" % (time.time() - start_time))

        
        for image, tsne_emb, grid, original in zip(images, y, y_overlap_removed, embeddings):
            save_json[classname][image.replace(f"{basepath}/", "")] = {
                "tsne": tsne_emb.tolist(),
                "grid": grid.tolist(),
                "original": original.tolist()
            }

    os.makedirs(dataset, exist_ok=True)
    with open(f"{dataset}/coordinates.json", "w") as f:
        json.dump(save_json, f, indent=4)