import re
import json 
import os
import random

BASE_FOLDER = '/home/pureblackkkk/my_volume/Bias-Detector/backend/post-training/augmentations'

def create_solution_folder_by_uid(
    dataset,
    class_name,
    uid,
    solution_name,
):
    solution_path = os.path.join(
        BASE_FOLDER,
        uid,
        f'{dataset}-{class_name}',
        solution_name,
    )
    os.makedirs(solution_path, exist_ok=True)
    return solution_path

def create_inpaining_folder_for_image(
    solution_folder,
    img_name
):
    img_folder = os.path.join(solution_folder, img_name)
    os.makedirs(img_folder, exist_ok=True)

    return img_folder

def solve_manual_mask_path(
    uid,
    dataset,
    class_name,
    solution_name,
    img_path,
    keyword,
):
    manual_mask_path = os.path.join(
        BASE_FOLDER,
        uid,
        f'{dataset}-{class_name}',
        solution_name,
        solve_img_name_from_abs_path(img_path),
        f'{keyword}_segmentation.png',
    )

    return str(manual_mask_path)


def solve_img_name_from_abs_path(imgPath):
    return os.path.basename(imgPath).split('.')[0]


def get_built_in_dict(urbancars_json, waterbirds_json):
    with open(urbancars_json, "r", encoding="utf-8") as f1, open(waterbirds_json, "r", encoding="utf-8") as f2:
        res_dict = {
            'urbancars': json.load(f1),
            'waterbirds': json.load(f2)
        }
    return res_dict

def sample_solution_imgs(numbers, folder_path):
    all_files = [os.path.join(folder_path, f) for f in os.listdir(folder_path) if os.path.isfile(os.path.join(folder_path, f))]

    if numbers >= len(all_files):
        return all_files

    return random.sample(all_files, numbers)