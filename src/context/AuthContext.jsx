import { createContext, useContext, useReducer, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import authService from '../services/authService';
import toast from 'react-hot-toast';

const AuthContext = createContext();

// Auth reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_USER':
      return { 
        ...state, 
        user: action.payload, 
        isAuthenticated: !!action.payload,
        isLoading: false 
      };
    case 'SET_TOKEN':
      return { ...state, token: action.payload };
    case 'LOGOUT':
      return { 
        ...state, 
        user: null, 
        token: null, 
        isAuthenticated: false,
        isLoading: false 
      };
    case 'UPDATE_USER':
      return { ...state, user: { ...state.user, ...action.payload } };
    default:
      return state;
  }
};

// Initial state
const initialState = {
  user: null,
  token: localStorage.getItem('careease-token'),
  isAuthenticated: false,
  isLoading: true,
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const queryClient = useQueryClient();

  // Get user profile query
  const { data: profileData, isLoading: profileLoading, error } = useQuery({
    queryKey: ['profile'],
    queryFn: authService.getProfile,
    enabled: !!state.token,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Set user from profile data
  useEffect(() => {
    if (profileData?.data?.user) {
      dispatch({ type: 'SET_USER', payload: profileData.data.user });
    } else if (error) {
      // Token is invalid, clear it
      localStorage.removeItem('careease-token');
      dispatch({ type: 'LOGOUT' });
    } else if (!state.token) {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [profileData, error, state.token]);

  // Initialize auth state
  useEffect(() => {
    const token = localStorage.getItem('careease-token');
    if (token) {
      dispatch({ type: 'SET_TOKEN', payload: token });
    } else {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  // Auth methods
  const login = async (credentials) => {
    try {
      const response = await authService.login(credentials);
      const { token, user } = response.data;
      
      localStorage.setItem('careease-token', token);
      dispatch({ type: 'SET_TOKEN', payload: token });
      dispatch({ type: 'SET_USER', payload: user });
      
      // Invalidate and refetch profile
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      
      toast.success(`Welcome back, ${user.firstName}!`);
      return response;
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed';
      toast.error(message);
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      const response = await authService.register(userData);
      const { token, user } = response.data;
      
      localStorage.setItem('careease-token', token);
      dispatch({ type: 'SET_TOKEN', payload: token });
      dispatch({ type: 'SET_USER', payload: user });
      
      // Invalidate and refetch profile
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      
      toast.success(`Welcome to CareEase, ${user.firstName}!`);
      return response;
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed';
      toast.error(message);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('careease-token');
      dispatch({ type: 'LOGOUT' });
      queryClient.clear();
      toast.success('Logged out successfully');
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await authService.updateProfile(profileData);
      dispatch({ type: 'UPDATE_USER', payload: response.data.user });
      
      // Invalidate and refetch profile
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      
      toast.success('Profile updated successfully');
      return response;
    } catch (error) {
      const message = error.response?.data?.message || 'Profile update failed';
      toast.error(message);
      throw error;
    }
  };

  // Check if user has specific role
  const hasRole = (role) => {
    return state.user?.role === role;
  };

  // Check if user is admin
  const isAdmin = () => {
    return hasRole('admin');
  };

  const value = {
    ...state,
    isLoading: state.isLoading || profileLoading,
    login,
    register,
    logout,
    updateProfile,
    hasRole,
    isAdmin,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
