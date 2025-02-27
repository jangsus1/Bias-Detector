import React, { useRef, useState, useEffect } from "react";
import { ReactSketchCanvas } from "react-sketch-canvas";
import { Button, Slider, Modal, Box, Typography, Stack, TextField } from "@mui/material";
import API_URL from '../common/api'

const Draw = ({ modalOpen, onClose, referenceImage, handleRegister }) => {
    const canvasRef = useRef(null);
    const [eraseMode, setEraseMode] = useState(false);
    const [strokeWidth, setStrokeWidth] = useState(50);
    const [prompt, setPrompt] = useState("");
    const [image, setImage] = useState("");
    // const [eraserWidth, setEraserWidth] = useState(50);


    useEffect(() => {
        fetch(`${API_URL}/api/static/` + referenceImage, { method: 'GET', mode: "cors", })
            .then(response => response.blob()) // Convert the response to a blob
            .then(blob => {
                // Create a new FileReader to read this image as base64
                const reader = new FileReader();

                reader.onloadend = () => {
                    const base64data = reader.result;
                    setImage(base64data)
                };

                // Read the blob as a data URL (base64 string)
                reader.readAsDataURL(blob);
            })
            .catch(error => console.error('Error fetching and converting the image:', error));
    }, [referenceImage])


    useEffect(() => {
        if (image === false){
            handleRegister(canvasRef, prompt)
        }
    }, [image])


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
            onClose={onClose}
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
                <TextField id="standard-basic" label="Mask Name" variant="standard" size="small" value={prompt} onChange={(e) => { setPrompt(e.target.value) }} />
                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                        <Button variant="outlined" disabled={!eraseMode} onClick={handlePenClick}>
                            Pen
                        </Button>
                        <Button variant="outlined" disabled={eraseMode} onClick={handleEraserClick}>
                            Eraser
                        </Button>
                        <div>
                        </div>
                        <Button variant="outlined" onClick={handleUndoClick}>
                            Undo
                        </Button>
                        <Button variant="outlined" onClick={handleRedoClick}>
                            Redo
                        </Button>
                        |
                        <Button variant="outlined" onClick={handleClearClick}>
                            Clear
                        </Button>
                        |
                        <Button variant="outlined" onClick={() => {setImage(false)}}>
                            Register
                        </Button>
                    </div>
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
                    <div style={{ width: 512, height: 512 }}>
                        <ReactSketchCanvas
                            width={512}
                            height={512}
                            ref={canvasRef}

                            strokeWidth={strokeWidth}
                            eraserWidth={strokeWidth}
                            strokeColor="black"
                            backgroundImage={image}
                        />
                    </div>
                </div>
            </Box>
        </Modal>
    );
}

export default Draw;