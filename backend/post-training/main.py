import os
import json
import ast
import argparse
from database_connector import DatabaseConnector
from workflow_manager import UserWorkFLow
from keyword_processor import KeywordProcessor
from utils import get_built_in_dict, sample_solution_imgs
from segmentor import Segmentor, UserImageSegmentor

DEFAULT_DATABASE_PATH = '/home/pureblackkkk/my_volume/Bias-Detector/backend/data.db'
DEFAULT_TABLE_NAME = 'user_data'
BUILT_IN_KEYWORDS_LIST_URBANCARS = '/home/pureblackkkk/my_volume/Bias-Detector/backend/urbancars/panoptic_categories.json'
BUILT_IN_KEYWORDS_LIST_WATERBIRDS = '/home/pureblackkkk/my_volume/Bias-Detector/backend/waterbirds/panoptic_categories.json'
BUILT_IN_PANOPTIC_URBANCARS = '/home/pureblackkkk/my_volume/Bias-Detector/backend/urbancars/panoptic.json'
BUILT_IN_PANOPTIC_WATERBIRDS = '/home/pureblackkkk/my_volume/Bias-Detector/backend/waterbirds/panoptic.json'
BUILT_IN_TRAIN_IMG_FOLDER = '/home/pureblackkkk/my_volume/Bias-Detector/backend/static/train'


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--database_path", type = str, default=DEFAULT_DATABASE_PATH)
    parser.add_argument("--table_name", type = str, default=DEFAULT_TABLE_NAME)
    parser.add_argument("--uid", type=str, default=None)
    args = parser.parse_args()
    return args


if __name__ == '__main__':
    args = parse_args()

    # Create database connector
    database_connector = DatabaseConnector(
        args.database_path,
        args.table_name,
    )

    # Create Segmentor
    segmentor = Segmentor()

    # Create keyword processor
    keywordProcessor = KeywordProcessor(
        get_built_in_dict(
            urbancars_json=BUILT_IN_KEYWORDS_LIST_URBANCARS,
            waterbirds_json=BUILT_IN_KEYWORDS_LIST_WATERBIRDS,
        )
    )

    # TODO: Create Impainter
    # inpainter = Inpainer()

    # Create panoptic dict
    built_in_panoptic_dict = get_built_in_dict(
        urbancars_json=BUILT_IN_PANOPTIC_URBANCARS,
        waterbirds_json=BUILT_IN_PANOPTIC_WATERBIRDS,
    )

    if args.uid:
        # TODO: currently not implement the logic for certain user data
        user_data = []
    else:
        user_data = database_connector.get_all_user_data()

    # Create inpainting for each user with solutions
    for user_id, solution_list in user_data.items():
        print(f'Processing user {user_id}...........')

        # Create user segmentor
        userSegmentor = UserImageSegmentor(
            uid=user_id,
            segmentor=segmentor,
        )

        # Create workflow for this user
        userWorkFLow = UserWorkFLow(
            uid=user_id,
            keyword_processor=keywordProcessor,
            segmentor=userSegmentor,
            inpainter=None,
        )

        # Inpaining for each solution
        for solution in solution_list:
            # TODO: change the server for adding a fields
            query = solution['solution_query']
            print(f'Inpatinig for solution \"{query}\":')
            dataset = solution['dataset']
            label = solution['class_name']

            # Sample solution images from origin dataset
            solution_imgs=sample_solution_imgs(
                numbers=solution['solution'],
                folder_path=str(os.path.join(BUILT_IN_TRAIN_IMG_FOLDER, label)),
            )

            # Get panoptic dict
            solution_panoptic=built_in_panoptic_dict[dataset][label]

            userWorkFLow.inpainting_for_solution(
                dataset=dataset,
                label=label,
                solution_name=solution['solution_query'],
                solution_imgs=solution_imgs,
                panoptic_dict=solution_panoptic,
                invert=solution['invert'],
                prompt=solution['solution_query'],
                keyword_list=json.loads(solution['keywords']),
                mask_path_list=json.loads(solution['batch_mask']),
            )





