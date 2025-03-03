import React, { useRef, useEffect, useState, useMemo, useCallback } from "react";
import { Box, Grid, Paper, Typography, CircularProgress, IconButton, Divider } from '@mui/material';
import _, { range, set } from 'lodash';
import * as d3 from "d3";
import { PieChart, Pie, Tooltip, Cell } from "recharts";
import textures from 'textures';

const scoreColor = d3.scaleDiverging([2, 0, -2], d3.interpolateRdBu);
const red = scoreColor(1);
const blue = scoreColor(-1);

// Highlighting helper (unchanged)
const highlightKeywords = (text, clickedKeywords, generalKeywords) => {
  if (!clickedKeywords || clickedKeywords?.length === 0) {
    const colormap = {};
    generalKeywords?.forEach(({ keyword, score }) => {
      const color = _.mean(score) > 0 ? red : blue;
      keyword.forEach(k => {
        colormap[k] = color;
      });
    });
    const regexPattern = Object.keys(colormap)
      .map(word => _.escapeRegExp(word))
      .join("|");
    const regex = new RegExp(`(${regexPattern})`, "gi");
    return text.split(regex).map((part, index) =>
      colormap[part.toLowerCase()] ? (
        <span
          key={index}
          style={{
            color: colormap[part.toLowerCase()],
            fontWeight: "bold",
          }}
        >
          {part}
        </span>
      ) : (
        part
      )
    );
  } else {
    const regexPattern = clickedKeywords
      .map(k => k.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&"))
      .join("|");
    const regex = new RegExp(`(${regexPattern})`, "gi");
    return text.split(regex).map((part, index) =>
      regex.test(part) ? (
        <span style={{ color: "red", fontWeight: "bold" }} key={index}>
          {part}
        </span>
      ) : (
        part
      )
    );
  }
};

const Images = ({
  prediction,
  hoveredImages,
  clickedImage,
  setClickedImage,
  clickedObj,
  coordinates,
  selectedImages,
  setSelectedImages,
  keywordMode,
  setPopover,
  keywords,
}) => {
  // Use an SVG ref instead of a canvas ref
  const svgRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 2000, height: 2000 });
  const [viewToggle, setViewToggle] = useState("prediction"); // "image" or "prediction"
  const [allImagesLoaded, setAllImagesLoaded] = useState(false);
  const [quantiles, setQuantiles] = useState(null);
  const [pattern, setPattern] = useState("#C9C9C9");


  const toggle = () => {
    setViewToggle(prev => (prev === "prediction" ? "image" : "prediction"));
  };

  const totalCorrect = prediction?.reduce((acc, curr) => acc + curr.correct, 0);
  const totalWrong = prediction.length - totalCorrect;

  // Update dimensions (similar to resizing canvas)
  useEffect(() => {
    function updateSize() {
      if (svgRef.current) {
        const { width, height } = svgRef.current.getBoundingClientRect();
        setDimensions({ width, height });
      }
    }
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Preload images (to mimic the original loading state)
  useEffect(() => {
    let loadedCount = 0;
    prediction.forEach(d => {
      const img = new Image();
      img.src = `/${d.image}`;
      img.onload = () => {
        loadedCount += 1;
        if (loadedCount === prediction.length) {
          setAllImagesLoaded(true);
        }
      };
    });
  }, [prediction]);

  // Helper to build shape edges for quantile paths (unchanged)
  const getPaths = useCallback(points => {
    const squares = {};
    points.forEach(p => {
      const p1 = `${p[0]},${p[1]},${p[0] + 1},${p[1]}`;
      const p2 = `${p[0]},${p[1]},${p[0]},${p[1] + 1}`;
      const p3 = `${p[0] + 1},${p[1]},${p[0] + 1},${p[1] + 1}`;
      const p4 = `${p[0]},${p[1] + 1},${p[0] + 1},${p[1] + 1}`;
      if (!squares[p1]) squares[p1] = 0;
      if (!squares[p2]) squares[p2] = 0;
      if (!squares[p3]) squares[p3] = 0;
      if (!squares[p4]) squares[p4] = 0;
      squares[p1] += 1;
      squares[p2] += 1;
      squares[p3] += 1;
      squares[p4] += 1;
    });
    const finalPaths = [];
    Object.entries(squares).forEach(([key, value]) => {
      if (value === 1) {
        const [x1, y1, x2, y2] = key.split(",").map(p => parseInt(p, 10));
        finalPaths.push([[x1, y1], [x2, y2]]);
      }
    });
    return finalPaths;
  }, []);

  // Compute quantile groups (unchanged)
  const calculateDistanceGroup = useCallback(
    (clicked, rawPoints, tsnePoints, gridPoints, scaler) => {
      const clickedPoints = tsnePoints.filter((_, i) => clicked[i]);
      if (clickedPoints.length === 0) {
        setQuantiles(null);
        return;
      }
      const centroid = Array.from({ length: 2 }, (_, i) =>
        clickedPoints.reduce((acc, p) => acc + p[i], 0) / clickedPoints.length
      );
      const distanceFromCentroid = tsnePoints.map(p =>
        Math.sqrt(p.reduce((acc, val, i) => acc + (val - centroid[i]) ** 2, 0))
      );
      const quantileLevels = [0.1, 0.3, 0.5, 0.7, 0.9];
      const q = [];
      const clickedGridPoints = gridPoints.filter((_, i) => clicked[i]);
      q.push({
        level: "clicked",
        paths: getPaths(clickedGridPoints).map(([p1, p2]) => [
          scaler(p1[0]),
          scaler(p1[1]),
          scaler(p2[0]),
          scaler(p2[1]),
        ]),
      });
      const computedQ = quantileLevels.map(level => ({
        level,
        value: d3.quantile(distanceFromCentroid, level),
      }));
      computedQ.forEach(({ level, value }) => {
        const inRangePoints = gridPoints.filter((_, i) => distanceFromCentroid[i] < value);
        q.push({
          level,
          paths: getPaths(inRangePoints).map(([p1, p2]) => [
            scaler(p1[0]),
            scaler(p1[1]),
            scaler(p2[0]),
            scaler(p2[1]),
          ]),
        });
      });
      setQuantiles(q);
    },
    [getPaths]
  );

  // Prepare full data (unchanged)
  const fullData = useMemo(() => {
    let data = prediction.map((pred, idx) => ({
      ...pred,
      opacity: hoveredImages ? (hoveredImages.includes(pred.image) ? 1 : 0) : 1,
    }));
    if (clickedObj.keyword) {
      const imagesSelected = clickedObj.images.flat();
      data = data.filter(pred => imagesSelected.includes(pred.image));
    }
    return data;
  }, [prediction, hoveredImages, clickedObj]);

  // Build lookup for quick mouse detection (unchanged)
  const gridDict = useMemo(() => {
    const dict = {};
    fullData.forEach(d => {
      const [gx, gy] = coordinates[d.image].grid;
      dict[`${gx},${gy}`] = d;
    });
    return dict;
  }, [fullData, coordinates]);

  // Compute scale and image size – note we now use the svg dimensions
  const { scale, imageSize } = useMemo(() => {
    if (!coordinates) {
      return {
        scale: d3.scaleLinear().range([0, 0]),
        imageSize: 0,
      };
    }
    const xvals = Object.keys(coordinates).map(img => coordinates[img].grid[0]);
    const yvals = Object.keys(coordinates).map(img => coordinates[img].grid[1]);
    const xRange = d3.max(xvals) - d3.min(xvals);
    const yRange = d3.max(yvals) - d3.min(yvals);
    let s, imgSize;
    if (dimensions.width < dimensions.height) {
      s = d3.scaleLinear().domain([d3.min(xvals), d3.max(xvals)]).range([0, dimensions.width]);
      imgSize = 1 * (dimensions.width / xRange);
    } else {
      s = d3.scaleLinear().domain([d3.min(yvals), d3.max(yvals)]).range([0, dimensions.height]);
      imgSize = 1 * (dimensions.height / yRange);
    }
    return { scale: s, imageSize: imgSize };
  }, [coordinates, dimensions]);

  // These helpers remain the same
  const calculateOpacity = useCallback(
    (data, type) => {
      if (type === "image") {
        if (!allImagesLoaded) return 0;
        if (clickedImage) return clickedImage.image === data.image ? 1 : 0.1;
        return data.opacity;
      } else if (type === "rect") {
        if (viewToggle === "image") return data.opacity;
        if (keywordMode === "Manual") return 1;
        if (clickedImage) return clickedImage.image === data.image ? 1 : 0.1;
        if (!allImagesLoaded) return 0;
        return data.opacity;
      }
      return 0;
    },
    [allImagesLoaded, viewToggle, keywordMode, clickedImage]
  );

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    const texture = textures
      .lines()
      .size(4)
      .strokeWidth(1)
      .background("#C9C9C9");

    svg.call(texture);
    setPattern(texture.url());
  }, [])

  const calculateColor = useCallback(
    (data, isClicked) => {
      if (keywordMode) return isClicked ? "#CF5972" : "none";
      return data.correct ? "#C9C9C9" : pattern;
    },
    [keywordMode, pattern]
  );

  // ─── D3 DRAWING (replacing the canvas drawing) ───────────────────────────
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);

    // Ensure a group exists for all drawn elements and zoom transformations
    let zoomGroup = svg.select("g.zoom-group");
    if (zoomGroup.empty()) {
      zoomGroup = svg.append("g").attr("class", "zoom-group");
    }

    // Data–join for each image group (which will contain the image and overlay rect)
    const groups = zoomGroup.selectAll("g.image-group")
      .data(fullData, d => d.image);

    groups.exit().remove();

    const groupsEnter = groups.enter().append("g")
      .attr("class", "image-group");

    // Merge and update transform for all groups
    groupsEnter.merge(groups)
      .attr("transform", d => {
        const [gx, gy] = coordinates[d.image].grid;
        return `translate(${scale(gx)}, ${scale(gy)})`;
      });

    // Append an <image> element for each datum
    groupsEnter.append("image")
      .attr("xlink:href", d => `/${d.image}`)
      .attr("width", imageSize)
      .attr("height", imageSize)
      .style("opacity", d => calculateOpacity(d, "image"));
    groups.select("image")
      .attr("xlink:href", d => `/${d.image}`)
      .attr("width", imageSize)
      .attr("height", imageSize)
      .style("opacity", d => calculateOpacity(d, "image"));

    // If not in keyword mode, add/update an overlay rectangle
    if (!keywordMode) {
      const rects = groups.selectAll("rect.overlay").data(d => [d]);
      rects.enter().append("rect")
        .attr("class", "overlay")
        .attr("width", imageSize)
        .attr("height", imageSize)
        .merge(rects)
        .attr("x", d => viewToggle === "image" ? 1.5 : 0)
        .attr("y", d => viewToggle === "image" ? 1.5 : 0)
        .attr("width", d => viewToggle === "image" ? imageSize - 3 : imageSize)
        .attr("height", d => viewToggle === "image" ? imageSize - 3 : imageSize)
        .style("fill", d => viewToggle === "prediction" ? calculateColor(d, selectedImages[d.image] ? true : false) : "none")
        .style("stroke", d => viewToggle === "prediction" ? "black" : calculateColor(d, selectedImages[d.image] ? true : false))
        .style("stroke-width", d => viewToggle === "prediction" ? 1 : 3)
        .style("opacity", d => calculateOpacity(d, "rect"))
        .style("cursor", "pointer");
      rects.exit().remove();
    } else {
      zoomGroup.selectAll("rect.overlay").remove();
    }

    // If in keyword mode and quantiles exist, draw quantile lines.
    if (keywordMode && quantiles) {
      const colors = ["#8F003B", "#C40F58", "#E32977", "#E95694", "#ED8580", "#F2ACCA", "#F9D8E6"];
      // Flatten the quantile groups into a list of line segments.
      const quantileLines = quantiles.flatMap((q, i) =>
        q.paths.map(path => ({ coords: path, color: colors[i] }))
      );
      const lines = zoomGroup.selectAll("line.quantile-line")
        .data(quantileLines);
      lines.enter().append("line")
        .attr("class", "quantile-line")
        .merge(lines)
        .attr("x1", d => d.coords[0])
        .attr("y1", d => d.coords[1])
        .attr("x2", d => d.coords[2])
        .attr("y2", d => d.coords[3])
        .style("stroke", d => d.color)
        .style("stroke-width", 3)
        .style("opacity", 1);
      lines.exit().remove();
    } else {
      zoomGroup.selectAll("line.quantile-line").remove();
    }
  }, [fullData, coordinates, scale, imageSize, keywordMode, viewToggle, quantiles, selectedImages, calculateOpacity, calculateColor]);

  // ─── D3 ZOOM BEHAVIOR ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const zoomGroup = svg.select("g.zoom-group");
    const zoomBehavior = d3.zoom()
      .scaleExtent([0.8, 8])
      .filter((event) => {
        // Prevent zooming on double-click while allowing scroll zoom
        return !event.ctrlKey && event.type !== "dblclick";
      })
      .on("zoom", (event) => {
        zoomGroup.attr("transform", event.transform);
      });
    svg.call(zoomBehavior);
    return () => {
      svg.on(".zoom", null);
    };
  }, []);

  // ─── MOUSE EVENTS (using d3.pointer and the zoom transform) ───────────────
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const mousemoveFn = (event) => {
      if (clickedImage) return;
      const [mouseX, mouseY] = d3.pointer(event);
      const transform = d3.zoomTransform(svg.node());
      const xData = scale.invert((mouseX - transform.x) / transform.k);
      const yData = scale.invert((mouseY - transform.y) / transform.k);
      const xIndex = Math.floor(xData);
      const yIndex = Math.floor(yData);
      const d = gridDict[`${xIndex},${yIndex}`];
      if (!d) return;
      setPopover({
        image: `/${d.image}`,
        caption: highlightKeywords(d.caption, clickedObj.keyword, keywords),
      });
    };
    svg.on("mousemove", mousemoveFn);

    const clickFn = (event) => {
      const [mouseX, mouseY] = d3.pointer(event);
      const transform = d3.zoomTransform(svg.node());
      const xData = scale.invert((mouseX - transform.x) / transform.k);
      const yData = scale.invert((mouseY - transform.y) / transform.k);
      const xIndex = Math.floor(xData);
      const yIndex = Math.floor(yData);
      const d = gridDict[`${xIndex},${yIndex}`];
      if (!d) return;
      if (keywordMode) {
        let newSelectedImages;
        if (selectedImages[d.image]) {
          const { [d.image]: _, ...rest } = selectedImages;
          newSelectedImages = { ...rest };
        } else {
          newSelectedImages = { ...selectedImages, [d.image]: true };
        }
        setSelectedImages(newSelectedImages);
        const rawEmbeddings = fullData.map(img => coordinates[img.image].original.map(coord => parseFloat(coord)));
        const tsneEmbeddings = fullData.map(img => coordinates[img.image].tsne.map(coord => parseFloat(coord)));
        const gridEmbeddings = fullData.map(img => {
          const [gx, gy] = coordinates[img.image].grid;
          return [parseInt(gx, 10), parseInt(gy, 10)];
        });
        const newClicked = fullData.map(fd => newSelectedImages[fd.image]);
        calculateDistanceGroup(newClicked, rawEmbeddings, tsneEmbeddings, gridEmbeddings, scale);
      } else {
        if (clickedImage && (clickedImage.image === d.image)) {
          setClickedImage(null);
        } else {
          setClickedImage(d);
          setPopover({
            image: `/${d.image}`,
            caption: highlightKeywords(d.caption, clickedObj.keyword, keywords),
          });
        }
      }
    };
    svg.on("click", clickFn);
    return () => {
      svg.on("mousemove", null).on("click", null);
    };
  }, [scale, gridDict, clickedObj, setPopover, keywordMode, coordinates, selectedImages, fullData, calculateDistanceGroup, highlightKeywords, keywords, clickedImage]);

  return (
    <Grid item lg={6}>
      {!allImagesLoaded && (
        <div
          style={{
            position: "relative",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            zIndex: 1000
          }}
        >
          <CircularProgress />
        </div>
      )}
      <Paper
        sx={{
          p: 2,
          display: "relative",
          height: "85vh",
          overflow: "hidden",
          borderRadius: "12px"
        }}
      >
        <Box
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            width: "100%",
            height: "40px",
            borderBottom: "2px solid #ddd"
          }}
        >
          <IconButton
            onClick={toggle}
            sx={{
              position: "absolute",
              left: "10px",
              padding: "8px 12px",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer"
            }}
          >
            {viewToggle === "prediction" ? (
              <img src="/fill.png" alt="icon" width="24" height="24" />
            ) : (
              <img src="/border.png" alt="icon" width="24" height="24" />
            )}
          </IconButton>
          <Typography variant="h6">Explore Panel</Typography>
          <PieChart style={{ marginLeft: 10 }} width={40} height={40}>
            <Pie
              data={[
                {
                  name: `Correct (${parseInt((totalCorrect / (totalCorrect + totalWrong)) * 100)}%)`,
                  value: totalCorrect,
                  color: "#C9C9C9"
                },
                {
                  name: `Wrong (${parseInt((totalWrong / (totalCorrect + totalWrong)) * 100)}%)`,
                  value: totalWrong,
                  color: pattern
                }
              ]}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={15}
              stroke="black" // Adds black border
              strokeWidth={1}
            >
              <Cell key="cell0" fill="#C9C9C9" />
              <Cell key="cell1" fill={pattern} />
            </Pie>
            <Tooltip />
          </PieChart>
        </Box>
        <Divider />
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          style={{
            width: "100%",
            height: "100%",
            display: "block"  // Prevent extra margins
          }}
        />
      </Paper>
    </Grid>
  );
};

export default Images;