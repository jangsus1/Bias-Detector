from PIL import Image, ImageOps
import base64
import shutil
from glob import glob
import os
import numpy as np
from io import BytesIO
import matplotlib.pyplot as plt
import pandas as pd
from tqdm import tqdm
import uuid
import json
import torch
import clip
import nltk
import time
from flask import request, Flask, jsonify, make_response
from flask_cors import CORS
import zlib
from SEEM.demo.seem.app import inference
# nltk.download("punkt")
from nltk.tokenize import sent_tokenize
from flask_sqlalchemy import SQLAlchemy
import uuid
from database import db, save_to_db

# ---------------------------- Define Flask APP ---------------------------------
start = time.time()
app = Flask(__name__, static_url_path='/api/static', static_folder='static/')
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:////home/pureblackkkk/my_volume/Bias-Detector/backend/data.db'  # Use sqlite
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
CORS(app, supports_credentials=True)

# Start database
db.init_app(app)
with app.app_context():
    db.create_all()

# ---------------------------- Define Constant variable ---------------------------------
def generate_unique_task_id():
    return str(uuid.uuid4())

def get_prefix_by_dataset(dataset: str):
    match dataset:
        case 'waterbirds':
            return '../Waterbirds'
        case 'urbancars':
            return '../UrbanCars'
        case _:
            return None

global_results = {}

# ---------------------------- Cookie user_id setting (For http need to be set manually)---------------------------------
@app.before_request
def ensure_unique_cookie():
    if not request.endpoint == 'static':
        if request.is_json:
            original_payload = request.get_json(silent = True)
            user_id = original_payload['user_id']

            # If not user_id, set in paylod
            if not user_id:
                user_id = str(uuid.uuid4())
                modified_payload = original_payload.copy()
                modified_payload['user_id'] = user_id
                request._cached_json = (modified_payload, modified_payload)

# ---------------------------- API /api/seem ---------------------------------

# ------- Base variable -------
black = np.array([0, 0, 0]) # Background color
red = np.array([255, 0, 0]) # Foreground color

base_folder = "static/generated_masks"  # Mask folder
os.makedirs(base_folder, exist_ok=True) 

# ------- API -------
@app.route('/api/seem', methods=["POST"])
def seem():
    data = request.json
    image_files = data['imagePaths']
    prompt = data['prompt']
    dataset = data['dataset']
    prefix = get_prefix_by_dataset(dataset)    
    mask_paths = []

    for image_file in tqdm(image_files):
        image_file = os.path.join(prefix, image_file)
        image = Image.open(image_file).convert("RGB")
        img = {"image": image, "mask": None}
        
        result = inference(img, ["Text"], None, prompt, None, None)
        
        mask = np.where(result == 1, 255, 0).astype(np.uint8)
        mask_3d = np.stack([mask] * 3, axis=-1)
        mask_color = np.where(mask_3d == 255, red, black).astype(np.uint8)
        alpha_channel = np.where(result == 1, 255, 0).astype(np.uint8)
        mask_rgba = np.dstack((mask_color, alpha_channel))
        final_mask = Image.fromarray(mask_rgba)
        
        index = glob(f"{base_folder}/*")
        local_mask_path = f"{base_folder}/{len(index)}.png"
        final_mask.save(local_mask_path)
        mask_paths.append(local_mask_path)
    
    data = {
        'mask_paths': mask_paths,
        'user_id': data['user_id'],
    }

    return jsonify(data), 200


# ---------------------------- API /api/manual_mask ---------------------------------
@app.route('/api/manual_mask', methods=["POST"])
def manual_mask():
    compressed_data = request.data  # Data sent in the request body
    print(f"Received {len(compressed_data)} bytes for inpainting")
    decompressed_data = zlib.decompress(compressed_data)
    print(f"Decompressed to {len(decompressed_data)} bytes")
    data = json.loads(decompressed_data)
    
    image_data = data['image']
    _, image_data = image_data.split("data:image/png;base64,")
    image_bytes = base64.b64decode(image_data)
    mask_image = Image.open(BytesIO(image_bytes)).convert("L")
    mask_image = ImageOps.invert(mask_image)
    mask = np.array(mask_image).astype(np.uint8)
    alpha_channel = np.array(mask_image).astype(np.uint8)
    
    mask_3d = np.stack([mask] * 3, axis=-1)
    mask_color = np.where(mask_3d == 255, red, black).astype(np.uint8)
    mask_rgba = np.dstack((mask_color, alpha_channel))
    final_mask = Image.fromarray(mask_rgba)
    
    index = glob(f"{base_folder}/*")
    local_mask_path = f"{base_folder}/{len(index)}.png"
    final_mask.save(local_mask_path)
    
    return [local_mask_path]


# ---------------------------- API /api/keyword ---------------------------------
# from calculate_similarity import calc_similarity

# urbancars_df = pd.read_csv("../b2t/result/urbancars_urbancars_.csv")
# waterbirds_df = pd.read_csv("../b2t/result/waterbirds_waterbirds.csv")
# # Process captions for similarity
# urbancars_df["caption"] = urbancars_df["caption"].apply(lambda x: x.split(".")[0][3:].lower())
# urbancars_df['image'] = urbancars_df['image'].apply(lambda x: x.replace("../UrbanCars/", ""))

# waterbirds_df["caption"] = waterbirds_df["caption"].apply(lambda x: x.split(".")[0][3:].lower())
# waterbirds_df['image'] = waterbirds_df['image'].apply(lambda x: x.replace("../Waterbirds/", ""))

# def list_chunk(lst, n):
#     return [lst[i:i+n] for i in range(0, len(lst), n)]

# model, preprocess = clip.load('ViT-B/32', "cuda")

# def cache_image(prefix, image_path):
#     filename = f"cache/image/{image_path}.pkl"
#     os.makedirs(os.path.dirname(filename), exist_ok=True)
#     if os.path.exists(filename):
#         preprocessed = torch.load(filename)
#     else:
#         image = Image.open(f"{prefix}/{image_path}").convert("RGB")
#         preprocessed = preprocess(image).unsqueeze(0)
#         torch.save(preprocessed, filename)
#     return preprocessed

# def clip_keyword_similarity(keyword, df, prefix):
#     image_paths = df['image'].tolist()
#     embedding_list = []
#     image_list_chunked = list_chunk(image_paths, 64)
#     with torch.no_grad():
#         for chunk in tqdm(image_list_chunked):
#             image_inputs = torch.cat([cache_image(prefix, image) for image in chunk]).to("cuda:0")
#             image_features = model.encode_image(image_inputs)
#             embedding_list.append(image_features)
#         keyword_embedding = model.encode_text(clip.tokenize([f"A photo of {keyword}"]).to("cuda:0")).detach()
#     image_embeddings = torch.cat(embedding_list)
#     image_embeddings /= image_embeddings.norm(dim=-1, keepdim=True)
#     keyword_embedding /= keyword_embedding.norm(dim=-1, keepdim=True)
#     similarity = (100.0 * image_embeddings @ keyword_embedding.T)
#     return similarity.cpu().numpy().flatten()

# def cache_caption(image_path, caption):
#     filename = f"cache/caption/{image_path}.pkl"
#     os.makedirs(os.path.dirname(filename), exist_ok=True)
#     if os.path.exists(filename):
#         tokens = torch.load(filename)
#     else:
#         tokens = clip.tokenize(sent_tokenize(caption))
#         torch.save(tokens, filename)
#     return tokens

# def caption_similarity_generate(keyword, df):
    # captions = df['caption'].tolist()
    # image_paths = df['image'].tolist()
    # embedding_list = []
    # with torch.no_grad():
    #     for caption, image_path in tqdm(zip(captions, image_paths)):
    #         tokens = cache_caption(image_path, caption).to("cuda:0")
    #         keyword_embedding = model.encode_text(tokens).detach()
    #         embedding_list.append(keyword_embedding)
    #     keyword_embedding = model.encode_text(clip.tokenize([f"A photo of {keyword}"]).to("cuda:0")).detach()
    
    # caption_embeddings = torch.cat(embedding_list)
    # similarity = []
    # keyword_embedding /= keyword_embedding.norm(dim=-1, keepdim=True)
    # for sentence_embeddings in caption_embeddings:
    #     sentence_embeddings /= sentence_embeddings.norm(dim=-1, keepdim=True)
    #     sent_sim_list = (100.0 * sentence_embeddings @ keyword_embedding.T)
    #     max_sim = sent_sim_list.max().item()
    #     similarity.append(max_sim)
    # return np.array(similarity)

@app.route("/api/keyword", methods=["POST"])  
def keyword_generate():
    data = request.json
    keyword = data['keyword']
    classname = data['classname']
    dataset = data['dataset']
    
    if dataset == 'urbancars':
        prefix = "../UrbanCars"
        df = urbancars_df
    else:
        prefix = "../Waterbirds"
        df = waterbirds_df
    df = df[df['image'].str.contains(f"/{classname}/")]
    
    caption_similarity = caption_similarity_generate(keyword, df)
    caption_similarity = (caption_similarity - caption_similarity.min()) / (caption_similarity.max() - caption_similarity.min())
    caption_similarity = [str(s) for s in caption_similarity]
    
    clip_similarity = clip_keyword_similarity(keyword, df, prefix)
    clip_similarity = (clip_similarity - clip_similarity.min()) / (clip_similarity.max() - clip_similarity.min())
    clip_similarity = [str(s) for s in clip_similarity]
    
    return {
        "keyword": keyword,
        "images": df['image'].tolist(),
        "clip_similarity": clip_similarity,
        "caption_similarity": caption_similarity,
    }


# ---------------------------- API /api/manual_keyword ---------------------------------
@app.route("/api/manual_keyword", methods=["POST"])  
def manual_keyword_generate():
    data = request.json
    print(data)

    keyword = data['keyword']
    dataset = data['dataset']
    images = data['images']
    
    if dataset == 'urbancars':
        prefix = "../UrbanCars"
        df = urbancars_df
    else:
        prefix = "../Waterbirds"
        df = waterbirds_df
    
    df_class = df[df['image'].isin(images)]
    df_wrong = df_class[df_class['correct'] == 0]
    df_correct = df_class[df_class['correct'] == 1]
    similarity_wrong_class_0 = calc_similarity(f"{prefix}/", df_wrong['image'], [keyword])
    similarity_correct_class_0 = calc_similarity(f"{prefix}/", df_correct['image'], [keyword])
    dist_class_0 = similarity_wrong_class_0 - similarity_correct_class_0
    return {
        "accuracy": str(df_class['correct'].mean()),
        "score": str(dist_class_0[0]),
    }

# ---------------------------- API /api/inpaint ---------------------------------
@app.route("/api/inpaint", methods=["POST"])
def save_inpaint_action():
    data = request.json
    
    required_fields = [
        'user_id', 
        'batch_mask', 
        'keywords', 
        'invert', 
        'solution',
        'solution_query',
        'dataset',
        'class_name',
    ]

    if not all(field in data for field in required_fields):
        return jsonify({"error": "Missing required fields"}, 400)
    
    success = save_to_db(
        user_id=data['user_id'],
        batch_mask=json.dumps(data['batch_mask']),
        keywords=json.dumps(data['keywords']),
        invert=data['invert'],
        solution=data['solution'],
        solution_query=data['solution_query'],
        dataset=data['dataset'],
        class_name=data['class_name'],
    )

    if success:
        return jsonify({
            "message": "Data saved successfully",
            "user_id": data['user_id'],
        }), 200
    return jsonify({"error": "Failed to save data"}), 500

if __name__ == '__main__':
    print(f"Startup time: {time.time() - start} seconds")
    app.run(host='0.0.0.0', port=6000)
