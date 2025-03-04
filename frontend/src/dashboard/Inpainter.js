import React from 'react';
import { Container, Paper, Grid } from '@mui/material';
import _ from 'lodash';
import InpaintBlock from './InpainterBlock/index';

const Inpainter = ({dataset, solutions, normalImages, panoptic, panopticCategories, label}) => {

    return (
        <Grid item xs={12}>
        <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column'}}>
        <div>
            <h3>Inpainter</h3>
            <Container maxWidth="false">
                {solutions.map((sol, solIndex) => 
                    <InpaintBlock
                        solution={sol}
                        solIndex={solIndex}
                        normalImages={normalImages}
                        panopticCategories={panopticCategories}
                        panoptic={panoptic}
                        label={label}
                        dataset={dataset}
                    />
                )}
            </Container>
        </div>
        </Paper>
        </Grid>
    );
};

export default Inpainter;
