import React, { useEffect, useMemo } from 'react';
import { useState } from 'react';
import {
  Grid,
  Paper,
  Button,
  Typography,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
  TableSortLabel
} from '@mui/material';
import _, { set } from 'lodash';
import * as d3 from "d3";

const Keywords = ({
  keywords,
  setKeywords,
  prediction,
  setHoveredImages,
  setClickedObj,
  draggedKeywordObj,
  setDraggedKeywordObj,
  mergeComplete,
  coordinates,
  registerManualKeyword,
  clickedImage,
  hoveredCaptionKeyword,
  popoverCollapsed,
  keywordMode,
}) => {


  const [focusKeyword, setFocusKeyword] = useState("")
  const [clickedKeyword, setClickedKeyword] = useState("")
  const [order, setOrder] = useState('desc');
  const [orderBy, setOrderBy] = useState('score');

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
    setHoveredImages(images)
    setFocusKeyword(data.keyword)
  }

  const onMouseOut = function (e) {
    setHoveredImages(null)
    setFocusKeyword("")
  }

  const focus = function (data) {

    const keyword = data.keyword;
    if (clickedImage) { // When image is clicked in explorer
      if (keyword == hoveredCaptionKeyword) return "#d0d0d0"
      if (data.images.flat().includes(clickedImage.image)) return "#f0f0f0"
      return "white"
    }
    if (!clickedKeyword) return focusKeyword == keyword ? "#f0f0f0" : "white" // when keyword is hovered here
    return clickedKeyword == keyword ? "#d0d0d0" : "white" // when keyword is clicked here
  }

  const onKeywordChange = function (e, index1, index2) {
    const updatedKeywords = keywords?.map((keywordGroup, i) => {
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

  const onDragStart = function (e, data, index) {
    setDraggedKeywordObj({ index, data });
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
  const totalCorrect = prediction.reduce((acc, curr) => acc + curr.correct, 0);
  const totalWrong = prediction.length - totalCorrect;
  const overallAccuracy = totalCorrect / prediction.length;
  const accuracyColor = d3.scaleDiverging([0, overallAccuracy, 1], d3.interpolateRdBu);

  const overallCD = distanceFromCentroid(prediction.map(d => d.image));
  const centroidColor = d3.scaleDiverging([overallCD.min, overallCD.average, overallCD.max], d3.interpolateRdBu);

  const scoreColor = d3.scaleDiverging([2, 0, -2], d3.interpolateRdBu);

  const calculateAccuracy = function (data) {
    const filteredPredictions = prediction.filter(d => data.images.flat().includes(d.image));
    return filteredPredictions.reduce((acc, curr) => acc + curr.correct, 0) / filteredPredictions.length;
  }

  const weightedSumScore = function (data) {
    const lengths = data.images.map(ls => ls.length);
    const weights = lengths.map(l => l / _.sum(lengths));
    return _.sum(data.score.map((s, i) => s * weights[i]));
  }

  const handleSortRequest = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const sortedIndices = useMemo(() => {
    return keywords
      ?.map((_, index) => index)
      ?.sort((a, b) => {
        let aVal, bVal;
        if (orderBy === 'score') {
          aVal = weightedSumScore(keywords[a]);
          bVal = weightedSumScore(keywords[b]);
        } else if (orderBy === 'accuracy') {
          aVal = calculateAccuracy(keywords[a]);
          bVal = calculateAccuracy(keywords[b]);
        } else if (orderBy === 'compactness') {
          aVal = distanceFromCentroid(keywords[a].images.flat()).average;
          bVal = distanceFromCentroid(keywords[b].images.flat()).average;
        } else {
          aVal = keywords[a].keyword[0] || "";
          bVal = keywords[b].keyword[0] || "";
          return order === 'asc'
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        }
        return order === 'asc' ? aVal - bVal : bVal - aVal;
      });
  }, [keywords, order, orderBy]);


  const sortedKeywords = _.orderBy(
    keywords,
    (data) => {
      if (orderBy === 'score') return weightedSumScore(data);
      if (orderBy === 'accuracy') return calculateAccuracy(data);
      if (orderBy === 'compactness') return distanceFromCentroid(data.images.flat()).average;
      if (orderBy === 'keyword') return data.keyword[0] || "";
      return 0;
    },
    order
  );

  return (
    <Grid item lg={popoverCollapsed ? 5.8 : 4}>
      <Paper
        sx={{
          p: 2,
          display: "flex",
          flexDirection: 'column',
          maxHeight: '85vh', // Example max height
          overflowY: 'auto', // Enables vertical scrolling
          borderRadius: "12px"
        }}
      >
        <Typography sx={{ mb: 1 }} variant='h6'>Bias Candidates</Typography>
        <Paper sx={{ my: 1, }}>
          <Table aria-label="customized table">
            {/* Fixed Header */}
            <TableHead sx={{ position: "sticky", top: 0, backgroundColor: "#A8A8A8", zIndex: 2 }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>
                  <Button onClick={registerManualKeyword}>
                    {
                      keywordMode === false ? 'Add Keyword' : 'Select Images Done'
                    }
                  </Button>
                  <TableSortLabel
                    active={orderBy === 'keyword'}
                    direction={orderBy === 'keyword' ? order : 'asc'}
                    onClick={() => handleSortRequest('keyword')}
                  >
                    Keywords
                  </TableSortLabel>

                </TableCell>
                <TableCell sx={{ fontWeight: 'bold' }} align="right">
                  <TableSortLabel
                    active={orderBy === 'score'}
                    direction={orderBy === 'score' ? order : 'asc'}
                    onClick={() => handleSortRequest('score')}
                  >
                    Score
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold' }} align="right">
                  <TableSortLabel
                    active={orderBy === 'accuracy'}
                    direction={orderBy === 'accuracy' ? order : 'asc'}
                    onClick={() => handleSortRequest('accuracy')}
                  >
                    Accuracy
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold' }} align="right">
                <TableSortLabel
                    active={orderBy === 'compactness'}
                    direction={orderBy === 'compactness' ? order : 'asc'}
                    onClick={() => handleSortRequest('compactness')}
                  >
                    Compactness
                  </TableSortLabel>
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {sortedIndices?.map((sortedIndex) => {
                const data = keywords[sortedIndex];
                const index = keywords.indexOf(data);
                return <TableRow
                  key={index}
                  draggable
                  onDragStart={(e) => onDragStart(e, data, index)}
                  onMouseOver={(e) => onMouseOver(e, data)}
                  onMouseOut={onMouseOut}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => onDrop(e, data, index)}
                  onClick={(e) => onClick(e, data)}
                  sx={{
                    // '&:last-child td, &:last-child th': { border: 0 },
                    cursor: "pointer",
                    backgroundColor: focus(data),
                    // border: 1,
                    borderColor: "gray",

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
                        sx={{ width: "100%" }}
                      />
                    ))}
                  </TableCell>
                  <TableCell sx={{ backgroundColor: scoreColor(weightedSumScore(data)) }} align="right">
                    <Typography>{weightedSumScore(data).toFixed(2)}</Typography>
                  </TableCell>
                  <TableCell sx={{ backgroundColor: accuracyColor(calculateAccuracy(data)) }} align="right">
                    <Typography>{calculateAccuracy(data).toFixed(2)}</Typography>
                  </TableCell>
                  <TableCell sx={{ backgroundColor: centroidColor(distanceFromCentroid(data.images.flat()).average) }} align="right">
                    <Typography>{distanceFromCentroid(data.images.flat()).average.toFixed(2)}</Typography>
                  </TableCell>
                </TableRow>
              })}
            </TableBody>
          </Table>
        </Paper>
      </Paper>
    </Grid >
  );
};

export default Keywords;
