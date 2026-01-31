import React, { useState, useEffect } from 'react';
import TranslatedText from '../components/TranslatedText';
import { useTranslation } from '../hooks/useTranslation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Settings as SettingsIcon,
  FolderOpen,
  Edit,
  Trash2,
  Plus,
  Save,
  X,
  ChevronRight,
  Users,
  Shield,
  Database,
  Palette,
  Bell,
  Globe,
  CreditCard,
  Search,
  Filter,
  MoreVertical,
  AlertCircle,
  CheckCircle,
  Clock,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  RefreshCw,
  Download,
  Upload,
  Archive,
  BarChart3,
  Zap,
  Star,
  HelpCircle,
  Mail,
  Phone,
  UserPlus,
  Key,
  Building,
  Type,
  Code
} from 'lucide-react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';
import { shopsAPI, settingsAPI, usersAPI } from '../lib/api';


const Settings = () => {
  const { tSync } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('users');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // grid, list, table
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // User Management State
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userFormData, setUserFormData] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    phone: '',
    role: 'cashier',
    shop_id: '',
    password: '',
    confirm_password: ''
  });

  // Security Settings State
  const [securitySettings, setSecuritySettings] = useState({
    twoFactorAuth: false,
    sessionTimeout: 30,
    passwordPolicy: {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      passwordExpiry: 90
    },
    loginAttempts: {
      maxAttempts: 5,
      lockoutDuration: 15
    },
    ipWhitelist: [],
    auditLogging: true
  });

  // Appearance & Branding State
  const [appearanceSettings, setAppearanceSettings] = useState({
    theme: 'light',
    primaryColor: '#3B82F6',
    secondaryColor: '#6B7280',
    accentColor: '#10B981',
    fontFamily: 'Inter',
    fontSize: 'medium',
    borderRadius: 'medium',
    logo: null,
    companyName: 'Your Company',
    companyDescription: 'Professional business solutions',
    favicon: null,
    customCSS: ''
  });

  // Appearance Settings Loading State
  const [isSavingAppearance, setIsSavingAppearance] = useState(false);

  // Notifications State
  const [notificationSettings, setNotificationSettings] = useState({
    email: {
      enabled: true,
      orderConfirmations: true,
      orderUpdates: true,
      inventoryAlerts: true,
      systemNotifications: true,
      marketingEmails: false,
      dailyDigest: false,
      weeklyReport: true
    },
    sms: {
      enabled: false,
      orderConfirmations: false,
      orderUpdates: true,
      urgentAlerts: true
    },
    inApp: {
      enabled: true,
      orderNotifications: true,
      inventoryAlerts: true,
      systemUpdates: true,
      successMessages: true,
      errorMessages: true,
      tipsAndTricks: false
    },
    push: {
      enabled: false,
      orderUpdates: true,
      inventoryAlerts: true,
      promotions: false
    },
    schedule: {
      quietHours: {
        enabled: false,
        startTime: '22:00',
        endTime: '08:00'
      },
      timezone: 'UTC',
      digestFrequency: 'daily'
    }
  });

  // Billing & Subscription State
  const [billingSettings, setBillingSettings] = useState({
    currentPlan: {
      name: 'Professional',
      price: 99,
      currency: 'USD',
      interval: 'monthly',
      features: [
        'Unlimited users',
        'Advanced analytics',
        'Priority support',
        'Custom integrations',
        'API access'
      ],
      status: 'active',
      nextBillingDate: '2024-02-15'
    },
    paymentMethod: {
      type: 'card',
      last4: '4242',
      brand: 'Visa',
      expiryMonth: 12,
      expiryYear: 2025,
      isDefault: true
    },
    billingHistory: [
      {
        id: 'inv_001',
        date: '2024-01-15',
        amount: 99,
        currency: 'USD',
        status: 'paid',
        description: 'Professional Plan - January 2024'
      },
      {
        id: 'inv_002',
        date: '2023-12-15',
        amount: 99,
        currency: 'USD',
        status: 'paid',
        description: 'Professional Plan - December 2023'
      }
    ],
    usage: {
      users: 12,
      maxUsers: 50,
      storage: 2.5,
      maxStorage: 10,
      apiCalls: 15000,
      maxApiCalls: 50000
    }
  });

  // Database & System State
  const [systemSettings, setSystemSettings] = useState({
    database: {
      type: 'SQLite',
      version: '3.42.0',
      size: '2.4 GB',
      lastBackup: '2024-01-15 14:30:00',
      backupFrequency: 'daily',
      autoBackup: true,
      compression: true,
      encryption: false
    },
    performance: {
      cpuUsage: 45,
      memoryUsage: 68,
      diskUsage: 72,
      networkLatency: 12,
      responseTime: 180,
      activeConnections: 24,
      maxConnections: 100
    },
    maintenance: {
      autoOptimization: true,
      optimizationSchedule: 'weekly',
      lastOptimization: '2024-01-14 02:00:00',
      logRetention: 30,
      cacheEnabled: true,
      cacheSize: '512 MB',
      cacheHitRate: 87
    },
    security: {
      sslEnabled: true,
      sslVersion: 'TLS 1.3',
      firewallEnabled: true,
      intrusionDetection: true,
      lastSecurityScan: '2024-01-15 10:00:00',
      vulnerabilitiesFound: 0,
      updatesAvailable: 2
    },
    logs: {
      errorLogs: 15,
      warningLogs: 42,
      infoLogs: 1250,
      debugLogs: 0,
      logLevel: 'info',
      logRetentionDays: 30
    }
  });

  const queryClient = useQueryClient();

  // Appearance Settings Query
  const { data: appearanceData, isLoading: appearanceLoading } = useQuery({
    queryKey: ['appearance-settings'],
    queryFn: async () => {
      const response = await settingsAPI.getAppearance();
      return response.data;
    },
    onSuccess: (data) => {
      if (data) {
        setAppearanceSettings(data);
      }
    }
  });

  // Appearance Settings Mutation
  const saveAppearanceMutation = useMutation({
    mutationFn: async (settings) => {
      const response = await settingsAPI.updateAppearance(settings);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['appearance-settings']);
      toast.success('Appearance settings saved successfully!');
      setIsSavingAppearance(false);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to save appearance settings');
      setIsSavingAppearance(false);
    }
  });

  // Set initial active tab from URL
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) {
      setActiveTab(tab);
    } else {
      setActiveTab('users');
      setSearchParams({ tab: 'users' });
    }
  }, [searchParams, setSearchParams]);

  // Apply theme on component mount
  useEffect(() => {
    if (appearanceData) {
      applyThemeChanges(appearanceData);
    } else {
      // Apply default theme
      applyThemeChanges(appearanceSettings);
    }
  }, [appearanceData]);

  // Update URL when tab changes
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
    setSearchTerm('');
    setFilterStatus('all');
    setSelectedItems(new Set());
    setShowBulkActions(false);
  };

  // Settings navigation structure
  const settingsNavigation = {
    users: {
      title: tSync('User Management'),
      description: tSync('Manage system users, roles, and permissions'),
      icon: Users,
      color: 'green',
      sections: [
        {
          id: 'users',
          title: tSync('System Users'),
          description: tSync('Manage user accounts and profiles'),
          count: 0
        },
        {
          id: 'roles',
          title: tSync('Roles & Permissions'),
          description: tSync('Configure access control and permissions'),
          count: 0
        }
      ]
    },
    security: {
      title: tSync('Security Settings'),
      description: tSync('Configure authentication, authorization, and security policies'),
      icon: Shield,
      color: 'red',
      sections: [
        {
          id: 'authentication',
          title: tSync('Authentication'),
          description: tSync('Password policies and login settings'),
          count: 0
        },
        {
          id: 'sessions',
          title: tSync('Session Management'),
          description: tSync('Session timeouts and security policies'),
          count: 0
        }
      ]
    },
    appearance: {
      title: tSync('Appearance & Branding'),
      description: tSync('Customize the look and feel of your system'),
      icon: Palette,
      color: 'purple',
      sections: [
        {
          id: 'theme',
          title: tSync('Theme & Colors'),
          description: tSync('Customize system colors and themes'),
          count: 0
        },
        {
          id: 'branding',
          title: tSync('Branding'),
          description: tSync('Logo, company name, and branding elements'),
          count: 0
        }
      ]
    }
  };

  const getColorClasses = (color) => {
    const colors = {
      blue: 'bg-blue-50 text-blue-700 border-blue-200',
      green: 'bg-green-50 text-green-700 border-green-200',
      red: 'bg-red-50 text-red-700 border-red-200',
      purple: 'bg-purple-50 text-purple-700 border-purple-200',
      orange: 'bg-orange-50 text-orange-700 border-orange-200',
      indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      slate: 'bg-slate-50 text-slate-700 border-slate-200'
    };
    return colors[color] || colors.blue;
  };

  const getIconColorClasses = (color) => {
    const colors = {
      blue: 'text-blue-600 bg-blue-100',
      green: 'text-green-600 bg-green-100',
      red: 'text-red-600 bg-red-100',
      purple: 'text-purple-600 bg-purple-100',
      orange: 'text-orange-600 bg-orange-100',
      indigo: 'text-indigo-600 bg-indigo-100',
      emerald: 'text-emerald-600 bg-emerald-100',
      slate: 'text-slate-600 bg-slate-100'
    };
    return colors[color] || colors.blue;
  };

  const renderEmptyState = (title, description, Icon, actionText, onAction) => (
    <div className="text-center py-16 px-6">
      <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${getIconColorClasses(settingsNavigation[activeTab]?.color)} mb-6`}>
        <Icon className="h-8 w-8" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-500 mb-6 max-w-md mx-auto">{description}</p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          {actionText}
        </button>
      )}
    </div>
  );

  const renderComingSoon = () => (
    <div className="text-center py-16 px-6">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-6">
        <Zap className="h-8 w-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2"><TranslatedText text="Coming Soon" /></h3>
      <p className="text-gray-500 mb-6 max-w-md mx-auto">
        <TranslatedText text="This feature is currently under development. We're working hard to bring you the best experience." />
      </p>
      <div className="flex items-center justify-center space-x-4 text-sm text-gray-400">
        <div className="flex items-center">
          <Clock className="h-4 w-4 mr-1" />
          <TranslatedText text="In Development" />
        </div>
        <div className="flex items-center">
          <Star className="h-4 w-4 mr-1" />
          <TranslatedText text="High Priority" />
        </div>
      </div>
    </div>
  );

  // User Management Queries
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await usersAPI.getAll();
      return response.data;
    }
  });

  const { data: shopsData } = useQuery({
    queryKey: ['shops'],
    queryFn: async () => {
      const response = await shopsAPI.getAll();
      console.log('Shops data loaded:', response.data);
      return response.data;
    }
  });

  // User Management Mutations
  const addUserMutation = useMutation({
    mutationFn: async (userData) => {
      const response = await usersAPI.create(userData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      toast.success('User added successfully!');
      setShowAddUserModal(false);
      resetUserForm();
    },
    onError: (error) => {
      console.error('Add user error:', error);
      console.error('Error response:', error.response?.data);
      const resp = error.response?.data;
      if (resp?.errors?.length) {
        // express-validator errors
        toast.error(resp.errors[0]?.msg || 'Validation error');
      } else if (resp?.error) {
        toast.error(resp.error);
      } else {
        toast.error('Failed to add user');
      }
    }
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, userData }) => {
      const response = await api.put(`/users/${userId}`, userData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      toast.success('User updated successfully!');
      setShowEditUserModal(false);
      setEditingUser(null);
      resetUserForm();
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to update user');
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId) => {
      const response = await api.delete(`/users/${userId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      toast.success('User deleted successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to delete user');
    }
  });

  // User Management Functions
  const resetUserForm = () => {
    setUserFormData({
      username: '',
      email: '',
      first_name: '',
      last_name: '',
      phone: '',
      role: 'cashier',
      shop_id: '',
      password: '',
      confirm_password: ''
    });
  };

  const handleAddUser = () => {
    if (userFormData.password !== userFormData.confirm_password) {
      toast.error('Passwords do not match');
      return;
    }
    if (userFormData.role === 'cashier' && !userFormData.shop_id) {
      toast.error('Please select a shop for cashier users');
      return;
    }

    const userData = { ...userFormData };
    // Normalize shop_id: for non-cashier roles, allow null if empty string
    if (userData.role !== 'cashier' && !userData.shop_id) {
      userData.shop_id = null;
    }
    delete userData.confirm_password;

    // Debug: Log the data being sent
    console.log('Sending user data:', userData);

    addUserMutation.mutate(userData);
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setUserFormData({
      username: user.username,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      phone: user.phone || '',
      role: user.role,
      shop_id: user.shop_id || '',
      is_active: user.is_active,
      password: '',
      confirm_password: ''
    });
    setShowEditUserModal(true);
  };

  const handleUpdateUser = () => {
    if (userFormData.password && userFormData.password !== userFormData.confirm_password) {
      toast.error('Passwords do not match');
      return;
    }
    if (userFormData.role === 'cashier' && !userFormData.shop_id) {
      toast.error('Please select a shop for cashier users');
      return;
    }

    const userData = { ...userFormData };
    // Normalize shop_id: for non-cashier roles, allow null if empty string
    if (userData.role !== 'cashier' && !userData.shop_id) {
      userData.shop_id = null;
    }
    if (!userData.password) {
      delete userData.password;
    }
    delete userData.confirm_password;

    updateUserMutation.mutate({ userId: editingUser.id, userData });
  };

  const handleDeleteUser = (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      deleteUserMutation.mutate(userId);
    }
  };

  // Appearance Settings Functions
  const handleSaveAppearanceSettings = async () => {
    // Validate settings
    const errors = validateAppearanceSettings();
    if (errors.length > 0) {
      errors.forEach(error => toast.error(error));
      return;
    }

    setIsSavingAppearance(true);
    try {
      await saveAppearanceMutation.mutateAsync(appearanceSettings);

      // Apply theme changes to the document
      applyThemeChanges(appearanceSettings);

      // Apply custom CSS
      applyCustomCSS(appearanceSettings.customCSS);

    } catch (error) {
      console.error('Error saving appearance settings:', error);
    }
  };

  const applyThemeChanges = (settings) => {
    const root = document.documentElement;

    // Apply CSS custom properties for colors
    root.style.setProperty('--primary-color', settings.primaryColor);
    root.style.setProperty('--secondary-color', settings.secondaryColor);
    root.style.setProperty('--accent-color', settings.accentColor);

    // Apply theme class to HTML element
    root.className = root.className.replace(/theme-\w+/g, '');
    root.classList.add(`theme-${settings.theme}`);

    // Apply font family
    root.style.setProperty('--font-family', settings.fontFamily);

    // Apply font size
    const fontSizeMap = {
      small: '14px',
      medium: '16px',
      large: '18px'
    };
    root.style.setProperty('--base-font-size', fontSizeMap[settings.fontSize]);

    // Apply border radius
    const borderRadiusMap = {
      small: '4px',
      medium: '8px',
      large: '12px'
    };
    root.style.setProperty('--border-radius', borderRadiusMap[settings.borderRadius]);

    // Also apply theme class to body for immediate visual feedback
    document.body.className = document.body.className.replace(/theme-\w+/g, '');
    document.body.classList.add(`theme-${settings.theme}`);
  };

  const applyCustomCSS = (customCSS) => {
    // Remove existing custom CSS
    const existingStyle = document.getElementById('custom-appearance-css');
    if (existingStyle) {
      existingStyle.remove();
    }

    // Add new custom CSS
    if (customCSS.trim()) {
      const style = document.createElement('style');
      style.id = 'custom-appearance-css';
      style.textContent = customCSS;
      document.head.appendChild(style);
    }
  };

  const handleFileUpload = async (file, type) => {
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    try {
      const response = await api.post('/settings/upload-asset', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const fileUrl = response.data.url;

      if (type === 'logo') {
        setAppearanceSettings(prev => ({ ...prev, logo: fileUrl }));
      } else if (type === 'favicon') {
        setAppearanceSettings(prev => ({ ...prev, favicon: fileUrl }));
      }

      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} uploaded successfully!`);
    } catch (error) {
      toast.error(`Failed to upload ${type}`);
      console.error('Upload error:', error);
    }
  };

  const validateAppearanceSettings = () => {
    const errors = [];

    if (!appearanceSettings.companyName.trim()) {
      errors.push('Company name is required');
    }

    if (!appearanceSettings.primaryColor.match(/^#[0-9A-F]{6}$/i)) {
      errors.push('Primary color must be a valid hex color');
    }

    if (!appearanceSettings.secondaryColor.match(/^#[0-9A-F]{6}$/i)) {
      errors.push('Secondary color must be a valid hex color');
    }

    if (!appearanceSettings.accentColor.match(/^#[0-9A-F]{6}$/i)) {
      errors.push('Accent color must be a valid hex color');
    }

    return errors;
  };

  // Preview theme changes in real-time
  const handleAppearanceChange = (key, value) => {
    setAppearanceSettings(prev => ({ ...prev, [key]: value }));

    // Apply preview changes immediately
    const updatedSettings = { ...appearanceSettings, [key]: value };
    applyThemeChanges(updatedSettings);
  };

  const renderUserManagement = () => {
    const users = usersData?.users || [];
    const shops = shopsData?.shops || [];

    return (
      <div className="space-y-6">
        {/* Header with Add User Button */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900"><TranslatedText text="System Users" /></h2>
            <p className="text-gray-600 mt-1"><TranslatedText text="Manage user accounts and access permissions" /></p>
          </div>
          <button
            onClick={() => setShowAddUserModal(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            <TranslatedText text="Add User" />
          </button>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder={tSync("Search users...")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all"><TranslatedText text="All Users" /></option>
              <option value="active"><TranslatedText text="Active" /></option>
              <option value="inactive"><TranslatedText text="Inactive" /></option>
            </select>
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="grid"><TranslatedText text="Grid" /></option>
              <option value="list"><TranslatedText text="List" /></option>
              <option value="table"><TranslatedText text="Table" /></option>
            </select>
          </div>
        </div>

        {/* Users List */}
        {usersLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Chargement des utilisateurs...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-16">
            <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2"><TranslatedText text="No users found" /></h3>
            <p className="text-gray-500 mb-6"><TranslatedText text="Get started by adding your first user." /></p>
            <button
              onClick={() => setShowAddUserModal(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              <TranslatedText text="Add First User" />
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {viewMode === 'table' ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"><TranslatedText text="User" /></th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"><TranslatedText text="Role" /></th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"><TranslatedText text="Shop" /></th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"><TranslatedText text="Status" /></th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"><TranslatedText text="Actions" /></th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <span className="text-sm font-medium text-blue-600">
                                {user.first_name?.[0]}{user.last_name?.[0]}
                              </span>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {user.first_name} {user.last_name}
                              </div>
                              <div className="text-sm text-gray-500">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${user.role === 'admin' ? 'bg-red-100 text-red-800' :
                            user.role === 'manager' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {shops.find(s => s.id === user.shop_id)?.name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${user.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                            }`}>
                            {user.is_active ? (
                              <>
                                <CheckCircle className="h-3 w-3 mr-1" />
                                <TranslatedText text="Active" />
                              </>
                            ) : (
                              <>
                                <X className="h-3 w-3 mr-1" />
                                <TranslatedText text="Inactive" />
                              </>
                            )}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleEditUser(user)}
                              className="text-blue-600 hover:text-blue-900 p-1 rounded"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="text-red-600 hover:text-red-900 p-1 rounded"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 p-6">
                {users.map((user) => (
                  <div key={user.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                      <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-lg font-medium text-blue-600">
                          {user.first_name?.[0]}{user.last_name?.[0]}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEditUser(user)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="text-red-600 hover:text-red-900 p-1 rounded"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {user.first_name} {user.last_name}
                    </h3>
                    <p className="text-gray-600 text-sm mb-3">{user.email}</p>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm text-gray-500">
                        <Key className="h-4 w-4 mr-2" />
                        <span className="capitalize">{user.role}</span>
                      </div>
                      {user.shop_id && (
                        <div className="flex items-center text-sm text-gray-500">
                          <Building className="h-4 w-4 mr-2" />
                          <span>{shops.find(s => s.id === user.shop_id)?.name}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${user.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                        }`}>
                        {user.is_active ? (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            <TranslatedText text="Active" />
                          </>
                        ) : (
                          <>
                            <X className="h-3 w-3 mr-1" />
                            <TranslatedText text="Inactive" />
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderAddUserModal = () => {
    if (!showAddUserModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-10 mx-auto p-0 w-full max-w-2xl">
          <div className="bg-white rounded-2xl shadow-2xl border-0 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-white bg-opacity-20 rounded-xl">
                    <UserPlus className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white"><TranslatedText text="Add New User" /></h3>
                    <p className="text-blue-100 text-sm mt-1"><TranslatedText text="Create a new user account with appropriate permissions" /></p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAddUserModal(false)}
                  className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-xl transition-all duration-200"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={(e) => { e.preventDefault(); handleAddUser(); }} className="p-8">
              <div className="space-y-6">
                {/* Personal Information Section */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900"><TranslatedText text="Personal Information" /></h4>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">
                        <TranslatedText text="First Name" /> <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          value={userFormData.first_name}
                          onChange={(e) => setUserFormData({ ...userFormData, first_name: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white hover:bg-gray-50"
                          placeholder={tSync("Enter first name")}
                        />
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <Users className="h-5 w-5 text-gray-400" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">
                        <TranslatedText text="Last Name" /> <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          value={userFormData.last_name}
                          onChange={(e) => setUserFormData({ ...userFormData, last_name: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white hover:bg-gray-50"
                          placeholder={tSync("Enter last name")}
                        />
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <Users className="h-5 w-5 text-gray-400" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Account Information Section */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Key className="h-5 w-5 text-green-600" />
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900"><TranslatedText text="Account Information" /></h4>
                  </div>

                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">
                          <TranslatedText text="Username" /> <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            required
                            value={userFormData.username}
                            onChange={(e) => setUserFormData({ ...userFormData, username: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white hover:bg-gray-50"
                            placeholder={tSync("Choose username")}
                          />
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <UserPlus className="h-5 w-5 text-gray-400" />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">
                          <TranslatedText text="Email Address" /> <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="email"
                            required
                            value={userFormData.email}
                            onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white hover:bg-gray-50"
                            placeholder={tSync("user@company.com")}
                          />
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <Mail className="h-5 w-5 text-gray-400" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">
                        Phone Number
                      </label>
                      <div className="relative">
                        <input
                          type="tel"
                          value={userFormData.phone}
                          onChange={(e) => setUserFormData({ ...userFormData, phone: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white hover:bg-gray-50"
                          placeholder="+1 (555) 123-4567"
                        />
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <Phone className="h-5 w-5 text-gray-400" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Security & Permissions Section */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Shield className="h-5 w-5 text-purple-600" />
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900"><TranslatedText text="Security & Permissions" /></h4>
                  </div>

                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">
                          <TranslatedText text="User Role" /> <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <select
                            value={userFormData.role}
                            onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white hover:bg-gray-50 appearance-none"
                          >
                            <option value="cashier">👤 <TranslatedText text="Cashier - Basic access" /></option>
                            <option value="manager">👨‍💼 <TranslatedText text="Manager - Enhanced permissions" /></option>
                            <option value="admin">👑 <TranslatedText text="Admin - Full system access" /></option>
                          </select>
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <ChevronRight className="h-5 w-5 text-gray-400 transform rotate-90" />
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1"><TranslatedText text="Select the appropriate access level for this user" /></p>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">
                          <TranslatedText text="Shop Assignment" />
                        </label>
                        <div className="relative">
                          <select
                            value={userFormData.shop_id}
                            onChange={(e) => setUserFormData({ ...userFormData, shop_id: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white hover:bg-gray-50 appearance-none"
                          >
                            <option value="">🏪 <TranslatedText text="Select Shop (Required for Cashier)" /></option>
                            {shopsData?.shops?.map(shop => (
                              <option key={shop.id} value={shop.id}>🏪 {shop.name}</option>
                            ))}
                          </select>
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <ChevronRight className="h-5 w-5 text-gray-400 transform rotate-90" />
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1"><TranslatedText text="Assign user to a specific shop location (required for cashier role; optional for manager/admin)" /></p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">
                          <TranslatedText text="Password" /> <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="password"
                            required
                            value={userFormData.password}
                            onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white hover:bg-gray-50"
                            placeholder={tSync("Create strong password")}
                          />
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <Lock className="h-5 w-5 text-gray-400" />
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1"><TranslatedText text="Minimum 8 characters recommended" /></p>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">
                          <TranslatedText text="Confirm Password" /> <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="password"
                            required
                            value={userFormData.confirm_password}
                            onChange={(e) => setUserFormData({ ...userFormData, confirm_password: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white hover:bg-gray-50"
                            placeholder={tSync("Confirm your password")}
                          />
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <Lock className="h-5 w-5 text-gray-400" />
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1"><TranslatedText text="Must match the password above" /></p>
                      </div>
                    </div>
                  </div>
                </div>


              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4 pt-8 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="w-full sm:w-auto px-6 py-3 border-2 border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addUserMutation.isPending}
                  className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  {addUserMutation.isPending ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span><TranslatedText text="Création de l'utilisateur..." /></span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <UserPlus className="h-5 w-5" />
                      <span><TranslatedText text="Create User Account" /></span>
                    </div>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  const renderEditUserModal = () => {
    if (!showEditUserModal || !editingUser) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-10 mx-auto p-0 w-full max-w-2xl">
          <div className="bg-white rounded-2xl shadow-2xl border-0 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-green-700 px-8 py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-white bg-opacity-20 rounded-xl">
                    <Edit className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white"><TranslatedText text="Edit User Account" /></h3>
                    <p className="text-green-100 text-sm mt-1"><TranslatedText text="Update user information and permissions" /></p>
                  </div>
                </div>
                <button
                  onClick={() => setShowEditUserModal(false)}
                  className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-xl transition-all duration-200"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={(e) => { e.preventDefault(); handleUpdateUser(); }} className="p-8">
              <div className="space-y-6">
                {/* Personal Information Section */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900"><TranslatedText text="Personal Information" /></h4>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">
                        <TranslatedText text="First Name" /> <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          value={userFormData.first_name}
                          onChange={(e) => setUserFormData({ ...userFormData, first_name: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white hover:bg-gray-50"
                          placeholder={tSync("Enter first name")}
                        />
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <Users className="h-5 w-5 text-gray-400" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">
                        <TranslatedText text="Last Name" /> <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          value={userFormData.last_name}
                          onChange={(e) => setUserFormData({ ...userFormData, last_name: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white hover:bg-gray-50"
                          placeholder={tSync("Enter last name")}
                        />
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <Users className="h-5 w-5 text-gray-400" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Account Information Section */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Key className="h-5 w-5 text-green-600" />
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900"><TranslatedText text="Account Information" /></h4>
                  </div>

                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">
                          <TranslatedText text="Username" /> <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            required
                            value={userFormData.username}
                            onChange={(e) => setUserFormData({ ...userFormData, username: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white hover:bg-gray-50"
                            placeholder={tSync("Choose username")}
                          />
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <UserPlus className="h-5 w-5 text-gray-400" />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">
                          <TranslatedText text="Email Address" /> <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="email"
                            required
                            value={userFormData.email}
                            onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white hover:bg-gray-50"
                            placeholder={tSync("user@company.com")}
                          />
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <Mail className="h-5 w-5 text-gray-400" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">
                        <TranslatedText text="Phone Number" />
                      </label>
                      <div className="relative">
                        <input
                          type="tel"
                          value={userFormData.phone}
                          onChange={(e) => setUserFormData({ ...userFormData, phone: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white hover:bg-gray-50"
                          placeholder="+1 (555) 123-4567"
                        />
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <Phone className="h-5 w-5 text-gray-400" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Security & Permissions Section */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Shield className="h-5 w-5 text-purple-600" />
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900">Security & Permissions</h4>
                  </div>

                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">
                          <TranslatedText text="User Role" /> <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <select
                            value={userFormData.role}
                            onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white hover:bg-gray-50 appearance-none"
                          >
                            <option value="user">👤 <TranslatedText text="User - Basic access" /></option>
                            <option value="manager">👨‍💼 <TranslatedText text="Manager - Enhanced permissions" /></option>
                            <option value="admin">👑 <TranslatedText text="Admin - Full system access" /></option>
                          </select>
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <ChevronRight className="h-5 w-5 text-gray-400 transform rotate-90" />
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1"><TranslatedText text="Select the appropriate access level for this user" /></p>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">
                          <TranslatedText text="Shop Assignment" />
                        </label>
                        <div className="relative">
                          <select
                            value={userFormData.shop_id}
                            onChange={(e) => setUserFormData({ ...userFormData, shop_id: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white hover:bg-gray-50 appearance-none"
                          >
                            <option value="">🏪 <TranslatedText text="Select Shop (Optional)" /></option>
                            {shopsData?.shops?.map(shop => (
                              <option key={shop.id} value={shop.id}>🏪 {shop.name}</option>
                            ))}
                          </select>
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <ChevronRight className="h-5 w-5 text-gray-400 transform rotate-90" />
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1"><TranslatedText text="Assign user to a specific shop location" /></p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">
                          <TranslatedText text="New Password" />
                        </label>
                        <div className="relative">
                          <input
                            type="password"
                            value={userFormData.password}
                            onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white hover:bg-gray-50"
                            placeholder={tSync("Enter new password (optional)")}
                          />
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <Lock className="h-5 w-5 text-gray-400" />
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1"><TranslatedText text="Leave blank to keep the current password" /></p>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">
                          <TranslatedText text="Confirm Password" />
                        </label>
                        <div className="relative">
                          <input
                            type="password"
                            value={userFormData.confirm_password}
                            onChange={(e) => setUserFormData({ ...userFormData, confirm_password: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white hover:bg-gray-50"
                            placeholder={tSync("Confirm new password")}
                          />
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <Lock className="h-5 w-5 text-gray-400" />
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1"><TranslatedText text="Must match the new password above" /></p>
                      </div>
                    </div>
                  </div>
                </div>


              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4 pt-8 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowEditUserModal(false)}
                  className="w-full sm:w-auto px-6 py-3 border-2 border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateUserMutation.isPending}
                  className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold rounded-xl hover:from-green-700 hover:to-green-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  {updateUserMutation.isPending ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span><TranslatedText text="Mise à jour..." /></span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Save className="h-5 w-5" />
                      <span><TranslatedText text="Update User Account" /></span>
                    </div>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  const renderSecuritySettings = () => {
    return (
      <div className="p-8">
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-3 bg-red-100 rounded-xl">
              <Shield className="h-8 w-8 text-red-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900"><TranslatedText text="Security Settings" /></h2>
              <p className="text-gray-600 mt-1"><TranslatedText text="Configure authentication, authorization, and security policies" /></p>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Two-Factor Authentication */}
          <div className="bg-gray-50 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Lock className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900"><TranslatedText text="Two-Factor Authentication" /></h3>
                  <p className="text-sm text-gray-600">Add an extra layer of security to user accounts</p>
                </div>
              </div>
              <button
                onClick={() => setSecuritySettings(prev => ({ ...prev, twoFactorAuth: !prev.twoFactorAuth }))}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${securitySettings.twoFactorAuth
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                {securitySettings.twoFactorAuth ? 'Enabled' : 'Disabled'}
              </button>
            </div>
            <p className="text-sm text-gray-600">
              Two-factor authentication requires users to provide a second form of verification in addition to their password.
            </p>
          </div>

          {/* Password Policy */}
          <div className="bg-gray-50 rounded-xl p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Key className="h-5 w-5 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900"><TranslatedText text="Password Policy" /></h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Length</label>
                <input
                  type="number"
                  min="6"
                  max="32"
                  value={securitySettings.passwordPolicy.minLength}
                  onChange={(e) => setSecuritySettings(prev => ({
                    ...prev,
                    passwordPolicy: { ...prev.passwordPolicy, minLength: parseInt(e.target.value) }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Password Expiry (days)</label>
                <input
                  type="number"
                  min="0"
                  max="365"
                  value={securitySettings.passwordPolicy.passwordExpiry}
                  onChange={(e) => setSecuritySettings(prev => ({
                    ...prev,
                    passwordPolicy: { ...prev.passwordPolicy, passwordExpiry: parseInt(e.target.value) }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="requireUppercase"
                  checked={securitySettings.passwordPolicy.requireUppercase}
                  onChange={(e) => setSecuritySettings(prev => ({
                    ...prev,
                    passwordPolicy: { ...prev.passwordPolicy, requireUppercase: e.target.checked }
                  }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="requireUppercase" className="ml-2 text-sm text-gray-700">
                  Require uppercase letters (A-Z)
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="requireLowercase"
                  checked={securitySettings.passwordPolicy.requireLowercase}
                  onChange={(e) => setSecuritySettings(prev => ({
                    ...prev,
                    passwordPolicy: { ...prev.passwordPolicy, requireLowercase: e.target.checked }
                  }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="requireLowercase" className="ml-2 text-sm text-gray-700">
                  Require lowercase letters (a-z)
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="requireNumbers"
                  checked={securitySettings.passwordPolicy.requireNumbers}
                  onChange={(e) => setSecuritySettings(prev => ({
                    ...prev,
                    passwordPolicy: { ...prev.passwordPolicy, requireNumbers: e.target.checked }
                  }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="requireNumbers" className="ml-2 text-sm text-gray-700">
                  Require numbers (0-9)
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="requireSpecialChars"
                  checked={securitySettings.passwordPolicy.requireSpecialChars}
                  onChange={(e) => setSecuritySettings(prev => ({
                    ...prev,
                    passwordPolicy: { ...prev.passwordPolicy, requireSpecialChars: e.target.checked }
                  }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="requireSpecialChars" className="ml-2 text-sm text-gray-700">
                  Require special characters (!@#$%^&*)
                </label>
              </div>
            </div>
          </div>

          {/* Session Management */}
          <div className="bg-gray-50 rounded-xl p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-green-100 rounded-lg">
                <Clock className="h-5 w-5 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900"><TranslatedText text="Session Management" /></h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Session Timeout (minutes)</label>
                <input
                  type="number"
                  min="5"
                  max="480"
                  value={securitySettings.sessionTimeout}
                  onChange={(e) => setSecuritySettings(prev => ({ ...prev, sessionTimeout: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Users will be automatically logged out after this period of inactivity</p>
              </div>
            </div>
          </div>

          {/* Login Security */}
          <div className="bg-gray-50 rounded-xl p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-orange-100 rounded-lg">
                <AlertCircle className="h-5 w-5 text-orange-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900"><TranslatedText text="Login Security" /></h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Maximum Login Attempts</label>
                <input
                  type="number"
                  min="3"
                  max="10"
                  value={securitySettings.loginAttempts.maxAttempts}
                  onChange={(e) => setSecuritySettings(prev => ({
                    ...prev,
                    loginAttempts: { ...prev.loginAttempts, maxAttempts: parseInt(e.target.value) }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Account will be locked after this many failed attempts</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Lockout Duration (minutes)</label>
                <input
                  type="number"
                  min="5"
                  max="1440"
                  value={securitySettings.loginAttempts.lockoutDuration}
                  onChange={(e) => setSecuritySettings(prev => ({
                    ...prev,
                    loginAttempts: { ...prev.loginAttempts, lockoutDuration: parseInt(e.target.value) }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">How long the account remains locked</p>
              </div>
            </div>
          </div>

          {/* Audit Logging */}
          <div className="bg-gray-50 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900"><TranslatedText text="Audit Logging" /></h3>
                  <p className="text-sm text-gray-600"><TranslatedText text="Track user activities and system changes" /></p>
                </div>
              </div>
              <button
                onClick={() => setSecuritySettings(prev => ({ ...prev, auditLogging: !prev.auditLogging }))}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${securitySettings.auditLogging
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                {securitySettings.auditLogging ? 'Enabled' : 'Disabled'}
              </button>
            </div>
            <p className="text-sm text-gray-600">
              Audit logging records all user actions, login attempts, and system changes for security monitoring and compliance.
            </p>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-6 border-t border-gray-200">
            <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200">
              <Save className="h-4 w-4 inline mr-2" />
              Save Security Settings
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderAppearanceBranding = () => {
    return (
      <div className="p-8">
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-3 bg-purple-100 rounded-xl">
              <Palette className="h-8 w-8 text-purple-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold theme-text-primary"><TranslatedText text="Appearance & Branding" /></h2>
              <p className="theme-text-secondary mt-1">Customize the look and feel of your system</p>
            </div>
          </div>

          {/* Theme Preview */}
          <div className="mb-6 p-4 theme-card rounded-lg border-2 border-dashed theme-border">
            <h3 className="text-lg font-semibold theme-text-primary mb-2"><TranslatedText text="Live Preview" /></h3>
            <p className="theme-text-secondary text-sm mb-3">See your changes in real-time as you customize the appearance</p>
            <div className="flex items-center space-x-4">
              <div className="theme-card p-3 rounded-lg">
                <div className="w-4 h-4 rounded-full bg-blue-500 mb-2"></div>
                <div className="theme-text-primary text-sm font-medium">Sample Card</div>
                <div className="theme-text-secondary text-xs">Theme preview</div>
              </div>
              <div className="theme-input px-3 py-2 rounded-lg border">
                <span className="theme-text-primary text-sm">Sample Input</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Theme Selection */}
          <div className="bg-gray-50 rounded-xl p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Zap className="h-5 w-5 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900"><TranslatedText text="Theme Selection" /></h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div
                onClick={() => handleAppearanceChange('theme', 'light')}
                className={`p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${appearanceSettings.theme === 'light'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
              >
                <div className="w-full h-20 bg-white border border-gray-200 rounded-lg mb-3 flex items-center justify-center">
                  <div className="w-3 h-3 bg-gray-400 rounded-full mr-2"></div>
                  <div className="w-3 h-3 bg-gray-400 rounded-full mr-2"></div>
                  <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                </div>
                <div className="text-center">
                  <div className="font-medium text-gray-900">Light Theme</div>
                  <div className="text-sm text-gray-500">Clean and bright interface</div>
                </div>
              </div>

              <div
                onClick={() => handleAppearanceChange('theme', 'dark')}
                className={`p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${appearanceSettings.theme === 'dark'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
              >
                <div className="w-full h-20 bg-gray-900 border border-gray-700 rounded-lg mb-3 flex items-center justify-center">
                  <div className="w-3 h-3 bg-gray-500 rounded-full mr-2"></div>
                  <div className="w-3 h-3 bg-gray-500 rounded-full mr-2"></div>
                  <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                </div>
                <div className="text-center">
                  <div className="font-medium text-gray-900">Dark Theme</div>
                  <div className="text-sm text-gray-500">Easy on the eyes</div>
                </div>
              </div>

              <div
                onClick={() => handleAppearanceChange('theme', 'auto')}
                className={`p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${appearanceSettings.theme === 'auto'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
              >
                <div className="w-full h-20 bg-gradient-to-r from-gray-100 to-gray-300 border border-gray-200 rounded-lg mb-3 flex items-center justify-center">
                  <div className="w-3 h-3 bg-gray-400 rounded-full mr-2"></div>
                  <div className="w-3 h-3 bg-gray-400 rounded-full mr-2"></div>
                  <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                </div>
                <div className="text-center">
                  <div className="font-medium text-gray-900">Auto Theme</div>
                  <div className="text-sm text-gray-500">Follows system preference</div>
                </div>
              </div>
            </div>
          </div>

          {/* Color Scheme */}
          <div className="bg-gray-50 rounded-xl p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-green-100 rounded-lg">
                <Palette className="h-5 w-5 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900"><TranslatedText text="Color Scheme" /></h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Primary Color</label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={appearanceSettings.primaryColor}
                    onChange={(e) => handleAppearanceChange('primaryColor', e.target.value)}
                    className="w-12 h-10 border border-gray-300 rounded-lg cursor-pointer"
                  />
                  <input
                    type="text"
                    value={appearanceSettings.primaryColor}
                    onChange={(e) => handleAppearanceChange('primaryColor', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="#3B82F6"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Main brand color used throughout the interface</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Secondary Color</label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={appearanceSettings.secondaryColor}
                    onChange={(e) => handleAppearanceChange('secondaryColor', e.target.value)}
                    className="w-12 h-10 border border-gray-300 rounded-lg cursor-pointer"
                  />
                  <input
                    type="text"
                    value={appearanceSettings.secondaryColor}
                    onChange={(e) => handleAppearanceChange('secondaryColor', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="#6B7280"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Supporting color for secondary elements</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Accent Color</label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={appearanceSettings.accentColor}
                    onChange={(e) => handleAppearanceChange('accentColor', e.target.value)}
                    className="w-12 h-10 border border-gray-300 rounded-lg cursor-pointer"
                  />
                  <input
                    type="text"
                    value={appearanceSettings.accentColor}
                    onChange={(e) => handleAppearanceChange('accentColor', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="#10B981"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Highlight color for important actions</p>
              </div>
            </div>
          </div>

          {/* Typography */}
          <div className="bg-gray-50 rounded-xl p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Type className="h-5 w-5 text-indigo-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900"><TranslatedText text="Typography" /></h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Font Family</label>
                <select
                  value={appearanceSettings.fontFamily}
                  onChange={(e) => handleAppearanceChange('fontFamily', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="Inter">Inter - Modern and clean</option>
                  <option value="Roboto">Roboto - Google's system font</option>
                  <option value="Open Sans">Open Sans - Highly readable</option>
                  <option value="Lato">Lato - Friendly and professional</option>
                  <option value="Poppins">Poppins - Geometric and modern</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Font Size</label>
                <select
                  value={appearanceSettings.fontSize}
                  onChange={(e) => handleAppearanceChange('fontSize', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="small">Small - Compact interface</option>
                  <option value="medium">Medium - Standard size</option>
                  <option value="large">Large - Enhanced readability</option>
                </select>
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Border Radius</label>
              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="borderRadius"
                    value="small"
                    checked={appearanceSettings.borderRadius === 'small'}
                    onChange={(e) => handleAppearanceChange('borderRadius', e.target.value)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-700">Small (4px)</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="borderRadius"
                    value="medium"
                    checked={appearanceSettings.borderRadius === 'medium'}
                    onChange={(e) => handleAppearanceChange('borderRadius', e.target.value)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-700">Medium (8px)</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="borderRadius"
                    value="large"
                    checked={appearanceSettings.borderRadius === 'large'}
                    onChange={(e) => handleAppearanceChange('borderRadius', e.target.value)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-700">Large (12px)</span>
                </label>
              </div>
            </div>
          </div>

          {/* Company Branding */}
          <div className="bg-gray-50 rounded-xl p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Building className="h-5 w-5 text-yellow-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900"><TranslatedText text="Company Branding" /></h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
                <input
                  type="text"
                  value={appearanceSettings.companyName}
                  onChange={(e) => setAppearanceSettings(prev => ({ ...prev, companyName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Your Company Name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Company Description</label>
                <input
                  type="text"
                  value={appearanceSettings.companyDescription}
                  onChange={(e) => setAppearanceSettings(prev => ({ ...prev, companyDescription: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Brief company description"
                />
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Company Logo</label>
                <div className="flex items-center space-x-3">
                  <div className="w-16 h-16 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                    {appearanceSettings.logo ? (
                      <img src={appearanceSettings.logo} alt="Logo" className="w-12 h-12 object-contain" />
                    ) : (
                      <Plus className="h-6 w-6 text-gray-400" />
                    )}
                  </div>
                  <label className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors cursor-pointer">
                    Upload Logo
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e.target.files[0], 'logo')}
                      className="hidden"
                    />
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-1">Recommended: 256x256px PNG or SVG</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Favicon</label>
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                    {appearanceSettings.favicon ? (
                      <img src={appearanceSettings.favicon} alt="Favicon" className="w-8 h-8 object-contain" />
                    ) : (
                      <Star className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                  <label className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors cursor-pointer">
                    Upload Favicon
                    <input
                      type="file"
                      accept="image/*,.ico"
                      onChange={(e) => handleFileUpload(e.target.files[0], 'favicon')}
                      className="hidden"
                    />
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-1">Recommended: 32x32px ICO or PNG</p>
              </div>
            </div>
          </div>

          {/* Custom CSS */}
          <div className="bg-gray-50 rounded-xl p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-red-100 rounded-lg">
                <Code className="h-5 w-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900"><TranslatedText text="Custom CSS" /></h3>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Custom Styles</label>
              <textarea
                value={appearanceSettings.customCSS}
                onChange={(e) => {
                  setAppearanceSettings(prev => ({ ...prev, customCSS: e.target.value }));
                  // Apply custom CSS preview
                  applyCustomCSS(e.target.value);
                }}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                placeholder="/* Add your custom CSS here */&#10;.custom-button {&#10;  background-color: #your-color;&#10;}"
              />
              <p className="text-xs text-gray-500 mt-1">Add custom CSS to further customize the appearance</p>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-6 border-t border-gray-200">
            <button
              onClick={handleSaveAppearanceSettings}
              disabled={isSavingAppearance || saveAppearanceMutation.isPending}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSavingAppearance || saveAppearanceMutation.isPending ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Sauvegarde...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Save className="h-4 w-4" />
                  <span>Save Appearance Settings</span>
                </div>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderNotifications = () => {
    return (
      <div className="p-8">
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-3 bg-orange-100 rounded-xl">
              <Bell className="h-8 w-8 text-orange-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900"><TranslatedText text="Notification Settings" /></h2>
              <p className="text-gray-600 mt-1"><TranslatedText text="Configure email, SMS, and in-app notifications" /></p>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Email Notifications */}
          <div className="bg-gray-50 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Mail className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900"><TranslatedText text="Email Notifications" /></h3>
                  <p className="text-sm text-gray-600"><TranslatedText text="Manage email notification preferences" /></p>
                </div>
              </div>
              <button
                onClick={() => setNotificationSettings(prev => ({
                  ...prev,
                  email: { ...prev.email, enabled: !prev.email.enabled }
                }))}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${notificationSettings.email.enabled
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                {notificationSettings.email.enabled ? 'Enabled' : 'Disabled'}
              </button>
            </div>

            {notificationSettings.email.enabled && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="emailOrderConfirmations"
                      checked={notificationSettings.email.orderConfirmations}
                      onChange={(e) => setNotificationSettings(prev => ({
                        ...prev,
                        email: { ...prev.email, orderConfirmations: e.target.checked }
                      }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="emailOrderConfirmations" className="ml-2 text-sm text-gray-700">
                      <TranslatedText text="Order Confirmations" />
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="emailOrderUpdates"
                      checked={notificationSettings.email.orderUpdates}
                      onChange={(e) => setNotificationSettings(prev => ({
                        ...prev,
                        email: { ...prev.email, orderUpdates: e.target.checked }
                      }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="emailOrderUpdates" className="ml-2 text-sm text-gray-700">
                      <TranslatedText text="Order Updates" />
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="emailInventoryAlerts"
                      checked={notificationSettings.email.inventoryAlerts}
                      onChange={(e) => setNotificationSettings(prev => ({
                        ...prev,
                        email: { ...prev.email, inventoryAlerts: e.target.checked }
                      }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="emailInventoryAlerts" className="ml-2 text-sm text-gray-700">
                      <TranslatedText text="Inventory Alerts" />
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="emailSystemNotifications"
                      checked={notificationSettings.email.systemNotifications}
                      onChange={(e) => setNotificationSettings(prev => ({
                        ...prev,
                        email: { ...prev.email, systemNotifications: e.target.checked }
                      }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="emailSystemNotifications" className="ml-2 text-sm text-gray-700">
                      <TranslatedText text="System Notifications" />
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="emailMarketingEmails"
                      checked={notificationSettings.email.marketingEmails}
                      onChange={(e) => setNotificationSettings(prev => ({
                        ...prev,
                        email: { ...prev.email, marketingEmails: e.target.checked }
                      }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="emailMarketingEmails" className="ml-2 text-sm text-gray-700">
                      <TranslatedText text="Marketing Emails" />
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="emailDailyDigest"
                      checked={notificationSettings.email.dailyDigest}
                      onChange={(e) => setNotificationSettings(prev => ({
                        ...prev,
                        email: { ...prev.email, dailyDigest: e.target.checked }
                      }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="emailDailyDigest" className="ml-2 text-sm text-gray-700">
                      <TranslatedText text="Daily Digest" />
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="emailWeeklyReport"
                      checked={notificationSettings.email.weeklyReport}
                      onChange={(e) => setNotificationSettings(prev => ({
                        ...prev,
                        email: { ...prev.email, weeklyReport: e.target.checked }
                      }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="emailWeeklyReport" className="ml-2 text-sm text-gray-700">
                      <TranslatedText text="Weekly Report" />
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SMS Notifications */}
          <div className="bg-gray-50 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Phone className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900"><TranslatedText text="SMS Notifications" /></h3>
                  <p className="text-sm text-gray-600"><TranslatedText text="Configure SMS notification preferences" /></p>
                </div>
              </div>
              <button
                onClick={() => setNotificationSettings(prev => ({
                  ...prev,
                  sms: { ...prev.sms, enabled: !prev.sms.enabled }
                }))}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${notificationSettings.sms.enabled
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                {notificationSettings.sms.enabled ? 'Enabled' : 'Disabled'}
              </button>
            </div>

            {notificationSettings.sms.enabled && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="smsOrderConfirmations"
                      checked={notificationSettings.sms.orderConfirmations}
                      onChange={(e) => setNotificationSettings(prev => ({
                        ...prev,
                        sms: { ...prev.sms, orderConfirmations: e.target.checked }
                      }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="smsOrderConfirmations" className="ml-2 text-sm text-gray-700">
                      <TranslatedText text="Order Confirmations" />
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="smsOrderUpdates"
                      checked={notificationSettings.sms.orderUpdates}
                      onChange={(e) => setNotificationSettings(prev => ({
                        ...prev,
                        sms: { ...prev.sms, orderUpdates: e.target.checked }
                      }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="smsOrderUpdates" className="ml-2 text-sm text-gray-700">
                      <TranslatedText text="Order Updates" />
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="smsUrgentAlerts"
                      checked={notificationSettings.sms.urgentAlerts}
                      onChange={(e) => setNotificationSettings(prev => ({
                        ...prev,
                        sms: { ...prev.sms, urgentAlerts: e.target.checked }
                      }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="smsUrgentAlerts" className="ml-2 text-sm text-gray-700">
                      <TranslatedText text="Urgent Alerts" />
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* In-App Notifications */}
          <div className="bg-gray-50 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Bell className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900"><TranslatedText text="In-App Notifications" /></h3>
                  <p className="text-sm text-gray-600"><TranslatedText text="Manage in-app notification preferences" /></p>
                </div>
              </div>
              <button
                onClick={() => setNotificationSettings(prev => ({
                  ...prev,
                  inApp: { ...prev.inApp, enabled: !prev.inApp.enabled }
                }))}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${notificationSettings.inApp.enabled
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                {notificationSettings.inApp.enabled ? 'Enabled' : 'Disabled'}
              </button>
            </div>

            {notificationSettings.inApp.enabled && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="inAppOrderNotifications"
                      checked={notificationSettings.inApp.orderNotifications}
                      onChange={(e) => setNotificationSettings(prev => ({
                        ...prev,
                        inApp: { ...prev.inApp, orderNotifications: e.target.checked }
                      }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="inAppOrderNotifications" className="ml-2 text-sm text-gray-700">
                      <TranslatedText text="Order Notifications" />
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="inAppInventoryAlerts"
                      checked={notificationSettings.inApp.inventoryAlerts}
                      onChange={(e) => setNotificationSettings(prev => ({
                        ...prev,
                        inApp: { ...prev.inApp, inventoryAlerts: e.target.checked }
                      }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="inAppInventoryAlerts" className="ml-2 text-sm text-gray-700">
                      <TranslatedText text="Inventory Alerts" />
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="inAppSystemUpdates"
                      checked={notificationSettings.inApp.systemUpdates}
                      onChange={(e) => setNotificationSettings(prev => ({
                        ...prev,
                        inApp: { ...prev.inApp, systemUpdates: e.target.checked }
                      }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="inAppSystemUpdates" className="ml-2 text-sm text-gray-700">
                      <TranslatedText text="System Updates" />
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="inAppSuccessMessages"
                      checked={notificationSettings.inApp.successMessages}
                      onChange={(e) => setNotificationSettings(prev => ({
                        ...prev,
                        inApp: { ...prev.inApp, successMessages: e.target.checked }
                      }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="inAppSuccessMessages" className="ml-2 text-sm text-gray-700">
                      <TranslatedText text="Success Messages" />
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="inAppErrorMessages"
                      checked={notificationSettings.inApp.errorMessages}
                      onChange={(e) => setNotificationSettings(prev => ({
                        ...prev,
                        inApp: { ...prev.inApp, errorMessages: e.target.checked }
                      }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="inAppErrorMessages" className="ml-2 text-sm text-gray-700">
                      <TranslatedText text="Error Messages" />
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="inAppTipsAndTricks"
                      checked={notificationSettings.inApp.tipsAndTricks}
                      onChange={(e) => setNotificationSettings(prev => ({
                        ...prev,
                        inApp: { ...prev.inApp, tipsAndTricks: e.target.checked }
                      }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="inAppTipsAndTricks" className="ml-2 text-sm text-gray-700">
                      <TranslatedText text="Tips & Tricks" />
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Push Notifications */}
          <div className="bg-gray-50 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <Zap className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900"><TranslatedText text="Push Notifications" /></h3>
                  <p className="text-sm text-gray-600"><TranslatedText text="Configure push notification preferences" /></p>
                </div>
              </div>
              <button
                onClick={() => setNotificationSettings(prev => ({
                  ...prev,
                  push: { ...prev.push, enabled: !prev.push.enabled }
                }))}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${notificationSettings.push.enabled
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                {notificationSettings.push.enabled ? 'Enabled' : 'Disabled'}
              </button>
            </div>

            {notificationSettings.push.enabled && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="pushOrderUpdates"
                      checked={notificationSettings.push.orderUpdates}
                      onChange={(e) => setNotificationSettings(prev => ({
                        ...prev,
                        push: { ...prev.push, orderUpdates: e.target.checked }
                      }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="pushOrderUpdates" className="ml-2 text-sm text-gray-700">
                      <TranslatedText text="Order Updates" />
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="pushInventoryAlerts"
                      checked={notificationSettings.push.inventoryAlerts}
                      onChange={(e) => setNotificationSettings(prev => ({
                        ...prev,
                        push: { ...prev.push, inventoryAlerts: e.target.checked }
                      }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="pushInventoryAlerts" className="ml-2 text-sm text-gray-700">
                      <TranslatedText text="Inventory Alerts" />
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="pushPromotions"
                      checked={notificationSettings.push.promotions}
                      onChange={(e) => setNotificationSettings(prev => ({
                        ...prev,
                        push: { ...prev.push, promotions: e.target.checked }
                      }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="pushPromotions" className="ml-2 text-sm text-gray-700">
                      <TranslatedText text="Promotions" />
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Notification Schedule */}
          <div className="bg-gray-50 rounded-xl p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900"><TranslatedText text="Notification Schedule" /></h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
                <select
                  value={notificationSettings.schedule.timezone}
                  onChange={(e) => setNotificationSettings(prev => ({
                    ...prev,
                    schedule: { ...prev.schedule, timezone: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="UTC">UTC (Coordinated Universal Time)</option>
                  <option value="EST">EST (Eastern Standard Time)</option>
                  <option value="PST">PST (Pacific Standard Time)</option>
                  <option value="GMT">GMT (Greenwich Mean Time)</option>
                  <option value="CET">CET (Central European Time)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Digest Frequency</label>
                <select
                  value={notificationSettings.schedule.digestFrequency}
                  onChange={(e) => setNotificationSettings(prev => ({
                    ...prev,
                    schedule: { ...prev.schedule, digestFrequency: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="never">Never</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <label className="text-sm font-medium text-gray-700">Quiet Hours</label>
                <button
                  onClick={() => setNotificationSettings(prev => ({
                    ...prev,
                    schedule: {
                      ...prev.schedule,
                      quietHours: { ...prev.schedule.quietHours, enabled: !prev.schedule.quietHours.enabled }
                    }
                  }))}
                  className={`px-3 py-1 rounded text-sm font-medium transition-all duration-200 ${notificationSettings.schedule.quietHours.enabled
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-700'
                    }`}
                >
                  {notificationSettings.schedule.quietHours.enabled ? 'Enabled' : 'Disabled'}
                </button>
              </div>

              {notificationSettings.schedule.quietHours.enabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                    <input
                      type="time"
                      value={notificationSettings.schedule.quietHours.startTime}
                      onChange={(e) => setNotificationSettings(prev => ({
                        ...prev,
                        schedule: {
                          ...prev.schedule,
                          quietHours: { ...prev.schedule.quietHours, startTime: e.target.value }
                        }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
                    <input
                      type="time"
                      value={notificationSettings.schedule.quietHours.endTime}
                      onChange={(e) => setNotificationSettings(prev => ({
                        ...prev,
                        schedule: {
                          ...prev.schedule,
                          quietHours: { ...prev.schedule.quietHours, endTime: e.target.value }
                        }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              )}

              <p className="text-xs text-gray-500 mt-2">
                During quiet hours, only urgent notifications will be sent
              </p>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-6 border-t border-gray-200">
            <button className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-all duration-200">
              <Save className="h-4 w-4 inline mr-2" />
              <TranslatedText text="Save Notification Settings" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderBillingSubscription = () => {
    return (
      <div className="p-8">
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-3 bg-indigo-100 rounded-xl">
              <CreditCard className="h-8 w-8 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900"><TranslatedText text="Billing & Subscription" /></h2>
              <p className="text-gray-600 mt-1"><TranslatedText text="Manage your subscription, payment methods, and billing history" /></p>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Current Plan */}
          <div className="bg-gray-50 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Star className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900"><TranslatedText text="Current Plan" /></h3>
                  <p className="text-sm text-gray-600"><TranslatedText text="Your active subscription details" /></p>
                </div>
              </div>
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                {billingSettings.currentPlan.status}
              </span>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-xl font-bold text-gray-900">{billingSettings.currentPlan.name} Plan</h4>
                  <p className="text-gray-600">Next billing: {billingSettings.currentPlan.nextBillingDate}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900">
                    ${billingSettings.currentPlan.price}
                    <span className="text-sm font-normal text-gray-500">/{billingSettings.currentPlan.interval}</span>
                  </div>
                  <p className="text-sm text-gray-500">{billingSettings.currentPlan.currency}</p>
                </div>
              </div>

              <div className="mb-6">
                <h5 className="font-medium text-gray-900 mb-3">Plan Features:</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {billingSettings.currentPlan.features.map((feature, index) => (
                    <div key={index} className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex space-x-3">
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors">
                  <TranslatedText text="Upgrade Plan" />
                </button>
                <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors">
                  <TranslatedText text="Change Plan" />
                </button>
                <button className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors">
                  <TranslatedText text="Cancel Subscription" />
                </button>
              </div>
            </div>
          </div>

          {/* Usage & Limits */}
          <div className="bg-gray-50 rounded-xl p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BarChart3 className="h-5 w-5 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900"><TranslatedText text="Usage & Limits" /></h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Users</span>
                  <span className="text-sm text-gray-500">
                    {billingSettings.usage.users}/{billingSettings.usage.maxUsers}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(billingSettings.usage.users / billingSettings.usage.maxUsers) * 100}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {Math.round((billingSettings.usage.users / billingSettings.usage.maxUsers) * 100)}% used
                </p>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Storage</span>
                  <span className="text-sm text-gray-500">
                    {billingSettings.usage.storage}GB/{billingSettings.usage.maxStorage}GB
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(billingSettings.usage.storage / billingSettings.usage.maxStorage) * 100}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {Math.round((billingSettings.usage.storage / billingSettings.usage.maxStorage) * 100)}% used
                </p>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">API Calls</span>
                  <span className="text-sm text-gray-500">
                    {billingSettings.usage.apiCalls.toLocaleString()}/{billingSettings.usage.maxApiCalls.toLocaleString()}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(billingSettings.usage.apiCalls / billingSettings.usage.maxApiCalls) * 100}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {Math.round((billingSettings.usage.apiCalls / billingSettings.usage.maxApiCalls) * 100)}% used
                </p>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="bg-gray-50 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <CreditCard className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900"><TranslatedText text="Payment Method" /></h3>
                  <p className="text-sm text-gray-600"><TranslatedText text="Manage your payment information" /></p>
                </div>
              </div>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors">
                <TranslatedText text="Update Payment Method" />
              </button>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-8 bg-gray-100 rounded flex items-center justify-center">
                    <CreditCard className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">
                      {billingSettings.paymentMethod.brand} •••• {billingSettings.paymentMethod.last4}
                    </div>
                    <div className="text-sm text-gray-500">
                      Expires {billingSettings.paymentMethod.expiryMonth}/{billingSettings.paymentMethod.expiryYear}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {billingSettings.paymentMethod.isDefault && (
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                      Default
                    </span>
                  )}
                  <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                    Edit
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Billing History */}
          <div className="bg-gray-50 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Archive className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900"><TranslatedText text="Billing History" /></h3>
                  <p className="text-sm text-gray-600"><TranslatedText text="View your past invoices and payments" /></p>
                </div>
              </div>
              <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors">
                <TranslatedText text="Download All" />
              </button>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <TranslatedText text="Invoice" />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <TranslatedText text="Date" />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <TranslatedText text="Amount" />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <TranslatedText text="Status" />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <TranslatedText text="Actions" />
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {billingSettings.billingHistory.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{invoice.id}</div>
                        <div className="text-sm text-gray-500">{invoice.description}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(invoice.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${invoice.amount} {invoice.currency}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${invoice.status === 'paid'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                          }`}>
                          {invoice.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button className="text-blue-600 hover:text-blue-900 mr-3">
                          Download
                        </button>
                        <button className="text-gray-600 hover:text-gray-900">
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tax Information */}
          <div className="bg-gray-50 rounded-xl p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-red-100 rounded-lg">
                <Building className="h-5 w-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900"><TranslatedText text="Tax Information" /></h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tax ID / VAT Number</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your tax identification number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <option value="">Select country</option>
                  <option value="US">United States</option>
                  <option value="CA">Canada</option>
                  <option value="GB">United Kingdom</option>
                  <option value="DE">Germany</option>
                  <option value="FR">France</option>
                </select>
              </div>
            </div>

            <div className="mt-4">
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors">
                <TranslatedText text="Save Tax Information" />
              </button>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-6 border-t border-gray-200">
            <button className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200">
              <Save className="h-4 w-4 inline mr-2" />
              <TranslatedText text="Save Billing Settings" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderDatabaseSystem = () => {
    return (
      <div className="p-8">
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-3 bg-gray-100 rounded-xl">
              <Database className="h-8 w-8 text-gray-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900"><TranslatedText text="Database & System" /></h2>
              <p className="text-gray-600 mt-1"><TranslatedText text="Monitor system performance, database health, and maintenance settings" /></p>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Database Information */}
          <div className="bg-gray-50 rounded-xl p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Database className="h-5 w-5 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900"><TranslatedText text="Database Information" /></h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700"><TranslatedText text="Database Type" /></span>
                </div>
                <div className="text-lg font-semibold text-gray-900">{systemSettings.database.type}</div>
                <p className="text-xs text-gray-500">Version {systemSettings.database.version}</p>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700"><TranslatedText text="Database Size" /></span>
                </div>
                <div className="text-lg font-semibold text-gray-900">{systemSettings.database.size}</div>
                <p className="text-xs text-gray-500">Total storage used</p>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700"><TranslatedText text="Last Backup" /></span>
                </div>
                <div className="text-lg font-semibold text-gray-900">
                  {new Date(systemSettings.database.lastBackup).toLocaleDateString()}
                </div>
                <p className="text-xs text-gray-500">
                  {new Date(systemSettings.database.lastBackup).toLocaleTimeString()}
                </p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="autoBackup"
                  checked={systemSettings.database.autoBackup}
                  onChange={(e) => setSystemSettings(prev => ({
                    ...prev,
                    database: { ...prev.database, autoBackup: e.target.checked }
                  }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="autoBackup" className="ml-2 text-sm text-gray-700">
                  <TranslatedText text="Auto Backup" />
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="compression"
                  checked={systemSettings.database.compression}
                  onChange={(e) => setSystemSettings(prev => ({
                    ...prev,
                    database: { ...prev.database, compression: e.target.checked }
                  }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="compression" className="ml-2 text-sm text-gray-700">
                  <TranslatedText text="Compression" />
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="encryption"
                  checked={systemSettings.database.encryption}
                  onChange={(e) => setSystemSettings(prev => ({
                    ...prev,
                    database: { ...prev.database, encryption: e.target.checked }
                  }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="encryption" className="ml-2 text-sm text-gray-700">
                  <TranslatedText text="Encryption" />
                </label>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Backup Frequency</label>
              <select
                value={systemSettings.database.backupFrequency}
                onChange={(e) => setSystemSettings(prev => ({
                  ...prev,
                  database: { ...prev.database, backupFrequency: e.target.value }
                }))}
                className="w-full md:w-48 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          </div>

          {/* System Performance */}
          <div className="bg-gray-50 rounded-xl p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-green-100 rounded-lg">
                <BarChart3 className="h-5 w-5 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900"><TranslatedText text="System Performance" /></h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">CPU Usage</span>
                  <span className="text-sm text-gray-500">{systemSettings.performance.cpuUsage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${systemSettings.performance.cpuUsage > 80 ? 'bg-red-600' :
                      systemSettings.performance.cpuUsage > 60 ? 'bg-yellow-600' : 'bg-green-600'
                      }`}
                    style={{ width: `${systemSettings.performance.cpuUsage}%` }}
                  ></div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Memory Usage</span>
                  <span className="text-sm text-gray-500">{systemSettings.performance.memoryUsage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${systemSettings.performance.memoryUsage > 80 ? 'bg-red-600' :
                      systemSettings.performance.memoryUsage > 60 ? 'bg-yellow-600' : 'bg-green-600'
                      }`}
                    style={{ width: `${systemSettings.performance.memoryUsage}%` }}
                  ></div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Disk Usage</span>
                  <span className="text-sm text-gray-500">{systemSettings.performance.diskUsage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${systemSettings.performance.diskUsage > 80 ? 'bg-red-600' :
                      systemSettings.performance.diskUsage > 60 ? 'bg-yellow-600' : 'bg-green-600'
                      }`}
                    style={{ width: `${systemSettings.performance.diskUsage}%` }}
                  ></div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Network Latency</span>
                  <span className="text-sm text-gray-500">{systemSettings.performance.networkLatency}ms</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${systemSettings.performance.networkLatency > 50 ? 'bg-red-600' :
                      systemSettings.performance.networkLatency > 20 ? 'bg-yellow-600' : 'bg-green-600'
                      }`}
                    style={{ width: `${Math.min((systemSettings.performance.networkLatency / 100) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="text-sm font-medium text-gray-700 mb-1">Response Time</div>
                <div className="text-lg font-semibold text-gray-900">{systemSettings.performance.responseTime}ms</div>
                <p className="text-xs text-gray-500">Average API response</p>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="text-sm font-medium text-gray-700 mb-1">Active Connections</div>
                <div className="text-lg font-semibold text-gray-900">
                  {systemSettings.performance.activeConnections}/{systemSettings.performance.maxConnections}
                </div>
                <p className="text-xs text-gray-500">Database connections</p>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="text-sm font-medium text-gray-700 mb-1">System Status</div>
                <div className="text-lg font-semibold text-green-600">Healthy</div>
                <p className="text-xs text-gray-500">All systems operational</p>
              </div>
            </div>
          </div>

          {/* Maintenance Settings */}
          <div className="bg-gray-50 rounded-xl p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-purple-100 rounded-lg">
                <RefreshCw className="h-5 w-5 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900"><TranslatedText text="Maintenance Settings" /></h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="text-sm font-medium text-gray-700">Auto Optimization</label>
                  <button
                    onClick={() => setSystemSettings(prev => ({
                      ...prev,
                      maintenance: { ...prev.maintenance, autoOptimization: !prev.maintenance.autoOptimization }
                    }))}
                    className={`px-3 py-1 rounded text-sm font-medium transition-all duration-200 ${systemSettings.maintenance.autoOptimization
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-700'
                      }`}
                  >
                    {systemSettings.maintenance.autoOptimization ? 'Enabled' : 'Disabled'}
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Optimization Schedule</label>
                    <select
                      value={systemSettings.maintenance.optimizationSchedule}
                      onChange={(e) => setSystemSettings(prev => ({
                        ...prev,
                        maintenance: { ...prev.maintenance, optimizationSchedule: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Log Retention (days)</label>
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={systemSettings.maintenance.logRetention}
                      onChange={(e) => setSystemSettings(prev => ({
                        ...prev,
                        maintenance: { ...prev.maintenance, logRetention: parseInt(e.target.value) }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="text-sm font-medium text-gray-700">Cache System</label>
                  <button
                    onClick={() => setSystemSettings(prev => ({
                      ...prev,
                      maintenance: { ...prev.maintenance, cacheEnabled: !prev.maintenance.cacheEnabled }
                    }))}
                    className={`px-3 py-1 rounded text-sm font-medium transition-all duration-200 ${systemSettings.maintenance.cacheEnabled
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-700'
                      }`}
                  >
                    {systemSettings.maintenance.cacheEnabled ? 'Enabled' : 'Disabled'}
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Cache Size</label>
                    <input
                      type="text"
                      value={systemSettings.maintenance.cacheSize}
                      onChange={(e) => setSystemSettings(prev => ({
                        ...prev,
                        maintenance: { ...prev.maintenance, cacheSize: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="512 MB"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Cache Hit Rate</label>
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${systemSettings.maintenance.cacheHitRate}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-500">{systemSettings.maintenance.cacheHitRate}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <div className="text-sm text-gray-600">
                Last optimization: {new Date(systemSettings.maintenance.lastOptimization).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Security Status */}
          <div className="bg-gray-50 rounded-xl p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-red-100 rounded-lg">
                <Shield className="h-5 w-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900"><TranslatedText text="Security Status" /></h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">SSL Status</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${systemSettings.security.sslEnabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                    {systemSettings.security.sslEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="text-sm text-gray-600">{systemSettings.security.sslVersion}</div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Firewall</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${systemSettings.security.firewallEnabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                    {systemSettings.security.firewallEnabled ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="text-sm text-gray-600">Network protection</div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Intrusion Detection</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${systemSettings.security.intrusionDetection ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                    {systemSettings.security.intrusionDetection ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="text-sm text-gray-600">Threat monitoring</div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Updates</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${systemSettings.security.updatesAvailable > 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                    }`}>
                    {systemSettings.security.updatesAvailable} available
                  </span>
                </div>
                <div className="text-sm text-gray-600">System updates</div>
              </div>
            </div>

            <div className="mt-6">
              <div className="text-sm text-gray-600">
                Last security scan: {new Date(systemSettings.security.lastSecurityScan).toLocaleString()}
                {systemSettings.security.vulnerabilitiesFound > 0 && (
                  <span className="ml-2 text-red-600 font-medium">
                    {systemSettings.security.vulnerabilitiesFound} vulnerabilities found
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* System Logs */}
          <div className="bg-gray-50 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Archive className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900"><TranslatedText text="System Logs" /></h3>
                  <p className="text-sm text-gray-600">Monitor system activity and errors</p>
                </div>
              </div>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors">
                View All Logs
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Error Logs</span>
                  <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                    {systemSettings.logs.errorLogs}
                  </span>
                </div>
                <div className="text-sm text-gray-600">Critical issues</div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Warning Logs</span>
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                    {systemSettings.logs.warningLogs}
                  </span>
                </div>
                <div className="text-sm text-gray-600">Potential issues</div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Info Logs</span>
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                    {systemSettings.logs.infoLogs}
                  </span>
                </div>
                <div className="text-sm text-gray-600">General activity</div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Debug Logs</span>
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                    {systemSettings.logs.debugLogs}
                  </span>
                </div>
                <div className="text-sm text-gray-600">Debug information</div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Log Level</label>
                <select
                  value={systemSettings.logs.logLevel}
                  onChange={(e) => setSystemSettings(prev => ({
                    ...prev,
                    logs: { ...prev.logs, logLevel: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="debug">Debug</option>
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="error">Error</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Log Retention (days)</label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={systemSettings.logs.logRetentionDays}
                  onChange={(e) => setSystemSettings(prev => ({
                    ...prev,
                    logs: { ...prev.logs, logRetentionDays: parseInt(e.target.value) }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-6 border-t border-gray-200">
            <button className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200">
              <Save className="h-4 w-4 inline mr-2" />
              <TranslatedText text="Save System Settings" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'users':
        return renderUserManagement();
      case 'security':
        return renderSecuritySettings();
      case 'appearance':
        return renderAppearanceBranding();
      default:
        return renderComingSoon();
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <SettingsIcon className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold theme-text-primary"><TranslatedText text="Settings" /></h1>
            <p className="theme-text-secondary mt-2">Configure your system preferences</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors">
            <HelpCircle className="h-4 w-4 mr-2" />
            <TranslatedText text="Help" />
          </button>
          <button className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors">
            <Save className="h-4 w-4 mr-2" />
            <TranslatedText text="Save All" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1 order-2 lg:order-1">
          <div className="theme-card rounded-xl overflow-hidden transition-all duration-300">
            <div className="p-4 theme-border border-b">
              <h3 className="text-sm font-semibold theme-text-primary uppercase tracking-wide"><TranslatedText text="Settings Menu" /></h3>
            </div>
            <nav className="p-2">
              {Object.entries(settingsNavigation).map(([key, section]) => {
                const Icon = section.icon;
                const isActive = activeTab === key;

                return (
                  <button
                    key={key}
                    onClick={() => handleTabChange(key)}
                    className={`w-full text-left p-3 rounded-lg transition-all duration-200 mb-1 ${isActive
                      ? `${getColorClasses(section.color)} border shadow-sm`
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${isActive ? 'bg-white' : getIconColorClasses(section.color)}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{section.title}</div>
                        <div className="text-xs text-gray-500 truncate">{section.description}</div>
                      </div>
                      <ChevronRight className={`h-4 w-4 transition-transform ${isActive ? 'rotate-90' : ''}`} />
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3 order-1 lg:order-2">
          <div className="theme-card rounded-xl overflow-hidden transition-all duration-300">
            {renderTabContent()}
          </div>
        </div>
      </div>

      {/* Modals */}
      {renderAddUserModal()}
      {renderEditUserModal()}
    </div>
  );
};

export default Settings; 
