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
    Alert,
    Snackbar,
} from '@mui/material';
import _ from 'lodash';
import { ImageMask, getMaskPathFromKeywords } from './ImageMask';
import Shortcut from './Shortcut';
import useImagePanoptic from './hooks/image-panoptic';
import Message from './Message';
import Drawer from './Drawer';
import {
    callInpaintAPI,
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
    label,
}) => {
    const [invert, setInvert] = useState(false);
    const [numImages, setNumImages] = useState(solution[0]);
    const [finished, setFinished] = useState(false);
    const [drawModalOpen, setDrawModalOpen] = useState(false);
    const [alert, setAlert] = useState({severity: 'success', content: '', open: false});
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
        updateManualKeyword,
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
            updateManualKeyword(prompt);

            // Update generated mask-img pair
            updateMaskedImage(prompt, filteredURL);

            // Update message modal
            updateModal(false, '');
        })
    }

    const inpaint = function (e) {
        if (selectedKeywords.size === 0) {
            setAlert({
                content: 'You haven\'t mave any mask yet...',
                severity: 'error',
                open: true,
            });
            return;
        }

        updateModal(
            true,
            'Recording inpaint command..., please wait',
        );
        callInpaintAPI({
            batch_mask: selectedImgURL.map((imgURL) => {
                if (selectedKeywords.size > 0) {
                    return getMaskPathFromKeywords(
                        selectedKeywords,
                        panopticInUse[imgURL],
                    );
                }
                return '';
            }),
            keywords: Array.from(selectedKeywords),
            invert,
            solution: numImages,
            solution_query: queryRef.current.value,
            dataset: dataset,
            class_name: label,
        })
        .then(() => {
            updateModal(false, '');
        });
    }

    return (
        <Paper key={solIndex}>
            <Paper elevation={4} sx={{ p: 2, mb: 2 }}>
                <Typography sx={{ mb: 1 }} variant="subtitle1" gutterBottom>
                    Generate <TextField
                        variant="standard"
                        value={numImages}
                        onChange={e => setNumImages(parseInt(e.target.value) || 0)}
                    /> images {generateQuery(solution)}
                </Typography>

                {/* Block for shortcut */}
                <Stack direction="row" spacing={3} sx={{ my: 2 }}>
                    <Box key="-1" component="div" sx={{ width: '160px', maxHeight: '100px' }} >
                        <TextField inputRef={seemQueryRef} sx={{ width: '160px', mb: 1, height: "50px" }} label="New Mask Keyword" variant="standard" />
                        <Stack direction="row" spacing={1}>
                            <Button size="small" sx={{ width: '100px', fontSize: '12px' }} variant="contained" onClick={(e) => generateMask(e, solIndex)}>
                                Generate
                            </Button>
                            <Button size="small" sx={{ width: '100px', fontSize: '12px'}} variant="contained" onClick={(e) => setDrawModalOpen(true)}>
                                Draw
                            </Button>
                        </Stack>
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
                        inputRef={queryRef}
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
            <Drawer
                modalOpen={drawModalOpen}
                setModalOpen={setDrawModalOpen}
                updateManualKeyword={updateManualKeyword}
                updateMaskedImage={updateMaskedImage}
                selectedImgURL={selectedImgURL}
                updateModal={updateModal}
                updatePanoptic={updatePanoptic}
            />
            <Snackbar
                open={alert.open}
                autoHideDuration={1000}
                onClose={() => setAlert({...alert, open: false})}
                anchorOrigin={{ vertical: "top", horizontal: "center" }}
            >
                <Alert severity={alert.severity}>{alert.content}</Alert>
            </Snackbar>
        </Paper>
    );
};

export default InpaintBlock;
