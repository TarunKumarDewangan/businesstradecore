import axios from 'axios';

const api = axios.create({
    // CHANGE THIS LINE: Use 127.0.0.1 instead of localhost
    baseURL: 'http://127.0.0.1:8000/api',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
});

export default api;
