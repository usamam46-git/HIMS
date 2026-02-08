import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor for adding auth tokens, logging, etc.
api.interceptors.request.use(
    (config) => {
        // Add auth token if available
        const token = localStorage.getItem('authToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // Development logging
        if (import.meta.env.VITE_ENV === 'development') {
            console.log(`📡 API Request: ${config.method?.toUpperCase()} ${config.url}`);
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        // Handle common errors
        if (error.response) {
            switch (error.response.status) {
                case 401:
                    // Unauthorized - clear token and redirect to login
                    localStorage.removeItem('authToken');
                    window.location.href = '/login';
                    break;
                case 403:
                    console.error('Access forbidden');
                    break;
                case 404:
                    console.error('Resource not found');
                    break;
                case 500:
                    console.error('Server error');
                    break;
                default:
                    console.error('API Error:', error.response.data?.message || error.message);
            }
        } else if (error.request) {
            console.error('Network error - no response received');
        } else {
            console.error('Request error:', error.message);
        }

        return Promise.reject(error);
    }
);

export default api;
