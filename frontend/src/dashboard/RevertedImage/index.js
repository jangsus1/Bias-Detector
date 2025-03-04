import {
    Box,
    Paper,
    ToggleButtonGroup,
    ToggleButton,
    Stack,
    Typography,
} from '@mui/material';
import _ from 'lodash';
import API_URL from '../../common/api';
import { useMemo, useState } from 'react';

const RandomBatchNum = 10;
const PredictionClassNumDict = {
    'country': ['country', 'urban'],
    'urban': ['country', 'urban'],
    'landbird': ['landbird', 'waterbird'],
    'waterbird': ['landbird', 'waterbird'],
};

// Random generate color for different class
const generateColor = (index, total) => {
    const hue = (index * (360 / total)) % 360;
    return `hsl(${hue}, 70%, 60%)`;
};

const getRevertedImagePath = (
    imgInfo,
    keywords,
    label,
) => {
    if (keywords?.length === undefined || keywords?.length === 0) {
        return (
            [
                {
                    isLimited: undefined,
                    path: undefined,
                }, 
                {
                    isLimited: undefined,
                    path: undefined,
                },
            ]
        );
    }

    const prediction_class = PredictionClassNumDict[label]

    return prediction_class.map((current_class) => {
        const sortedKeywords = keywords.sort().join('_');
        const imgNum = imgInfo[sortedKeywords][current_class];
        const sumNum = imgInfo[sortedKeywords][prediction_class[0]] + imgInfo[sortedKeywords][prediction_class[1]]
        let isLimited = undefined;
        let selectNum = undefined;

        if (imgNum < RandomBatchNum) {
            selectNum = Array(imgNum).fill(0).map((_, i) => i);
            isLimited = true;
        } else {
            selectNum = _.sampleSize(_.range(0, imgNum), RandomBatchNum);
            isLimited = false;
        }

        return {
            isLimited,
            imgNum,
            totalImgNum: sumNum,
            path: selectNum.map((val) => (`${API_URL}/api/static/gradcam/${label}/${sortedKeywords}/${current_class}/${val}.png`)),
        }
    });
};

const RevertedImage = ({
    label,
    limeKeywords,
    selectedRevertedImgInfo,
}) => {
    const [alignment, setAlignment] = useState([]);
    const keywords_text = limeKeywords.map((data) => data.keyword[0])
    const keywords_class = limeKeywords.map((data) => data.class[0])

    const handleChange = (e, newAlignment) => {
        const currentSet = new Set(alignment);
        if (currentSet.has(newAlignment)) {
            currentSet.delete(newAlignment)
        } else {
            currentSet.add(newAlignment)
        }
        setAlignment(Array.from(currentSet));
    };

    const revertedImgPath = useMemo(() => getRevertedImagePath(
        selectedRevertedImgInfo,
        alignment,
        label,
    ), [alignment]);

    return (
        <Paper sx={{width: '100%', marginTop: '20px'}} elevation={24}>
            {/* Keyword List */}
            <Box component="div" sx={{ width: '100%', maxHeight: '300px', overflow: 'auto' }}>
                <ToggleButtonGroup
                    color="primary"
                    exclusive
                    aria-label="Platform"
                    value={alignment}
                    onChange={handleChange}
                >
                    {
                        keywords_text.map((keyword, idx) => (
                            <ToggleButton
                                value={keyword}
                                sx={{ 
                                    textTransform: 'none',
                                    borderColor: generateColor(keywords_class[idx], keywords_class.length),
                                    borderWidth: '2px'
                                }}
                                key={keyword}
                            >
                                {keyword}
                            </ToggleButton>
                        ))
                    }
                </ToggleButtonGroup>
            </Box>

            {/* Image List */}
            <Box overflow='auto'>
                {
                    revertedImgPath?.map((single_reverted_img_path, idx) => {
                        const totalNum =  single_reverted_img_path['totalImgNum'];
                        const imgNum = single_reverted_img_path['imgNum'];

                        return (
                            <>
                                <Typography>{`Prediction: ${PredictionClassNumDict[label][idx]} (${imgNum ?? 0} / ${totalNum ?? 0})`}</Typography>
                                <Stack direction='row' spacing={2}>
                                    {
                                        single_reverted_img_path?.['path']?.map((path) => (
                                            <Box
                                                key={path}
                                                component="img"
                                                src={path} // Adjust the path to your colored mask
                                                sx={{
                                                    top: 0,
                                                    left: 0,
                                                    width: '130px',
                                                    height: '130px',
                                                }}
                                            />
                                        ))
                                    }
                                </Stack>
                            </>
                        );

                    })
                }
            </Box>
        </Paper>
    );
};

export default RevertedImage