import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  Mail,
  MessageSquare,
  Smartphone,
  Plus,
  Search,
  Filter,
  Send,
  BarChart3,
  Users,
  Target,
  Settings,
  Eye,
  EyeOff,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  TrendingUp,
  MailOpen,
  MousePointer
} from 'lucide-react';
import { notificationsAPI } from '../lib/api';
import toast from 'react-hot-toast';
import AddNotificationModal from '../components/AddNotificationModal';
import TranslatedText from '../components/TranslatedText';
import { useTranslation } from '../hooks/useTranslation';

const Notifications = () => {
  const { tSync } = useTranslation();
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalMode, setAddModalMode] = useState('template');
  const queryClient = useQueryClient();

  // Fetch notification analytics
  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['notification-analytics'],
    queryFn: async () => {
      const response = await notificationsAPI.getAnalytics();
      return response.data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 60000
  });

  // Fetch notification templates
  const { data: templatesData, isLoading: templatesLoading } = useQuery({
    queryKey: ['notification-templates'],
    queryFn: async () => {
      const response = await notificationsAPI.getTemplates();
      return response.data;
    }
  });

  // Fetch notification campaigns
  const { data: campaignsData, isLoading: campaignsLoading } = useQuery({
    queryKey: ['notification-campaigns'],
    queryFn: async () => {
      const response = await notificationsAPI.getCampaigns();
      return response.data;
    }
  });

  // Fetch notification triggers
  const { data: triggersData, isLoading: triggersLoading } = useQuery({
    queryKey: ['notification-triggers'],
    queryFn: async () => {
      const response = await notificationsAPI.getTriggers();
      return response.data;
    }
  });

  const templates = templatesData?.templates || [];
  const campaigns = campaignsData?.campaigns || [];
  const triggers = triggersData?.triggers || [];

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString(tSync('en-US'), {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatScheduleTime = (scheduledAt, status) => {
    if (!scheduledAt) return null;

    const now = new Date();
    const scheduled = new Date(scheduledAt);
    const diffMs = scheduled.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (status === 'scheduled') {
      if (diffMs < 0) {
        return { text: tSync('Overdue'), color: 'text-red-600', icon: AlertCircle };
      } else if (diffDays > 0) {
        return { text: `${tSync('In')} ${diffDays} ${tSync('days')}`, color: 'text-blue-600', icon: Calendar };
      } else if (diffHours > 0) {
        return { text: `${tSync('In')} ${diffHours} ${tSync('hours')}`, color: 'text-yellow-600', icon: Clock };
      } else {
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        return { text: `${tSync('In')} ${diffMinutes} ${tSync('min')}`, color: 'text-orange-600', icon: Clock };
      }
    }

    return { text: formatDate(scheduledAt), color: 'text-gray-500', icon: Calendar };
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'sent':
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'sending':
      case 'scheduled':
        return 'bg-yellow-100 text-yellow-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'failed':
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'sms':
        return MessageSquare;
      case 'email':
        return Mail;
      case 'push':
        return Smartphone;
      default:
        return Bell;
    }
  };

  const getCampaignTypeColor = (type) => {
    switch (type?.toLowerCase()) {
      case 'promotion':
        return 'bg-blue-100 text-blue-800';
      case 'loyalty':
        return 'bg-purple-100 text-purple-800';
      case 'payment_reminder':
        return 'bg-orange-100 text-orange-800';
      case 'custom':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const tabs = [
    {
      id: 'overview',
      name: tSync('Overview'),
      icon: BarChart3,
      description: tSync('Notification analytics and insights')
    },
    {
      id: 'templates',
      name: tSync('Templates'),
      icon: Mail,
      description: tSync('Manage notification templates')
    },
    {
      id: 'campaigns',
      name: tSync('Campaigns'),
      icon: Target,
      description: tSync('Create and manage campaigns')
    },
    {
      id: 'triggers',
      name: tSync('Triggers'),
      icon: Settings,
      description: tSync('Automated notification triggers')
    }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <Bell className="h-8 w-8 text-primary-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900"><TranslatedText text="Notifications & Engagement" /></h1>
            <p className="text-gray-600 mt-2">{tSync('SMS, Email, and Push notification management')}</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {/* <button 
            onClick={() => {
              setAddModalMode('template');
              setShowAddModal(true);
            }}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Template
            </button> */}
          <button
            onClick={() => {
              setAddModalMode('campaign');
              setShowAddModal(true);
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            {tSync('New Message')}
          </button>
          {/* <button 
            onClick={() => {
              setAddModalMode('single');
              setShowAddModal(true);
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            <Send className="h-4 w-4 mr-2" />
            Send Notification
            </button> */}
        </div>
      </div>

      {/* Add Notification Modal (global, available from any tab) */}
      <AddNotificationModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        mode={addModalMode}
      />

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <nav className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="py-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={tSync(`Search ${activeTab}...`)}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md ${showFilters
                  ? 'bg-primary-50 border-primary-300 text-primary-700'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
                  } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500`}
              >
                <Filter className="h-4 w-4 mr-2" />
                {tSync('Filters')}
              </button>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md ${viewMode === 'grid'
                    ? 'bg-primary-100 text-primary-600'
                    : 'text-gray-400 hover:text-gray-600'
                    }`}
                >
                  <div className="grid grid-cols-2 gap-1 w-4 h-4">
                    <div className="bg-current rounded-sm"></div>
                    <div className="bg-current rounded-sm"></div>
                    <div className="bg-current rounded-sm"></div>
                    <div className="bg-current rounded-sm"></div>
                  </div>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md ${viewMode === 'list'
                    ? 'bg-primary-100 text-primary-600'
                    : 'text-gray-400 hover:text-gray-600'
                    }`}
                >
                  <div className="space-y-1 w-4 h-4">
                    <div className="bg-current rounded-sm h-1"></div>
                    <div className="bg-current rounded-sm h-1"></div>
                    <div className="bg-current rounded-sm h-1"></div>
                  </div>
                </button>
              </div>
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-');
                  setSortBy(field);
                  setSortOrder(order);
                }}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
              >
                <option value="created_at-desc">{tSync('Newest First')}</option>
                <option value="created_at-asc">{tSync('Oldest First')}</option>
                <option value="name-asc">{tSync('Name A-Z')}</option>
                <option value="name-desc">{tSync('Name Z-A')}</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <OverviewTab
            analytics={analytics}
            isLoading={analyticsLoading}
            campaigns={campaigns}
            formatScheduleTime={formatScheduleTime}
          />
        )}

        {activeTab === 'templates' && (
          <TemplatesTab
            templates={templates}
            isLoading={templatesLoading}
            searchTerm={searchTerm}
            viewMode={viewMode}
            getTypeIcon={getTypeIcon}
            formatDate={formatDate}
          />
        )}

        {activeTab === 'campaigns' && (
          <CampaignsTab
            campaigns={campaigns}
            isLoading={campaignsLoading}
            searchTerm={searchTerm}
            viewMode={viewMode}
            getStatusColor={getStatusColor}
            getCampaignTypeColor={getCampaignTypeColor}
            formatDate={formatDate}
            formatScheduleTime={formatScheduleTime}
          />
        )}

        {activeTab === 'triggers' && (
          <TriggersTab
            triggers={triggers}
            isLoading={triggersLoading}
            searchTerm={searchTerm}
            viewMode={viewMode}
            formatDate={formatDate}
          />
        )}
      </div>
    </div>
  );
};

// Overview Tab Component
const OverviewTab = ({ analytics, isLoading, campaigns, formatScheduleTime }) => {
  const { tSync } = useTranslation();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  const stats = analytics?.overall_stats || {};
  const campaignPerformance = analytics?.campaign_performance || [];
  const typeBreakdown = analytics?.type_breakdown || [];

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Send className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">{tSync('Total Sent')}</dt>
                <dd className="text-lg font-medium text-gray-900">{stats.total_sent || 0}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <MailOpen className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">{tSync('Delivered')}</dt>
                <dd className="text-lg font-medium text-gray-900">{stats.total_delivered || 0}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Eye className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">{tSync('Opened')}</dt>
                <dd className="text-lg font-medium text-gray-900">{stats.total_opened || 0}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <MousePointer className="h-8 w-8 text-orange-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">{tSync('Clicked')}</dt>
                <dd className="text-lg font-medium text-gray-900">{stats.total_clicked || 0}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Charts and Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Campaign Performance */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900"><TranslatedText text="Campaign Performance" /></h3>
          </div>
          <div className="p-6">
            {campaignPerformance.length > 0 ? (
              <div className="space-y-4">
                {campaignPerformance.slice(0, 5).map((campaign, index) => (
                  <div key={campaign.campaign_name} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-900">{campaign.campaign_name}</span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {campaign.open_rate ? `${campaign.open_rate.toFixed(1)}%` : 'N/A'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No campaign data available</p>
            )}
          </div>
        </div>

        {/* Notification Type Breakdown */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900"><TranslatedText text="Notification Type Breakdown" /></h3>
          </div>
          <div className="p-6">
            {typeBreakdown.length > 0 ? (
              <div className="space-y-4">
                {typeBreakdown.map((type, index) => (
                  <div key={type.type} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-900 capitalize">{type.type}</span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {type.total} sent
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No type breakdown data available</p>
            )}
          </div>
        </div>
      </div>

      {/* Scheduled Campaigns */}
      {campaigns && campaigns.length > 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900"><TranslatedText text="Scheduled Campaigns" /></h3>
          </div>
          <div className="p-6">
            {(() => {
              const scheduledCampaigns = campaigns.filter(campaign =>
                campaign.status === 'scheduled' && campaign.scheduled_at
              );

              if (scheduledCampaigns.length === 0) {
                return <p className="text-gray-500 text-center py-4">No scheduled campaigns</p>;
              }

              return (
                <div className="space-y-4">
                  {scheduledCampaigns.slice(0, 5).map((campaign) => {
                    const scheduleInfo = formatScheduleTime(campaign.scheduled_at, campaign.status);
                    return (
                      <div key={campaign.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-gray-900">{campaign.name}</h4>
                          <p className="text-sm text-gray-500">{campaign.template_name}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          {scheduleInfo && (
                            <div className="flex items-center space-x-1">
                              {(() => {
                                const IconComponent = scheduleInfo.icon;
                                return <IconComponent className="h-4 w-4" />;
                              })()}
                              <span className={`text-sm font-medium ${scheduleInfo.color}`}>
                                {scheduleInfo.text}
                              </span>
                            </div>
                          )}
                          <span className="text-xs text-gray-500">
                            {campaign.total_recipients || 0} recipients
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

// Templates Tab Component
const TemplatesTab = ({ templates, isLoading, searchTerm, viewMode, getTypeIcon, formatDate }) => {
  if (isLoading) {
    return <div className="text-center py-8">Loading templates...</div>;
  }

  const filteredTemplates = templates.filter(template => {
    const searchLower = searchTerm.toLowerCase();
    return template.name?.toLowerCase().includes(searchLower) ||
      template.content?.toLowerCase().includes(searchLower);
  });

  return (
    <div className="space-y-6">
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => {
            const TypeIcon = getTypeIcon(template.type);
            return (
              <div key={template.id} className="bg-white rounded-lg shadow border border-gray-200 hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900">{template.name}</h3>
                      <p className="text-sm text-gray-500">{template.type.toUpperCase()}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <TypeIcon className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-sm text-gray-600 line-clamp-3">{template.content}</p>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                    <span>Created: {formatDate(template.created_at)}</span>
                    <span className={`px-2 py-1 rounded-full ${template.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {template.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {filteredTemplates.map((template) => {
              const TypeIcon = getTypeIcon(template.type);
              return (
                <li key={template.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900">{template.name}</h3>
                      <p className="text-sm text-gray-500">{template.type.toUpperCase()} • {template.content.substring(0, 100)}...</p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <TypeIcon className="h-5 w-5 text-gray-400" />
                      <span className={`px-2 py-1 rounded-full text-xs ${template.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {template.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

// Campaigns Tab Component
const CampaignsTab = ({ campaigns, isLoading, searchTerm, viewMode, getStatusColor, getCampaignTypeColor, formatDate, formatScheduleTime }) => {
  if (isLoading) {
    return <div className="text-center py-8">Loading campaigns...</div>;
  }

  const filteredCampaigns = campaigns.filter(campaign => {
    const searchLower = searchTerm.toLowerCase();
    return campaign.name?.toLowerCase().includes(searchLower) ||
      campaign.description?.toLowerCase().includes(searchLower);
  });

  return (
    <div className="space-y-6">
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCampaigns.map((campaign) => (
            <div key={campaign.id} className="bg-white rounded-lg shadow border border-gray-200 hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900">{campaign.name}</h3>
                    <p className="text-sm text-gray-500">{campaign.description}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(campaign.status)}`}>
                      {campaign.status}
                      {campaign.status?.toLowerCase() === 'sent' && (
                        <CheckCircle className="h-4 w-4 ml-1 text-blue-600" />
                      )}
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCampaignTypeColor(campaign.campaign_type)}`}>
                      {campaign.campaign_type.replace('_', ' ')}
                    </span>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Template:</span>
                    <span className="text-gray-900">{campaign.template_name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Recipients:</span>
                    <span className="text-gray-900">{campaign.total_recipients || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Sent:</span>
                    <span className="text-gray-900">{campaign.sent_count || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Opened:</span>
                    <span className="text-gray-900">{campaign.opened_count || 0}</span>
                  </div>
                  {campaign.scheduled_at && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Scheduled:</span>
                      <div className="flex items-center space-x-1">
                        {(() => {
                          const scheduleInfo = formatScheduleTime(campaign.scheduled_at, campaign.status);
                          if (scheduleInfo) {
                            const IconComponent = scheduleInfo.icon;
                            return (
                              <>
                                <IconComponent className="h-4 w-4" />
                                <span className={scheduleInfo.color}>{scheduleInfo.text}</span>
                              </>
                            );
                          }
                          return <span className="text-gray-500">{formatDate(campaign.scheduled_at)}</span>;
                        })()}
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-4 text-xs text-gray-500">
                  Created: {formatDate(campaign.created_at)}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {filteredCampaigns.map((campaign) => (
              <li key={campaign.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900">{campaign.name}</h3>
                    <p className="text-sm text-gray-500">{campaign.description} • {campaign.template_name}</p>
                    {campaign.scheduled_at && (
                      <div className="mt-1 flex items-center space-x-1 text-sm">
                        {(() => {
                          const scheduleInfo = formatScheduleTime(campaign.scheduled_at, campaign.status);
                          if (scheduleInfo) {
                            const IconComponent = scheduleInfo.icon;
                            return (
                              <>
                                <IconComponent className="h-4 w-4" />
                                <span className={scheduleInfo.color}>{scheduleInfo.text}</span>
                              </>
                            );
                          }
                          return <span className="text-gray-500">{formatDate(campaign.scheduled_at)}</span>;
                        })()}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(campaign.status)}`}>
                      {campaign.status}
                      {campaign.status?.toLowerCase() === 'sent' && (
                        <CheckCircle className="h-4 w-4 ml-1 text-blue-600" />
                      )}
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCampaignTypeColor(campaign.campaign_type)}`}>
                      {campaign.campaign_type.replace('_', ' ')}
                    </span>
                    <span className="text-sm text-gray-500">{campaign.sent_count || 0} sent</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

// Triggers Tab Component
const TriggersTab = ({ triggers, isLoading, searchTerm, viewMode, formatDate }) => {
  if (isLoading) {
    return <div className="text-center py-8">Loading triggers...</div>;
  }

  const filteredTriggers = triggers.filter(trigger => {
    const searchLower = searchTerm.toLowerCase();
    return trigger.name?.toLowerCase().includes(searchLower);
  });

  return (
    <div className="space-y-6">
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTriggers.map((trigger) => (
            <div key={trigger.id} className="bg-white rounded-lg shadow border border-gray-200 hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900">{trigger.name}</h3>
                    <p className="text-sm text-gray-500">{trigger.trigger_type.replace('_', ' ')}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${trigger.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {trigger.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-sm text-gray-600">Template: {trigger.template_name}</p>
                </div>
                <div className="mt-4 text-xs text-gray-500">
                  Created: {formatDate(trigger.created_at)}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {filteredTriggers.map((trigger) => (
              <li key={trigger.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900">{trigger.name}</h3>
                    <p className="text-sm text-gray-500">{trigger.trigger_type.replace('_', ' ')} • {trigger.template_name}</p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${trigger.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {trigger.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}





    </div>
  );
};

export default Notifications; 