import {
    useState,
    useMemo,
    useRef,
} from 'react';
import { callGenerateMaskAPI } from '../api';
import _ from 'lodash';

/**
 * Pre-compute keywords-num pair
 */
const calculateCategoriesCountPair = (
    panoptic,
    panopticCategories,
) => {
    const categoriesConuntPair = {};

    panopticCategories.forEach((category) => {
        // Count catergory num
        const count = Object.values(panoptic).reduce((pre, keywordObj) => {
            if (category in keywordObj) {
                return pre + 1;
            }

            return pre;
        }, 0);

        categoriesConuntPair[category] = count;
    });

    return categoriesConuntPair;
};

const useImagePanoptic = (
    dataset,
    panoptic,
    normalImages,
    panopticCategories,
    blockShowImageNum,
) => {
    // Define state variable
    const [panopticInUse, setPanopticInUse] = useState(panoptic);
    const [selectedImgURL, setSelectedImgURL] = useState(_.sampleSize(normalImages, blockShowImageNum));
    const [selectedKeywords, setSelectedKeywords] = useState(new Set());
    const [manualKeywords, setManualKeywords] = useState(new Set());
    const generatedMaskImgPair = useRef({});
    const [modalOpen, setModalOpen] = useState(false);
    const modalContent = useRef('');
    
    /**
     * Define static variables
     */
    const categoriesNumPair = useMemo(() => calculateCategoriesCountPair(
        panoptic,
        panopticCategories,
    ), []);


    /**
     * Define mask-image generation pair action
     */
    const filerMaskedImage = (
        keywords,
        imgURL,
    ) => {
        // No previous generated keywords before
        if (!(keywords in generatedMaskImgPair.current)) {
            return imgURL;
        }

        // Check overlap 
        const currentGeneratedImg = generatedMaskImgPair.current[keywords];
        const nonOverlap = imgURL.filter(item => !currentGeneratedImg.has(item));
        return nonOverlap;
    };

    const updateMaskedImage = (
        keywords,
        imgURL,
    ) => {
        if (!(keywords in generatedMaskImgPair.current)) {
            generatedMaskImgPair.current[keywords] = new Set(imgURL);
        }

        const currentSet = generatedMaskImgPair.current[keywords];
        generatedMaskImgPair.current[keywords] = new Set([...currentSet, ...imgURL]);
    };


    /**
     * Define keywords action
     */
    const resetKeywords = () => {
        setSelectedKeywords(new Set());
    };

    const updateKeywords = (keyword, type) => {
        switch(type) {
            case 'add':
                selectedKeywords.add(keyword);
                break;
            case 'delete':
                selectedKeywords.delete(keyword)
                break;
            default:
                return
        }

        if (!manualKeywords.has(keyword) || type !== 'add') {
            setSelectedKeywords(new Set(selectedKeywords));
            return;
        }

        // Check if the keyword belong to the mannual keyword and activate the keyword
        // If the current images for show don't have the generated mask, then generate for them
        const filteredURL = filerMaskedImage(keyword, selectedImgURL);

        if (filteredURL?.length > 0) {
            // Call the message modal
            updateModal(
                true,
                'Generating Masks..., please wait!',
            );
            
            // Generate mask for those images and then update keywords
            callGenerateMaskAPI(
                dataset,
                keyword,
                filteredURL,
            ).then((maskPaths) => {
                // Update panoptic
                updatePanoptic(
                    filteredURL,
                    maskPaths,
                    keyword,
                );

                // Update generated mask-img pair
                updateMaskedImage(keyword, filteredURL);
                
                // Update message modal
                updateModal(false, '');
            });

        } else {
            setSelectedKeywords(new Set(selectedKeywords));
        }
    };


    /**
     * Define panoptic action
     */
    const updatePanoptic = (
        imageURI,
        maskPathURI,
        keyword,
    ) => {
        const newPanopticInUse = _.cloneDeep(panopticInUse);
        imageURI.forEach((url, idx) => {
            newPanopticInUse[url][keyword] = maskPathURI[idx];
        });
        setPanopticInUse(newPanopticInUse);
    }


    /**
     * Define image action
     */
    const reloadImageBatch = () => {
        // reset all the collected keywords
        resetKeywords()

        // Set new image url
        setSelectedImgURL(_.sampleSize(normalImages, blockShowImageNum))
    }

    /**
     * Define popup modal action
     */
    const updateModal = (isopen, content) => {
        setModalOpen(isopen);
        modalContent.current = content;
    }

    return {
        filerMaskedImage,
        updateMaskedImage,
        panopticInUse,
        updatePanoptic,
        selectedImgURL,
        setSelectedImgURL,
        selectedKeywords,
        setSelectedKeywords,
        updateKeywords,
        categoriesNumPair,
        manualKeywords,
        setManualKeywords,
        reloadImageBatch,
        modalOpen,
        modalContent,
        updateModal,
    };
}

export default useImagePanoptic;