import re
from typing import Any
from utils import solve_manual_mask_path
from tqdm import tqdm
from PIL import Image
import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from SEEM.demo.seem.app import inference

class Segmentor:
    def segment(img, prompt):
        result = inference(img, ["Text"], None, prompt, None, None)
        return result

class UserImageSegmentor:
    def __init__(
        self,
        uid: str,
        segmentor: Any,
    ):
        self.uid = uid
        self.segmentor = segmentor

    def __deal_with_draw_mask(self, draw_keyword_mask_pairs):
        return [mask_path for _, mask_path in draw_keyword_mask_pairs]
        
    def __deal_with_builtin_mask(
        self,
        img,
        keywords,
        panoptic_dict
    ):
        match = re.search(r"(train/.*)", img)

        if match:
            img_path = match.group(1)
            return [panoptic_dict[img_path][keyword] for keyword in keywords if keyword in panoptic_dict[img_path]]

        return []

    def __deal_with_manual_mask(
        self,
        img_path,
        manual_generate_keywords,
        dataset,
        class_name,
        solution_name,
    ):
        mask_path_list = []

        # Generate segmentation using seem
        img = Image.open(img_path).convert('RGB')

        # Segment by each keyword
        for keyword in manual_generate_keywords:
            mask = self.segmentor.segment(
                img,
                keyword
            )

            # Save mask
            save_path = solve_manual_mask_path(
                uid=self.uid,
                img_path=img_path,
                solution_name=solution_name,
                keyword=keyword,
                dataset=dataset,
                class_name=class_name,
            )

            mask.save(save_path)

            # Add to the path list
            mask_path_list.append(save_path)
        
        return mask_path_list

    def generate_segmentaion(
        self,
        dataset,
        class_name,
        solution_name,
        solution_imgs,
        panoptic_dict,
        draw_keyword_mask_pairs,
        manual_generate_keywords,
        built_in_keywords,
    ):
        '''''
        Generate segmentation for this user given current param under certain solution
        Based on the solution image, provide the segmentation path 
        '''''
        img_mask_pair_list = []

        for img in solution_imgs:
            img_mask = []

            # Append draw mask list
            img_mask.extend(self.__deal_with_draw_mask(draw_keyword_mask_pairs))

            # Append builtin mask list
            img_mask.extend(self.__deal_with_builtin_mask(
                img,
                built_in_keywords,
                panoptic_dict
            ))

            # Append manual mask list
            img_mask.extend(self.__deal_with_manual_mask(
                img,
                manual_generate_keywords,
                solution_name,
                dataset,
                class_name,
            ))

            img_mask_pair_list.append((img, img_mask))
        
        return img_mask_pair_list