import React, { useState, useEffect, useRef } from 'react';
import { Paper, TextField, Stack, LinearProgress, Typography, Box, Button, Checkbox, FormControlLabel, Divider, Modal } from '@mui/material';
import _ from 'lodash';
import pako from 'pako';

import Draw from './Draw';

const InpaintBlock = ({ dataset, solution, solIndex, normalImages, panoptic, setLoading, panopticCategories, label }) => {

    const initialQuery = solution.slice(1).map(s => {
        if (s[0] === "with") {
            return `[with ${s[1]}]`
        } else {
            return `[without ${s[1].join(" and ")}]`
        }
    }).join(" and ");


    const [invert, setInvert] = useState(false);
    const [inpaintedList, setInpaintedList] = useState([]);
    const [categoryClicked, setCategoryClicked] = useState(panopticCategories.map(category => false));
    const [numImages, setNumImages] = useState(solution[0]);
    const [finished, setFinished] = useState(false);
    const [imageList, setImageList] = useState(_.sampleSize(normalImages, solution[0]));
    const [modalOpen, setModalOpen] = useState(false);
    const seemQueryRef = useRef(null);
    const queryRef = useRef(null);

    const categoriesShortcutInitial = panopticCategories.map(category => {
        const shortcuts = []
        Object.keys(panoptic).forEach(image => {
            Object.keys(panoptic[image]).forEach((segment, idx) => {
                if (segment === category) {
                    shortcuts.push([image, idx])
                }
            })
        })
        return [category, shortcuts]
    })

    const [categoriesShortcut, setCategoriesShortcut] = useState(categoriesShortcutInitial);

    const panopticListInitial = {}
    const showPanopticInitial = {}
    Object.keys(panoptic).forEach(key => {
        panopticListInitial[key] = []
        showPanopticInitial[key] = []
        Object.keys(panoptic[key]).forEach(segment => {
            panopticListInitial[key].push(panoptic[key][segment])
            showPanopticInitial[key].push(0)
        })
    });
    const [panopticList, setPanopticList] = useState(panopticListInitial);
    const [showPanoptic, setShowPanoptic] = useState(showPanopticInitial);

    const highlightCategory = function (e, categoryIndex, shortcuts) {
        if (finished) return
        const newShowPanoptic = _.cloneDeep(showPanoptic);
        shortcuts.forEach(([image, idx]) => {
            if (categoryClicked[categoryIndex])
                newShowPanoptic[image][idx] = 0;
            else
                newShowPanoptic[image][idx] = 0.7;
        })
        setShowPanoptic(newShowPanoptic);
        setCategoryClicked(categoryClicked.map((clicked, index) => {
            if (index === categoryIndex) {
                return !clicked
            }
            return clicked
        }))
    }

    const scrollRef1 = useRef(null);
    const scrollRef2 = useRef(null);

    // Scroll handler for the image
    const handleScroll1 = () => {
        const scrollElement1 = scrollRef1.current;
        const scrollElement2 = scrollRef2.current;

        if (scrollElement2 && scrollElement1) {
            scrollElement2.scrollTop = scrollElement1.scrollTop;
            scrollElement2.scrollLeft = scrollElement1.scrollLeft;
        }
    };
    //scroll handler for masks
    const handleScroll2 = () => {
        const scrollElement1 = scrollRef1.current;
        const scrollElement2 = scrollRef2.current;

        if (scrollElement1 && scrollElement2) {
            scrollElement1.scrollTop = scrollElement2.scrollTop;
            scrollElement1.scrollLeft = scrollElement2.scrollLeft;
        }
    };

    const drawMask = async function (canvasRef, prompt) {
        const image = await canvasRef.current.exportImage("png")
        fetch('/api/manual_mask', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            mode: "cors",
            body: pako.deflate(JSON.stringify({ image: image }), { to: 'string' }),
        })
            .then(response => response.json())
            .then(data => {
                setCategoryClicked([false, ...categoryClicked])
                const newPanopticList = _.cloneDeep(panopticList);
                const newShowPanoptic = _.cloneDeep(showPanoptic);
                const shortcuts = []
                imageList.slice(0, numImages).forEach((image, index) => {
                    newPanopticList[image].push(data[0]);
                    newShowPanoptic[image].push(0);
                    shortcuts.push([image, newPanopticList[image].length - 1]);
                })
                setPanopticList(newPanopticList);
                setShowPanoptic(newShowPanoptic);
                setCategoriesShortcut([[prompt, shortcuts], ...categoriesShortcut]);

            })
            .catch(error => console.error(error))
            .finally(() => {
                setLoading(false);
                setModalOpen(false);
            });
    }

    const generateMask = function (e) {
        setLoading("Generating Masks...");
        const prompt = seemQueryRef.current.value
        fetch('/api/seem', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                imagePaths: imageList.slice(0, numImages),
                toFix: new Array(numImages).fill("false"), // maskList.map((m, i) => toFix[i] ? m : "false"),
                prompt: prompt,
                invert: "false",
                dataset: dataset
            }),
            mode: "cors",
        })
            .then(response => response.json())
            .then(data => {
                setCategoryClicked([false, ...categoryClicked])
                const newPanopticList = _.cloneDeep(panopticList);
                const newShowPanoptic = _.cloneDeep(showPanoptic);
                const shortcuts = []
                imageList.slice(0, numImages).forEach((image, index) => {
                    newPanopticList[image].push(data[index]);
                    newShowPanoptic[image].push(0);
                    shortcuts.push([image, newPanopticList[image].length - 1]);
                })
                setPanopticList(newPanopticList);
                setShowPanoptic(newShowPanoptic);
                setCategoriesShortcut([[prompt, shortcuts], ...categoriesShortcut]);

            })
            .catch(error => console.error(error))
            .finally(() => setLoading(false));

    }

    const inpaint = function (e) {
        const turnedOn = {}
        categoriesShortcut.forEach(([category, shortcuts], index) => {
            if (categoryClicked[index]) {
                shortcuts.forEach(([image, idx]) => {
                    turnedOn[image] = turnedOn[image] || []
                    turnedOn[image].push(panopticList[image][idx])
                })
            }
        })
        // TODO: record the user action rather than directly inpainitng
        // TODO: send the collected data and save on database
        setLoading("Inpainting the Images...");
        fetch('/api/inpaint', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: pako.deflate(JSON.stringify({
                imagePaths: imageList.slice(0, numImages),
                maskPaths: imageList.slice(0, numImages).map(image => turnedOn[image]),
                prompt: queryRef.current.value,
                invert: invert ? "true" : "false",
                dataset: dataset
            }), { to: 'string' }),
            mode: "cors",
        })
            .then(response => response.json())
            .catch(error => console.error(error))
    }

    const normalize = function (shortcuts) {
        const total = imageList.slice(0, numImages)
        const target = shortcuts.filter(([image, idx]) => total.includes(image));
        return target.length / total.length * 100
    }

    const rawCount = function (shortcuts) {
        const total = imageList.slice(0, numImages)
        const target = shortcuts.filter(([image, idx]) => total.includes(image));
        return target.length
    }
    
    return (
        <Paper key={solIndex}>
            <Paper elevation={4} sx={{ p: 2, mb: 2 }}>
                <Typography sx={{ mb: 1 }} variant="subtitle1" gutterBottom>
                    Generate <TextField
                        variant="standard"
                        value={numImages}
                        onChange={e => setNumImages(parseInt(e.target.value) || 0)}
                    /> images {initialQuery}
                </Typography>

                <Stack direction="row" spacing={3} sx={{ my: 2 }}>
                    <Box key="-1" component="div" sx={{ width: '160px', maxHeight: '100px' }} >
                        <TextField inputRef={seemQueryRef} sx={{ width: '160px', mb: 1, height: "50px" }} label="New Mask Keyword" variant="standard" />
                        <Button size="small" sx={{ width: '100px' }} variant="contained" onClick={(e) => generateMask(e, solIndex)}>Generate</Button>
                        <Button size="small" sx={{ width: '50px' }} variant="contained" onClick={() => { setModalOpen(true) }}>Draw</Button>
                    </Box>
                    <Stack
                        direction="row"
                        spacing={1}
                        sx={{ overflow: "auto" }}
                    >
                        {categoriesShortcut.sort((a, b) => (rawCount(b[1]) - rawCount(a[1]))).map(([category, shortcuts], index) => (
                            rawCount(shortcuts) > 0 &&
                            <Box>
                                <Box
                                    size="small"
                                    key={`Category${solIndex}-${index}`}
                                    variant={categoryClicked[index] ? "contained" : "outlined"}
                                    onClick={(e) => highlightCategory(e, index, shortcuts)}
                                    sx={{
                                        px: "15px",
                                        py: "7px",
                                        height: '60px',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        margin: '5px',
                                        cursor: finished ? "cursor" : 'pointer',
                                        border: '1px solid',
                                        borderColor: categoryClicked[index] ? 'transparent' : '#c4c4c4',
                                        borderRadius: '4px',
                                        backgroundColor: categoryClicked[index] ? '#1976d2' : 'transparent',
                                        color: categoryClicked[index] ? 'white' : 'black',
                                        textDecoration: 'none',
                                        '&:hover': finished ? null : {
                                            backgroundColor: categoryClicked[index] ? '#115293' : '#f5f5f5',
                                            borderColor: categoryClicked[index] ? 'transparent' : '#c4c4c4',
                                        },
                                        transition: 'background-color 250ms ease-in-out, box-shadow 250ms ease-in-out',
                                    }}>
                                    {category}
                                    <br />
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Box sx={{ width: '100%', minWidth: 100 }}>
                                            <LinearProgress variant="determinate" value={normalize(shortcuts)} />
                                        </Box>
                                        <Box>
                                            <Typography variant="body2">{rawCount(shortcuts)}</Typography>
                                        </Box>
                                    </Box>
                                </Box>
                            </Box>
                        ))}
                    </Stack>
                </Stack>
                <Divider />


                <Box
                    sx={{ display: 'flex', overflowX: 'auto', gap: '16px', mt: 2, p: 1 }}
                    ref={scrollRef1}
                    onScroll={handleScroll1}>

                    {imageList && imageList.slice(0, 5).map((image, imageIndex) => (
                        <Stack
                            direction="column"
                            spacing={1}>
                            <Box
                                key={`Image${solIndex}-${imageIndex}`}
                                sx={{ position: 'relative', width: '150px', height: '150px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <img
                                    src={"/api/static/" + image}
                                    style={{ width: '150px', maxHeight: '150px', marginBottom: '8px' }} // Adjust marginBottom as needed
                                    alt={`Image ${solIndex}-${imageIndex}`}
                                />
                                {panopticList[image].map((mask, idx) => (
                                    <Box
                                        key={`Panoptic${solIndex}-${imageIndex}-${idx}`}
                                        component="img"
                                        src={"/api/" + mask} // Adjust the path to your colored mask
                                        sx={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            width: '150px',
                                            height: '150px',
                                            opacity: showPanoptic[image][idx],
                                        }}
                                        alt={`Mask Overlay ${idx}`}
                                    />
                                ))}
                            </Box>
                            <Box key={`Mask${solIndex}-${imageIndex}`} sx={{ position: 'relative', width: '150px', height: '150px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <div style={{ width: '150px', maxHeight: '150px', marginBottom: '8px', border: "black 1px" }} />
                                {panopticList[image].map((mask, idx) => (
                                    <Box
                                        key={`Inpainted${solIndex}-${imageIndex}-${idx}`}
                                        component="img"
                                        src={"/api/" + mask} // Adjust the path to your colored mask
                                        sx={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            width: '150px',
                                            height: '150px',
                                            opacity: showPanoptic[image][idx],
                                        }}
                                        alt={`Mask Overlay ${idx}`}
                                    />
                                ))}
                            </Box>
                        </Stack>
                    ))}
                </Box>

                <Divider />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
                    <TextField
                        variant="standard"
                        ref={queryRef}
                        fullWidth
                        defaultValue={`A picture ${initialQuery}`}
                        label="Query for inpainter"
                    />
                    <FormControlLabel control={<Checkbox value={invert} onChange={e => setInvert(e.target.value)} />} label="Invert" />
                    <Button variant="contained" onClick={(e) => inpaint(e, solIndex)}>Inpaint</Button>
                </Box>
                <Box
                    sx={{ display: 'flex', overflowX: 'auto', gap: '16px', mt: 2, p: 1 }}
                    ref={scrollRef2}
                    onScroll={handleScroll2}
                >
                    {inpaintedList.slice(0, 5).map((image, index) => (
                        <Box
                            key={`${solIndex}-${index}`}
                            component="img"
                            src={"/api/" + image}
                            sx={{ width: '150px', maxHeight: '150px' }}
                            alt={`Image ${index}`}
                        />
                    ))}
                </Box>
            </Paper>
            <Draw anchor="right" modalOpen={modalOpen} referenceImage={imageList[0]} onClose={() => setModalOpen(false)} handleRegister={drawMask} />
        </Paper>

    );
};

export default InpaintBlock;
