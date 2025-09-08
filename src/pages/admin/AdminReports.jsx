import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, 
  CheckCircle, 
  X,
  Eye,
  MessageSquare,
  Calendar,
  Search,
  BarChart3,
  Star,
  User as UserIcon,
  Bot,
  Download
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import adminService from '../../services/adminService';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import jsPDF from 'jspdf';
import toast from 'react-hot-toast';

const AdminReports = () => {
  const [activeTab, setActiveTab] = useState('chats'); // 'chats' | 'users'
  const [userPage, setUserPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const exportRef = useRef(null);

  // Chats tab filters
  const [chatSearch, setChatSearch] = useState('');
  const [chatCategory, setChatCategory] = useState('');
  const [chatStatus, setChatStatus] = useState('');
  const [chatPriority, setChatPriority] = useState('');
  const [chatPage, setChatPage] = useState(1);
  // Removed report-related state per request

  // Get reports with filters
  // Remove reports feature per request
  const reports = [];
  const pagination = {};

  // Users list to power Users tab (with basic analytics by user)
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users-for-reports', userPage],
    queryFn: () => adminService.getAllUsers({ page: userPage, limit: 20 }),
    enabled: activeTab === 'users',
  });
  const users = usersData?.data?.users || [];
  const usersPagination = usersData?.data?.pagination || {};
  const usersStats = usersData?.data?.stats || {};

  // Chats list for Chats tab
  const { data: chatsData, isLoading: chatsLoading } = useQuery({
    queryKey: ['admin-chats-in-reports', { chatPage, chatSearch, chatCategory, chatStatus, chatPriority }],
    queryFn: () => adminService.getAllChats({
      page: chatPage,
      limit: 20,
      search: chatSearch,
      category: chatCategory,
      status: chatStatus,
      priority: chatPriority,
    }),
    enabled: activeTab === 'chats',
    retry: 3,
    retryDelay: (i) => Math.min(1000 * 2 ** i, 30000),
  });
  const chats = chatsData?.data?.chats || [];
  const chatsPagination = chatsData?.data?.pagination || {};
  const chatStats = chatsData?.data?.stats || {};
  const [isChatDetailsOpen, setIsChatDetailsOpen] = useState(false);
  const [selectedChatId, setSelectedChatId] = useState(null);

  const { data: chatDetailsData, isLoading: chatDetailsLoading } = useQuery({
    queryKey: ['admin-chat-details-in-reports', selectedChatId],
    queryFn: () => adminService.getChatDetails(selectedChatId),
    enabled: !!selectedChatId && isChatDetailsOpen,
  });
  const chatDetails = chatDetailsData?.data?.chat;

  // PDF Export function
  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = 210;
      const pageHeight = 295;
      let yPosition = 20;
      
      // Helper function to add text with word wrapping
      const addText = (text, x, y, maxWidth, fontSize = 12, isBold = false) => {
        pdf.setFontSize(fontSize);
        pdf.setFont('helvetica', isBold ? 'bold' : 'normal');
        const lines = pdf.splitTextToSize(text, maxWidth);
        pdf.text(lines, x, y);
        return y + (lines.length * fontSize * 0.4);
      };
      
      // Helper function to check if we need a new page
      const checkNewPage = (requiredSpace) => {
        if (yPosition + requiredSpace > pageHeight - 20) {
          pdf.addPage();
          yPosition = 20;
          return true;
        }
        return false;
      };
      
      // Header
      pdf.setFillColor(59, 130, 246); // Blue color
      pdf.rect(0, 0, pageWidth, 30, 'F');
      
      pdf.setTextColor(255, 255, 255);
      addText('CareEase Admin Reports', 20, 20, pageWidth - 40, 20, true);
      
      pdf.setTextColor(0, 0, 0);
      yPosition = 40;
      
      // Report generation info
      addText(`Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, 20, yPosition, pageWidth - 40, 10);
      addText(`Active Tab: ${activeTab === 'chats' ? 'Chats' : 'Users'}`, 20, yPosition + 8, pageWidth - 40, 10);
      yPosition += 20;
      
      if (activeTab === 'chats') {
        // Chat statistics
        checkNewPage(30);
        addText('CHAT STATISTICS', 20, yPosition, pageWidth - 40, 14, true);
        yPosition += 10;
        
        const chatStatsData = [
          { label: 'Total Chats', value: chatStats.totalChats || 0 },
          { label: 'Active Chats', value: chatStats.activeChats || 0 },
          { label: 'Resolved Chats', value: chatStats.resolvedChats || 0 },
          { label: 'Average Rating', value: chatStats.averageRating ? `${chatStats.averageRating.toFixed(1)}/5` : 'N/A' }
        ];
        
        chatStatsData.forEach(stat => {
          checkNewPage(8);
          addText(`${stat.label}: ${stat.value}`, 30, yPosition, pageWidth - 60, 11);
          yPosition += 8;
        });
        
        yPosition += 15;
        
        // Chat filters
        checkNewPage(20);
        addText('CHAT FILTERS APPLIED', 20, yPosition, pageWidth - 40, 14, true);
        yPosition += 10;
        
        const chatFilters = [];
        if (chatSearch) chatFilters.push(`Search: "${chatSearch}"`);
        if (chatCategory) chatFilters.push(`Category: ${chatCategory}`);
        if (chatStatus) chatFilters.push(`Status: ${chatStatus}`);
        if (chatPriority) chatFilters.push(`Priority: ${chatPriority}`);
        
        if (chatFilters.length > 0) {
          chatFilters.forEach(filter => {
            checkNewPage(6);
            addText(`• ${filter}`, 30, yPosition, pageWidth - 60, 10);
            yPosition += 6;
          });
        } else {
          addText('No filters applied', 30, yPosition, pageWidth - 60, 10);
          yPosition += 6;
        }
        
        yPosition += 15;
        
        // Chats table
        checkNewPage(30);
        addText('CHAT RECORDS', 20, yPosition, pageWidth - 40, 14, true);
        yPosition += 10;
        
        if (chats.length === 0) {
          addText('No chats found matching the current filters.', 30, yPosition, pageWidth - 60, 10);
        } else {
          // Table headers
          checkNewPage(15);
          pdf.setFillColor(240, 240, 240);
          pdf.rect(20, yPosition - 5, pageWidth - 40, 10, 'F');
          
          addText('Title', 25, yPosition, 40, 10, true);
          addText('User', 70, yPosition, 30, 10, true);
          addText('Category', 105, yPosition, 25, 10, true);
          addText('Priority', 135, yPosition, 20, 10, true);
          addText('Status', 160, yPosition, 20, 10, true);
          addText('Created', 185, yPosition, 25, 10, true);
          yPosition += 15;
          
          // Table rows
          chats.forEach((chat, index) => {
            checkNewPage(12);
            
            // Alternate row colors
            if (index % 2 === 0) {
              pdf.setFillColor(248, 250, 252);
              pdf.rect(20, yPosition - 5, pageWidth - 40, 10, 'F');
            }
            
            addText(chat.title || 'Untitled', 25, yPosition, 40, 9);
            addText(chat.userId?.fullName || chat.userId?.username || 'Unknown', 70, yPosition, 30, 9);
            addText(chat.category?.replace('_', ' ') || 'Other', 105, yPosition, 25, 9);
            addText(chat.priority || 'medium', 135, yPosition, 20, 9);
            addText(chat.status || 'active', 160, yPosition, 20, 9);
            addText(new Date(chat.createdAt).toLocaleDateString(), 185, yPosition, 25, 9);
            yPosition += 12;
          });
        }
      } else {
        // User statistics
        checkNewPage(30);
        addText('USER STATISTICS', 20, yPosition, pageWidth - 40, 14, true);
        yPosition += 10;
        
        const userStatsData = [
          { label: 'Total Users', value: usersStats.totalUsers || 0 },
          { label: 'Active Users', value: usersStats.activeUsers || 0 },
          { label: 'Banned Users', value: usersStats.bannedUsers || 0 }
        ];
        
        userStatsData.forEach(stat => {
          checkNewPage(8);
          addText(`${stat.label}: ${stat.value}`, 30, yPosition, pageWidth - 60, 11);
          yPosition += 8;
        });
        
        yPosition += 15;
        
        // Users table
        checkNewPage(30);
        addText('USER RECORDS', 20, yPosition, pageWidth - 40, 14, true);
        yPosition += 10;
        
        if (users.length === 0) {
          addText('No users found.', 30, yPosition, pageWidth - 60, 10);
        } else {
          // Table headers
          checkNewPage(15);
          pdf.setFillColor(240, 240, 240);
          pdf.rect(20, yPosition - 5, pageWidth - 40, 10, 'F');
          
          addText('User', 25, yPosition, 50, 10, true);
          addText('Email', 80, yPosition, 60, 10, true);
          addText('Role', 145, yPosition, 25, 10, true);
          addText('Status', 175, yPosition, 25, 10, true);
          yPosition += 15;
          
          // Table rows
          users.forEach((user, index) => {
            checkNewPage(12);
            
            // Alternate row colors
            if (index % 2 === 0) {
              pdf.setFillColor(248, 250, 252);
              pdf.rect(20, yPosition - 5, pageWidth - 40, 10, 'F');
            }
            
            addText(user.fullName || user.username, 25, yPosition, 50, 9);
            addText(user.email, 80, yPosition, 60, 9);
            addText(user.role, 145, yPosition, 25, 9);
            addText(user.isBanned ? 'Banned' : (user.isActive ? 'Active' : 'Inactive'), 175, yPosition, 25, 9);
            yPosition += 12;
          });
        }
      }
      
      // Footer
      const totalPages = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(128, 128, 128);
        pdf.text(`Page ${i} of ${totalPages}`, pageWidth - 30, pageHeight - 10);
        pdf.text('CareEase Admin Reports - AI-Powered Elderly Care Platform', 20, pageHeight - 10);
      }
      
      // Download the PDF
      const fileName = `CareEase_Admin_Reports_${activeTab}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      
      toast.success('Admin reports exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export reports. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Removed report handlers

  // Utility
  const formatTime = (dateString) => new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Removed report helpers



  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="container-custom" ref={exportRef}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Report Management
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Review and manage user reports and system alerts
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
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Chats</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{chatStats.totalChats || 0}</p>
              </div>
              <MessageSquare className="w-8 h-8 text-blue-600" />
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
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Chats</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{chatStats.activeChats || 0}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-green-600" />
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
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Resolved Chats</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{chatStats.resolvedChats || 0}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-purple-600" />
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
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Rating</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{chatStats.averageRating ? chatStats.averageRating.toFixed(1) : 'N/A'}</p>
              </div>
              <Star className="w-8 h-8 text-yellow-600" />
            </div>
          </motion.div>
        </div>

        {/* Tabs */}
        <div className="mb-4">
          <div className="inline-flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
            <button className={`px-4 py-2 text-sm ${activeTab === 'chats' ? 'bg-primary-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`} onClick={() => setActiveTab('chats')}>Chats</button>
            <button className={`px-4 py-2 text-sm ${activeTab === 'users' ? 'bg-primary-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`} onClick={() => setActiveTab('users')}>Users</button>
          </div>
        </div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8"
        >
          {activeTab === 'users' ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Users</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{usersStats.totalUsers || 0}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500 dark:text-gray-400">Active Users</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{usersStats.activeUsers || 0}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500 dark:text-gray-400">Banned Users</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{usersStats.bannedUsers || 0}</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <Input
                placeholder="Search chats..."
                value={chatSearch}
                onChange={(e) => setChatSearch(e.target.value)}
                leftIcon={<Search className="w-4 h-4" />}
              />
              <select value={chatCategory} onChange={(e) => setChatCategory(e.target.value)} className="input-field">
                <option value="">All Categories</option>
                <option value="health">Health</option>
                <option value="medication">Medication</option>
                <option value="mobility">Mobility</option>
                <option value="emotional">Emotional</option>
                <option value="daily_care">Daily Care</option>
                <option value="emergency">Emergency</option>
                <option value="other">Other</option>
              </select>
              <select value={chatStatus} onChange={(e) => setChatStatus(e.target.value)} className="input-field">
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="resolved">Resolved</option>
                <option value="archived">Archived</option>
              </select>
              <select value={chatPriority} onChange={(e) => setChatPriority(e.target.value)} className="input-field">
                <option value="">All Priorities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
              <Button 
                variant="outline" 
                leftIcon={<Download className="w-4 h-4" />}
                onClick={handleExportPDF}
                disabled={isExporting}
                isLoading={isExporting}
              >
                {isExporting ? 'Exporting...' : 'Export PDF'}
              </Button>
            </div>
          )}
        </motion.div>

        {/* Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
        >
          {activeTab === 'users' ? (
            <>
              {usersLoading ? (
                <div className="p-8 flex justify-center">
                  <LoadingSpinner size="lg" text="Loading users..." />
                </div>
              ) : users.length === 0 ? (
                <div className="p-8 text-center">
                  <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No users found</h3>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">User</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Role</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                      {users.map((u) => (
                        <tr key={u._id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                          <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{u.fullName || u.username}</td>
                          <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-300">{u.email}</td>
                          <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-300 capitalize">{u.role}</td>
                          <td className="px-6 py-4 text-sm">
                            <span className={`px-2 py-1 text-xs rounded-full ${u.isBanned ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' : (u.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300')}`}>
                              {u.isBanned ? 'Banned' : (u.isActive ? 'Active' : 'Inactive')}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {usersPagination.pages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-600">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Showing {((usersPagination.current - 1) * 20) + 1} to {Math.min(usersPagination.current * 20, usersPagination.total)} of {usersPagination.total} users
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" disabled={usersPagination.current === 1} onClick={() => setUserPage(userPage - 1)}>Previous</Button>
                      <Button variant="outline" size="sm" disabled={usersPagination.current === usersPagination.pages} onClick={() => setUserPage(userPage + 1)}>Next</Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {chatsLoading ? (
                <div className="p-8 flex justify-center">
                  <LoadingSpinner size="lg" text="Loading chats..." />
                </div>
              ) : chats.length === 0 ? (
                <div className="p-8 text-center">
                  <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No chats found</h3>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Chat</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">User</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Category</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Priority</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Created</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Rating</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                      {chats.map((chat, index) => (
                        <motion.tr
                          key={chat._id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4, delay: index * 0.05 }}
                          className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                          onClick={() => { setSelectedChatId(chat._id); setIsChatDetailsOpen(true); }}
                        >
                          <td className="px-6 py-4">
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">{chat.title || 'Untitled Chat'}</div>
                              <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">{chat.issue || 'No description available'}</div>
                              <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">{chat.metadata?.totalMessages || 0} messages</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{chat.userId?.fullName || chat.userId?.username || 'Unknown User'}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">{chat.userId?.email || 'No email available'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap capitalize">{chat.category?.replace('_', ' ') || 'Other'}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              chat.priority === 'urgent' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                              chat.priority === 'high' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' :
                              chat.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                              'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                            }`}>{chat.priority || 'medium'}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              chat.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                              chat.status === 'resolved' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                              'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                            }`}>{chat.status || 'active'}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{new Date(chat.createdAt).toLocaleDateString()}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {chat.review?.rating ? (
                              <div className="flex items-center">
                                <Star className="w-4 h-4 text-yellow-400 fill-current mr-1" />
                                <span className="text-sm font-medium text-gray-900 dark:text-white">{chat.review.rating}/5</span>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">No rating</span>
                            )}
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {chatsPagination.pages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-600">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Showing {((chatsPagination.current - 1) * 20) + 1} to {Math.min(chatsPagination.current * 20, chatsPagination.total)} of {chatsPagination.total} chats
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" disabled={chatsPagination.current === 1} onClick={() => setChatPage(chatPage - 1)}>Previous</Button>
                      <Button variant="outline" size="sm" disabled={chatsPagination.current === chatsPagination.pages} onClick={() => setChatPage(chatPage + 1)}>Next</Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </motion.div>
      </div>

      {/* Chat Details Modal */}
      <Modal
        isOpen={isChatDetailsOpen}
        onClose={() => setIsChatDetailsOpen(false)}
        title="Chat Details"
        size="xl"
      >
        {chatDetails ? (
          <div className="space-y-6">
            <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{chatDetails.title || 'Untitled Chat'}</h3>
              <p className="text-gray-600 dark:text-gray-400 mt-1">{chatDetails.issue || 'No description available'}</p>
            </div>
            <div className="max-h-96 overflow-y-auto space-y-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              {chatDetails.messages?.map((message, idx) => (
                <div key={idx} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex items-start space-x-3 max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${message.role === 'user' ? 'bg-primary-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                      {message.role === 'user' ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>
                    <div className={`rounded-2xl px-4 py-3 ${message.role === 'user' ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'}`}>
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <p className={`text-xs mt-2 ${message.role === 'user' ? 'text-primary-100' : 'text-gray-500 dark:text-gray-400'}`}>{formatTime(message.timestamp)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-8 flex justify-center">
            <LoadingSpinner size="lg" />
          </div>
        )}
      </Modal>

      {/* Removed update report modal */}
    </div>
  );
};

export default AdminReports;
