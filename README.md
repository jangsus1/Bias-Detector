# Bias Project

- Read each folders' Readme for more descriptions


## Structure
- backend: backend server files
- frontend: frontend react folder
- Waterbirds, UrbanCars: dataset 
    - train, val split is unbalanced(biased), and test split is balanced(unbiased)
    - for frontend VIS part, we only use validation splits
    - for frontend inpainter part, we use train split so that we can augment them.
- Dgrid: embedding generator for 
- move_files.sh: move all json + image files that frontend code needs to the right location.
    