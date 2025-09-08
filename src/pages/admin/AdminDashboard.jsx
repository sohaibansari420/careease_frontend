import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  BarChart3,
  TrendingUp,
  Shield,
  AlertCircle,
  Activity,
  Calendar,
  Download
} from 'lucide-react';
import adminService from '../../services/adminService';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Button from '../../components/ui/Button';
import jsPDF from 'jspdf';
import toast from 'react-hot-toast';

const AdminDashboard = () => {
  const [timeframe, setTimeframe] = useState('30d');
  const [statsRef, statsInView] = useInView({ triggerOnce: true, threshold: 0.1 });
  const [isExporting, setIsExporting] = useState(false);
  const exportRef = useRef(null);

  // Get dashboard analytics
  const { data: analyticsData, isLoading, error } = useQuery({
    queryKey: ['admin-analytics', timeframe],
    queryFn: () => adminService.getDashboardAnalytics(timeframe),
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const analytics = analyticsData?.data || {};

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
      addText('CareEase Admin Dashboard Report', 20, 20, pageWidth - 40, 20, true);
      
      pdf.setTextColor(0, 0, 0);
      yPosition = 40;
      
      // Report generation info
      addText(`Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, 20, yPosition, pageWidth - 40, 10);
      addText(`Timeframe: ${timeframe === '7d' ? 'Last 7 days' : timeframe === '30d' ? 'Last 30 days' : 'Last 90 days'}`, 20, yPosition + 8, pageWidth - 40, 10);
      yPosition += 20;
      
      // Statistics overview
      checkNewPage(40);
      addText('PLATFORM STATISTICS', 20, yPosition, pageWidth - 40, 14, true);
      yPosition += 10;
      
      const statsData = [
        { label: 'Total Users', value: analytics.users?.total || 0, change: `+${analytics.users?.new || 0} new` },
        { label: 'Active Users', value: analytics.users?.active || 0, change: `${analytics.users?.banned || 0} banned` },
        { label: 'Total Chats', value: analytics.chats?.total || 0, change: `+${analytics.chats?.new || 0} new` },
        { label: 'Average Rating', value: analytics.chats?.averageRating ? `${analytics.chats.averageRating.toFixed(1)}/5` : 'N/A', change: 'User satisfaction' }
      ];
      
      statsData.forEach(stat => {
        checkNewPage(12);
        addText(`${stat.label}: ${stat.value}`, 30, yPosition, pageWidth - 60, 11, true);
        addText(stat.change, 30, yPosition + 6, pageWidth - 60, 9);
        yPosition += 12;
      });
      
      yPosition += 15;
      
      // Recent Activity
      checkNewPage(30);
      addText('RECENT ACTIVITY', 20, yPosition, pageWidth - 40, 14, true);
      yPosition += 10;
      
      if (recentActivity.length > 0) {
        recentActivity.forEach(activity => {
          checkNewPage(8);
          addText(`• ${activity.message}`, 30, yPosition, pageWidth - 60, 10);
          addText(activity.time, 30, yPosition + 5, pageWidth - 60, 8);
          yPosition += 8;
        });
      } else {
        addText('No recent activity to display', 30, yPosition, pageWidth - 60, 10);
        yPosition += 8;
      }
      
      yPosition += 15;
      
      // System Alerts
      checkNewPage(30);
      addText('SYSTEM ALERTS', 20, yPosition, pageWidth - 40, 14, true);
      yPosition += 10;
      
      if (systemAlerts.length > 0) {
        systemAlerts.forEach(alert => {
          checkNewPage(8);
          addText(`• ${alert.message}`, 30, yPosition, pageWidth - 60, 10);
          addText(`Severity: ${alert.severity}`, 30, yPosition + 5, pageWidth - 60, 8);
          yPosition += 8;
        });
      } else {
        addText('No system alerts at this time', 30, yPosition, pageWidth - 60, 10);
        yPosition += 8;
      }
      
      yPosition += 15;
      
      // Chat Trends
      if (analytics.trends?.chatCreation && analytics.trends.chatCreation.length > 0) {
        checkNewPage(40);
        addText('CHAT ACTIVITY TRENDS', 20, yPosition, pageWidth - 40, 14, true);
        yPosition += 10;
        
        addText(`Daily Chat Creation (${analytics.trends.chatCreation.length} days)`, 30, yPosition, pageWidth - 60, 11, true);
        yPosition += 8;
        
        const totalChats = analytics.trends.chatCreation.reduce((sum, item) => sum + item.count, 0);
        addText(`Total chats in period: ${totalChats}`, 30, yPosition, pageWidth - 60, 10);
        yPosition += 8;
        
        // Show recent trend data
        const recentTrends = analytics.trends.chatCreation.slice(-7);
        recentTrends.forEach(trend => {
          checkNewPage(6);
          const date = new Date(trend._id);
          addText(`${date.toLocaleDateString()}: ${trend.count} chats`, 30, yPosition, pageWidth - 60, 9);
          yPosition += 6;
        });
      }
      
      // Footer
      const totalPages = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(128, 128, 128);
        pdf.text(`Page ${i} of ${totalPages}`, pageWidth - 30, pageHeight - 10);
        pdf.text('CareEase Admin Dashboard - AI-Powered Elderly Care Platform', 20, pageHeight - 10);
      }
      
      // Download the PDF
      const fileName = `CareEase_Admin_Dashboard_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      
      toast.success('Admin dashboard report exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export dashboard report. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const statCards = [
    {
      title: 'Total Users',
      value: analytics.users?.total || 0,
      change: `+${analytics.users?.new || 0} new`,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900/20',
      trend: 'up'
    },
    {
      title: 'Active Users',
      value: analytics.users?.active || 0,
      change: `${analytics.users?.banned || 0} banned`,
      icon: Activity,
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900/20',
      trend: 'up'
    },
    {
      title: 'Total Chats',
      value: analytics.chats?.total || 0,
      change: `+${analytics.chats?.new || 0} new`,
      icon: BarChart3,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 dark:bg-purple-900/20',
      trend: 'up'
    },
    {
      title: 'Avg Rating',
      value: analytics.chats?.averageRating ? `${analytics.chats.averageRating.toFixed(1)}/5` : 'N/A',
      change: 'User satisfaction',
      icon: Shield,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/20',
      trend: 'up'
    }
  ];

  // Generate recent activity based on available analytics data
  const recentActivity = [
    {
      type: 'user_joined',
      message: `+${analytics.users?.new || 0} new users registered`,
      time: 'Recently',
      icon: Users
    },
    {
      type: 'chat_created',
      message: `${analytics.chats?.new || 0} new chats started`,
      time: 'Recently',
      icon: BarChart3
    },
    {
      type: 'user_banned',
      message: `${analytics.users?.banned || 0} users currently banned`,
      time: 'Current',
      icon: Shield
    },
    {
      type: 'admin_action',
      message: `Average user rating: ${analytics.chats?.averageRating ? analytics.chats.averageRating.toFixed(1) : 'N/A'}/5`,
      time: 'Overall',
      icon: Activity
    }
  ].filter(item => {
    // Only show items that have meaningful data
    if (item.type === 'user_joined') return (analytics.users?.new || 0) > 0;
    if (item.type === 'chat_created') return (analytics.chats?.new || 0) > 0;
    if (item.type === 'user_banned') return (analytics.users?.banned || 0) > 0;
    return true;
  });

  // Generate system alerts based on data
  const systemAlerts = [];
  if ((analytics.users?.banned || 0) > (analytics.users?.total || 0) * 0.1) {
    systemAlerts.push({
      type: 'warning',
      message: 'High number of banned users detected',
      severity: 'medium'
    });
  }
  if ((analytics.chats?.averageRating || 0) < 3.0 && analytics.chats?.total > 0) {
    systemAlerts.push({
      type: 'warning',
      message: 'User satisfaction rating is below average',
      severity: 'medium'
    });
  }
  if (analytics.users?.active === 0) {
    systemAlerts.push({
      type: 'info',
      message: 'No active users currently online',
      severity: 'low'
    });
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading dashboard..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Failed to load dashboard data
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {error?.message || 'An unexpected error occurred while loading the dashboard.'}
          </p>
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Admin Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Monitor and manage your CareEase platform
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                className="input-field"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
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
        </motion.div>

        {/* Stats Grid */}
        <section ref={statsRef} className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {statCards.map((stat, index) => (
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
                  <TrendingUp className={`w-5 h-5 ${stat.trend === 'up' ? 'text-green-500' : 'text-red-500'}`} />
                </div>
                
                <div className="space-y-1">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stat.value}
                  </h3>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {stat.title}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    {stat.change}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Recent Activity */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700"
            >
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Recent Activity
                </h3>
              </div>
              
              <div className="p-6">
                {recentActivity.length === 0 ? (
                  <div className="text-center py-8">
                    <Activity className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                      No recent activity to display
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      Recent activity will appear here when available
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentActivity.map((activity, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, delay: index * 0.1 }}
                        className="flex items-start space-x-4"
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          activity.type === 'user_joined' ? 'bg-green-100 dark:bg-green-900/30' :
                          activity.type === 'chat_created' ? 'bg-blue-100 dark:bg-blue-900/30' :
                          activity.type === 'user_banned' ? 'bg-red-100 dark:bg-red-900/30' :
                          'bg-purple-100 dark:bg-purple-900/30'
                        }`}>
                          <activity.icon className={`w-4 h-4 ${
                            activity.type === 'user_joined' ? 'text-green-600' :
                            activity.type === 'chat_created' ? 'text-blue-600' :
                            activity.type === 'user_banned' ? 'text-red-600' :
                            'text-purple-600'
                          }`} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 dark:text-white">
                            {activity.message}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            {activity.time}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* System Alerts & Quick Actions */}
          <div className="space-y-6">
            {/* System Alerts */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700"
            >
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  System Alerts
                </h3>
              </div>
              
              <div className="p-6">
                {systemAlerts.length === 0 ? (
                  <div className="text-center py-8">
                    <Shield className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                      No system alerts at this time
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      All systems are running normally
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {systemAlerts.map((alert, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.5 + index * 0.1 }}
                        className={`p-3 rounded-lg border-l-4 ${
                          alert.severity === 'high' ? 'bg-red-50 dark:bg-red-900/20 border-red-500' :
                          alert.severity === 'medium' ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500' :
                          'bg-blue-50 dark:bg-blue-900/20 border-blue-500'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                            alert.severity === 'high' ? 'text-red-500' :
                            alert.severity === 'medium' ? 'text-yellow-500' :
                            'text-blue-500'
                          }`} />
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            {alert.message}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700"
            >
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Quick Actions
                </h3>
              </div>
              
              <div className="p-6 space-y-3">
                <Link to="/admin/users" className="block">
                  <Button className="w-full justify-start" variant="outline">
                    <Users className="w-4 h-4 mr-2" />
                    Manage Users
                  </Button>
                </Link>

                <Link to="/admin/reports" className="block">
                  <Button className="w-full justify-start" variant="outline">
                    <Shield className="w-4 h-4 mr-2" />
                    Review Reports
                  </Button>
                </Link>

                <Link to="/admin/chats" className="block">
                  <Button className="w-full justify-start" variant="outline">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    View Chats
                  </Button>
                </Link>
              </div>
            </motion.div>

            {/* Performance Overview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="bg-gradient-primary rounded-xl p-6 text-white"
            >
              <h3 className="text-lg font-semibold mb-3">
                Platform Statistics
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-white/90">Total Users</span>
                  <span className="font-semibold">{analytics.users?.total || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/90">Active Users</span>
                  <span className="font-semibold">{analytics.users?.active || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/90">Total Chats</span>
                  <span className="font-semibold">{analytics.chats?.total || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/90">User Satisfaction</span>
                  <span className="font-semibold">
                    {analytics.chats?.averageRating ? `${analytics.chats.averageRating.toFixed(1)}/5` : 'N/A'}
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Chat Trends Chart Placeholder */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Chat Activity Trends
            </h3>
          </div>
          
          <div className="p-6">
            {analytics.trends?.chatCreation && analytics.trends.chatCreation.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                    Daily Chat Creation ({analytics.trends.chatCreation.length} days)
                  </h4>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Last {timeframe}
                  </span>
                </div>

                <div className="h-64">
                  <div className="flex items-end justify-between h-full space-x-1">
                    {analytics.trends.chatCreation.slice(-14).map((item, index) => {
                      const date = new Date(item._id);
                      const maxCount = Math.max(...analytics.trends.chatCreation.map(d => d.count));
                      const height = maxCount > 0 ? (item.count / maxCount) * 100 : 0;

                      return (
                        <div key={item._id} className="flex-1 flex flex-col items-center">
                          <div
                            className="w-full bg-primary-500 rounded-t transition-all duration-300 hover:bg-primary-600"
                            style={{ height: `${Math.max(height, 5)}%` }}
                            title={`${item.count} chats on ${date.toLocaleDateString()}`}
                          >
                            <div className="w-full h-full flex items-end justify-center pb-2">
                              <span className="text-xs text-white font-medium opacity-0 group-hover:opacity-100">
                                {item.count}
                              </span>
                            </div>
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400 mt-2 transform -rotate-45 origin-center">
                            {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-primary-500 rounded"></div>
                      <span className="text-gray-600 dark:text-gray-400">New Chats</span>
                    </div>
                  </div>
                  <div className="text-gray-600 dark:text-gray-400">
                    Total: {analytics.trends.chatCreation.reduce((sum, item) => sum + item.count, 0)} chats
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-center">
                  <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">
                    No chat data available for the selected period
                  </p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                    Chat activity will appear here when data is available
                  </p>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminDashboard;
