import React, { useEffect, useState } from 'react';
import { 
  Box,
  Typography,
  Container,
  Grid,
} from '@mui/material';
import { useParams } from 'react-router-dom';
import _ from 'lodash';

// Components
import Solver from './Solver';
import Keywords from './Keywords';
import Images from './Images';
import Inpainter from './Inpainter';
import PopoverPanel from './Popover';

// Create promise for extract json file given path
const returnFetchPromise = async (path) => {
  const response = await fetch(`${process.env.PUBLIC_URL}/${path}`);
  return await response.json()
};

export default function Dashboard() {
  const { dataset, label } = useParams();

  // Define the source data
  const [selectedKeywords, setSelectedKeywords] = useState(null);
  const [selectedPrediction, setSelectedPrediction] = useState(null);
  const [selectedPanoptic, setSelectedPanoptic] = useState(null);
  const [selectedPanopticCategories, setSelectedPanopticCategories] = useState(null);
  const [selectedCoordinates, setSelectedCoordinates] = useState(null);
  const [selectedTrainData, setSelectedTrainData] = useState(null);

  useEffect(() => {
    const [
      keywords, 
      predictions,
      panoptic,
      panopticCategories,
      coordinates,
      trainData,
    ] = await.Promise.all([
      returnFetchPromise(`${dataset}/keywords.json`),
      returnFetchPromise(`${dataset}/prediction.json`),
      returnFetchPromise(`${dataset}/panoptic.json`),
      returnFetchPromise(`${dataset}/panoptic_categories.json`),
      returnFetchPromise(`${dataset}/coordinates.json`),
      returnFetchPromise(`${dataset}/file_list.json`),
    ]);

    setSelectedKeywords(keywords[label]);
    setSelectedPrediction(predictions[label]);
    setSelectedPanoptic(panoptic[label]);
    setSelectedPanopticCategories(panopticCategories[label]);
    setSelectedCoordinates(coordinates[label]);
    setSelectedTrainData(trainData['train'][label]);
  }, []);
  
  const [hoveredImages, setHoveredImages] = useState(null);
  const [clickedObj, setClickedObj] = useState({})
  const [solutions, setSolutions] = useState([])
  const [draggedKeywordObj, setDraggedKeywordObj] = useState(null)
  const [keywordMode, setKeywordMode] = useState(false) // for manual keyword generation
  const [selectedImages, setSelectedImages] = useState({})
  const [popover, setPopover] = useState(null)
  const [clickedImage, setClickedImage] = useState(null)
  const [hoveredCaptionKeyword, setHoveredCaptionKeyword] = useState(null)
  const [popoverCollapsed, setPopoverCollapsed] = useState(false)

  const registerManualKeyword = function () { // User add new keyword 
    if (keywordMode == "Manual") {
      const newKeyword = prompt("Please enter the new bias keyword", "e.g. grassfield")
      if (newKeyword != null) {
        const images = Object.entries(selectedImages).filter(([key, value]) => value).map(([key, value]) => key)
        fetch("/api/manual_keyword", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          mode: "cors",
          body: JSON.stringify({
            keyword: newKeyword,
            dataset: dataset,
            classname: label,
            images: images
          })
        }).then(response => response.json())
          .then(data => {
            const newKeywordObj = {
              keyword: [newKeyword],
              score: [data["score"]],
              accuracy: [data["accuracy"]],
              images: [images]
            }
            setSelectedImages({})
            setKeywords([...keywords, newKeywordObj])
            setKeywordMode(false)
          })
      }
    } else if (keywordMode == false) {
      setKeywordMode("Manual")
    }
  }

  const parsedKeywords = selectedKeywords.map((data, index) => ({
    keyword: [data.keyword],
    score: [parseFloat(data.score)],
    accuracy: [parseFloat(data.accuracy)],
    images: [data.images]
  }))
  const [keywords, setKeywords] = useState(parsedKeywords)

  const registerComplete = (dragCompletedKeywordObj) => {
    setKeywords(keywords.filter((k, index) => index != dragCompletedKeywordObj.index))
    setDraggedKeywordObj(null)
  }

  const mergeComplete = () => {
    setDraggedKeywordObj(null)
  }

  return (
    // <ThemeProvider theme={defaultTheme}>
    <div className="App">
      <Box sx={{
        backgroundColor: "#A8A8A8",
        justifyContent: "center",
        alignItems: "center",
        display: "flex",
        height: "50px"
      }}>
        <Typography variant="h6" noWrap component="div">
          Interactive System for Mitigating Multiple Bias in Image Datasets
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <Box
          component="main"
          sx={{
            backgroundColor: (theme) =>
              theme.palette.mode === 'light'
                ? theme.palette.grey[100]
                : theme.palette.grey[900],
            flexGrow: 1,
            height: 'calc(100vh - 50px)',
            overflow: 'auto',
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'row', overflowX: 'auto', width: '100%' }}>
            <Container sx={{ mt: 1, mb: 1, minWidth: "100vw" }}>
              <Grid container spacing={1}>
                {/* Images */}
                <Images
                  clickedImage={clickedImage}
                  setClickedImage={setClickedImage}
                  prediction={selectedPrediction}
                  hoveredImages={hoveredImages}
                  clickedObj={clickedObj}
                  coordinates={selectedCoordinates}
                  keywordMode={keywordMode}
                  selectedImages={selectedImages}
                  setSelectedImages={setSelectedImages}
                  setPopover={setPopover}
                  keywords={keywords}
                />
                {/* Keywords */}

                <PopoverPanel
                  popover={popover}
                  setHoveredCaptionKeyword={setHoveredCaptionKeyword}
                  popoverCollapsed={popoverCollapsed}
                  setPopoverCollapsed={setPopoverCollapsed}
                />


                <Keywords
                  dataset={dataset}
                  popoverCollapsed={popoverCollapsed}
                  label={label}
                  keywords={keywords}
                  setKeywords={setKeywords}
                  setHoveredImages={setHoveredImages}
                  prediction={selectedPrediction}
                  setClickedObj={setClickedObj}
                  mergeComplete={mergeComplete}
                  coordinates={selectedCoordinates}
                  setDraggedKeywordObj={setDraggedKeywordObj}
                  draggedKeywordObj={draggedKeywordObj}
                  registerManualKeyword={registerManualKeyword}
                  keywordMode={keywordMode}
                  popover={popover}
                  clickedImage={clickedImage}
                  hoveredCaptionKeyword={hoveredCaptionKeyword}
                />

              </Grid>
            </Container>
            <Container sx={{ mt: 1, mb: 1, minWidth: "50vw" }}>
              <Grid container spacing={1}>
                {/* Solver */}
                <Solver
                  predictions={selectedPrediction}
                  setSolutions={setSolutions}
                  registerComplete={registerComplete}
                  draggedKeywordObj={draggedKeywordObj}
                  setKeywords={setKeywords}
                  selectedTrainData={selectedTrainData}
                />
              </Grid>
            </Container>
            <Container sx={{ mt: 1, mb: 1, minWidth: "100vw" }}>
              <Grid container spacing={1}>
                {/* Solver */}
                <Inpainter
                  dataset={dataset}
                  solutions={solutions}
                  normalImages={selectedTrainData}
                  panoptic={selectedPanoptic}
                  panopticCategories={selectedPanopticCategories}
                  label={label}
                />
              </Grid>
            </Container>
          </Box>
        </Box>
      </Box>
    </div >
    // </ThemeProvider>
  );
}
