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
  Stack,
  Switch,
  TableSortLabel,
  Tooltip,
  Box,
} from '@mui/material';
import _ from 'lodash';
import * as d3 from "d3";
import RevertedImage from './RevertedImage';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import AddBoxIcon from '@mui/icons-material/AddBox';
import IndeterminateCheckBoxIcon from '@mui/icons-material/IndeterminateCheckBox';

/**
 * Calculate compachness
 */
const calculateCentroid = (points) => {
  const sum = points.reduce((acc, point) => [acc[0] + point[0], acc[1] + point[1]], [0, 0]);
  return [sum[0] / points.length, sum[1] / points.length];
};

/**
 * Calculate weighted score
 */
const weightedSumScore = function (data) {
  const lengths = data.images.map(ls => ls.length);
  const weights = lengths.map(l => l / _.sum(lengths));
  return _.sum(data.score.map((s, i) => s * weights[i]));
}

/**
 * Calculate simple avarage lime coefficient
 */
const avgLimeCoefficient = function (data) {
  const filteredCoefficient = data.coefficient.filter(val => val !== undefined);
  return _.sum(filteredCoefficient) / filteredCoefficient.length;
}

/**
 * Find if two keywords are equal
 */
const equalKeywords = (keyword1, keyword2) => {
  if(keyword1 === undefined || keyword2 === undefined) return false;

  return keyword1.length === keyword2.length && keyword1.every((val, index) => val === keyword2[index]);
};

const Keywords = ({
  keywords,
  label,
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
  selectedRevertedImgInfo,
}) => {
  const [focusKeyword, setFocusKeyword] = useState("")
  const [clickedKeyword, setClickedKeyword] = useState("")
  const [order, setOrder] = useState('desc');
  const [orderBy, setOrderBy] = useState('score');
  const [useLimeKeyword, setUseLimeKeyword] = useState(false);
  const [fixedLimeKeyword, setFixedLimeKeyword] = useState(undefined);
  const [hoveredData, setHoveredData] = useState(undefined);

  useEffect(() => {
    const limeKeyword = keywords?.filter((data) => data?.coefficient?.[0] !== undefined)
    setFixedLimeKeyword(limeKeyword);
  }, []);

  /**
   * On click action
   */
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

  /**
   * On mouse over action
   */
  const onMouseOver = function (e, data) {
    const images = data.images.flat()
    setHoveredImages(images)
    setFocusKeyword(data.keyword)
    
    // Show the adding icon
    setHoveredData(data)
  }

  /**
   * On mouse out action
   */
  const onMouseOut = function (e) {
    setHoveredImages(null)
    setFocusKeyword("")

    // Disable the adding icon
    setHoveredData(undefined);
  }

  /**
   * On focus action
   */
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

  /**
   * On keyword change action
   */
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

  /**
   * On drag start action
   */
  const onDragStart = function (e, data, index) {
    setDraggedKeywordObj({ index, data });
  }

  /**
   * On drop action
   */
  const onDrop = function (e, droppedKeyword, droppedIndex) {
    e.preventDefault();
    if (!draggedKeywordObj) return;
    if (draggedKeywordObj.index === droppedIndex) return mergeComplete();

    const checkedKeywords = [draggedKeywordObj.data, droppedKeyword];

    const newKeyword = {
      keyword: checkedKeywords.map(keyword => keyword.keyword).flat(1),
      score: checkedKeywords.map(keyword => keyword.score).flat(1),
      accuracy: checkedKeywords.map(keyword => keyword.accuracy).flat(1),
      images: checkedKeywords.map(keyword => keyword.images).flat(1),
      sepcificity: checkedKeywords.map(keyword => keyword.sepcificity).flat(1),
      class: checkedKeywords.map(keyword => keyword.class).flat(1),
      coefficient: checkedKeywords.map(keyword => keyword.coefficient).flat(1),
    }

    const uncheckedKeywords = keywords.filter((keyword, index) => index !== draggedKeywordObj.index && index !== droppedIndex);
    setKeywords([...uncheckedKeywords, newKeyword].sort((a, b) => _.mean(b.score) - _.mean(a.score)));
    mergeComplete();
  }

  /**
   * On decoupling
   */
  const onDecoupling = (keyword, indexWithKeyword, indexOfKeywordInList) => {
    const remainKeyword = {}
    const restoredKeyword = {}

    // Extract corresponding keyword from current keyword
    Object.keys(keyword).forEach((property) => {
      const propertyVal = keyword[property];
      remainKeyword[property] = propertyVal.filter((_, index) => index != indexWithKeyword);
      restoredKeyword[property] = propertyVal.filter((_, index) => index === indexWithKeyword);
    });

    // Delete current keyword
    const keywordAfterDelete = keywords.filter((_, index) => index !== indexOfKeywordInList);

    // Update new keywords list
    setKeywords([...keywordAfterDelete, remainKeyword, restoredKeyword]);
  };

  /**
   * On adding the image to keyword
   */
  const onAddingImageToKeyword = (currentIndex) => {
    const cloneKeywords = _.cloneDeep(keywords);
    
    const addingFunction = (images) => {
      // Update current images list
      const currentKeywords = cloneKeywords[currentIndex];
      currentKeywords.images = currentKeywords.images?.map((img_list) => {
        return img_list.concat(images);
      })
      cloneKeywords[currentIndex] = currentKeywords;
      setKeywords(cloneKeywords);
    }

    return addingFunction;
  }

  /**
   * On deleting the image to keyword
   */
  const onDeletingImageToKeyword = (currentIndex) => {
    const cloneKeywords = _.cloneDeep(keywords);

    const deletingFunction = (images) => {
      const imagesSet = new Set(images);

      // Update current images list
      const currentKeywords = cloneKeywords[currentIndex];
      currentKeywords.images = currentKeywords.images?.map((img_list) => {
        const result = img_list.filter(url => !imagesSet.has(url));
        return Array.from(result);
      });

      cloneKeywords[currentIndex] = currentKeywords;
      setKeywords(cloneKeywords);
    }

    return deletingFunction;
  }


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
  const overallAccuracy = totalCorrect / prediction.length;
  const accuracyColor = d3.scaleDiverging([0, overallAccuracy, 1], d3.interpolateRdBu);

  const overallCD = distanceFromCentroid(prediction.map(d => d.image));
  const centroidColor = d3.scaleDiverging([overallCD.min, overallCD.average, overallCD.max], d3.interpolateRdBu);
  const scoreColor = d3.scaleDiverging([2, 0, -2], d3.interpolateRdBu);

  const calculateAccuracy = function (data) {
    const filteredPredictions = prediction.filter(d => data.images.flat().includes(d.image));
    return filteredPredictions.reduce((acc, curr) => acc + curr.correct, 0) / filteredPredictions.length;
  }

  const handleSortRequest = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const sortedIndices = useMemo(() => {
    return keywords
      ?.map((_, index) => index)
      ?.filter(index => {
        // Filter values who don't have lime property when lime switch opens
        if (!useLimeKeyword) return true;
        return keywords[index]['coefficient'] !== undefined;
      })
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
        } else if (orderBy === 'coefficient') {
          aVal = avgLimeCoefficient(keywords[a]);
          bVal = avgLimeCoefficient(keywords[b]);
        }
        else {
          aVal = keywords[a].keyword[0] || "";
          bVal = keywords[b].keyword[0] || "";
          return order === 'asc'
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        }
        return order === 'asc' ? aVal - bVal : bVal - aVal;
      });
  }, [keywords, order, orderBy, useLimeKeyword]);


  return (
    <Grid item lg={popoverCollapsed ? 5.8 : 4}>
      <Paper
        sx={{
          p: 2,
          display: "flex",
          flexDirection: 'column',
          maxHeight: '85vh', // Example max height
          overflowY: !!keywordMode ? 'hidden' : 'auto',
          overflowX: !!keywordMode ? 'hidden' : 'auto',
          borderRadius: "12px",
          position: 'relative',
        }}
      >
        {/* Mask when selection keywords */}
        {
          (keywordMode !== false) && <Box
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              backgroundColor: "rgba(0, 0, 0, 0.4)",
              pointerEvents: "auto",
              zIndex: 100,
            }}
          />
        }

        {/* Title */}
        <Typography sx={{ mb: 1 }} variant='h6'>Bias Candidates</Typography>

        {/* Switch button for lime */}
        <Stack direction="row" spacing={1} sx={{ w: '100%', mb: 1, alignItems: 'center', justifyContent: "center"}}>
          <Typography>ALL Keywords</Typography>
          <Switch onChange={(e) => {
            setUseLimeKeyword(e.target.checked);
            if (e.target.checked) {
              setOrderBy('coefficient');
              // Cancel adding the keyword
              registerManualKeyword(true);
            } else {
              setOrderBy('score');
            }
          }} name="jason" />
          <Typography>Concept LIME</Typography>
        </Stack>

        {/* Table body */}
        <Paper sx={{ my: 1, }}>
          {
            !useLimeKeyword ? (
              // All keywords
              <Table aria-label="customized table">
                {/* Fixed Header */}
                <TableHead sx={{ position: "sticky", top: 0, backgroundColor: "#A8A8A8", zIndex: 2 }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>
                      <Button>
                        {
                          <Tooltip title={'Add Keyword'}>
                            <AddCircleOutlineIcon onClick={() => registerManualKeyword(false, 'Manual')}/>
                          </Tooltip>
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
                        CLIP Score
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
                
                {/* Table body */}
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
                      {/* Keyword */}
                      <TableCell component="th" scope="row" sx={{padding: '10px 0px 10px 10px'}}>
                      <Stack direction='row' alignItems='center'>
                        { equalKeywords(data?.keyword, hoveredData?.keyword) && 
                          <Stack direction='column'>
                            <AddBoxIcon 
                              sx={{position: 'relative', ml: -3}}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                registerManualKeyword(
                                  false,
                                  'Adding',
                                  onAddingImageToKeyword(index),
                                )
                              }}
                            />
                            <IndeterminateCheckBoxIcon 
                              sx={{position: 'relative', ml: -3}}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                registerManualKeyword(
                                  false,
                                  'Deleting',
                                  onDeletingImageToKeyword(index),
                                )
                              }}
                            />
                          </Stack>
                        }
                        <Stack direction='column'>
                          {data.keyword.map((k, index2) => (
                                <Stack direction='row' sx={{alignItems: 'center', justifyContent: 'space-between'}}>
                                  <TextField
                                    key={index2}
                                    variant="standard"
                                    value={k}
                                    onChange={(e) => onKeywordChange(e, index, index2)}
                                    onClick={(e) => e.stopPropagation()}
                                    sx={{ width: "100%" }}
                                  />
                                  {
                                    (index2 > 0) && <LinkOffIcon
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        onDecoupling(data, index2, index);
                                      }}
                                      sx={{fontSize: '15px', cursor: 'pointer'}}
                                    />
                                  }
                                </Stack>
                            ))
                          }
                        </Stack>
                      </Stack>
                      </TableCell>
                      {/* Score */}
                      <TableCell sx={{ backgroundColor: scoreColor(weightedSumScore(data)) }} align="right">
                        <Typography>{weightedSumScore(data).toFixed(2)}</Typography>
                      </TableCell>
                      {/* Accuracy */}
                      <TableCell sx={{ backgroundColor: accuracyColor(calculateAccuracy(data)) }} align="right">
                        <Typography>{calculateAccuracy(data).toFixed(2)}</Typography>
                      </TableCell>
                      {/* Compactness */}
                      <TableCell sx={{ backgroundColor: centroidColor(distanceFromCentroid(data.images.flat()).average) }} align="right">
                        <Typography>{distanceFromCentroid(data.images.flat()).average.toFixed(2)}</Typography>
                      </TableCell>
                    </TableRow>
                  })}
                </TableBody>
              </Table>
            ) : (
              // LIME keywords
              <>
                <Table aria-label="customized table">
                  {/* Fixed Header */}
                  <TableHead sx={{ position: "sticky", top: 0, backgroundColor: "#A8A8A8", zIndex: 2 }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>
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
                          active={orderBy === 'coefficient'}
                          direction={orderBy === 'coefficient' ? order : 'asc'}
                          onClick={() => handleSortRequest('coefficient')}
                        >
                          Coefficient
                        </TableSortLabel>
                      </TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }} align="right">
                        <TableSortLabel
                          active={orderBy === 'score'}
                          direction={orderBy === 'score' ? order : 'asc'}
                          onClick={() => handleSortRequest('score')}
                        >
                          CLIP Score
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
                  
                  {/* Table body */}
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
                        {/* Keyword */}
                        <TableCell component="th" scope="row">
                          {data.keyword.map((k, index2) => (
                            <Stack direction='row' sx={{alignItems: 'center', justifyContent: 'space-between'}}>
                              <TextField
                                key={index2}
                                variant="standard"
                                value={k}
                                onChange={(e) => onKeywordChange(e, index, index2)}
                                onClick={(e) => e.stopPropagation()}
                                sx={{ width: "100%" }}
                              />
                              {
                                (index2 > 0) && <LinkOffIcon
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onDecoupling(data, index2, index);
                                  }}
                                  sx={{fontSize: '15px', cursor: 'pointer'}}
                                />
                              }
                            </Stack>
                          ))}
                        </TableCell>
                        {/* Coefficient */}
                        <TableCell sx={{ backgroundColor: centroidColor(distanceFromCentroid(data.images.flat()).average) }} align="right">
                          <Typography>{avgLimeCoefficient(data).toFixed(2)}</Typography>
                        </TableCell>
                        {/* CLIP Score */}
                        <TableCell sx={{ backgroundColor: scoreColor(weightedSumScore(data)) }} align="right">
                          <Typography>{weightedSumScore(data).toFixed(2)}</Typography>
                        </TableCell>
                        {/* Accuracy */}
                        <TableCell sx={{ backgroundColor: accuracyColor(calculateAccuracy(data)) }} align="right">
                          <Typography>{calculateAccuracy(data).toFixed(2)}</Typography>
                        </TableCell>
                        {/* Compactness */}
                        <TableCell sx={{ backgroundColor: centroidColor(distanceFromCentroid(data.images.flat()).average) }} align="right">
                          <Typography>{distanceFromCentroid(data.images.flat()).average.toFixed(2)}</Typography>
                        </TableCell>
                      </TableRow>
                    })}
                  </TableBody>
                </Table>
                <RevertedImage
                  label={label}
                  selectedRevertedImgInfo={selectedRevertedImgInfo}
                  limeKeywords={fixedLimeKeyword}
                />
              </>
            )
          }
        </Paper>
      </Paper>
    </Grid >
  );
};

export default Keywords;
