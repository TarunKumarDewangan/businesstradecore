import axios from 'axios';

const getBaseUrl = () => {
    const hostname = window.location.hostname;

    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://127.0.0.1:8000/api';
    } else {
        // 👇 MAKE SURE THIS HAS /api AT THE END
        return 'https://api.businesstradecore.in/api';
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
