import os
from tqdm import tqdm
from utils import create_solution_folder_by_uid, create_inpaining_folder_for_image, solve_img_name_from_abs_path

class UserWorkFLow:
    def __init__(
        self,
        uid,
        keyword_processor,
        segmentor,
        inpainter,
    ):
        self.uid = uid
        self.keyword_processor = keyword_processor
        self.user_segmentor = segmentor
        self.inpainter = inpainter

    def inpainting_for_solution(
        self,
        dataset,
        label,
        solution_name,
        solution_imgs,
        panoptic_dict,
        invert,
        prompt,
        keyword_list,
        mask_path_list,
    ):
        # Create requested folder (Solution + Image)
        solution_folder = create_solution_folder_by_uid(
            dataset=dataset,
            class_name=label,
            uid=self.uid,
            solution_name=solution_name,
        )

        # Create image folder
        for img_path in solution_imgs:
            create_inpaining_folder_for_image(
                solution_folder=solution_folder,
                img_name=solve_img_name_from_abs_path(img_path)
            )
        
        # Get grouped processor
        draw_keyword_mask_pairs, manual_keywords, builtin_keywords = self.keyword_processor.group_keywords(
            dataset,
            label,
            keyword_list,
            mask_path_list,
        )

        # Segment image based on keywords
        img_mask_pair_list = self.user_segmentor.generate_segmentaion(
            dataset=dataset,
            class_name=label,
            solution_name=solution_name,
            solution_imgs=solution_imgs,
            panoptic_dict=panoptic_dict,
            draw_keyword_mask_pairs=draw_keyword_mask_pairs,
            manual_generate_keywords=manual_keywords,
            built_in_keywords=builtin_keywords,
        )

        # Inpaint for current solution
        for img_path, masks_path in tqdm(img_mask_pair_list):
            # Get the generated image_folder
            img_name = solve_img_name_from_abs_path(img_path)
            img_folder = create_inpaining_folder_for_image(
                solution_folder=solution_folder,
                img_name=img_name
            )

            merged_mask_path = os.path.join(
                img_folder,
                f'merged_mask.png'
            )

            output_img_path = os.path.join(
                img_folder,
                f'inpainting.jpg'
            )

            self.inpainter.inpaint_image(
                img_path=img_path,
                masks_path=masks_path,
                invert=invert,
                prompt=prompt,
                merged_mask_path=merged_mask_path,
                output_img_path=output_img_path,
            )

