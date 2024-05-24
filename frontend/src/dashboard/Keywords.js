import React from 'react';
import { useState } from 'react';
import { TextField, Button, Grid, Box, Table, Container, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography } from '@mui/material';
import _ from 'lodash';
import * as d3 from "d3";

const Keywords = ({ dataset, label, keywords, setKeywords, prediction, setOpacity, setClickedObj, setLoading, show, draggedKeywordObj, setDraggedKeywordObj, mergeComplete, coordinates, registerManualKeyword, ensembleKeyword, popover}) => {

  const [focusKeyword, setFocusKeyword] = useState("")
  const [clickedKeyword, setClickedKeyword] = useState("")


  const onClick = function (e, data) {
    if (clickedKeyword == data.keyword) {
      setClickedKeyword("")
      setClickedObj({})
    }
    else {
      setClickedKeyword(data.keyword)
      setClickedObj(data)
    }
  }

  const onMouseOver = function (e, data) {
    const images = data.images.flat()
    const opacity = prediction.map((d, index) => {
      if (images.includes(d.image)) return 1
      else return 0.2
    })
    setOpacity(opacity)
    setFocusKeyword(data.keyword)
  }

  const onMouseOut = function (e) {
    setOpacity(prediction.map((data, index) => 1))
    setFocusKeyword("")
  }

  const focus = function (keyword) {
    if (clickedKeyword == "") {
      if (focusKeyword == keyword) return true
      else return false
    }
    else {
      if (clickedKeyword == keyword) return true
      else return false
    }
  }

  const onKeywordChange = function (e, index1, index2) {
    const updatedKeywords = keywords.map((keywordGroup, i) => {
      if (i === index1) {
        return {
          ...keywordGroup,
          keyword: keywordGroup.keyword.map((keyword, j) => {
            if (j === index2) {
              // Update the specific keyword
              return e.target.value;
            }
            return keyword;
          }),
        };
      }
      return keywordGroup;
    });

    // Update the state with the new keywords array
    setKeywords(updatedKeywords);
  }

  const addKeyword = function () {
    const newKeyword = prompt("Enter new keyword");
    if (!newKeyword || newKeyword.length == 0) return;
    setLoading("Fetching keyword from the server...");
    fetch('/api/keyword', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        keyword: newKeyword, 
        classname: label,
        dataset: dataset,
      })
    })
    .then(response => response.json())
    .then(data => {
      const captionSimList = data.caption_similarity
      const clipSimList = data.clip_similarity
      const images = data.images
      
      const captionSimilarities = {}
      captionSimList.forEach((sim, index) => {
        captionSimilarities[images[index]] = parseFloat(sim)
      })

      const clipSimilarities = {}
      clipSimList.forEach((sim, index) => {
        clipSimilarities[images[index]] = parseFloat(sim)
      }) 

      ensembleKeyword(newKeyword, captionSimilarities, clipSimilarities)
    })
    .catch(err => console.log(err))
    .finally(() => { setLoading(false) })


  }

  const onDragStart = function (e, data, index) {
    setDraggedKeywordObj({index, data});
  }

  const onDrop = function (e, droppedKeyword, droppedIndex) {
    e.preventDefault();
    if (!draggedKeywordObj) return;
    if (draggedKeywordObj.index === droppedIndex) return mergeComplete();

    const checkedKeywords = [draggedKeywordObj.data, droppedKeyword];

    const newKeyword = {
      keyword: checkedKeywords.map(keyword => keyword.keyword).flat(1),
      score: checkedKeywords.map(keyword => keyword.score).flat(1),
      accuracy: checkedKeywords.map(keyword => keyword.accuracy).flat(1),
      images: checkedKeywords.map(keyword => keyword.images).flat(1)
    }
    const uncheckedKeywords = keywords.filter((keyword, index) => index !== draggedKeywordObj.index && index !== droppedIndex);
    setKeywords([...uncheckedKeywords, newKeyword].sort((a, b) => _.mean(b.score) - _.mean(a.score)));
    mergeComplete();
  
  }

  const calculateCentroid = (points) => {
    const sum = points.reduce((acc, point) => [acc[0] + point[0], acc[1] + point[1]], [0, 0]);
    return [sum[0] / points.length, sum[1] / points.length];
  };
  
  const distanceFromCentroid = (images) => {
    const points = images.map(i => coordinates[i].tsne)
    const centroid = calculateCentroid(points);
    const distances = points.map(point => Math.sqrt(Math.pow(point[0] - centroid[0], 2) + Math.pow(point[1] - centroid[1], 2)));
    return {
      average: _.mean(distances),
      min: _.min(distances),
      max: _.max(distances)
    };
  };

  const overallAccuracy = prediction.reduce((acc, curr) => acc + curr.correct, 0) / prediction.length;
  const accuracyColor = d3.scaleDiverging([0, overallAccuracy, 1], d3.interpolateRdBu);

  const overallCD = distanceFromCentroid(prediction.map(d => d.image));
  const centroidColor = d3.scaleDiverging([overallCD.min, overallCD.average, overallCD.max], d3.interpolateRdBu);

  const scoreColor = d3.scaleDiverging([2, 0, -2], d3.interpolateRdBu);

  const calculateAccuracy = function(data) {
    const filteredPredictions = prediction.filter(d => data.images.flat().includes(d.image));
    return filteredPredictions.reduce((acc, curr) => acc + curr.correct, 0) / filteredPredictions.length;
  }
  const weightedSumScore = function(data) {
    const lengths = data.images.map(ls => ls.length);
    const weights = lengths.map(l => l / _.sum(lengths));
    return _.sum(data.score.map((s, i) => s * weights[i]));
  }

  if (!show) return null;

  return (
    <Grid item xs={12} md={4} lg={3}>
      <Paper
        sx={{
          p: 2,
          display: "flex",
          flexDirection: 'column',
          maxHeight: '40vh', // Example max height
          overflowY: 'auto', // Enables vertical scrolling
        }}
      >
        <div>
          <h3>Bias Candidates</h3>
          <Typography>Accuracy for {label}: {parseFloat(overallAccuracy).toFixed(2)} </Typography> <br />
          <Button sx={{ mr: 1 }} variant="contained" onClick={addKeyword}>Ensemble</Button>
          <Button sx={{ mr: 1 }} variant="contained" onClick={registerManualKeyword}>Manual</Button>
            <Paper sx={{ my: 1, overflowX: "auto" }}>
              <Table aria-label="customized table">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Keywords</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }} align="right">Score</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }} align="right">Accuracy</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }} align="right">Centroid Distance</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {keywords.map((data, index) => (
                    <TableRow 
                      key={index}
                      draggable 
                      onDragStart={(e) => onDragStart(e, data, index)}
                      onMouseOver={(e) => onMouseOver(e, data)}
                      onMouseOut={onMouseOut}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => onDrop(e, data, index)}
                      onClick={(e) => onClick(e, data)}
                      sx={{ 
                        '&:last-child td, &:last-child th': { border: 0 }, 
                        cursor: "pointer",
                        backgroundColor: focus(data.keyword) ? "#f0f0f0" : "white"
                      }}
                    >
                      <TableCell component="th" scope="row">
                        {data.keyword.map((k, index2) => (
                          <TextField 
                            key={index2}
                            variant="standard" 
                            value={k} 
                            onChange={(e) => onKeywordChange(e, index, index2)} 
                            onClick={(e) => e.stopPropagation()}
                            sx={{ width: "70px"}}
                          />
                        ))}
                      </TableCell>
                      <TableCell sx={{backgroundColor: scoreColor(weightedSumScore(data))}} align="right"><Typography>{weightedSumScore(data).toFixed(2)}</Typography></TableCell>
                      <TableCell sx={{backgroundColor: accuracyColor(calculateAccuracy(data))}} align="right">
                        <Typography>{calculateAccuracy(data).toFixed(2)}</Typography>
                      </TableCell>
                      <TableCell sx={{backgroundColor: centroidColor(distanceFromCentroid(data.images.flat()).average)}} align="right"><Typography>{distanceFromCentroid(data.images.flat()).average.toFixed(2)}</Typography></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
        </div>
      </Paper>
      {popover && <Paper
        sx={{
          p: 2,
          mt: 2,
          display: "flex",
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          maxHeight: '40vh', // Example max height
          overflowY: 'auto', // Enables vertical scrolling
        }}>
        <img width="50%" src={popover.image}></img>
        <Typography sx={{width: "100%"}}>{popover.caption}</Typography>
      </Paper>
      }
    </Grid>
  );
};

export default Keywords;
