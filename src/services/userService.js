import { apiMethods } from './api';

const userService = {
  // Get user dashboard statistics
  getDashboardStats: async () => {
    const response = await apiMethods.get('/user/dashboard');
    return response.data;
  },

  // Alarm management
  createAlarm: async (alarmData) => {
    const response = await apiMethods.post('/user/alarms', alarmData);
    return response.data;
  },

  getUserAlarms: async () => {
    const response = await apiMethods.get('/user/alarms');
    return response.data;
  },

  updateAlarm: async (alarmId, alarmData) => {
    const response = await apiMethods.put(`/user/alarms/${alarmId}`, alarmData);
    return response.data;
  },

  deleteAlarm: async (alarmId) => {
    const response = await apiMethods.delete(`/user/alarms/${alarmId}`);
    return response.data;
  },

  // Get pending chat ratings for notifications
  getPendingRatings: async () => {
    const response = await apiMethods.get('/user/pending-ratings');
    return response.data;
  }
};

export default userService;
