import React, { useState } from 'react';
import { Box, Stack, Button, IconButton, Paper, TextField, Grid, Typography, Popover } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import _ from 'lodash';
import { GraphCanvas } from 'reagraph';
import { PieChart, Pie, Tooltip, Legend, Cell } from 'recharts';

const COLORS = ['#FF6384', '#36A2EB', '#FFCD56', '#4BC0C0', '#9966FF'];

const calculatePieData = (nodes, totalImageCounts) => {
    if (!nodes) return [];
    const remainingImages = totalImageCounts - _.sumBy(nodes, 'data');

    const pieData = [
        { name: "Others", value: remainingImages },
        ...nodes.map(node => ({ name: node.id, value: node.data }))
    ];
    return pieData;
};

const CustomLegend = (props) => {
    const { payload, removeKeyword } = props;

    return (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {payload.map((entry, index) => (
            <li key={`item-${index}`} style={{ display: 'flex', alignItems: 'center', marginBottom: 4, verticalAlign: 'center'}}>
                <span style={{
                    width: 12,
                    height: 12,
                    backgroundColor: entry.color,
                    marginRight: 8,
                    borderRadius: 2,
                }}/>
                <span style={{ color: entry.color, marginRight: 8 }}>{entry.value}</span>
                {
                    entry.value.toLowerCase() !== 'others'
                    && !entry.value.toLowerCase().includes('/')
                    && <span
                        style={{ 
                            cursor: 'pointer',
                            opacity: 0.6,
                        }}
                        onClick={() => {
                            removeKeyword(entry.value);
                        }}
                    >
                        {/* TODO: Change the emoji to iconfont maybe? */}
                        {'❌'}
                    </span>
                }
            </li>
          ))}
        </ul>
    );
}

const Rule = ({
    rule,
    ruleIndex,
    totalImageCounts,
    changeBiasName,
    addKeywordToRule,
    removeKeywordFromRule,
    removeRule,
    draggedKeywordObj,
    registerComplete
}) => {
    const onDrop = (e) => {
        e.preventDefault();
        if (!draggedKeywordObj) return;
        addKeywordToRule(ruleIndex, draggedKeywordObj.data);
        registerComplete(draggedKeywordObj);
    };

    const allImages = rule.keywords.map((k) => k.images.flat()).flat();
    const uniqueImages = _.uniq(allImages);
    const nodeSet = {};
    let edges = [];

    uniqueImages.forEach((image) => {
        const includedKeywords = rule.keywords
            .filter(keyword => keyword.images.flat().includes(image))
            .map(keyword => keyword.keyword.join("+"));
        if (includedKeywords.length === 0) return;
        const mergedKeyword = includedKeywords.join("/");
        includedKeywords.forEach((keyword) => {
            edges.push({
                source: keyword,
                target: mergedKeyword,
                id: `${keyword}-${mergedKeyword}`,
                label: `${keyword}-${mergedKeyword}`
            });
        });
        if (!nodeSet[mergedKeyword]) {
            nodeSet[mergedKeyword] = {
                id: mergedKeyword,
                label: mergedKeyword,
                size: 1,
                data: 1,
            };
        } else {
            nodeSet[mergedKeyword].data += 1;
            nodeSet[mergedKeyword].size += 1;
        }
    });
    edges = _.uniq(edges);
    const nodes = Object.values(nodeSet);
    const pieData = calculatePieData(nodes, totalImageCounts);

    const removeKeyword = (keywordContent) => {
        // Find keywordIndex
        let keywordIndex = undefined;
        rule.keywords.forEach((keyword, idx) => {
            if (keyword.keyword?.join('+') === keywordContent) {
                keywordIndex = idx;
            }
        });

        removeKeywordFromRule(ruleIndex, keywordIndex);
    };

    return (
        <Stack
            direction="row"
            spacing={2}
            sx={{ mb: 2, position: "relative" }}
            onDragOver={e => e.preventDefault()}
            onDrop={onDrop}
        >
            <Paper key={ruleIndex} elevation={4} sx={{ p: 2, mb: 2, overflow: 'auto', width: "100%" }}>
                <TextField
                    id="standard-basic"
                    variant="standard"
                    placeholder='Bias Name'
                    value={rule.biasName}
                    onChange={(e) => changeBiasName(e, ruleIndex)}
                    sx={{ width: "50%" }}
                />
                <Stack direction="row" spacing={2}>
                    {!rule.keywords[0] && (
                        <Box sx={{ height: '100px' }}>
                            <Typography variant="h7"> Drag & Drop keywords here! </Typography>
                        </Box>
                    )}

                    {rule.keywords[0] && (
                        <Box
                            sx={{
                                width: "100%",
                                height: "200px",
                                position: "relative",
                            }}
                        >
                            <GraphCanvas
                                layoutType="forceDirected2d"
                                layoutOverrides={{ linkDistance: 5 }}
                                defaultNodeSize={10}
                                minNodeSize={10}
                                maxNodeSize={30}
                                nodes={nodes}
                                edges={edges}
                                draggable={true}
                            />
                        </Box>
                    )}

                    {rule.keywords[0] && (
                        <Box
                            sx={{
                                width: "100%",
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center'
                            }}
                        >
                            <PieChart width={250} height={250}>
                                <Pie data={pieData} cx="50%" cy="50%" outerRadius={40} fill="#8884d8" dataKey="value">
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend
                                    layout="vertical"
                                    align="right"
                                    verticalAlign="middle"
                                    onClick={(e) => {
                                        console.log(e)}
                                    }
                                    content={<CustomLegend removeKeyword={removeKeyword}/>}
                                />
                            </PieChart>
                        </Box>
                    )}
                </Stack>
                <IconButton onClick={() => removeRule(ruleIndex)} sx={{
                    position: 'absolute',
                    top: 5,
                    right: 5,
                    color: 'error'
                }}>
                    <CloseIcon onClick={() => {
                        // Remove all the keywords
                        rule.keywords.forEach((_, idx) => {
                            removeKeywordFromRule(ruleIndex, idx);
                        })
                    }}/>
                </IconButton>
            </Paper>
        </Stack>
    );
};

export default Rule;