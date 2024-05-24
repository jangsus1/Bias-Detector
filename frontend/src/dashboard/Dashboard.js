import React, { useEffect, useState } from 'react';
import { styled, createTheme, ThemeProvider, CssBaseline, Tabs, Tab, Drawer as MuiDrawer, Box, AppBar as MuiAppBar, Toolbar, List, Typography, Divider, IconButton, Badge, Container, Grid, Paper, Link, CircularProgress } from '@mui/material';
import { Menu as MenuIcon, ChevronLeft as ChevronLeftIcon, Notifications as NotificationsIcon } from '@mui/icons-material';
import { useParams } from 'react-router-dom';
import _ from 'lodash';

// Components
import Solver from './Solver';
import Keywords from './Keywords';
import Images from './Images';
import Inpainter from './Inpainter';


const drawerWidth = 0; //240

const AppBar = styled(MuiAppBar, {
  shouldForwardProp: (prop) => prop !== 'open',
})(({ theme, open }) => ({
  zIndex: theme.zIndex.drawer + 1,
  transition: theme.transitions.create(['width', 'margin'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  ...(open && {
    marginLeft: drawerWidth,
    width: `calc(100% - ${drawerWidth}px)`,
    transition: theme.transitions.create(['width', 'margin'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  }),
}));


export default function Dashboard() {
  const { dataset, label } = useParams();

  var selectedKeywords = require(`../data/${dataset}/keywords.json`)[label]
  var selectedPrediction = require(`../data/${dataset}/prediction.json`)[label]
  var selectedPanoptic = require(`../data/${dataset}/panoptic.json`)[label]
  var selectedPanopticCategories = require(`../data/${dataset}/panoptic_categories.json`)[label]
  var selectedCoordinates = require(`../data/${dataset}/coordinates.json`)[label]
  var selectedTrainData = require(`../data/${dataset}/file_list.json`)['train'][label]


  const [open, setOpen] = useState(true);
  const [opacity, setOpacity] = useState(new Array(selectedPrediction.length).fill(1));
  const [clickedObj, setClickedObj] = useState({})
  const [solutions, setSolutions] = useState([])
  const [normalImages, setNormalImages] = useState([])
  const [loading, setLoading] = useState(false)
  const [draggedKeywordObj, setDraggedKeywordObj] = useState(null)
  const [keywordMode, setKeywordMode] = useState(false) // for manual keyword generation
  const [selectedImages, setSelectedImages] = useState({})
  const [ensembleInfo, setEnsembleInfo] = useState({})
  const [popover, setPopover] = useState(null)


  const registerManualKeyword = function(){
    if (keywordMode == "Manual"){
      const newKeyword = prompt("Please enter the new bias keyword", "e.g. grassfield")
      if (newKeyword != null) {
        const images = Object.entries(selectedImages).filter(([key, value]) => value).map(([key, value]) => key)
        fetch("/api/manual_keyword", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
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
          addKeyword(newKeywordObj)
          setKeywordMode(false)
        })
      }
    } else if (keywordMode == false){
      setKeywordMode("Manual")
    }
  }

  const ensembleKeyword = function(newKeyword, captionSimilarities, clipSimilarities){
    if (keywordMode == "Ensemble"){
      
    } 
    else if (keywordMode == false){
      setEnsembleInfo({
        keyword: newKeyword,
        captionSimilarities: captionSimilarities,
        clipSimilarities: clipSimilarities
      })
      setKeywordMode("Ensemble")
    }
  }

  const addKeyword = function(keyword){
    setKeywords([...keywords, keyword].sort((a, b) => _.mean(b.score) - _.mean(a.score)))
  }

  const parsedKeywords = selectedKeywords.map((data, index) => ({
    keyword: [data.keyword], 
    score: [parseFloat(data.score)], 
    accuracy: [parseFloat(data.accuracy)],
    images: [data.images]
  }))
  const [keywords, setKeywords] = useState(parsedKeywords)

  const toggleDrawer = () => {
    setOpen(!open);
  };

  const [value, setValue] = React.useState(0);

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  const registerComplete = (dragCompletedKeywordObj) => {
    setKeywords(keywords.filter((k, index) => index!= dragCompletedKeywordObj.index))
    setDraggedKeywordObj(null)
  }

  const mergeComplete = () => {
    setDraggedKeywordObj(null)
  }

  const onSolved = (solutions, normalImages) => {
    setSolutions(solutions);
    setNormalImages(normalImages);
    setValue(1);
  }


  return (
    // <ThemeProvider theme={defaultTheme}>
    <div className="App">
      <Box sx={{ display: 'flex',  justifyContent: 'center'}}>
        {loading && 
          <div style={{
            position: 'fixed', // Use fixed to cover the entire screen
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent black
            zIndex: 1000, // Ensure it sits above other content (adjust as necessary)
          }} />}
        <CssBaseline />
        <AppBar position="absolute" open={open}>
          <Toolbar
            sx={{
              pr: '24px', // keep right padding when drawer closed
            }}
          >
            <IconButton
              edge="start"
              color="inherit"
              aria-label="open drawer"
              onClick={toggleDrawer}
              sx={{
                marginRight: '36px',
                ...(open && { display: 'none' }),
              }}
            >
              <MenuIcon />
            </IconButton>
            <Typography
              component="h1"
              variant="h6"
              color="inherit"
              noWrap
              sx={{ flexGrow: 1 }}
            >
              {keywordMode && ` ${keywordMode} Mode`}
              {loading && loading}
              {(loading||keywordMode) ? (<CircularProgress  sx={{ color: 'black' }} />) : "Interactive System for Mitigating Multiple Bias in Image Datasets "}
              
            </Typography>
            
          </Toolbar>
        </AppBar>

        <Box
          component="main"
          sx={{
            backgroundColor: (theme) =>
              theme.palette.mode === 'light'
                ? theme.palette.grey[100]
                : theme.palette.grey[900],
            flexGrow: 1,
            height: '100vh',
            overflow: 'auto',
          }}
        >
          <Toolbar />
          <Tabs value={value} onChange={handleChange} aria-label="basic tabs example">
            <Tab label="Bias Solver" />
            <Tab label="Inage Inpainter" />
          </Tabs>
          <Container maxWidth="100vw" sx={{ mt: 4, mb: 4 }}>
            <Grid container spacing={2}>
              {/* Images */}
              <Images 
                show={value==0}
                prediction={selectedPrediction} 
                opacity={opacity} 
                clickedObj={clickedObj}
                coordinates={selectedCoordinates}
                keywordMode={keywordMode}
                ensembleInfo={ensembleInfo}
                selectedImages={selectedImages}
                setSelectedImages={setSelectedImages}
                setPopover={setPopover}
              />
              {/* Keywords */}
              <Keywords 
                dataset={dataset}
                show={value==0}
                label={label} 
                keywords={keywords} 
                setKeywords={setKeywords} 
                setOpacity={setOpacity} 
                prediction={selectedPrediction} 
                setClickedObj={setClickedObj}
                mergeComplete={mergeComplete}
                setLoading={setLoading}
                coordinates={selectedCoordinates}
                setDraggedKeywordObj={setDraggedKeywordObj}
                draggedKeywordObj={draggedKeywordObj}
                registerManualKeyword={registerManualKeyword}
                keywordMode={keywordMode}
                ensembleKeyword={ensembleKeyword}
                popover={popover}
              />
              {/* Solver */}
              <Solver 
                show={value==0}
                predictions={selectedPrediction} 
                onSolved={onSolved}
                registerComplete={registerComplete}
                draggedKeywordObj={draggedKeywordObj}
                addKeyword={addKeyword}
                selectedTrainData={selectedTrainData}
              />
              
              {/* Solver */}
              <Inpainter 
                dataset={dataset}
                show = {value==1}
                solutions={solutions} 
                normalImages={selectedTrainData} 
                setLoading={setLoading} 
                panoptic={selectedPanoptic}
                panopticCategories={selectedPanopticCategories}
                label={label}
              />
            </Grid>
          </Container>
        </Box>
      </Box>
    </div>
    // </ThemeProvider>
  );
}
