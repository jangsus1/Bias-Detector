import numpy as np
from PIL import Image, ImageOps
from typing import List
from FLUX_Controlnet_Inpainting.main import inpaint_image

class Inpainer:
    def inpaint_image(
        self,
        img_path: str,
        masks_path: List[str],
        invert: bool,
        prompt: str,
        merged_mask_path: str,
        output_img_path: str,
    ):
        # Megre the mask alpha channel
        merged_alpha = np.zeros((256, 256))

        if masks_path:
            for mask_path in masks_path:
                mask = Image.open(mask_path).resize((256, 256))
                try:
                    alpha = np.array(mask.getchannel('A'))
                except Exception:
                    alpha = np.array(mask.convert("L"))

                merged_alpha = np.maximum(merged_alpha, alpha)
        
        # Create one merged mask
        binary_mask = np.where(merged_alpha > 0, 255, 0).astype(np.uint8)
        mask_image = Image.fromarray(binary_mask, 'L')

        if invert:
            mask_image = ImageOps.invert(mask_image)
        
        # Save the current mask as record
        mask_image.save(merged_mask_path)

        # Start inpainting
        inpaint_image(
            img_path,
            merged_mask_path,
            prompt,
            output_path=output_img_path,
            seed=24,
            size=(256, 256)
        )