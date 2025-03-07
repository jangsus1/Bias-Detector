import API_URL from '../../common/api';
import pako from 'pako';

const setUserIdInLocalStorage = (user_id) => {
    // Save user_id in localStorage
    localStorage.setItem('user_id', user_id);
};

const getUserIdInLocalStorage = () => {
    return localStorage.getItem('user_id');
};

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
            dataset: dataset,
            user_id: getUserIdInLocalStorage(),
        }),
        mode: "cors",
        credentials: "include",
    })
    .then(response => response.json())
    .then(data => {
        if ('user_id' in data) {
            setUserIdInLocalStorage(data['user_id'])
        }
        return data['mask_paths'];
    })
    .catch(error => console.error(error))
};

/**
 * Call API /api/inpatin
 * Saving inpatin action of user
 */
const callInpaintAPI = (data) => {
    return fetch(`${API_URL}/api/inpaint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            user_id: getUserIdInLocalStorage(),
            batch_mask: data.batch_mask,
            keywords: data.keywords,
            invert: data.invert,
            solution: data.solution,
            solution_query: data.solution_query,
            dataset: data.dataset,
            class_name: data.class_name,
        }),
        mode: "cors",
        credentials: "include",
    })
    .then(response => response.json())
    .then(data => {
        if ('user_id' in data) {
            setUserIdInLocalStorage(data['user_id'])
        }
        return data;
    })
    .catch(error => console.error(error))
};

/**
 * Call API /api/manual_mask
 * Save the mask which is manually generated
 */
const callDrawMaskAPI = (image) => {
    return fetch(`${API_URL}/api/manual_mask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        mode: "cors",
        body: pako.deflate(JSON.stringify({ image: image }), { to: 'string' }),
    })
    .then(response => response.json())
    .then(data => {
        if ('user_id' in data) {
            setUserIdInLocalStorage(data['user_id'])
        }
        // TODO: Return mask path
        return data['mask_paths']
    })
    .catch(error => console.error(error))
};

export {
    callInpaintAPI,
    callGenerateMaskAPI,
    callDrawMaskAPI,
};