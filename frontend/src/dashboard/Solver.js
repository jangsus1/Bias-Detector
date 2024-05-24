import React, { useState } from 'react';
import { Paper, Button, Container, Grid } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import _ from 'lodash';
import Rule from './Rule';



function Solver({ predictions, onSolved, show, draggedKeywordObj, registerComplete, addKeyword, selectedTrainData}) {


  const initialRule = { keywords: [], biasName: "" };
  const [rules, setRules] = useState([initialRule]);

  /**
   * rules: [
   *  { 
   *    biasName: "bias1",
   *    keywords: [
   *      keyword1: {
   *          keyword: ["keyword1", "keyword2"],
   *          images: [["image1"], ["image2"]],
   *          accuracy: [0.9, 0.8],
   *      },
   *    ],
   * ]
   */

  const addRule = () => {
    const newRule = { keywords: [], biasName: "" }; // Each rule starts with an empty list of components
    setRules([...rules, newRule]);
  };

  const addKeywordToRule = (ruleIndex, keyword) => {
    const updatedRules = rules.map((rule, index) => {
      if (index === ruleIndex) {
        const updatedRule = {
          ...rule,
          keywords: [...rule.keywords, keyword],
        };
        return updatedRule;
      }
      return rule;
    });
    setRules(updatedRules);
  };

  const removeRule = (ruleIndex) => {
    const filteredRules = rules.filter((_, index) => index !== ruleIndex);
    setRules(filteredRules);
  };

  const removeKeywordFromRule = (ruleIndex, keywordIndex) => {
    let removedKeyword;
    const updatedRules = rules.map((rule, index) => {
      if (index === ruleIndex) {
        removedKeyword = rule.keywords[keywordIndex];
        const filteredKeywords = rule.keywords.filter((_, kIndex) => kIndex !== keywordIndex);
        return { ...rule, keywords: filteredKeywords };
      }
      return rule;
    });
    setRules(updatedRules);
    addKeyword(removedKeyword);
  };

  const changeBiasName = (event, ruleIndex) => {
    const updatedRules = rules.map((rule, index) => {
      if (index === ruleIndex) {
        return { ...rule, biasName: event.target.value };
      }
      return rule;
    });
    setRules(updatedRules);
  };

  function cartesianProduct(arrays) {
    return arrays.reduce((acc, currentArray) => {
      const product = [];
      acc.forEach(accItem => {
        currentArray.forEach(currentItem => {
          product.push([...accItem, currentItem]);
        });
      });
      return product;
    }, [[]]);
  }

  const generateSolutions = () => {
    const biasTable = [...Array(predictions.length)].map(() => []);
    const counter = {};
    const keywordsInEachRule = []
    rules.forEach((rule, ruleIndex) => {
      const validKeywords = rule.keywords.filter(keyword => keyword.keyword);
      keywordsInEachRule.push(validKeywords.map(keyword => keyword.keyword.join("/")).concat("Others"));
      predictions.forEach((prediction, index) => {
        const image = prediction.image;
        const initialLength = biasTable[index].length;
        validKeywords.forEach((k, idx) => {
          if (k.images.flat().includes(image) && initialLength === biasTable[index].length) {
            biasTable[index].push(k.keyword.join("/"));
          }
        })
        if (biasTable[index].length === initialLength) {
          biasTable[index].push("Others");
        }
      })
    })

    // Initialize counter
    const allCombinations = cartesianProduct(keywordsInEachRule);
    allCombinations.forEach(bias => {
      const key = JSON.stringify(bias);
      counter[key] = [];
    })


    biasTable.forEach((bias, index) => {
      const key = JSON.stringify(bias);
      counter[key].push(index);

    })
    const maxCount = Math.max(...Object.values(counter).map((val) => val.length));
    const solutions = []
    const increasedRatio = selectedTrainData.length / predictions.length;
    Object.keys(counter).forEach((key) => {
      const originalList = JSON.parse(key);
      const amountToAdd = parseInt((maxCount - counter[key].length)*increasedRatio);
      if (amountToAdd > 0) {
        let solution = [amountToAdd]
        originalList.forEach((bias, ruleIdx) => {
          if (bias !== "Others") {
            solution.push(["with", [bias]])
          } else {
            solution.push(["without", keywordsInEachRule[ruleIdx].slice(0, -1)])
          }
        })
        solutions.push(solution);
      }
    })
    // const normalImages = predictions.filter((prediction, index) => biasTable[index].every(bias => bias === "Others")).map(p => p.image);
    // onSolved(solutions, normalImages);
    onSolved(solutions, selectedTrainData);
  }

  if (!show) return null;

  return (
    <Grid item xs={3}>
      <Paper 
        sx={{
          p: 2,
          display: "flex",
          flexDirection: 'column',
          height: '80vh', // Example max height
          overflowY: 'auto', // Enables vertical scrolling
        }}>
        <div>
          <h3>Bias Solver</h3>
          <Container>
            <Button variant="contained" onClick={generateSolutions} sx={{ mb: 2, mx: 1 }}>Solve</Button>
            {rules.map((rule, ruleIndex) => (
              <Rule
                rule={rule}
                ruleIndex={ruleIndex}
                totalImageCounts={predictions.length}
                changeBiasName={changeBiasName}
                addKeywordToRule={addKeywordToRule}
                removeKeywordFromRule={removeKeywordFromRule}
                removeRule={removeRule}
                draggedKeywordObj={draggedKeywordObj}
                registerComplete={registerComplete}
              />
            ))}
            <Button variant="outlined" onClick={addRule} sx={{ mb: 2, mx: 1 }}>Add Rule</Button>
          </Container>
        </div>
      </Paper>
    </Grid>
  );
}

export default Solver;