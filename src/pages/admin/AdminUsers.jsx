import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, 
  Filter, 
  Shield, 
  ShieldOff,
  Eye,
  Ban,
  Check,
  X,
  Users,
  UserX,
  MessageCircle,
  AlertTriangle,
  Star
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import adminService from '../../services/adminService';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import toast from 'react-hot-toast';

const AdminUsers = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [isUserDetailsOpen, setIsUserDetailsOpen] = useState(false);
  const [isBanModalOpen, setIsBanModalOpen] = useState(false);
  const [isChatHistoryOpen, setIsChatHistoryOpen] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [page, setPage] = useState(1);
  const [activeDropdown, setActiveDropdown] = useState(null);

  const queryClient = useQueryClient();

  // Get users with filters
  const { data: usersData, isLoading, error: usersError } = useQuery({
    queryKey: ['admin-users', { page, search: searchTerm, role: selectedRole, status: selectedStatus }],
    queryFn: () => adminService.getAllUsers({
      page,
      limit: 20,
      search: searchTerm,
      role: selectedRole,
      status: selectedStatus
    }),
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Get user details
  const { data: userDetailsData, isLoading: userDetailsLoading, error: userDetailsError } = useQuery({
    queryKey: ['admin-user-details', selectedUser],
    queryFn: () => adminService.getUserDetails(selectedUser),
    enabled: !!selectedUser && isUserDetailsOpen,
    retry: 2,
    retryDelay: 1000,
  });

  // Get user chat history
  const { data: userChatHistoryData, isLoading: chatHistoryLoading, error: chatHistoryError } = useQuery({
    queryKey: ['admin-user-chat-history', selectedUser],
    queryFn: () => adminService.getUserChatHistory(selectedUser),
    enabled: !!selectedUser && isChatHistoryOpen,
    retry: 2,
    retryDelay: 1000,
  });

  // Ban/unban user mutation
  const banUserMutation = useMutation({
    mutationFn: ({ userId, banned, banReason }) => 
      adminService.toggleUserBan(userId, { banned, banReason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setIsBanModalOpen(false);
      setBanReason('');
      setActiveDropdown(null);
      toast.success('User status updated successfully');
    },
    onError: () => {
      toast.error('Failed to update user status');
    },
  });

  const users = usersData?.data?.users || [];
  const pagination = usersData?.data?.pagination || {};
  const stats = usersData?.data?.stats || {};
  const userDetails = userDetailsData?.data;
  const userChatHistory = userChatHistoryData?.data?.chats || [];

  const handleBanUser = (user, shouldBan) => {
    if (shouldBan) {
      setSelectedUser(user._id);
      setIsBanModalOpen(true);
    } else {
      banUserMutation.mutate({ 
        userId: user._id, 
        banned: false, 
        banReason: '' 
      });
    }
  };

  const handleConfirmBan = () => {
    if (!banReason.trim()) {
      toast.error('Please provide a reason for banning this user');
      return;
    }
    
    banUserMutation.mutate({ 
      userId: selectedUser, 
      banned: true, 
      banReason: banReason.trim() 
    });
  };

  const handleViewDetails = (userId) => {
    setSelectedUser(userId);
    setIsUserDetailsOpen(true);
  };

  const handleViewChatHistory = (userId) => {
    setSelectedUser(userId);
    setIsChatHistoryOpen(true);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusBadge = (user) => {
    if (user.isBanned) {
      return <span className="px-2 py-1 text-xs bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 rounded-full">Banned</span>;
    }
    if (!user.isActive) {
      return <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 rounded-full">Inactive</span>;
    }
    return <span className="px-2 py-1 text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded-full">Active</span>;
  };

  const getRoleBadge = (role) => {
    if (role === 'admin') {
      return <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 rounded-full">Admin</span>;
    }
    return <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 rounded-full">User</span>;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="container-custom">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            User Management
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Manage user accounts and permissions
          </p>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Users</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalUsers || 0}</p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Users</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.activeUsers || 0}</p>
              </div>
              <Check className="w-8 h-8 text-green-600" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Banned Users</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.bannedUsers || 0}</p>
              </div>
              <UserX className="w-8 h-8 text-red-600" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Admins</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.adminUsers || 0}</p>
              </div>
              <Shield className="w-8 h-8 text-purple-600" />
            </div>
          </motion.div>
        </div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8"
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
            
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="input-field"
            >
              <option value="">All Roles</option>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
            
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="input-field"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="banned">Banned</option>
            </select>
            
            <Button variant="outline" leftIcon={<Filter className="w-4 h-4" />}>
              Advanced Filters
            </Button>
          </div>
        </motion.div>

        {/* Users Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
        >
          {isLoading ? (
            <div className="p-8 flex justify-center">
              <LoadingSpinner size="lg" text="Loading users..." />
            </div>
          ) : usersError ? (
            <div className="p-8 text-center">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Failed to load users</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                {usersError?.message || 'An error occurred while loading users.'}
              </p>
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
              >
                Retry
              </Button>
            </div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No users found</h3>
              <p className="text-gray-500 dark:text-gray-400">Try adjusting your search criteria</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Joined
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Last Login
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                    {users.map((user, index) => (
                      <motion.tr
                        key={user._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: index * 0.05 }}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center text-white font-medium">
                              {user.firstName?.[0]?.toUpperCase() || 'U'}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {user.fullName || `${user.firstName} ${user.lastName}`}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getRoleBadge(user.role)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(user)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(user.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {user.lastLogin ? formatDate(user.lastLogin) : 'Never'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                                  onClick={() => handleViewDetails(user._id)}
                              leftIcon={<Eye className="w-4 h-4" />}
                                >
                              View
                            </Button>
                                
                                {user.role !== 'admin' && (
                              <Button
                                variant={user.isBanned ? "success" : "danger"}
                                size="sm"
                                    onClick={() => handleBanUser(user, !user.isBanned)}
                                leftIcon={user.isBanned ? <ShieldOff className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                              >
                                {user.isBanned ? 'Unban' : 'Ban'}
                              </Button>
                            )}

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewChatHistory(user._id)}
                              leftIcon={<MessageCircle className="w-4 h-4" />}
                            >
                              Chat
                            </Button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-600">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Showing {((pagination.current - 1) * 20) + 1} to {Math.min(pagination.current * 20, pagination.total)} of {pagination.total} users
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={pagination.current === 1}
                        onClick={() => setPage(page - 1)}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={pagination.current === pagination.pages}
                        onClick={() => setPage(page + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </motion.div>
      </div>

      {/* User Details Modal */}
      <Modal
        isOpen={isUserDetailsOpen}
        onClose={() => setIsUserDetailsOpen(false)}
        title="User Details"
        size="lg"
      >
        {userDetailsLoading ? (
          <div className="p-8 flex justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : userDetailsError ? (
          <div className="p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Failed to load user details</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {userDetailsError?.message || 'An error occurred while loading user details.'}
            </p>
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </div>
        ) : userDetails ? (
          <div className="space-y-6">
            {/* User Info */}
            <div className="flex items-center space-x-6">
              <div className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
                {userDetails.user.firstName?.[0]?.toUpperCase() || 'U'}
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {userDetails.user.fullName}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">{userDetails.user.email}</p>
                <div className="flex items-center space-x-3 mt-2">
                  {getRoleBadge(userDetails.user.role)}
                  {getStatusBadge(userDetails.user)}
                </div>
              </div>
            </div>

            {/* User Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {userDetails.chatStats?.totalChats || 0}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Chats</p>
              </div>
              <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {userDetails.chatStats?.activeChats || 0}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Active Chats</p>
              </div>
              <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {userDetails.chatStats?.averageRating?.toFixed(1) || 'N/A'}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Avg Rating</p>
              </div>
              <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {userDetails.chatStats?.totalMessages || 0}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Messages</p>
              </div>
            </div>

            {/* Recent Chats */}
            {userDetails.recentChats?.length > 0 && (
              <div>
                <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                  Recent Chats
                </h4>
                <div className="space-y-2">
                  {userDetails.recentChats.map((chat) => (
                    <div
                      key={chat._id}
                      className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {chat.title}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {chat.category} • {formatDate(chat.createdAt)}
                          </p>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          chat.status === 'active'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                          {chat.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-center text-gray-500 dark:text-gray-400">
            Failed to load user details
          </p>
        )}
      </Modal>

      {/* Ban Confirmation Modal */}
      <Modal
        isOpen={isBanModalOpen}
        onClose={() => setIsBanModalOpen(false)}
        title="Ban User"
        size="md"
      >
        <div className="space-y-4">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center">
              <Ban className="w-5 h-5 text-red-600 mr-2" />
              <h4 className="text-sm font-medium text-red-800 dark:text-red-400">
                Warning: This action will ban the user
              </h4>
            </div>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">
              The user will be immediately logged out and unable to access the platform.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Reason for ban *
            </label>
            <textarea
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              rows={3}
              className="input-field resize-none"
              placeholder="Please provide a detailed reason for banning this user..."
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setIsBanModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmBan}
              isLoading={banUserMutation.isPending}
              leftIcon={<Ban className="w-4 h-4" />}
            >
              Ban User
            </Button>
          </div>
        </div>
      </Modal>

      {/* Chat History Modal */}
      <Modal
        isOpen={isChatHistoryOpen}
        onClose={() => setIsChatHistoryOpen(false)}
        title="User Chat History"
        size="xl"
      >
        {chatHistoryLoading ? (
          <div className="p-8 flex justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : chatHistoryError ? (
          <div className="p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Failed to load chat history</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {chatHistoryError?.message || 'An error occurred while loading chat history.'}
            </p>
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </div>
        ) : userChatHistory.length === 0 ? (
          <div className="p-8 text-center">
            <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No chats found</h3>
            <p className="text-gray-500 dark:text-gray-400">This user hasn't started any conversations yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* User Info */}
            <div className="flex items-center space-x-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="w-12 h-12 bg-primary-600 rounded-full flex items-center justify-center text-white font-bold">
                {userChatHistory[0]?.userId?.firstName?.[0]?.toUpperCase() || (userChatHistory[0]?.userId?.username?.[0]?.toUpperCase() || 'U')}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {userChatHistory[0]?.userId?.fullName ||
                   (userChatHistory[0]?.userId?.firstName && userChatHistory[0]?.userId?.lastName ? `${userChatHistory[0].userId.firstName} ${userChatHistory[0].userId.lastName}` : null) ||
                   userChatHistory[0]?.userId?.username ||
                   'Unknown User'}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">{userChatHistory[0]?.userId?.email || 'No email available'}</p>
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  {userChatHistory.length} total chats
                </p>
              </div>
            </div>

            {/* Chat List */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {userChatHistory.map((chat, index) => (
                <motion.div
                  key={chat._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {chat.title}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {chat.issue}
                      </p>
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        chat.status === 'active'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {chat.status}
                      </span>
                      {chat.review?.rating && (
                        <div className="flex items-center">
                          <Star className="w-3 h-3 text-yellow-400 fill-current mr-1" />
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                            {chat.review.rating}/5
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                    <span>Category: {chat.category ? chat.category.replace('_', ' ') : 'Other'}</span>
                    <span>Started: {formatDate(chat.createdAt)}</span>
                  </div>

                  {/* Show last message if available */}
                  {chat.messages && chat.messages.length > 0 && (
                    <div className="mt-3 p-2 bg-white dark:bg-gray-600 rounded border-l-2 border-primary-500">
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Last message: {chat.messages[chat.messages.length - 1].content.substring(0, 100)}
                        {chat.messages[chat.messages.length - 1].content.length > 100 ? '...' : ''}
                      </p>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminUsers;
