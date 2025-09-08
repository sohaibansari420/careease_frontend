import { apiMethods } from './api';

const authService = {
  // Register new user
  register: async (userData) => {
    const response = await apiMethods.post('/auth/register', userData);
    return response.data;
  },

  // Login user
  login: async (credentials) => {
    const response = await apiMethods.post('/auth/login', credentials);
    return response.data;
  },

  // Logout user
  logout: async () => {
    const response = await apiMethods.post('/auth/logout');
    return response.data;
  },

  // Get user profile
  getProfile: async () => {
    const response = await apiMethods.get('/auth/profile');
    return response.data;
  },

  // Update user profile
  updateProfile: async (profileData) => {
    const response = await apiMethods.put('/auth/profile', profileData);
    return response.data;
  },
};

export default authService;
