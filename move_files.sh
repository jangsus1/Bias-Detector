echo "Moving files to frontend/src/data/..."

cp b2t/diff/urbancars/keywords.json frontend/src/data/urbancars/keywords.json
cp b2t/diff/waterbirds/keywords.json frontend/src/data/waterbirds/keywords.json

cp b2t/result/urbancars/prediction.json frontend/src/data/urbancars/prediction.json
cp b2t/result/waterbirds/prediction.json frontend/src/data/waterbirds/prediction.json

cp backend/urbancars/panoptic_categories.json frontend/src/data/urbancars/panoptic_categories.json
cp backend/waterbirds/panoptic_categories.json frontend/src/data/waterbirds/panoptic_categories.json

cp backend/urbancars/panoptic.json frontend/src/data/urbancars/panoptic.json 
cp backend/waterbirds/panoptic.json frontend/src/data/waterbirds/panoptic.json

cp dimensionality-reduction/urbancars/coordinates.json frontend/src/data/urbancars/coordinates.json
cp dimensionality-reduction/waterbirds/coordinates.json frontend/src/data/waterbirds/coordinates.json

cp UrbanCars/file_list.json frontend/src/data/urbancars/file_list.json
cp Waterbirds/file_list.json frontend/src/data/waterbirds/file_list.json

cp -r Waterbirds/val/landbird frontend/public/val/
cp -r Waterbirds/val/waterbird frontend/public/val/

cp -r UrbanCars/val/urban frontend/public/val/
cp -r UrbanCars/val/country frontend/public/val/

cp -r Waterbirds/train/landbird backend/static/train/
cp -r Waterbirds/train/waterbird backend/static/train/

cp -r UrbanCars/train/urban backend/static/train/
cp -r UrbanCars/train/country backend/static/train/