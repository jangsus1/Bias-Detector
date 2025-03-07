from typing import List

class KeywordProcessor:
    def __init__(self, built_in_keywords_dict):
        self.built_in_keywords_dict = built_in_keywords_dict

    def group_keywords(
        self,
        dataset,
        class_name,
        recieved_keywords_list,
        recieved_mask_path_list,
    ):
        # built in keywords list
        built_in_keywords = self.built_in_keywords_dict[dataset][class_name]

        # Take the first one mask path as reference
        ref_mask_path_list = recieved_mask_path_list[0]

        # Remove the built_in keyword from recieved_keywords_list
        filtered_keyowrds = list(filter(lambda x: not x in built_in_keywords, recieved_keywords_list))
        built_in_keywords = list(filter(lambda x: x in built_in_keywords, recieved_keywords_list))

        # Remove the built_in mask from the recieved_mask_list
        filtered_masks = list(filter(lambda x: not 'static/phanoptic' in x, ref_mask_path_list))

        # Get draw keywords, draw mask path
        draw_keyword_mask_pairs = [(filtered_keyowrds[idx], path) for idx, path in enumerate(filtered_masks) if 'draw.png' in path ]

        # Get manual keywords
        manual_generate_keywords = list(
            set(filtered_keyowrds) - set([keyword for keyword, _ in draw_keyword_mask_pairs])
        )

        return draw_keyword_mask_pairs, manual_generate_keywords, built_in_keywords