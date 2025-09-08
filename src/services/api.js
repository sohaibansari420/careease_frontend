import axios from 'axios';
import toast from 'react-hot-toast';

// Create axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('careease-token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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
    const { response } = error;
    
    if (!response) {
      // Network error
      toast.error('Network error. Please check your connection.');
      return Promise.reject(error);
    }

    const { status, data } = response;
    
    // Handle different error status codes
    switch (status) {
      case 401:
        // Unauthorized - token expired or invalid
        if (data?.message?.includes('token') || data?.message?.includes('unauthorized')) {
          localStorage.removeItem('careease-token');
          window.location.href = '/login';
        }
        break;
        
      case 403:
        // Forbidden - insufficient permissions or banned
        if (data?.message?.includes('banned')) {
          toast.error(`Account banned: ${data.banReason || 'Contact support'}`);
          localStorage.removeItem('careease-token');
          window.location.href = '/login';
        } else {
          toast.error(data?.message || 'Access denied');
        }
        break;
        
      case 404:
        // Not found
        toast.error(data?.message || 'Resource not found');
        break;
        
      case 422:
        // Validation error
        if (data?.errors && Array.isArray(data.errors)) {
          data.errors.forEach(err => {
            toast.error(err.message || err.msg);
          });
        } else {
          toast.error(data?.message || 'Validation error');
        }
        break;
        
      case 429:
        // Rate limit exceeded
        toast.error(data?.message || 'Too many requests. Please slow down.');
        break;
        
      case 500:
        // Internal server error
        toast.error('Server error. Please try again later.');
        break;
        
      case 503:
        // Service unavailable
        toast.error(data?.message || 'Service temporarily unavailable');
        break;
        
      default:
        // Other errors
        toast.error(data?.message || 'An unexpected error occurred');
    }
    
    return Promise.reject(error);
  }
);

// API methods
export const apiMethods = {
  get: (url, config = {}) => api.get(url, config),
  post: (url, data = {}, config = {}) => api.post(url, data, config),
  put: (url, data = {}, config = {}) => api.put(url, data, config),
  patch: (url, data = {}, config = {}) => api.patch(url, data, config),
  delete: (url, config = {}) => api.delete(url, config),
};

export default api;
