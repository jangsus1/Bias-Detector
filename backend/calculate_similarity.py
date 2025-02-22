import os
import clip
import torch
from pathlib import Path
import skimage.io as io
from PIL import Image
from tqdm import tqdm
import numpy as np
from transformers import BlipProcessor, BlipForImageTextRetrieval

def list_chunk(lst, n):
    return [lst[i:i+n] for i in range(0, len(lst), n)]

device = "cuda" if torch.cuda.is_available() else "cpu"
model, preprocess = clip.load('ViT-B/32', device)

def calc_similarity(image_dir, images, keywords):
    # Load the model
    images = [image_dir + image for image in images]
    images = [Image.fromarray(io.imread(image)) for image in images]
    
    similarity_list = []
    image_list_chunked = list_chunk(images, 64)

    for image_list in tqdm(image_list_chunked):

        # Prepare the inputs
        image_inputs = torch.cat([preprocess(pil_image).unsqueeze(0) for pil_image in image_list]).to(device) # (1909, 3, 224, 224)
        text_inputs = torch.cat([clip.tokenize(f"a photo of a {c}") for c in keywords]).to(device)


        # Calculate features
        with torch.no_grad():
            image_features = model.encode_image(image_inputs)
            text_features = model.encode_text(text_inputs)

        # Pick the top 5 most similar labels for the image
        image_features /= image_features.norm(dim=-1, keepdim=True)
        text_features /= text_features.norm(dim=-1, keepdim=True)
        similarity = (100.0 * image_features @ text_features.T) # (1909, 20)
        similarity_list.append(similarity)

    similarity = torch.cat(similarity_list).mean(dim=0).cpu().numpy()

    return similarity



# device = "cuda:0"

# processor = BlipProcessor.from_pretrained("Salesforce/blip-itm-large-coco")
# model = BlipForImageTextRetrieval.from_pretrained("Salesforce/blip-itm-large-coco").to(device)

def calc_similarity_blip(image_dir, images, keywords):
    # Load the model
    images = [image_dir + image for image in images]
    images = [Image.fromarray(io.imread(image)) for image in images]
    

    similarity_list = []
    with torch.no_grad():
        for k in tqdm(keywords, desc=f"Calculating similarity with blip"):
            per_keyword_sim = []
            for pil_image in images:
                inputs = processor(pil_image, f"a photo of a {k}", return_tensors="pt").to(device)
                cosine_score = model(**inputs, use_itm_head=False)[0]
                per_keyword_sim.append(cosine_score.item())
            similarity_list.append(np.average(per_keyword_sim))
    return np.array(similarity_list)