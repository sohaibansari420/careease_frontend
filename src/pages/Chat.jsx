import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  Plus, 
  MessageCircle, 
  Trash2, 
  Star,
  User,
  Bot
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import chatService from '../services/chatService';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import toast from 'react-hot-toast';

const Chat = () => {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  
  const [message, setMessage] = useState('');
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  // selectedChat cleanup: remove legacy state usage to avoid reference errors
  const [isSending, setIsSending] = useState(false);
  
  // Local state for managing messages independently
  const [localMessages, setLocalMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [currentTypingMessage, setCurrentTypingMessage] = useState('');
  const [typingMessageId, setTypingMessageId] = useState(null);

  // Get user chats
  const { data: chatsData, isLoading: chatsLoading } = useQuery({
    queryKey: ['user-chats'],
    queryFn: () => chatService.getUserChats(),
  });

  // Get current chat
  const { data: currentChatData, isLoading: chatLoading } = useQuery({
    queryKey: ['chat', chatId],
    queryFn: () => chatService.getChat(chatId),
    enabled: !!chatId,
  });

  // Create new chat mutation
  const createChatMutation = useMutation({
    mutationFn: chatService.createChat,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['user-chats'] });
      navigate(`/chat/${data.data.chat._id}`);
      setIsNewChatModalOpen(false);
      toast.success('New chat created successfully!');
    },
    onError: (error) => {
      console.error('Chat creation error:', error);
      // Don't show generic error if validation error already shown
      if (!error?.response?.data?.message?.includes('Validation failed')) {
        toast.error(error?.response?.data?.message || 'Failed to create chat. Please try again.');
      }
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: ({ chatId, content }) => chatService.sendMessage(chatId, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', chatId] });
      setIsSending(false);
    },
    onError: () => {
      toast.error('Failed to send message');
      setIsSending(false);
    },
  });

  // Delete chat mutation
  const deleteChatMutation = useMutation({
    mutationFn: chatService.deleteChat,
    onSuccess: (data, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['user-chats'] });
      if (chatId === deletedId) {
        navigate('/chat');
      }
      toast.success('Chat deleted');
    },
    onError: () => {
      toast.error('Failed to delete chat');
    },
  });

  // Add review mutation
  const addReviewMutation = useMutation({
    mutationFn: ({ chatId, review }) => chatService.addReview(chatId, review),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', chatId] });
      queryClient.invalidateQueries({ queryKey: ['user-chats'] });
      setIsReviewModalOpen(false);
      toast.success('Review submitted!');
    },
    onError: () => {
      toast.error('Failed to submit review');
    },
  });

  const chats = chatsData?.data?.chats || [];
  const currentChat = currentChatData?.data?.chat;

  // Word-by-word typing effect
  const typeMessage = (message, messageId) => {
    setIsTyping(true);
    setTypingMessageId(messageId);
    setCurrentTypingMessage('');
    
    const words = message.split(' ');
    let currentIndex = 0;
    
    const typeInterval = setInterval(() => {
      if (currentIndex < words.length) {
        setCurrentTypingMessage(prev => 
          prev + (prev.length > 0 ? ' ' : '') + words[currentIndex]
        );
        currentIndex++;
      } else {
        clearInterval(typeInterval);
        setIsTyping(false);
        setTypingMessageId(null);
        setCurrentTypingMessage('');
        
        // Add the complete message to local messages
        setLocalMessages(prev => 
          prev.map(msg => 
            msg.id === messageId 
              ? { ...msg, content: message, isTyping: false }
              : msg
          )
        );
      }
    }, 50); // Adjust speed as needed (50ms per word)
  };

  // Auto scroll to bottom of messages
  const scrollToBottom = (behavior = 'smooth') => {
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior });
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior });
    }
  };

  // Scroll when messages increase
  useEffect(() => {
    const length = localMessages.length;
    if (length > 0) {
      scrollToBottom('smooth');
    }
  }, [localMessages.length]);

  // Clean up local messages when switching chats
  useEffect(() => {
    setLocalMessages([]);
    setIsTyping(false);
    setCurrentTypingMessage('');
    setTypingMessageId(null);
  }, [chatId]);

  // Scroll when switching chats
  useEffect(() => {
    if (chatId) {
      scrollToBottom('auto');
    }
  }, [chatId]);

  // Sync local messages with server messages
  useEffect(() => {
    if (currentChat?.messages) {
      // Only update if we don't have local messages or if server has more messages
      if (localMessages.length === 0 || currentChat.messages.length > localMessages.length) {
        const serverMessages = currentChat.messages.map((msg, index) => ({
          id: `server-${index}`,
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp,
          isTyping: false
        }));
        
        // If we have local messages, merge them with server messages
        if (localMessages.length > 0) {
          const userMessages = localMessages.filter(msg => msg.role === 'user');
          const assistantMessages = localMessages.filter(msg => msg.role === 'assistant');
          
          // Keep user messages from local state, use server messages for assistant
          const mergedMessages = [...userMessages, ...assistantMessages];
          setLocalMessages(mergedMessages);
        } else {
          setLocalMessages(serverMessages);
        }
      }
    }
  }, [currentChat?.messages]);

  // Handle new assistant messages with typing effect
  useEffect(() => {
    if (currentChat?.messages && localMessages.length > 0) {
      const lastServerMessage = currentChat.messages[currentChat.messages.length - 1];
      const lastLocalMessage = localMessages[localMessages.length - 1];
      
      // If server has a new assistant message that we don't have locally
      if (lastServerMessage?.role === 'assistant' && 
          lastLocalMessage?.role !== 'assistant' && 
          !isTyping) {
        
        const messageId = `typing-${Date.now()}`;
        const newMessage = {
          id: messageId,
          role: 'assistant',
          content: '',
          timestamp: new Date().toISOString(),
          isTyping: true
        };
        
        setLocalMessages(prev => [...prev, newMessage]);
        typeMessage(lastServerMessage.content, messageId);
      }
    }
  }, [currentChat?.messages, localMessages.length, isTyping]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim() || !chatId || isSending) return;

    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: message.trim(),
      timestamp: new Date().toISOString(),
      isTyping: false
    };

    // Add user message immediately to local state
    setLocalMessages(prev => [...prev, userMessage]);
    
    setIsSending(true);
    setMessage('');
    scrollToBottom('smooth');
    
    // Send to server
    sendMessageMutation.mutate({ chatId, content: message.trim() });
  };

  const handleCreateChat = (data) => {
    createChatMutation.mutate(data);
  };

  const handleDeleteChat = (chatIdToDelete) => {
    if (window.confirm('Are you sure you want to delete this chat?')) {
      deleteChatMutation.mutate(chatIdToDelete);
    }
  };

  const handleSubmitReview = (reviewData) => {
    addReviewMutation.mutate({ chatId, review: reviewData });
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* Sidebar */}
      <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              Chats
            </h1>
            <Button
              size="sm"
              onClick={() => setIsNewChatModalOpen(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              New Chat
            </Button>
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {/* Latest Active Alarm (if any) */}
          {/* This is non-intrusive and shows at the top of the sidebar */}
          {/* We reuse dashboard alarms query shape by fetching from local storage hook if needed. For simplicity, suggest the Alarms page for full control. */}
          <div className="p-3 border-b border-gray-200 dark:border-gray-700">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Manage alarms from <span className="underline cursor-pointer" onClick={() => navigate('/alarms')}>Alarms</span>
            </div>
          </div>
          {chatsLoading ? (
            <div className="p-4 flex justify-center">
              <LoadingSpinner size="sm" />
            </div>
          ) : chats.length === 0 ? (
            <div className="p-4 text-center">
              <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                No chats yet. Start a new conversation!
              </p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {chats.map((chat) => (
                <motion.div
                  key={chat._id}
                  whileHover={{ x: 4 }}
                  onClick={() => navigate(`/chat/${chat._id}`)}
                  className={`relative group p-3 rounded-lg cursor-pointer transition-colors ${
                    chatId === chat._id
                      ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm truncate mb-1">
                        {chat.title}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {chat.issue}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          chat.status === 'active'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                          {chat.status}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(chat.metadata.lastActivity).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    
                    <Button
                      variant="danger"
                      size="xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteChat(chat._id);
                      }}
                      leftIcon={<Trash2 className="w-3 h-3" />}
                    >
                      Delete
                    </Button>
                  </div>

                  {/* Removed three-dots context menu; direct Delete button shown */}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-h-0">
        {chatId && currentChat ? (
          <>
            {/* Chat Header */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {currentChat.title}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {currentChat.category} • {currentChat.priority} priority
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsReviewModalOpen(true)}
                    leftIcon={<Star className="w-4 h-4" />}
                  >
                    Review
                  </Button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 pb-28 space-y-4 min-h-0">
              {chatLoading ? (
                <div className="flex justify-center items-center h-full">
                  <LoadingSpinner size="lg" text="Loading messages..." />
                </div>
              ) : (
                <>
                  {localMessages.map((msg, index) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex items-start space-x-3 max-w-[80%] ${
                        msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                      }`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          msg.role === 'user' 
                            ? 'bg-primary-600 text-white' 
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                        }`}>
                          {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                        </div>
                        
                        <div className={`rounded-2xl px-4 py-3 ${
                          msg.role === 'user'
                            ? 'bg-primary-600 text-white'
                            : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600'
                        }`}>
                          <p className="text-sm whitespace-pre-wrap">
                            {msg.isTyping && msg.id === typingMessageId ? currentTypingMessage : msg.content}
                            {msg.isTyping && msg.id === typingMessageId && (
                              <span className="inline-block w-2 h-4 bg-gray-400 ml-1 animate-pulse"></span>
                            )}
                          </p>
                          <p className={`text-xs mt-2 ${
                            msg.role === 'user' 
                              ? 'text-primary-100' 
                              : 'text-gray-500 dark:text-gray-400'
                          }`}>
                            {formatTime(msg.timestamp)}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  
                  {isSending && !isTyping && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex justify-start"
                    >
                      <div className="flex items-start space-x-3 max-w-[80%]">
                        <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                          <Bot className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                        </div>
                        <div className="bg-white dark:bg-gray-700 rounded-2xl px-4 py-3 border border-gray-200 dark:border-gray-600">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Message Input - sticky at bottom */}
            <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 sticky bottom-0 z-10">
              <form onSubmit={handleSendMessage} className="flex space-x-4">
                <div className="flex-1">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type your message..."
                    disabled={isSending}
                    className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 border-0 rounded-2xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={!message.trim() || isSending}
                  className="px-6 py-3 rounded-2xl"
                  leftIcon={<Send className="w-4 h-4" />}
                >
                  Send
                </Button>
              </form>
            </div>
          </>
        ) : (
          // No chat selected
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
                Welcome to CareEase Chat
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                Select a chat from the sidebar or start a new conversation
              </p>
              <Button
                onClick={() => setIsNewChatModalOpen(true)}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Start New Chat
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* New Chat Modal */}
      <NewChatModal
        isOpen={isNewChatModalOpen}
        onClose={() => setIsNewChatModalOpen(false)}
        onSubmit={handleCreateChat}
        isLoading={createChatMutation.isPending}
      />

      {/* Review Modal */}
      <ReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        onSubmit={handleSubmitReview}
        isLoading={addReviewMutation.isPending}
      />

    </div>
  );
};

// New Chat Modal Component
const NewChatModal = ({ isOpen, onClose, onSubmit, isLoading }) => {
  const [formData, setFormData] = useState({
    title: '',
    issue: '',
    category: 'health',
    priority: 'medium'
  });
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title?.trim()) {
      newErrors.title = 'Chat title is required';
    } else if (formData.title.trim().length < 3) {
      newErrors.title = 'Chat title must be at least 3 characters long';
    } else if (formData.title.trim().length > 100) {
      newErrors.title = 'Chat title must be less than 100 characters';
    }

    if (!formData.issue?.trim()) {
      newErrors.issue = 'Please describe your issue';
    } else if (formData.issue.trim().length < 10) {
      newErrors.issue = 'Please provide more details about your issue (at least 10 characters)';
    } else if (formData.issue.trim().length > 500) {
      newErrors.issue = 'Issue description must be less than 500 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    onSubmit({
      ...formData,
      title: formData.title.trim(),
      issue: formData.issue.trim()
    });
  };

  const handleClose = () => {
    onClose();
    setFormData({ title: '', issue: '', category: 'health', priority: 'medium' });
    setErrors({});
  };

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Start New Chat"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Input
            label="Chat Title *"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            placeholder="e.g., Medication Management"
            error={errors.title}
          />
          {errors.title && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.title}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Describe Your Issue *
          </label>
          <textarea
            value={formData.issue}
            onChange={(e) => handleInputChange('issue', e.target.value)}
            rows={3}
            className={`input-field resize-none ${errors.issue ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
            placeholder="Tell us about your care situation or question..."
          />
          {errors.issue && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.issue}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Category
            </label>
            <select
              value={formData.category}
              onChange={(e) => handleInputChange('category', e.target.value)}
              className="input-field"
            >
              <option value="health">Health</option>
              <option value="medication">Medication</option>
              <option value="mobility">Mobility</option>
              <option value="emotional">Emotional</option>
              <option value="daily_care">Daily Care</option>
              <option value="emergency">Emergency</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Priority
            </label>
            <select
              value={formData.priority}
              onChange={(e) => handleInputChange('priority', e.target.value)}
              className="input-field"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            Start Chat
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// Review Modal Component
const ReviewModal = ({ isOpen, onClose, onSubmit, isLoading }) => {
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ rating, feedback });
    setRating(5);
    setFeedback('');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Rate Your Experience"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            How was your experience? *
          </label>
          <div className="flex space-x-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className={`text-2xl ${
                  star <= rating ? 'text-yellow-400' : 'text-gray-300'
                } hover:text-yellow-400 transition-colors`}
              >
                ★
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Additional Feedback (Optional)
          </label>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={3}
            className="input-field resize-none"
            placeholder="Tell us how we can improve..."
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            Submit Review
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default Chat;
