import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, MessageCircle, Star, Filter, Activity, User as UserIcon, Bot, Download } from 'lucide-react';
import userService from '../services/userService';
import chatService from '../services/chatService';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Modal from '../components/ui/Modal';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import toast from 'react-hot-toast';

const Reports = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const exportRef = useRef(null);

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['user-dashboard-stats'],
    queryFn: () => userService.getDashboardStats(),
    staleTime: 60000,
  });

  const { data: chatsData, isLoading: chatsLoading } = useQuery({
    queryKey: ['user-chats-report', { page, selectedStatus }],
    queryFn: () => chatService.getUserChats({ page, limit: 20, status: selectedStatus }),
    keepPreviousData: true,
  });

  const stats = statsData?.data?.stats || {};
  const allChats = chatsData?.data?.chats || [];
  const chats = allChats
    .filter(c => (selectedCategory ? c.category === selectedCategory : true))
    .filter(c => (selectedPriority ? c.priority === selectedPriority : true))
    .filter(c => (searchTerm ? (c.title?.toLowerCase()?.includes(searchTerm.toLowerCase()) || c.issue?.toLowerCase()?.includes(searchTerm.toLowerCase())) : true));
  const pagination = chatsData?.data?.pagination || {};

  const getPriorityBadge = (priority) => {
    const styles = {
      low: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      urgent: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
    };
    return <span className={`px-2 py-1 text-xs rounded-full ${styles[priority] || styles.medium}`}>{priority}</span>;
  };

  const getStatusBadge = (status) => {
    const styles = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      resolved: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      archived: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    };
    return <span className={`px-2 py-1 text-xs rounded-full ${styles[status] || styles.active}`}>{status}</span>;
  };

  const formatDate = (dateString) => new Date(dateString).toLocaleDateString();
  const [isChatDetailsOpen, setIsChatDetailsOpen] = useState(false);
  const [selectedChat, setSelectedChat] = useState(null);

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
      addText('CareEase Reports', 20, 20, pageWidth - 40, 20, true);
      
      pdf.setTextColor(0, 0, 0);
      yPosition = 40;
      
      // Report generation info
      addText(`Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, 20, yPosition, pageWidth - 40, 10);
      yPosition += 15;
      
      // Statistics section
      checkNewPage(30);
      addText('STATISTICS OVERVIEW', 20, yPosition, pageWidth - 40, 14, true);
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
      
      yPosition += 10;
      
      // Filter information
      checkNewPage(20);
      addText('FILTERS APPLIED', 20, yPosition, pageWidth - 40, 14, true);
      yPosition += 10;
      
      const filters = [];
      if (searchTerm) filters.push(`Search: "${searchTerm}"`);
      if (selectedCategory) filters.push(`Category: ${selectedCategory}`);
      if (selectedPriority) filters.push(`Priority: ${selectedPriority}`);
      if (selectedStatus) filters.push(`Status: ${selectedStatus}`);
      
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
        addText('Category', 70, yPosition, 25, 10, true);
        addText('Priority', 100, yPosition, 20, 10, true);
        addText('Status', 125, yPosition, 20, 10, true);
        addText('Description', 150, yPosition, 50, 10, true);
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
          addText(chat.category?.replace('_', ' ') || 'N/A', 70, yPosition, 25, 9);
          addText(chat.priority || 'N/A', 100, yPosition, 20, 9);
          addText(chat.status || 'N/A', 125, yPosition, 20, 9);
          addText(chat.issue?.substring(0, 30) + (chat.issue?.length > 30 ? '...' : '') || 'No description', 150, yPosition, 50, 9);
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
        pdf.text('CareEase - AI-Powered Elderly Care Assistance', 20, pageHeight - 10);
      }
      
      // Download the PDF
      const fileName = `CareEase_Reports_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      
      toast.success('Report exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export report. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Fetch full chat details when modal opens
  const { data: chatDetailsData, isLoading: chatDetailsLoading } = useQuery({
    queryKey: ['user-chat-details-report', selectedChat?._id],
    queryFn: () => chatService.getChat(selectedChat._id),
    enabled: isChatDetailsOpen && !!selectedChat?._id,
  });
  const chatDetails = chatDetailsData?.data?.chat;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="container-custom" ref={exportRef}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Reports</h1>
          <p className="text-gray-600 dark:text-gray-300">Your chats overview, analytics, and quick access.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Chats</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalChats || 0}</p>
              </div>
              <MessageCircle className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.activeChats || 0}</p>
              </div>
              <Activity className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Resolved</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.resolvedChats || 0}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-purple-600" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Rating</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.averageRating ? `${stats.averageRating.toFixed(1)}/5` : 'N/A'}</p>
              </div>
              <Star className="w-8 h-8 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Input placeholder="Search chats..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="input-field">
              <option value="">All Categories</option>
              <option value="health">Health</option>
              <option value="medication">Medication</option>
              <option value="mobility">Mobility</option>
              <option value="emotional">Emotional</option>
              <option value="daily_care">Daily Care</option>
              <option value="emergency">Emergency</option>
              <option value="other">Other</option>
            </select>
            <select value={selectedPriority} onChange={(e) => setSelectedPriority(e.target.value)} className="input-field">
              <option value="">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
            <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="input-field">
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="resolved">Resolved</option>
              <option value="archived">Archived</option>
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
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {chatsLoading || statsLoading ? (
            <div className="p-8 flex justify-center">
              <LoadingSpinner size="lg" text="Loading..." />
            </div>
          ) : chats.length === 0 ? (
            <div className="p-8 text-center">
              <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No chats found</h3>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Title</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Description</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Priority</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                    {chats.map((chat) => (
                      <tr key={chat._id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer" onClick={() => { setSelectedChat(chat); setIsChatDetailsOpen(true); }}>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{chat.title}</td>
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-300 truncate max-w-xs">{chat.issue}</td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white capitalize">{chat.category?.replace('_', ' ')}</td>
                        <td className="px-6 py-4">{getPriorityBadge(chat.priority)}</td>
                        <td className="px-6 py-4">{getStatusBadge(chat.status)}</td>
                        <td className="px-6 py-4 text-right"></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {pagination.pages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-600 flex items-center justify-between">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Showing {((pagination.current - 1) * 20) + 1} to {Math.min(pagination.current * 20, pagination.total)} of {pagination.total}
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" disabled={pagination.current === 1} onClick={() => setPage(page - 1)}>Previous</Button>
                    <Button variant="outline" size="sm" disabled={pagination.current === pagination.pages} onClick={() => setPage(page + 1)}>Next</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <Modal
        isOpen={isChatDetailsOpen}
        onClose={() => setIsChatDetailsOpen(false)}
        title={(chatDetails?.title || selectedChat?.title) || 'Chat Details'}
        size="xl"
      >
        {chatDetailsLoading ? (
          <div className="p-8 flex justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : chatDetails ? (
          <div className="space-y-6">
            <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{chatDetails.title || 'Untitled Chat'}</h3>
              <p className="text-gray-600 dark:text-gray-400 mt-1">{chatDetails.issue || 'No description available'}</p>
              <div className="mt-2 flex items-center space-x-3 text-xs">
                <span className="capitalize">{chatDetails.category?.replace('_', ' ')}</span>
                <span>•</span>
                <span className="capitalize">{chatDetails.priority}</span>
                <span>•</span>
                <span className="capitalize">{chatDetails.status}</span>
              </div>
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
                      <p className={`text-xs mt-2 ${message.role === 'user' ? 'text-primary-100' : 'text-gray-500 dark:text-gray-400'}`}>
                        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              <Button onClick={() => { setIsChatDetailsOpen(false); navigate(`/chat/${chatDetails._id}`); }}>Open Full Conversation</Button>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center text-gray-500 dark:text-gray-400">No chat selected</div>
        )}
      </Modal>
    </div>
  );
};

export default Reports;


// Chat Details Modal Component (inline)
// Note: we reuse Modal from components. If not imported above, add similar inline modal or reuse page-level modal if available.
