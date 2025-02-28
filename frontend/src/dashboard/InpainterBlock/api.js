import API_URL from '../../common/api';

/**
 * Call API /api/seem
 * Generating mask for current image in show
 */
const callGenerateMaskAPI = (
    dataset,
    prompt,
    imageURL,
) => {
    return fetch(`${API_URL}/api/seem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            imagePaths: imageURL,
            prompt: prompt,
            invert: "false",
            dataset: dataset
        }),
        mode: "cors",
    })
    .then(response => response.json())
    .catch(error => console.error(error))
}


export {
    callGenerateMaskAPI,
};