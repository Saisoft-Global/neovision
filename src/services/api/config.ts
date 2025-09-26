import axios, { AxiosError } from 'axios';

// Get API URL from environment
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 900000, // 15 minute timeout for long operations (training can be slow)
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Remove Content-Type for FormData
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    let errorMessage = 'An unexpected error occurred';
    
    if (error.response) {
      // Server responded with error
      const data = error.response.data as any;
      errorMessage = data.detail || data.message || 'Server error';
      console.error('API Error:', {
        status: error.response.status,
        data: error.response.data
      });
    } else if (error.request) {
      // No response received
      errorMessage = 'Network error - please check your connection';
      console.error('Network Error:', error.request);
    } else {
      // Request setup error
      errorMessage = error.message;
      console.error('Request Error:', error.message);
    }

    return Promise.reject(new Error(errorMessage));
  }
);