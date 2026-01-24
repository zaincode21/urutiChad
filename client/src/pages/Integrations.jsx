import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, Settings, Zap, Globe, Shield, Activity, 
  CheckCircle, XCircle, Clock, AlertTriangle, 
  ExternalLink, Trash2, Edit, Eye, Play, TestTube
} from 'lucide-react';
import { api } from '../lib/api';
import { integrationsAPI } from '../lib/api';
import TranslatedText from '../components/TranslatedText';

// Helper function for getting type icon
const getTypeIcon = (type) => {
  switch (type) {
    case 'api': return Globe;
    case 'webhook': return Zap;
    case 'oauth': return Shield;
    default: return Settings;
  }
};

const Integrations = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState(null);
  const [modalMode, setModalMode] = useState('create'); // create, edit, view

  const queryClient = useQueryClient();

  // Fetch integrations
  const { data: integrationsData, isLoading: integrationsLoading } = useQuery({
    queryKey: ['integrations'],
    queryFn: async () => {
      const response = await integrationsAPI.getAll();
      return response.data;
    }
  });

  // Fetch analytics
  const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
    queryKey: ['integration-analytics'],
    queryFn: async () => {
      const response = await api.get('/integrations/analytics/overview');
      return response.data;
    }
  });

  // Create integration mutation
  const createIntegration = useMutation({
    mutationFn: async (data) => {
      const response = await integrationsAPI.create(data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['integrations']);
      setShowModal(false);
      setSelectedIntegration(null);
    }
  });

  // Update integration mutation
  const updateIntegration = useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await api.put(`/integrations/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['integrations']);
      setShowModal(false);
      setSelectedIntegration(null);
    }
  });

  // Delete integration mutation
  const deleteIntegration = useMutation({
    mutationFn: async (id) => {
      const response = await api.delete(`/integrations/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['integrations']);
    }
  });

  // Test integration mutation
  const testIntegration = useMutation({
    mutationFn: async (id) => {
      const response = await api.post(`/integrations/${id}/test`);
      return response.data;
    }
  });

  // Execute integration mutation
  const executeIntegration = useMutation({
    mutationFn: async ({ id, action, data }) => {
      const response = await api.post(`/integrations/${id}/execute`, { action, data });
      return response.data;
    }
  });

  const integrations = integrationsData?.integrations || [];
  const analytics = analyticsData || {};

  // Filter integrations
  const filteredIntegrations = integrations.filter(integration => {
    const matchesSearch = integration.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         integration.provider.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !filterType || integration.type === filterType;
    const matchesStatus = !filterStatus || (filterStatus === 'active' ? integration.is_active : !integration.is_active);
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const handleCreateIntegration = () => {
    setModalMode('create');
    setSelectedIntegration(null);
    setShowModal(true);
  };

  const handleEditIntegration = (integration) => {
    setModalMode('edit');
    setSelectedIntegration(integration);
    setShowModal(true);
  };

  const handleViewIntegration = (integration) => {
    setModalMode('view');
    setSelectedIntegration(integration);
    setShowModal(true);
  };

  const handleDeleteIntegration = async (id) => {
    if (window.confirm('Are you sure you want to delete this integration?')) {
      await deleteIntegration.mutateAsync(id);
    }
  };

  const handleTestIntegration = async (id) => {
    try {
      const result = await testIntegration.mutateAsync(id);
      alert(result.success ? 'Connection successful!' : `Connection failed: ${result.error}`);
    } catch (error) {
      alert('Failed to test connection');
    }
  };

  const handleExecuteAction = async (id, action, data = {}) => {
    try {
      const result = await executeIntegration.mutateAsync({ id, action, data });
      alert(result.success ? 'Action executed successfully!' : `Action failed: ${result.error}`);
    } catch (error) {
      alert('Failed to execute action');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'failed': return 'text-red-600 bg-red-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };



  const tabs = [
    { id: 'overview', name: 'Overview', icon: Activity },
    { id: 'integrations', name: 'Integrations', icon: Settings },
    { id: 'executions', name: 'Executions', icon: Clock },
    { id: 'analytics', name: 'Analytics', icon: Activity }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900"><TranslatedText text="Integrations" /></h1>
              <p className="text-gray-600">Manage external API connections and webhooks</p>
            </div>
            <button
              onClick={handleCreateIntegration}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Integration
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <OverviewTab 
            analytics={analytics} 
            integrations={integrations}
            isLoading={analyticsLoading}
          />
        )}

        {activeTab === 'integrations' && (
          <IntegrationsTab 
            integrations={filteredIntegrations}
            isLoading={integrationsLoading}
            onEdit={handleEditIntegration}
            onView={handleViewIntegration}
            onDelete={handleDeleteIntegration}
            onTest={handleTestIntegration}
            onExecute={handleExecuteAction}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            filterType={filterType}
            setFilterType={setFilterType}
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
          />
        )}

        {activeTab === 'executions' && (
          <ExecutionsTab />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsTab analytics={analytics} isLoading={analyticsLoading} />
        )}
      </div>

      {/* Integration Modal */}
      {showModal && (
        <IntegrationModal
          mode={modalMode}
          integration={selectedIntegration}
          onSubmit={modalMode === 'create' ? createIntegration.mutateAsync : updateIntegration.mutateAsync}
          onClose={() => setShowModal(false)}
          isLoading={createIntegration.isLoading || updateIntegration.isLoading}
        />
      )}
    </div>
  );
};

// Overview Tab Component
const OverviewTab = ({ analytics, integrations, isLoading }) => {
  if (isLoading) {
    return <div className="animate-pulse">Loading...</div>;
  }

  const stats = analytics.overall_stats || {};
  const executionStats = analytics.execution_stats || {};

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Globe className="h-8 w-8 text-primary-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Integrations</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.total_integrations || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Active Integrations</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.active_integrations || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Zap className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Executions</p>
              <p className="text-2xl font-semibold text-gray-900">{executionStats.total_executions || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Activity className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Success Rate</p>
              <p className="text-2xl font-semibold text-gray-900">
                {executionStats.total_executions > 0 
                  ? Math.round((executionStats.successful_executions / executionStats.total_executions) * 100)
                  : 0}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Integrations */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900"><TranslatedText text="Recent Integrations" /></h3>
        </div>
        <div className="divide-y divide-gray-200">
          {integrations.slice(0, 5).map((integration) => (
            <div key={integration.id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className={`w-3 h-3 rounded-full ${integration.is_active ? 'bg-green-400' : 'bg-gray-400'}`} />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-900">{integration.name}</p>
                    <p className="text-sm text-gray-500">{integration.provider} • {integration.type}</p>
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  {new Date(integration.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Integrations Tab Component
const IntegrationsTab = ({ 
  integrations, 
  isLoading, 
  onEdit, 
  onView, 
  onDelete, 
  onTest, 
  onExecute,
  searchTerm,
  setSearchTerm,
  filterType,
  setFilterType,
  filterStatus,
  setFilterStatus
}) => {
  if (isLoading) {
    return <div className="animate-pulse">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search integrations..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Types</option>
              <option value="api">API</option>
              <option value="webhook">Webhook</option>
              <option value="oauth">OAuth</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Integrations List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900"><TranslatedText text="Integrations ({integrations.length})" /></h3>
        </div>
        <div className="divide-y divide-gray-200">
          {integrations.map((integration) => {
            const TypeIcon = getTypeIcon(integration.type);
            return (
              <div key={integration.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <TypeIcon className="h-6 w-6 text-primary-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-900">{integration.name}</p>
                      <p className="text-sm text-gray-500">{integration.provider} • {integration.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`px-2 py-1 text-xs rounded-full ${integration.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {integration.is_active ? 'Active' : 'Inactive'}
                    </div>
                    <button
                      onClick={() => onTest(integration.id)}
                      className="p-1 text-gray-400 hover:text-primary-600"
                      title="Test Connection"
                    >
                      <TestTube className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onView(integration)}
                      className="p-1 text-gray-400 hover:text-primary-600"
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onEdit(integration)}
                      className="p-1 text-gray-400 hover:text-primary-600"
                      title="Edit"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onDelete(integration.id)}
                      className="p-1 text-red-400 hover:text-red-600"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// Executions Tab Component
const ExecutionsTab = () => {
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900"><TranslatedText text="Recent Executions" /></h3>
      </div>
      <div className="p-6">
        <p className="text-gray-500">Execution logs will be displayed here.</p>
      </div>
    </div>
  );
};

// Analytics Tab Component
const AnalyticsTab = ({ analytics, isLoading }) => {
  if (isLoading) {
    return <div className="animate-pulse">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4"><TranslatedText text="Integration Analytics" /></h3>
        <p className="text-gray-500">Detailed analytics will be displayed here.</p>
      </div>
    </div>
  );
};

// Integration Modal Component
const IntegrationModal = ({ mode, integration, onSubmit, onClose, isLoading }) => {
  const [formData, setFormData] = useState({
    name: integration?.name || '',
    type: integration?.type || 'api',
    provider: integration?.provider || '',
    api_key: integration?.api_key || '',
    api_secret: integration?.api_secret || '',
    webhook_url: integration?.webhook_url || '',
    base_url: integration?.base_url || '',
    is_active: integration?.is_active !== false
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (mode === 'edit') {
      await onSubmit({ id: integration.id, data: formData });
    } else {
      await onSubmit(formData);
    }
  };

  const isViewMode = mode === 'view';

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {mode === 'create' ? 'Create Integration' : mode === 'edit' ? 'Edit Integration' : 'Integration Details'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={isViewMode}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                disabled={isViewMode}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              >
                <option value="api">API</option>
                <option value="webhook">Webhook</option>
                <option value="oauth">OAuth</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Provider</label>
              <input
                type="text"
                value={formData.provider}
                onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                disabled={isViewMode}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">API Key</label>
              <input
                type="password"
                value={formData.api_key}
                onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                disabled={isViewMode}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">API Secret</label>
              <input
                type="password"
                value={formData.api_secret}
                onChange={(e) => setFormData({ ...formData, api_secret: e.target.value })}
                disabled={isViewMode}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Base URL</label>
              <input
                type="url"
                value={formData.base_url}
                onChange={(e) => setFormData({ ...formData, base_url: e.target.value })}
                disabled={isViewMode}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Webhook URL</label>
              <input
                type="url"
                value={formData.webhook_url}
                onChange={(e) => setFormData({ ...formData, webhook_url: e.target.value })}
                disabled={isViewMode}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                disabled={isViewMode}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label className="ml-2 block text-sm text-gray-900">Active</label>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              {!isViewMode && (
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 disabled:opacity-50"
                >
                  {isLoading ? 'Saving...' : mode === 'create' ? 'Create' : 'Update'}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Integrations; 