import React from 'react';
import { useState, useEffect, useRef } from 'react';
import { Box, Grid, Paper, ToggleButtonGroup, Typography, ToggleButton, CircularProgress, Slider } from '@mui/material';
import _, { set } from 'lodash';
import * as d3 from "d3"

const highlightKeywords = (text, keywords) => {
  if (!keywords) return text;
  // Escape special characters and join keywords into a regex pattern
  const regexPattern = keywords.map(keyword => keyword.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|');
  const regex = new RegExp(`(${regexPattern})`, 'gi');

  // Split the text into parts and map through them, applying bold style to keywords
  return text.split(regex).map((part, index) =>
    regex.test(part) ? <span style={{ color: "red", fontWeight: "bold" }} key={index}>{part}</span> : part
  );
};

const Images = ({ prediction, opacity, clickedObj, coordinates, show, selectedImages, setSelectedImages, keywordMode, ensembleInfo, setPopover }) => {
  const glyphSize = 1
  const canvasRef = useRef(null);
  const imagesRef = useRef({});
  const eventRef = useRef({});
  const [dimensions, setDimensions] = useState({ width: 2000, height: 2000 });
  // const [popover, setPopover] = useState(null);
  const [viewToggle, setViewToggle] = useState("prediction"); // image, prediction
  const [allImagesLoaded, setAllImagesLoaded] = useState(false);
  const [slider, setSlider] = useState(0.5);
  const [quantiles, setQuantiles] = useState(null)


  useEffect(() => {
    function updateSize() {
      if (canvasRef.current) {
        const { width, height } = canvasRef.current.getBoundingClientRect();
        canvasRef.current.width = width;
        canvasRef.current.height = height;
        setDimensions({ width, height });
      }
    }
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const getPaths = function (points) {
    const squares = {}
    points.forEach((p, i) => {
      const p1 = `${p[0]},${p[1]},${p[0] + 1},${p[1]}`;
      const p2 = `${p[0]},${p[1]},${p[0]},${p[1] + 1}`;
      const p3 = `${p[0] + 1},${p[1]},${p[0] + 1},${p[1] + 1}`;
      const p4 = `${p[0]},${p[1] + 1},${p[0] + 1},${p[1] + 1}`;
      if (!squares[p1]) squares[p1] = 0;
      if (!squares[p2]) squares[p2] = 0;
      if (!squares[p3]) squares[p3] = 0;
      if (!squares[p4]) squares[p4] = 0;
      squares[p1] = squares[p1] + 1;
      squares[p2] = squares[p2] + 1;
      squares[p3] = squares[p3] + 1;
      squares[p4] = squares[p4] + 1;

    })
    // const uniquePoints = Array.from(new Set(augmented.map(point => JSON.stringify(point)))).map(str => JSON.parse(str));
    const finalPaths = []
    Object.entries(squares).forEach(([key, value]) => {
      if (value == 1) {
        const [x1, y1, x2, y2] = key.split(",").map(p => parseInt(p));
        finalPaths.push([[x1, y1], [x2, y2]])
      }
    })
    return finalPaths
  }

  const calculateDistanceGroup = function (clicked, rawPoints, tsnePoints, gridPoints, scaler) {

    const clickedPoints = tsnePoints.filter((p, i) => clicked[i])
    const centroid = Array.from({ length: 2 }, (_, i) =>
      clickedPoints.reduce((acc, p) => acc + p[i], 0) / clickedPoints.length
    );
    const distanceFromCentroid = tsnePoints.map(p => Math.sqrt(p.reduce((acc, val, i) => acc + (val - centroid[i]) ** 2, 0)));

    const numDimensions = rawPoints[0].length; // Assuming all points have the same number of dimensions
    const rawClickedPoints = rawPoints.filter((p, i) => clicked[i]);
    const rawCentroid = Array.from({ length: numDimensions }, (_, i) =>
      rawClickedPoints.reduce((acc, p) => acc + p[i], 0) / rawClickedPoints.length
    );
    const rawDistanceFromCentroid = rawPoints.map(p =>
      Math.sqrt(p.reduce((acc, val, i) => acc + (val - rawCentroid[i]) ** 2, 0))
    );

    const top = [...rawDistanceFromCentroid].sort((a, b) => a - b)[clickedPoints.length + 3];

    const q1 = d3.quantile(distanceFromCentroid, 0.1)
    const q2 = d3.quantile(distanceFromCentroid, 0.3)
    const q3 = d3.quantile(distanceFromCentroid, 0.5)

    const q = {}
    const topPoints = gridPoints.filter((p, i) => rawDistanceFromCentroid[i] < top);
    q.top = getPaths(topPoints).map(([p1, p2]) => {
      return [scaler(p1[0]), scaler(p1[1]), scaler(p2[0]), scaler(p2[1])]
      // return `M ${x0},${y0} L ${x1},${y1}`
    })

    const q1Points = gridPoints.filter((p, i) => distanceFromCentroid[i] < q1);
    q.q1 = getPaths(q1Points).map(([p1, p2]) => {
      return [scaler(p1[0]), scaler(p1[1]), scaler(p2[0]), scaler(p2[1])]
      // return `M ${x0},${y0} L ${x1},${y1}`
    })

    const q2Points = gridPoints.filter((p, i) => distanceFromCentroid[i] < q2)
    q.q2 = getPaths(q2Points).map(([p1, p2]) => {
      return [scaler(p1[0]), scaler(p1[1]), scaler(p2[0]), scaler(p2[1])]
      // return `M ${x0},${y0} L ${x1},${y1}`
    })

    const q3Points = gridPoints.filter((p, i) => distanceFromCentroid[i] < q3)
    q.q3 = getPaths(q3Points).map(([p1, p2]) => {
      return [scaler(p1[0]), scaler(p1[1]), scaler(p2[0]), scaler(p2[1])]
      // return `M ${x0},${y0} L ${x1},${y1}`
    })

    setQuantiles(q)
  }

  useEffect(() => {
    let loadedCount = 0;
    prediction.forEach((d) => {
      const img = new Image();
      img.src = `/${d.image}`;
      img.onload = () => {
        imagesRef.current[d.image] = img; // Cache the loaded image
        loadedCount += 1;
        if (loadedCount === prediction.length) {
          setAllImagesLoaded(true); // All images are loaded
        }
      };
    });
  }, [prediction]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const d3Canvas = d3.select(canvas);

    let fullData = prediction.map((pred, index) => ({ ...pred, opacity: opacity[index] }));

    if (clickedObj.keyword) {
      const imagesSelected = clickedObj.images.flat()
      fullData = fullData.filter(pred => imagesSelected.includes(pred.image));
    }
    const gridDict = {}
    fullData.forEach((d, i) => {
      const x = coordinates[d.image].grid[0];
      const y = coordinates[d.image].grid[1];
      gridDict[`${x},${y}`] = d;
    })

    const xval = Object.keys(coordinates).map((img) => coordinates[img].grid[0]);
    const yval = Object.keys(coordinates).map((img) => coordinates[img].grid[1]);
    let scale, imageSize;
    if (d3.max(xval) - d3.min(xval) < d3.max(yval) - d3.min(yval)) {
      scale = d3.scaleLinear()
        .domain([d3.min(yval), d3.max(yval)])
        .range([0, canvas.width]);
      imageSize = glyphSize * (canvas.width / (d3.max(yval) - d3.min(yval)));
    } else {
      scale = d3.scaleLinear()
        .domain([d3.min(xval), d3.max(xval)])
        .range([0, canvas.height]);
      imageSize = glyphSize * (canvas.height / (d3.max(xval) - d3.min(xval)));
    }

    const calculateOpacity = function (data, type) {
      if (type == "image") {
        if (keywordMode == "Ensemble") return slider * (ensembleInfo.clipSimilarities[data.image]) + (1 - slider) * (ensembleInfo.captionSimilarities[data.image])
        if (allImagesLoaded) return data.opacity
      } else if (type == "rect") {
        if (viewToggle == 'image') return 0;
        if (keywordMode == "Ensemble") return 1;
        if (keywordMode == "Manual") return 1;
        if (allImagesLoaded) return data.opacity * 0.4

      }
      return 0
    }

    const calculateColor = function (data, clicked) {
      if (keywordMode) {
        if (clicked) return "red"
        return "none"
      }
      if (data.correct) return "blue"
      return "red"
    }

    const clicked = fullData.map(d => selectedImages[d.image] || false);


    function reDraw(ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      fullData.forEach((d, i) => {
        const x = scale(coordinates[d.image].grid[0]);
        const y = scale(coordinates[d.image].grid[1]);
        ctx.globalAlpha = calculateOpacity(d, "image");
        const img = imagesRef.current[d.image];
        if (img) {
          ctx.drawImage(img, x, y, imageSize, imageSize);
        }

        if (keywordMode) {
          ctx.strokeStyle = "black"
          ctx.lineWidth = 1; // Set the border width. Adjust as needed.
          ctx.strokeRect(x, y, imageSize, imageSize);
        }
        ctx.globalAlpha = calculateOpacity(d, "rect");
        if (!keywordMode || clicked[i]) {
          ctx.fillStyle = calculateColor(d, clicked[i]);
          ctx.fillRect(x, y, imageSize, imageSize);
        }
      });

      if (keywordMode && quantiles) {
        // Function to draw lines for quantiles
        const drawQuantileLines = (quantileData, strokeStyle, lineWidth) => {
          ctx.beginPath();
          quantileData.forEach(([x1, y1, x2, y2]) => {
            // Assuming d is a line represented by start and end points {x1, y1, x2, y2}
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
          });
          ctx.strokeStyle = strokeStyle;
          ctx.lineWidth = lineWidth;
          ctx.globalAlpha = 0.7; // Set opacity
          ctx.stroke();
        };

        // Draw each quantile
        drawQuantileLines(quantiles.top, "red", 5);
        drawQuantileLines(quantiles.q1, "orange", 5);
        drawQuantileLines(quantiles.q2, "yellow", 5);
        drawQuantileLines(quantiles.q3, "white", 5);
      }
    }
    const ctx = canvas.getContext('2d');

    canvas.removeEventListener('mousemove', eventRef["mousemove"]);
    eventRef["mousemove"] = function (e) {
      function handler(e) {
        console.log("mouse move")
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const x = scale.invert(mouseX);
        const y = scale.invert(mouseY);
        const xIndex = Math.floor(x);
        const yIndex = Math.floor(y);
        const d = gridDict[`${xIndex},${yIndex}`];

        if (!d) return;
        if (e.shiftKey) {
          if (keywordMode) {
            if (!selectedImages[d.image]) {
              setSelectedImages({ ...selectedImages, [d.image]: true });
            }
          }
        } else {
          setPopover({ image: `/${d.image}`, caption: highlightKeywords(d.caption, clickedObj.keyword) });
        }
      }
      _.debounce(handler, 300)(e)
    };

    
    canvas.addEventListener('mousemove', eventRef["mousemove"]);
    canvas.removeEventListener('click', eventRef["click"]);
    eventRef["click"] = function clickMouse(e) {
      console.log("mouse click")
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const x = scale.invert(mouseX);
      const y = scale.invert(mouseY);
      const xIndex = Math.floor(x);
      const yIndex = Math.floor(y);

      const d = gridDict[`${xIndex},${yIndex}`];

      if (!d) return;
      if (keywordMode) {
        let newSelectedImages;
        if (selectedImages[d.image]) {
          const { [d.image]: _, ...rest } = selectedImages;
          newSelectedImages = { ...rest };
        } else {
          newSelectedImages = {...selectedImages, [d.image]: true};
        }
        setSelectedImages(newSelectedImages);
        const rawEmbeddings = fullData
          .map(img => coordinates[img.image].original)
          .map(coords => coords.map(coord => parseFloat(coord)));
        const tsneEmbeddings = fullData
          .map(img => coordinates[img.image].tsne)
          .map(coords => coords.map(coord => parseFloat(coord)));
        const gridEmbeddings = fullData
          .map(img => coordinates[img.image].grid)
          .map(([x, y]) => [parseInt(x), parseInt(y)]);
        const newClicked = fullData.map(d => newSelectedImages[d.image]);
        calculateDistanceGroup(newClicked, rawEmbeddings, tsneEmbeddings, gridEmbeddings, scale)
      }
    }

    canvas.addEventListener('click', eventRef["click"]);

    if (!keywordMode) {
      const zoom = d3.zoom()
        .scaleExtent([1, 10]) // Example scale extent
        .on("zoom", (event) => {
          ctx.save();
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.translate(event.transform.x, event.transform.y);
          ctx.scale(event.transform.k, event.transform.k);

          reDraw(ctx); // You need to define this function to redraw the content
          ctx.restore();
        });

      d3Canvas.call(zoom);
    }


    reDraw(ctx)

  }, [dimensions, coordinates, prediction, opacity, clickedObj, show, viewToggle, selectedImages, keywordMode, allImagesLoaded, ensembleInfo, slider, quantiles]);

  if (!show) {
    return null;
  }
  return (
    <Grid item lg={6}>
      {!allImagesLoaded &&
        <div style={{
          position: 'relative', // Use fixed to cover the entire screen
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 1000, // Ensure it sits above other content (adjust as necessary)
        }}>
          <CircularProgress />
        </div>}
      <Paper
        sx={{
          p: 2,
          display: "relative",
          height: '80vh', // Example max height
          overflow: 'hidden', // Enables vertical scrolling
        }}
      >
        <ToggleButtonGroup
          color="primary"
          value={viewToggle}
          exclusive
          onChange={e => setViewToggle(e.target.value)}
          aria-label="Platform"
          size="small"
          sx={{ mb: 1 }}
        >
          <ToggleButton value="prediction">Prediction</ToggleButton>
          <ToggleButton value="image">Image</ToggleButton>
        </ToggleButtonGroup>
        {keywordMode == "Ensemble" && <Slider
          step={0.01}
          value={slider}
          valueLabelDisplay="auto"
          min={0}
          max={1}
          onChange={(e, val) => setSlider(val)}
        />}
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }}></canvas>

        {/* <svg width="100%" height="100%" ref={canvasRef}>
          <g className='container'></g>
          <g className="q3"></g>
          <g className="q2"></g>
          <g className="q1"></g>
          <g className="top"></g>
        </svg> */}

      </Paper>
    </Grid>
  );
};

export default Images;

