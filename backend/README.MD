## Files

- SEEM/                         - SEEM model repo
- calculate_similarity          - code for calculating CLIP score btw images - keywords
- server.py                     - server code

- parse.ipynb                   - list up static/phanoptic files into json files -> sore in urbancars/, waterbirds/
- urbancars/, waterbirds/       - COCO masks for datasets - copy for inpainter in frontend/public

- panoptic.py                   - read all train data and pre-generate segmentation masks with COCO labels.




## Installation

- install torch
- install detectron2 from github - for SEEM
- install clip from github
- install remaining libraries

## Run Server

- change CUDA devices in server.py
- execute the server with 
  ```python
    python3 server.py
  ```

## Generate COCO Masks for Inpainter

- run panoptic.py to generate COCO masks with SEEM
- parse them with parse.ipynb
- move the json files to frontend/public