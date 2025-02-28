import React, { useState, useEffect, useRef } from 'react';
import {
    Paper,
    TextField,
    Stack,
    Typography,
    Box,
    Button,
    Checkbox,
    FormControlLabel,
    Divider,
} from '@mui/material';
import _ from 'lodash';
import pako from 'pako';
import Draw from './Drawer/index';
import API_URL from '../../common/api';
import ImageMask from './ImageMask/index';
import Shortcut from './Shortcut/index';
import useImagePanoptic from './hooks/image-panoptic';
import Message from './Message/index';
import {
    callGenerateMaskAPI,
} from './api';

// Generate query with the given query
const generateQuery = (solution) => {
    return solution.slice(1).map(s => {
        if (s[0] === "with") {
            return `[with ${s[1]}]`
        } else {
            return `[without ${s[1].join(" and ")}]`
        }
    }).join(" and ");
};

const InpaintBlock = ({
    dataset,
    solution,
    solIndex,
    normalImages,
    panoptic,
    panopticCategories,
}) => {
    const [invert, setInvert] = useState(false);
    const [finished, setFinished] = useState(false);
    const seemQueryRef = useRef(null);
    const queryRef = useRef(null);

    // Get image, mask related variable
    const {
        filerMaskedImage,
        updateMaskedImage,
        panopticInUse,
        updatePanoptic,
        selectedImgURL,
        selectedKeywords,
        updateKeywords,
        categoriesNumPair,
        manualKeywords,
        setManualKeywords,
        reloadImageBatch,
        modalOpen,
        modalContent,
        updateModal,
    } = useImagePanoptic(
        dataset,
        panoptic,
        normalImages,
        panopticCategories,
        7,
    )

    const generateMask = function (e) {
        const prompt = seemQueryRef.current.value;
        if (prompt === '' || !prompt) return;

        // Filter the image who has already has generated mask
        const filteredURL = filerMaskedImage(prompt, selectedImgURL);
        if (filteredURL?.length <= 0) return;

        // Call the message modal
        updateModal(
            true,
            'Generating Masks..., please wait!',
        );
        
        callGenerateMaskAPI(
            dataset,
            prompt,
            filteredURL,
        )
        .then(maskPaths => {
            // Update panoptic
            updatePanoptic(
                filteredURL,
                maskPaths,
                prompt,
            );

            // Update manual keywords
            setManualKeywords(new Set(manualKeywords.add(prompt)));

            // Update generated mask-img pair
            updateMaskedImage(prompt, filteredURL);

            // Update message modal
            updateModal(false, '');
        })
    }

    const inpaint = function (e) {
        // Create action
        
        // // TODO: record the user action rather than directly inpainitng
        // // TODO: send the collected data and save on database
        // setLoading?.("Inpainting the Images...");
        // fetch(`${API_URL}/api/inpaint`, {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: pako.deflate(JSON.stringify({
        //         imagePaths: imageList.slice(0, numImages),
        //         maskPaths: imageList.slice(0, numImages).map(image => turnedOn[image]),
        //         prompt: queryRef.current.value,
        //         invert: invert ? "true" : "false",
        //         dataset: dataset
        //     }), { to: 'string' }),
        //     mode: "cors",
        // })
        //     .then(response => response.json())
        //     .catch(error => console.error(error))
    }

    return (
        <Paper key={solIndex}>
            <Paper elevation={4} sx={{ p: 2, mb: 2 }}>
                <Typography sx={{ mb: 1 }} variant="subtitle1" gutterBottom>
                    Generate <TextField
                        variant="standard"
                        value={solution[0]}
                        // onChange={e => setNumImages(parseInt(e.target.value) || 0)}
                    /> images {generateQuery(solution)}
                </Typography>

                {/* Block for shortcut */}
                <Stack direction="row" spacing={3} sx={{ my: 2 }}>
                    <Box key="-1" component="div" sx={{ width: '160px', maxHeight: '100px' }} >
                        <TextField inputRef={seemQueryRef} sx={{ width: '160px', mb: 1, height: "50px" }} label="New Mask Keyword" variant="standard" />
                        <Button size="small" sx={{ width: '100px' }} variant="contained" onClick={(e) => generateMask(e, solIndex)}>Generate</Button>
                    </Box>
                    <Shortcut
                        solIndex={solIndex}
                        selectedKeywords={selectedKeywords}
                        updateKeywords={updateKeywords}
                        categoriesNumPair={categoriesNumPair}
                        manualKeywords={manualKeywords}
                        finished={finished}
                        totalCount={normalImages.length}
                    />
                </Stack>
                <Divider />
                
                {/* Block for image and mask */}
                <ImageMask
                    solIndex={solIndex}
                    selectedImgURL={selectedImgURL}
                    selectedKeywords={selectedKeywords}
                    panoptic={panopticInUse}
                    reloadImageBatch={reloadImageBatch}
                />
                <Divider />
                
                {/* Generate inpainting pannel */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
                    <TextField
                        variant="standard"
                        ref={queryRef}
                        fullWidth
                        defaultValue={`A picture ${generateQuery(solution)}`}
                        label="Query for inpainter"
                    />
                    <FormControlLabel control={<Checkbox value={invert} onChange={e => setInvert(e.target.value)} />} label="Invert" />
                    <Button variant="contained" onClick={(e) => inpaint(e, solIndex)}>Inpaint</Button>
                </Box>
            </Paper>
            <Message
                anchor="right"
                modalOpen={modalOpen}
                modalContent={modalContent}
            />
        </Paper>
    );
};

export default InpaintBlock;
