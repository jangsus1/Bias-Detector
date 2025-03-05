import React, { useRef, useState, useEffect } from "react";
import { ReactSketchCanvas } from "react-sketch-canvas";
import {
    Button,
    Slider,
    Modal,
    Box,
    Typography,
    Stack,
    TextField
} from "@mui/material";
import { callDrawMaskAPI } from "../api";
import API_URL from '../../../common/api';

const Draw = ({
    modalOpen,
    setModalOpen,
    updateManualKeyword,
    updateMaskedImage,
    updatePanoptic,
    selectedImgURL,
    updateModal,
}) => {
    const canvasRef = useRef(null);
    const [eraseMode, setEraseMode] = useState(false);
    const [strokeWidth, setStrokeWidth] = useState(50);
    const [maskName, setMaskName] = useState("");
    const [currentShowImageIndex, setCurrentShowImageIndex] = useState(0);

    // Register new mask 
    const handleRegisterClick = async () => {
        updateModal(
            true,
            'Generating Masks..., please wait!',
        );

        const image = await canvasRef.current.exportImage('png');
        callDrawMaskAPI(image)
        .then((maskPath) => {
            // Update panoptic
            updatePanoptic(
                undefined,
                maskPath,
                maskName,
            );

            // Update registered mask
            updateManualKeyword(maskName);

            // Update mannual keyword
            updateMaskedImage(maskName, ['draw']);

            // Update message modal
            updateModal(false, '');

            // Close draw panel
            setModalOpen(false);
        })
    };


    const handleEraserClick = () => {
        setEraseMode(true);
        canvasRef.current?.eraseMode(true);
    };

    const handlePenClick = () => {
        setEraseMode(false);
        canvasRef.current?.eraseMode(false);
    };

    const handleStrokeWidthChange = (event, newValue) => {
        setStrokeWidth(newValue);
    };

    const handleEraserWidthChange = (event, newValue) => {
        setStrokeWidth(newValue);
    };

    const handleUndoClick = () => {
        canvasRef.current?.undo();
    };

    const handleRedoClick = () => {
        canvasRef.current?.redo();
    };

    const handleClearClick = () => {
        canvasRef.current?.clearCanvas();
    };
    return (
        <Modal
            open={modalOpen}
            onClose={() => {
                setModalOpen(false);
            }}
            aria-labelledby="modal-modal-title"
            aria-describedby="modal-modal-description"
        >
            <Box sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 600, // Adjusted for better fit
                bgcolor: 'background.paper',
                border: '2px solid #000',
                boxShadow: 24,
                p: 4,
            }}>
                <Typography id="modal-modal-title" variant="h6" component="h2">
                    Draw a new Mask
                </Typography>
                <TextField
                    id="standard-basic"
                    label="Mask Name"
                    variant="standard" size="small"
                    value={maskName}
                    onChange={(e) => { setMaskName(e.target.value) }}
                />
                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <Stack direction='column' spacing={1}>
                        {/* First row */}
                        <Stack direction='row' spacing={2}>
                            <Button variant="outlined" disabled={!eraseMode} onClick={handlePenClick}>
                                Pen
                            </Button>
                            <Button variant="outlined" disabled={eraseMode} onClick={handleEraserClick}>
                                Eraser
                            </Button>
                        </Stack>

                        {/* Second row */}
                        <Stack direction='row' spacing={2}>
                            <Button variant="outlined" onClick={handleUndoClick}>
                                Undo
                            </Button>
                            <Button variant="outlined" onClick={handleRedoClick}>
                                Redo
                            </Button>
                            <Button variant="outlined" onClick={handleClearClick}>
                                Clear
                            </Button>
                            <Button variant="outlined" onClick={handleRegisterClick}>
                                Register
                            </Button>
                        </Stack>
                    </Stack>
                    {!eraseMode && <div>
                        <Typography gutterBottom>
                            Stroke width
                        </Typography>
                        <Slider
                            disabled={eraseMode}
                            min={1}
                            max={100}
                            value={strokeWidth}
                            onChange={handleStrokeWidthChange}
                            aria-labelledby="stroke-width-slider"
                        />
                    </div>}
                    {eraseMode && <div>
                        <Typography gutterBottom>
                            Eraser width
                        </Typography>
                        <Slider
                            disabled={!eraseMode}
                            min={1}
                            max={100}
                            value={strokeWidth}
                            onChange={handleEraserWidthChange}
                            aria-labelledby="eraser-width-slider"
                        />
                    </div>}

                    {/* Preview image and mask */}
                    {/* TODO: change the background image */}
                    <Stack direction='row'>
                        <div style={{ width: 512, height: 512 }}>
                            <ReactSketchCanvas
                                width={512}
                                height={512}
                                ref={canvasRef}
                                strokeWidth={strokeWidth}
                                eraserWidth={strokeWidth}
                                strokeColor="black"
                                backgroundImage={`${API_URL}/api/static/` + selectedImgURL[currentShowImageIndex]}
                            />
                        </div>
                    </Stack>
                    
                </div>
            </Box>
        </Modal>
    );
}

export default Draw;