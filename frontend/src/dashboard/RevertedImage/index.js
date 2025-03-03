import {
    Box,
    Paper,
    ToggleButtonGroup,
    ToggleButton,
} from '@mui/material';
import { useState } from 'react';

const RevertedImage = ({
    limeKeywords,
}) => {
    const [alignment, setAlignment] = useState([]);
    const keywords_text = limeKeywords.map((data) => data.keyword[0])
    const keywords_class = limeKeywords.map((data) => data.class[0])

    const handleChange = (e, newAlignment) => {
        const currentSet = new Set(alignment);
        if (currentSet.has(newAlignment)) {
            currentSet.delete(newAlignment)
        } else {
            currentSet.add(newAlignment)
        }
        setAlignment(Array.from(currentSet));
    };

    return (
        <Paper sx={{width: '100%', marginTop: '20px'}} elevation={24}>
            {/* Keyword List */}
            <Box component="div" sx={{ width: '100%', maxHeight: '300px', overflow: 'auto' }}>
                <ToggleButtonGroup
                    color="primary"
                    exclusive
                    aria-label="Platform"
                    value={alignment}
                    onChange={handleChange}
                >
                    {
                        keywords_text.map((keyword) => (
                            <ToggleButton value={keyword} sx={{ textTransform: 'none' }} key={keyword}>
                                {keyword}
                            </ToggleButton>
                        ))
                    }
                </ToggleButtonGroup>
            </Box>

            {/* Image List */}
            <Box>

            </Box>

        </Paper>
    );
};

export default RevertedImage