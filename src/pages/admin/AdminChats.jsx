import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Filter,
  Eye,
  MessageCircle,
  Star,
  Calendar,
  User,
  Bot,
  BarChart3,
  AlertTriangle,
  Download
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import adminService from '../../services/adminService';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import jsPDF from 'jspdf';
import toast from 'react-hot-toast';

const AdminChats = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [selectedChat, setSelectedChat] = useState(null);
  const [isChatDetailsOpen, setIsChatDetailsOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const exportRef = useRef(null);

  // Get chats with filters
  const { data: chatsData, isLoading, error: chatsError } = useQuery({
    queryKey: ['admin-chats', {
      page,
      search: searchTerm,
      category: selectedCategory,
      status: selectedStatus,
      priority: selectedPriority
    }],
    queryFn: () => adminService.getAllChats({
      page,
      limit: 20,
      search: searchTerm,
      category: selectedCategory,
      status: selectedStatus,
      priority: selectedPriority
    }),
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Get chat details
  const { data: chatDetailsData, isLoading: chatDetailsLoading, error: chatDetailsError } = useQuery({
    queryKey: ['admin-chat-details', selectedChat],
    queryFn: () => adminService.getChatDetails(selectedChat),
    enabled: !!selectedChat && isChatDetailsOpen,
    retry: 2,
    retryDelay: 1000,
  });

  const chats = chatsData?.data?.chats || [];
  const pagination = chatsData?.data?.pagination || {};
  const stats = chatsData?.data?.stats || {};
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
      addText('CareEase Admin Chats Report', 20, 20, pageWidth - 40, 20, true);
      
      pdf.setTextColor(0, 0, 0);
      yPosition = 40;
      
      // Report generation info
      addText(`Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, 20, yPosition, pageWidth - 40, 10);
      yPosition += 15;
      
      // Statistics overview
      checkNewPage(30);
      addText('CHAT STATISTICS', 20, yPosition, pageWidth - 40, 14, true);
      yPosition += 10;
      
      const statsData = [
        { label: 'Total Chats', value: stats.totalChats || 0 },
        { label: 'Active Chats', value: stats.activeChats || 0 },
        { label: 'Resolved Chats', value: stats.resolvedChats || 0 },
        { label: 'Average Rating', value: stats.averageRating ? `${stats.averageRating.toFixed(1)}/5` : 'N/A' }
      ];
      
      statsData.forEach(stat => {
        checkNewPage(8);
        addText(`${stat.label}: ${stat.value}`, 30, yPosition, pageWidth - 60, 11);
        yPosition += 8;
      });
      
      yPosition += 15;
      
      // Filter information
      checkNewPage(20);
      addText('FILTERS APPLIED', 20, yPosition, pageWidth - 40, 14, true);
      yPosition += 10;
      
      const filters = [];
      if (searchTerm) filters.push(`Search: "${searchTerm}"`);
      if (selectedCategory) filters.push(`Category: ${selectedCategory}`);
      if (selectedStatus) filters.push(`Status: ${selectedStatus}`);
      if (selectedPriority) filters.push(`Priority: ${selectedPriority}`);
      
      if (filters.length > 0) {
        filters.forEach(filter => {
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
      
      // Footer
      const totalPages = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(128, 128, 128);
        pdf.text(`Page ${i} of ${totalPages}`, pageWidth - 30, pageHeight - 10);
        pdf.text('CareEase Admin Chats - AI-Powered Elderly Care Platform', 20, pageHeight - 10);
      }
      
      // Download the PDF
      const fileName = `CareEase_Admin_Chats_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      
      toast.success('Admin chats report exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export chats report. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleViewDetails = (chatId) => {
    setSelectedChat(chatId);
    setIsChatDetailsOpen(true);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getStatusBadge = (status) => {
    const styles = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      resolved: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      archived: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    };
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${styles[status] || styles.active}`}>
        {status}
      </span>
    );
  };

  const getPriorityBadge = (priority) => {
    const styles = {
      low: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      urgent: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
    };
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${styles[priority] || styles.medium}`}>
        {priority}
      </span>
    );
  };

  const getCategoryIcon = (category) => {
    const icons = {
      health: '🏥',
      medication: '💊',
      mobility: '🚶',
      emotional: '❤️',
      daily_care: '🏠',
      emergency: '🚨',
      other: '❓'
    };
    return icons[category] || icons.other;
  };

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
            Chat Management
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Monitor and analyze user conversations
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
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalChats || 0}</p>
              </div>
              <MessageCircle className="w-8 h-8 text-blue-600" />
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
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.activeChats || 0}</p>
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
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.resolvedChats || 0}</p>
              </div>
              <Calendar className="w-8 h-8 text-purple-600" />
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
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.averageRating ? `${stats.averageRating.toFixed(1)}/5` : 'N/A'}
                </p>
              </div>
              <Star className="w-8 h-8 text-yellow-600" />
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
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Input
              placeholder="Search chats..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
            
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="input-field"
            >
              <option value="">All Categories</option>
              <option value="health">Health</option>
              <option value="medication">Medication</option>
              <option value="mobility">Mobility</option>
              <option value="emotional">Emotional</option>
              <option value="daily_care">Daily Care</option>
              <option value="emergency">Emergency</option>
              <option value="other">Other</option>
            </select>
            
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="input-field"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="resolved">Resolved</option>
              <option value="archived">Archived</option>
            </select>
            
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="input-field"
            >
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
        </motion.div>

        {/* Chats Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
        >
          {isLoading ? (
            <div className="p-8 flex justify-center">
              <LoadingSpinner size="lg" text="Loading chats..." />
            </div>
          ) : chats.length === 0 ? (
            <div className="p-8 text-center">
              <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No chats found</h3>
              <p className="text-gray-500 dark:text-gray-400">Try adjusting your search criteria</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Chat
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Priority
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Rating
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                    {chats.map((chat, index) => (
                      <motion.tr
                        key={chat._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: index * 0.05 }}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {chat.title || 'Untitled Chat'}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                              {chat.issue || 'No description available'}
                            </div>
                            <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                              {chat.metadata?.totalMessages || 0} messages
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                              {chat.userId?.firstName?.[0]?.toUpperCase() || (chat.userId?.username?.[0]?.toUpperCase() || 'U')}
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {chat.userId?.fullName ||
                                 (chat.userId?.firstName && chat.userId?.lastName ? `${chat.userId.firstName} ${chat.userId.lastName}` : null) ||
                                 chat.userId?.username ||
                                 'Unknown User'}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {chat.userId?.email || 'No email available'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className="mr-2">{getCategoryIcon(chat.category || 'other')}</span>
                            <span className="text-sm text-gray-900 dark:text-white capitalize">
                              {chat.category ? chat.category.replace('_', ' ') : 'Other'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getPriorityBadge(chat.priority || 'medium')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(chat.status || 'active')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          <div>{formatDate(chat.createdAt)}</div>
                          <div className="text-xs">{formatTime(chat.createdAt)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {chat.review?.rating ? (
                            <div className="flex items-center">
                              <Star className="w-4 h-4 text-yellow-400 fill-current mr-1" />
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {chat.review.rating}/5
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">No rating</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetails(chat._id)}
                            leftIcon={<Eye className="w-4 h-4" />}
                          >
                            View
                          </Button>
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
                      Showing {((pagination.current - 1) * 20) + 1} to {Math.min(pagination.current * 20, pagination.total)} of {pagination.total} chats
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

      {/* Chat Details Modal */}
      <Modal
        isOpen={isChatDetailsOpen}
        onClose={() => setIsChatDetailsOpen(false)}
        title="Chat Details"
        size="xl"
      >
        {chatDetailsLoading ? (
          <div className="p-8 flex justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : chatDetails ? (
          <div className="space-y-6">
            {/* Chat Info */}
            <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {chatDetails.title || 'Untitled Chat'}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    {chatDetails.issue || 'No description available'}
                  </p>
                  <div className="flex items-center space-x-4 mt-3">
                    <div className="flex items-center">
                      <span className="mr-2">{getCategoryIcon(chatDetails.category || 'other')}</span>
                      <span className="text-sm capitalize">
                        {chatDetails.category ? chatDetails.category.replace('_', ' ') : 'Other'}
                      </span>
                    </div>
                    {getPriorityBadge(chatDetails.priority || 'medium')}
                    {getStatusBadge(chatDetails.status || 'active')}
                  </div>
                </div>
                
                {chatDetails.review?.rating && (
                  <div className="text-right">
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < chatDetails.review.rating
                              ? 'text-yellow-400 fill-current'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      User Rating
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* User Info */}
            <div className="flex items-center space-x-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="w-12 h-12 bg-primary-600 rounded-full flex items-center justify-center text-white font-bold">
                {chatDetails.userId?.firstName?.[0]?.toUpperCase() || (chatDetails.userId?.username?.[0]?.toUpperCase() || 'U')}
              </div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">
                  {chatDetails.userId?.fullName ||
                   (chatDetails.userId?.firstName && chatDetails.userId?.lastName ? `${chatDetails.userId.firstName} ${chatDetails.userId.lastName}` : null) ||
                   chatDetails.userId?.username ||
                   'Unknown User'}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {chatDetails.userId?.email || 'No email available'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  Started on {formatDate(chatDetails.createdAt)}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div>
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Conversation ({chatDetails.messages?.length || 0} messages)
              </h4>
              <div className="max-h-96 overflow-y-auto space-y-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                {chatDetails.messages && chatDetails.messages.length > 0 ? chatDetails.messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex items-start space-x-3 max-w-[80%] ${
                      message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                    }`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        message.role === 'user'
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                      }`}>
                        {message.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                      </div>
                      
                      <div className={`rounded-2xl px-4 py-3 ${
                        message.role === 'user'
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                      }`}>
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        <p className={`text-xs mt-2 ${
                          message.role === 'user' 
                            ? 'text-primary-100' 
                            : 'text-gray-500 dark:text-gray-400'
                        }`}>
                          {formatTime(message.timestamp)}
                        </p>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-8">
                    <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">No messages in this conversation</p>
                  </div>
                )}
              </div>
            </div>

            {/* Review */}
            {chatDetails.review?.feedback && (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                  User Feedback
                </h4>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {chatDetails.review.feedback}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                  Reviewed on {formatDate(chatDetails.review.reviewedAt)}
                </p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-center text-gray-500 dark:text-gray-400">
            Failed to load chat details
          </p>
        )}
      </Modal>
    </div>
  );
};

export default AdminChats;
