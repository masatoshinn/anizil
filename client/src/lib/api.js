import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const { status } = error.response;

      if (status === 401) {
        const hadToken = !!localStorage.getItem('token');
        if (hadToken) {
          localStorage.removeItem('token');
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }
      }

      if (status === 403) {
        console.error('Access denied');
      }

      if (status === 404) {
        console.error('Resource not found');
      }

      if (status >= 500) {
        console.error('Server error');
      }
    } else if (error.request) {
      console.error('Network error - no response received');
    } else {
      console.error('Request setup error:', error.message);
    }

    return Promise.reject(error);
  }
);

export default api;