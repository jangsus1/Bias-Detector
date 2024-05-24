import React, {useState} from 'react';
import { Box, Stack, Button, IconButton, Paper, TextField, Grid, Typography, Popover} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import _ from 'lodash';
import { GraphCanvas, lightTheme } from 'reagraph';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
ChartJS.register(ArcElement, Tooltip, Legend);

const calculatePieData = (nodes, totalImageCounts) => {
    if (!nodes) return {};
    const remainingImages = totalImageCounts - _.sumBy(nodes, 'data');

    const pieData = {
      labels: ["Others", ...nodes.map(node => node.id)],
      datasets: [{
        label: 'Images',
        data: [remainingImages, ...nodes.map(node => node.data)],
        backgroundColor: [
          'rgb(255, 99, 132)',
          'rgb(54, 162, 235)',
          'rgb(255, 205, 86)',
          'rgb(75, 192, 192)',
          'rgb(153, 102, 255)',
        ],
        hoverOffset: 4
      }]
    };
    return pieData;
}

const Rule = ({ rule, ruleIndex, totalImageCounts, changeBiasName, addKeywordToRule, removeKeywordFromRule, removeRule, draggedKeywordObj, registerComplete }) => {

    
    const [hoveredItem, setHoveredItem] = useState(null);

    // Function to close any open popover
    const onPopoverClick = (itemIndex) => (event) => {
        if (hoveredItem && hoveredItem.index === itemIndex) {
            setHoveredItem(null);
        } else {
            setHoveredItem({ anchorEl: event.currentTarget, index: itemIndex });
        }
    };


    const open = hoveredItem !== null;

    const onDrop = (e) => {
        e.preventDefault();
        if (!draggedKeywordObj) return;
        addKeywordToRule(ruleIndex, draggedKeywordObj.data);
        registerComplete(draggedKeywordObj);
    }

    const allImages = rule.keywords.map((k) => k.images.flat()).flat();
    const uniqueImages = _.uniq(allImages);
    const nodeSet = {}
    let edges = [];
    
    uniqueImages.forEach((image, index) => {
        const includedKeywords = rule.keywords.filter(keyword => {
            return keyword.images.flat().includes(image)
        }).map((keyword) => keyword.keyword.join("+"))
        if (includedKeywords.length == 0) return;
        const mergedKeyword = includedKeywords.join("/")
        includedKeywords.forEach((keyword) => {
            edges.push({
                source: keyword,
                target: mergedKeyword,
                id: `${keyword}-${mergedKeyword}`,
                label: `${keyword}-${mergedKeyword}`
            })
        })
        if (!nodeSet[mergedKeyword]) {
            nodeSet[mergedKeyword] = {
                id: mergedKeyword,
                label: mergedKeyword,
                size: 1,
                data: 1,
            }
        } else {
            nodeSet[mergedKeyword].data += 1
            nodeSet[mergedKeyword].size += 1
        }
    })
    edges = _.uniq(edges)
    const nodes = Object.values(nodeSet);
    const pieData = calculatePieData(nodes, totalImageCounts);
    
    return (
        <Stack 
            direction="row"
            spacing={2} 
            sx={{mb: 2, position: "relative"}}
            onDragOver={e => e.preventDefault()}
            onDrop={onDrop}
        >
        <Paper key={ruleIndex} elevation={4} sx={{ p: 2, mb: 2, overflow: 'auto', width: "100%" }}>
            <Stack direction="column" spacing={2}>
            <TextField 
                id="standard-basic" 
                variant="standard" 
                placeholder='Bias Name' 
                value={rule.biasName} 
                onChange={(e) => changeBiasName(e, ruleIndex)}
                sx={{width:"90%"}}
            />
            {!rule.keywords[0] && <Box sx={{height: '100px'}}>
                <Typography variant="h7"> Drag & Drop keywords here! </Typography>    
            </Box>}

            
            {rule.keywords[0] && <Box sx={{
                width: "100%",
                height: "300px",
                position: "relative",
                }}>
                <GraphCanvas
                    layoutType="forceDirected2d"
                    layoutOverrides={{
                        linkDistance: 5
                      }}
                    defaultNodeSize={10}
                    minNodeSize={10}
                    maxNodeSize={30}
                    nodes={nodes}
                    edges={edges}
                    draggable={true}
                />
            </Box>}

            {rule.keywords[0] &&
                <Box sx={{
                    width: "100%", 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center'
                    }}>
                    <Box sx={{ height: 200 }}>
                        <Pie data={pieData} options={{plugins: {legend: {position: "right"}}}}/>
                    </Box>
                </Box>
            }
            </Stack>
            <IconButton onClick={() => removeRule(ruleIndex)} sx={{ 
                position: 'absolute',
                top: 5,
                right: 5,
                color: 'error'
             }}>
                <CloseIcon />
            </IconButton>
        </Paper>
          
        </Stack>
    );
};

export default Rule;
