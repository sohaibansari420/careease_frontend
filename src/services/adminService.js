import { apiMethods } from './api';

const adminService = {
  // Dashboard analytics
  getDashboardAnalytics: async (timeframe = '30d') => {
    const response = await apiMethods.get('/admin/dashboard/analytics', {
      params: { timeframe }
    });
    return response.data;
  },

  // User management
  getAllUsers: async (params = {}) => {
    const response = await apiMethods.get('/admin/users', { params });
    return response.data;
  },

  getUserDetails: async (userId) => {
    const response = await apiMethods.get(`/admin/users/${userId}`);
    return response.data;
  },

  toggleUserBan: async (userId, banData) => {
    const response = await apiMethods.put(`/admin/users/${userId}/ban`, banData);
    return response.data;
  },

  // Chat management
  getAllChats: async (params = {}) => {
    const response = await apiMethods.get('/admin/chats', { params });
    return response.data;
  },

  getChatDetails: async (chatId) => {
    const response = await apiMethods.get(`/admin/chats/${chatId}`);
    return response.data;
  },

  getUserChatHistory: async (userId) => {
    const response = await apiMethods.get(`/admin/users/${userId}/chats`);
    return response.data;
  },

  // Report management
  getReports: async (params = {}) => {
    const response = await apiMethods.get('/admin/reports', { params });
    return response.data;
  },

  updateReport: async (reportId, updateData) => {
    const response = await apiMethods.put(`/admin/reports/${reportId}`, updateData);
    return response.data;
  },
};

export default adminService;
