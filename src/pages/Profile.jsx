import { useState } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { 
  User, 
  Mail, 
  Settings, 
  Shield, 
  Bell,
  Moon,
  Sun,
  Monitor,
  Save,
  Edit3,
  Camera
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import toast from 'react-hot-toast';

const Profile = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const { user, updateProfile } = useAuth();
  const { theme, setLightTheme, setDarkTheme, setSystemTheme } = useTheme();

  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      username: user?.username || '',
    }
  });

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'preferences', label: 'Preferences', icon: Settings },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ];

  const themeOptions = [
    { value: 'light', label: 'Light', icon: Sun, action: setLightTheme },
    { value: 'dark', label: 'Dark', icon: Moon, action: setDarkTheme },
    { value: 'system', label: 'System', icon: Monitor, action: setSystemTheme },
  ];

  const onSubmit = async (data) => {
    try {
      await updateProfile(data);
      setIsEditing(false);
      toast.success('Profile updated successfully!');
    } catch (error) {
      toast.error('Failed to update profile');
    }
  };

  const handleCancel = () => {
    reset();
    setIsEditing(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="container-custom">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto"
        >
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Account Settings
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Manage your account settings and preferences
            </p>
          </div>

          <div className="grid lg:grid-cols-4 gap-8">
            {/* Sidebar Navigation */}
            <div className="lg:col-span-1">
              <nav className="space-y-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 text-left rounded-lg transition-colors duration-200 ${
                      activeTab === tab.id
                        ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <tab.icon className="w-5 h-5" />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                {/* Profile Tab */}
                {activeTab === 'profile' && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4 }}
                    className="p-6"
                  >
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        Profile Information
                      </h2>
                      {!isEditing && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsEditing(true)}
                          leftIcon={<Edit3 className="w-4 h-4" />}
                        >
                          Edit Profile
                        </Button>
                      )}
                    </div>

                    {/* Profile Picture */}
                    <div className="flex items-center space-x-6 mb-8">
                      <div className="relative">
                        <div className="w-24 h-24 bg-primary-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                          {user?.firstName?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <button className="absolute bottom-0 right-0 w-8 h-8 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-full flex items-center justify-center hover:scale-110 transition-transform">
                          <Camera className="w-4 h-4" />
                        </button>
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                          {user?.fullName}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400">
                          {user?.role === 'admin' ? 'Administrator' : 'User'}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-500">
                          Member since {new Date(user?.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {/* Profile Form */}
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                      <div className="grid md:grid-cols-2 gap-6">
                        <Input
                          label="First Name"
                          disabled={!isEditing}
                          {...register('firstName', {
                            required: 'First name is required',
                            minLength: { value: 2, message: 'First name must be at least 2 characters' }
                          })}
                          error={errors.firstName?.message}
                        />

                        <Input
                          label="Last Name"
                          disabled={!isEditing}
                          {...register('lastName', {
                            required: 'Last name is required',
                            minLength: { value: 2, message: 'Last name must be at least 2 characters' }
                          })}
                          error={errors.lastName?.message}
                        />
                      </div>

                      <Input
                        label="Username"
                        disabled={!isEditing}
                        {...register('username', {
                          required: 'Username is required',
                          minLength: { value: 3, message: 'Username must be at least 3 characters' }
                        })}
                        error={errors.username?.message}
                        helperText="This is how others will see your name"
                      />

                      <Input
                        label="Email Address"
                        type="email"
                        disabled={true} // Email should not be editable for security
                        {...register('email')}
                        helperText="Contact support to change your email address"
                      />

                      {isEditing && (
                        <div className="flex items-center space-x-4 pt-4">
                          <Button
                            type="submit"
                            leftIcon={<Save className="w-4 h-4" />}
                          >
                            Save Changes
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleCancel}
                          >
                            Cancel
                          </Button>
                        </div>
                      )}
                    </form>
                  </motion.div>
                )}

                {/* Preferences Tab */}
                {activeTab === 'preferences' && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4 }}
                    className="p-6"
                  >
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                      Preferences
                    </h2>

                    <div className="space-y-6">
                      {/* Theme Selection */}
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                          Theme
                        </h3>
                        <div className="grid grid-cols-3 gap-4">
                          {themeOptions.map((option) => (
                            <button
                              key={option.value}
                              onClick={option.action}
                              className={`p-4 rounded-lg border-2 transition-colors duration-200 ${
                                theme === option.value
                                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                              }`}
                            >
                              <div className="flex flex-col items-center space-y-2">
                                <option.icon className={`w-6 h-6 ${
                                  theme === option.value
                                    ? 'text-primary-600 dark:text-primary-400'
                                    : 'text-gray-600 dark:text-gray-400'
                                }`} />
                                <span className={`text-sm font-medium ${
                                  theme === option.value
                                    ? 'text-primary-600 dark:text-primary-400'
                                    : 'text-gray-700 dark:text-gray-300'
                                }`}>
                                  {option.label}
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Language */}
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                          Language
                        </h3>
                        <select className="input-field max-w-xs">
                          <option value="en">English</option>
                          <option value="es">Spanish</option>
                          <option value="fr">French</option>
                          <option value="de">German</option>
                        </select>
                      </div>

                      {/* Time Zone */}
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                          Time Zone
                        </h3>
                        <select className="input-field max-w-xs">
                          <option value="UTC-8">Pacific Time (PT)</option>
                          <option value="UTC-7">Mountain Time (MT)</option>
                          <option value="UTC-6">Central Time (CT)</option>
                          <option value="UTC-5">Eastern Time (ET)</option>
                        </select>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Security Tab */}
                {activeTab === 'security' && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4 }}
                    className="p-6"
                  >
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                      Security Settings
                    </h2>

                    <div className="space-y-6">
                      {/* Password */}
                      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                            Password
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Last updated 3 months ago
                          </p>
                        </div>
                        <Button variant="outline" size="sm">
                          Change Password
                        </Button>
                      </div>

                      {/* Two-Factor Authentication */}
                      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                            Two-Factor Authentication
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Add an extra layer of security to your account
                          </p>
                        </div>
                        <Button variant="outline" size="sm">
                          Enable 2FA
                        </Button>
                      </div>

                      {/* Login Sessions */}
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                          Active Sessions
                        </h3>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">
                                Current Session
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                Chrome on Windows • Last seen now
                              </p>
                            </div>
                            <span className="px-2 py-1 text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded-full">
                              Active
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Notifications Tab */}
                {activeTab === 'notifications' && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4 }}
                    className="p-6"
                  >
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                      Notification Settings
                    </h2>

                    <div className="space-y-6">
                      {/* Email Notifications */}
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                          Email Notifications
                        </h3>
                        <div className="space-y-3">
                          {[
                            { id: 'new-messages', label: 'New chat messages', enabled: true },
                            { id: 'weekly-summary', label: 'Weekly care summary', enabled: true },
                            { id: 'care-tips', label: 'Daily care tips', enabled: false },
                            { id: 'security-alerts', label: 'Security alerts', enabled: true },
                          ].map((notification) => (
                            <label key={notification.id} className="flex items-center justify-between">
                              <span className="text-gray-700 dark:text-gray-300">
                                {notification.label}
                              </span>
                              <input
                                type="checkbox"
                                defaultChecked={notification.enabled}
                                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                              />
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Push Notifications */}
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                          Push Notifications
                        </h3>
                        <div className="space-y-3">
                          {[
                            { id: 'instant-messages', label: 'Instant message alerts', enabled: true },
                            { id: 'care-reminders', label: 'Care reminders', enabled: true },
                            { id: 'emergency-alerts', label: 'Emergency alerts', enabled: true },
                          ].map((notification) => (
                            <label key={notification.id} className="flex items-center justify-between">
                              <span className="text-gray-700 dark:text-gray-300">
                                {notification.label}
                              </span>
                              <input
                                type="checkbox"
                                defaultChecked={notification.enabled}
                                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                              />
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="pt-4">
                        <Button>Save Notification Settings</Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Profile;
