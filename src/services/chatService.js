import { apiMethods } from './api';

const chatService = {
  // Create new chat
  createChat: async (chatData) => {
    const response = await apiMethods.post('/chat', chatData);
    return response.data;
  },

  // Get user's chats
  getUserChats: async (params = {}) => {
    const response = await apiMethods.get('/chat', { params });
    return response.data;
  },

  // Get specific chat
  getChat: async (chatId) => {
    const response = await apiMethods.get(`/chat/${chatId}`);
    return response.data;
  },

  // Send message in chat
  sendMessage: async (chatId, messageData) => {
    const response = await apiMethods.post(`/chat/${chatId}/messages`, messageData);
    return response.data;
  },

  // Update chat
  updateChat: async (chatId, updateData) => {
    const response = await apiMethods.put(`/chat/${chatId}`, updateData);
    return response.data;
  },

  // Add review to chat
  addReview: async (chatId, reviewData) => {
    const response = await apiMethods.post(`/chat/${chatId}/review`, reviewData);
    return response.data;
  },

  // Delete chat
  deleteChat: async (chatId) => {
    const response = await apiMethods.delete(`/chat/${chatId}`);
    return response.data;
  },
};

export default chatService;
