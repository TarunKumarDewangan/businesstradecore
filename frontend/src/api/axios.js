import axios from 'axios';

// Logic to determine base URL automatically
const getBaseUrl = () => {
    const hostname = window.location.hostname;

    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        // We are on Local Machine
        return 'http://127.0.0.1:8000/api';
    } else {
        // We are on Live Server (businesstradecore.in)
        return 'https://api.businesstradecore.in';
    }
};

const api = axios.create({
    baseURL: getBaseUrl(),
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
});

export default api;
