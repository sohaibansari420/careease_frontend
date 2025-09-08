import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Link } from 'react-router-dom';
import {
  MessageCircle,
  Plus,
  Clock,
  Star,
  TrendingUp,
  Heart,
  Shield,
  Users,
  Activity,
  BarChart3,
  Bell,
  BellRing,
  AlarmClock,
  CheckCircle,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import userService from '../services/userService';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const { user } = useAuth();
  const [statsRef, statsInView] = useInView({ triggerOnce: true, threshold: 0.1 });
  const [chartsRef, chartsInView] = useInView({ triggerOnce: true, threshold: 0.1 });

  // Modal states
  const [showAlarmModal, setShowAlarmModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedChatForRating, setSelectedChatForRating] = useState(null);
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState('');

  // Alarm form state
  const [alarmForm, setAlarmForm] = useState({
    name: '',
    time: '',
    description: ''
  });

  const queryClient = useQueryClient();

  // Get dashboard statistics
  const { data: dashboardData, isLoading, error } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => userService.getDashboardStats(),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Get user alarms
  const { data: alarmsData } = useQuery({
    queryKey: ['user-alarms'],
    queryFn: () => userService.getUserAlarms(),
    refetchInterval: 60000, // Refetch every minute
  });

  // Get pending ratings
  const { data: pendingRatingsData } = useQuery({
    queryKey: ['pending-ratings'],
    queryFn: () => userService.getPendingRatings(),
    refetchInterval: 60000,
  });

  const dashboard = dashboardData?.data || {};
  const recentChats = dashboard.recentChats || [];
  const insights = dashboard.insights || [];
  const pendingRatings = pendingRatingsData?.data?.pendingChats || [];
  const userAlarms = alarmsData?.data?.alarms || [];

  // Create alarm mutation
  const createAlarmMutation = useMutation({
    mutationFn: (alarmData) => userService.createAlarm(alarmData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-alarms'] });
      setShowAlarmModal(false);
      setAlarmForm({ name: '', time: '', description: '' });
      toast.success('Alarm created successfully!');
    },
    onError: () => {
      toast.error('Failed to create alarm');
    },
  });

  // Handle alarm creation
  const handleCreateAlarm = () => {
    if (!alarmForm.name || !alarmForm.time) {
      toast.error('Please fill in name and time');
      return;
    }

    const alarmTime = new Date(alarmForm.time);
    if (alarmTime <= new Date()) {
      toast.error('Please select a future time');
      return;
    }

    createAlarmMutation.mutate({
      ...alarmForm,
      time: alarmTime.toISOString()
    });
  };

  // Handle rating submission
  const handleRatingSubmit = () => {
    // Here you would typically call an API to submit the rating
    // For now, we'll just close the modal and show a success message
    toast.success('Thank you for your feedback!');
    setShowRatingModal(false);
    setSelectedChatForRating(null);
    setRating(5);
    setFeedback('');
  };

  // Check for due alarms
  useEffect(() => {
    const checkAlarms = () => {
      userAlarms.forEach(alarm => {
        if (alarm.isActive && !alarm.isCompleted) {
          const alarmTime = new Date(alarm.time);
          const now = new Date();
          const timeDiff = alarmTime - now;

          // If alarm is due (within 1 minute)
          if (timeDiff <= 60000 && timeDiff > -60000) {
            toast(`🔔 ${alarm.name}`, {
              duration: 10000,
              icon: '⏰',
              action: {
                label: 'Dismiss',
                onClick: () => {
                  // Mark alarm as completed
                  userService.updateAlarm(alarm._id, { isActive: false });
                }
              }
            });
          }
        }
      });
    };

    if (userAlarms.length > 0) {
      checkAlarms();
      const interval = setInterval(checkAlarms, 30000); // Check every 30 seconds
      return () => clearInterval(interval);
    }
  }, [userAlarms]);

  // Show rating notification if there are pending ratings
  useEffect(() => {
    if (pendingRatings.length > 0) {
      const chat = pendingRatings[0];
      setSelectedChatForRating(chat);
      setShowRatingModal(true);
    }
  }, [pendingRatings]);

  // Real dynamic stats
  const stats = [
    {
      title: 'Total Chats',
      value: dashboard.stats?.totalChats || 0,
      change: `+${dashboard.stats?.recentResolved || 0} resolved today`,
      icon: MessageCircle,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900/20'
    },
    {
      title: 'Active Conversations',
      value: dashboard.stats?.activeChats || 0,
      change: dashboard.stats?.activeChats > 0 ? 'Currently active' : 'No active chats',
      icon: Activity,
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900/20'
    },
    {
      title: 'Average Rating',
      value: dashboard.stats?.averageRating ? `${dashboard.stats.averageRating.toFixed(1)}/5` : 'N/A',
      change: dashboard.stats?.averageRating >= 4.0 ? 'Excellent!' : 'Keep improving',
      icon: Star,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/20'
    },
    {
      title: 'Response Time',
      value: dashboard.stats?.avgResponseTime || 'N/A',
      change: dashboard.stats?.totalChats > 0 ? 'AI-powered responses' : 'No chats yet',
      icon: Clock,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 dark:bg-purple-900/20'
    }
  ];

  const quickActions = [
    {
      title: 'Start New Chat',
      description: 'Get instant help with any care question',
      icon: MessageCircle,
      color: 'bg-primary-600 hover:bg-primary-700',
      href: '/chat'
    },
    {
      title: 'Reports',
      description: 'View analytics and chat history in one place',
      icon: BarChart3,
      color: 'bg-indigo-600 hover:bg-indigo-700',
      href: '/reports'
    },
    {
      title: 'Set Alarm',
      description: 'Create medication or care reminders',
      icon: AlarmClock,
      color: 'bg-green-600 hover:bg-green-700',
      action: () => setShowAlarmModal(true)
    },
    {
      title: 'View Chat History',
      description: 'Review previous conversations',
      icon: Clock,
      color: 'bg-secondary-600 hover:bg-secondary-700',
      href: '/reports'
    },
    {
      title: 'Profile Settings',
      description: 'Update your account preferences',
      icon: Users,
      color: 'bg-gray-600 hover:bg-gray-700',
      href: '/profile'
    }
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading your dashboard..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Failed to load dashboard
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {error?.message || 'An error occurred while loading your dashboard.'}
          </p>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="container-custom">
        {/* Welcome Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Welcome back, {user?.firstName}! 👋
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Here's your care assistance overview.
              </p>
            </div>

            {/* Active Alarms Indicator */}
            {userAlarms.filter(alarm => alarm.isActive && !alarm.isCompleted).length > 0 && (
              <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
                <BellRing className="w-5 h-5" />
                <span className="text-sm font-medium">
                  {userAlarms.filter(alarm => alarm.isActive && !alarm.isCompleted).length} active alarms
                </span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          {quickActions.map((action, index) => (
            <div key={index}>
              {action.href ? (
                <Link to={action.href} className="block">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`${action.color} text-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-300`}
                  >
                    <action.icon className="w-8 h-8 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">{action.title}</h3>
                    <p className="text-white/80 text-sm">{action.description}</p>
                  </motion.div>
                </Link>
              ) : (
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`${action.color} text-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-300 cursor-pointer`}
                  onClick={action.action}
                >
                  <action.icon className="w-8 h-8 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">{action.title}</h3>
                  <p className="text-white/80 text-sm">{action.description}</p>
                </motion.div>
              )}
            </div>
          ))}
        </motion.div>

        {/* Stats Grid */}
        <section ref={statsRef} className="mb-8">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={statsInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="text-2xl font-bold text-gray-900 dark:text-white mb-6"
          >
            Your Statistics
          </motion.h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={statsInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                  <BarChart3 className="w-5 h-5 text-gray-400" />
                </div>
                
                <div className="space-y-1">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stat.value}
                  </h3>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {stat.title}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400">
                    {stat.change}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Recent Chats */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700"
            >
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Recent Conversations
                  </h3>
                  <Link to="/chat">
                    <Button variant="outline" size="sm">
                      View All
                    </Button>
                  </Link>
                </div>
              </div>
              
              <div className="p-6 space-y-4">
                {recentChats.length > 0 ? (
                  recentChats.map((chat, index) => (
                    <motion.div
                      key={chat._id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
                      className="flex items-start space-x-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200 cursor-pointer"
                    >
                      <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                        <MessageCircle className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {chat.title || 'Untitled Chat'}
                          </h4>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            chat.status === 'active'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                          }`}>
                            {chat.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                          {chat.issue || 'No description available'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          {new Date(chat.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      No conversations yet
                    </h4>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      Start your first conversation to get personalized care assistance.
                    </p>
                    <Link to="/chat">
                      <Button leftIcon={<Plus className="w-4 h-4" />}>
                        Start New Chat
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* Insights & Tips */}
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700"
            >
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Daily Insights
                </h3>
              </div>
              
              <div className="p-6 space-y-4">
                {insights.length > 0 ? (
                  insights.map((insight, index) => {
                    const iconMap = {
                      'trending-up': TrendingUp,
                      'heart': Heart,
                      'star': Star,
                      'shield': Shield,
                      'activity': Activity
                    };

                    const IconComponent = iconMap[insight.icon] || Heart;

                    return (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.5 + index * 0.1 }}
                        className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                      >
                        <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                          <IconComponent className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                            {insight.title}
                          </h4>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {insight.content}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })
                ) : (
                  <div className="text-center py-8">
                    <Heart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">
                      Insights will appear here as you use the platform more.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Quick Start Guide */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="bg-gradient-primary rounded-xl p-6 text-white"
            >
              <h3 className="text-lg font-semibold mb-3">
                New to CareEase?
              </h3>
              <p className="text-white/90 text-sm mb-4">
                Start a conversation with our AI assistant to get personalized care recommendations.
              </p>
              <Link to="/chat">
                <Button
                  variant="secondary"
                  size="sm"
                  className="bg-white text-primary-600 hover:bg-gray-100"
                  leftIcon={<MessageCircle className="w-4 h-4" />}
                >
                  Get Started
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>

        {/* Alarm Modal */}
        <Modal
          isOpen={showAlarmModal}
          onClose={() => setShowAlarmModal(false)}
          title="Set New Alarm"
          size="md"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Alarm Name *
              </label>
              <input
                type="text"
                value={alarmForm.name}
                onChange={(e) => setAlarmForm({ ...alarmForm, name: e.target.value })}
                className="input-field"
                placeholder="e.g., Take medication, Doctor appointment"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Time *
              </label>
              <input
                type="datetime-local"
                value={alarmForm.time}
                onChange={(e) => setAlarmForm({ ...alarmForm, time: e.target.value })}
                className="input-field"
                min={new Date().toISOString().slice(0, 16)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description (Optional)
              </label>
              <textarea
                value={alarmForm.description}
                onChange={(e) => setAlarmForm({ ...alarmForm, description: e.target.value })}
                className="input-field resize-none"
                rows={3}
                placeholder="Additional details about the alarm..."
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowAlarmModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateAlarm}
                isLoading={createAlarmMutation.isPending}
                leftIcon={<AlarmClock className="w-4 h-4" />}
              >
                Create Alarm
              </Button>
            </div>
          </div>
        </Modal>

        {/* Rating Modal */}
        <Modal
          isOpen={showRatingModal}
          onClose={() => setShowRatingModal(false)}
          title="Rate Your Experience"
          size="md"
        >
          <div className="space-y-4">
            {selectedChatForRating && (
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <h4 className="font-medium text-gray-900 dark:text-white">
                  {selectedChatForRating.title || 'Chat Session'}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Please rate your experience with this conversation.
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                How would you rate this conversation?
              </label>
              <div className="flex items-center space-x-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className={`w-8 h-8 ${
                      star <= rating
                        ? 'text-yellow-400 fill-current'
                        : 'text-gray-300 hover:text-yellow-400'
                    }`}
                  >
                    <Star className="w-6 h-6" />
                  </button>
                ))}
                <span className="text-sm text-gray-600 dark:text-gray-400 ml-2">
                  {rating} out of 5 stars
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Feedback (Optional)
              </label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="input-field resize-none"
                rows={3}
                placeholder="Tell us what you thought about this conversation..."
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowRatingModal(false)}
              >
                Skip
              </Button>
              <Button
                onClick={handleRatingSubmit}
                leftIcon={<CheckCircle className="w-4 h-4" />}
              >
                Submit Rating
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
};

export default Dashboard;
