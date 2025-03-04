import {
    Box,
    Stack,
    Typography,
    LinearProgress
} from '@mui/material';

const Shortcut = ({
    solIndex,
    categoriesNumPair,
    selectedKeywords,
    updateKeywords,
    finished,
    totalCount,
    manualKeywords,
}) => {
    // Pre-calculate keywords
    const sortedCategoriesNumPair = Object.entries(categoriesNumPair).sort((
        [, valueA],
        [, valueB]
    ) => valueB - valueA);

    // Combined with manual keywords
    const manualKeywordFakePair = Array.from(manualKeywords)?.map((keyword) => [keyword, 'manual']);
    const combinedCategoriesNumPair = [
        ...manualKeywordFakePair,
        ...sortedCategoriesNumPair,
    ];

    return (                
        <Stack
            direction="row"
            spacing={1}
            sx={{ overflow: "auto" }}
        >
            {combinedCategoriesNumPair.map(([keyword, num], index) => {
                if (typeof num === 'number' && num <= 0) return null;

                const isHighLighted = selectedKeywords.has(keyword);
                return (
                    <Box>
                        <Box
                            size="small"
                            key={`Category${solIndex}-${index}`}
                            variant={isHighLighted ? "contained" : "outlined"}
                            onClick={(e) => updateKeywords(
                                keyword,
                                isHighLighted ? 'delete' : 'add',
                            )}
                            sx={{
                                px: "15px",
                                py: "7px",
                                height: '60px',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                margin: '5px',
                                cursor: finished ? "cursor" : 'pointer',
                                border: '1px solid',
                                borderColor: isHighLighted ? 'transparent' : '#c4c4c4',
                                borderRadius: '4px',
                                backgroundColor: isHighLighted ? '#1976d2' : 'transparent',
                                color: isHighLighted ? 'white' : 'black',
                                textDecoration: 'none',
                                '&:hover': finished ? null : {
                                    backgroundColor: isHighLighted ? '#115293' : '#f5f5f5',
                                    borderColor: isHighLighted ? 'transparent' : '#c4c4c4',
                                },
                                transition: 'background-color 250ms ease-in-out, box-shadow 250ms ease-in-out',
                            }}>
                            {keyword}
                            <br />
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {
                                    typeof num === 'number' && (
                                        <>
                                            <Box sx={{ width: '100%', minWidth: 100 }}>
                                                <LinearProgress variant="determinate" value={100 * num / totalCount} />
                                            </Box>
                                            <Box>
                                                <Typography variant="body2">{num}</Typography>
                                            </Box>
                                        </>
                                    )
                                }
                            </Box>
                        </Box>
                    </Box>
                )
            })}
        </Stack>
    )
};

export default Shortcut;