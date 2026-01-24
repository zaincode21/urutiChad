import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, Settings, Zap, Globe, Shield, Activity, 
  CheckCircle, XCircle, Clock, AlertTriangle, 
  ExternalLink, Trash2, Edit, Eye, Play, TestTube
} from 'lucide-react';
import { api } from '../lib/api';
import PageLayout from '../components/PageLayout';
import StatsCard, { StatsGrid } from '../components/StatsCard';
import SearchFilter from '../components/SearchFilter';
import Modal from '../components/Modal';
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

  const tabs = [
    { id: 'overview', name: 'Overview', icon: Activity },
    { id: 'integrations', name: 'Integrations', icon: Settings },
    { id: 'executions', name: 'Executions', icon: Clock },
    { id: 'analytics', name: 'Analytics', icon: Activity }
  ];

  const headerActions = (
    <button onClick={handleCreateIntegration} className="btn-primary">
      <Plus className="icon-sm mr-2" />
      New Integration
    </button>
  );

  return (
    <PageLayout
      title="Integrations"
      subtitle="Manage external API connections and webhooks"
      headerActions={headerActions}
      showTabs={true}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
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

      {/* Integration Modal */}
      <IntegrationModal
        isOpen={showModal}
        mode={modalMode}
        integration={selectedIntegration}
        onSubmit={modalMode === 'create' ? createIntegration.mutateAsync : updateIntegration.mutateAsync}
        onClose={() => setShowModal(false)}
        isLoading={createIntegration.isLoading || updateIntegration.isLoading}
      />
    </PageLayout>
  );
};

// Overview Tab Component
const OverviewTab = ({ analytics, integrations, isLoading }) => {
  if (isLoading) {
    return <div className="loading-skeleton h-64 rounded-lg" />;
  }

  const stats = analytics.overall_stats || {};
  const executionStats = analytics.execution_stats || {};

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <StatsGrid>
        <StatsCard
          title="Total Integrations"
          value={stats.total_integrations || 0}
          icon={Globe}
          iconColor="text-primary-600"
        />
        <StatsCard
          title="Active Integrations"
          value={stats.active_integrations || 0}
          icon={CheckCircle}
          iconColor="text-green-600"
        />
        <StatsCard
          title="Total Executions"
          value={executionStats.total_executions || 0}
          icon={Zap}
          iconColor="text-yellow-600"
        />
        <StatsCard
          title="Success Rate"
          value={`${executionStats.total_executions > 0 
            ? Math.round((executionStats.successful_executions / executionStats.total_executions) * 100)
            : 0}%`}
          icon={Activity}
          iconColor="text-blue-600"
        />
      </StatsGrid>

      {/* Recent Integrations */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-heading-3"><TranslatedText text="Recent Integrations" /></h3>
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
                    <p className="text-body font-medium">{integration.name}</p>
                    <p className="text-caption">{integration.provider} • {integration.type}</p>
                  </div>
                </div>
                <div className="text-caption">
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
    return <div className="loading-skeleton h-64 rounded-lg" />;
  }

  const filters = [
    {
      key: 'type',
      label: 'Type',
      type: 'select',
      value: filterType,
      onChange: setFilterType,
      options: [
        { value: '', label: 'All Types' },
        { value: 'api', label: 'API' },
        { value: 'webhook', label: 'Webhook' },
        { value: 'oauth', label: 'OAuth' }
      ]
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      value: filterStatus,
      onChange: setFilterStatus,
      options: [
        { value: '', label: 'All Status' },
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' }
      ]
    }
  ];

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <SearchFilter
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search integrations..."
        filters={filters}
      />

      {/* Integrations List */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-heading-3"><TranslatedText text="Integrations ({integrations.length})" /></h3>
        </div>
        <div className="divide-y divide-gray-200">
          {integrations.map((integration) => {
            const TypeIcon = getTypeIcon(integration.type);
            return (
              <div key={integration.id} className="px-6 py-4 table-row">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <TypeIcon className="icon-lg text-primary-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-body font-medium">{integration.name}</p>
                      <p className="text-caption">{integration.provider} • {integration.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`badge ${integration.is_active ? 'badge-success' : 'badge-gray'}`}>
                      {integration.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <button
                      onClick={() => onTest(integration.id)}
                      className="btn-ghost btn-sm"
                      title="Test Connection"
                    >
                      <TestTube className="icon-sm" />
                    </button>
                    <button
                      onClick={() => onView(integration)}
                      className="btn-ghost btn-sm"
                      title="View Details"
                    >
                      <Eye className="icon-sm" />
                    </button>
                    <button
                      onClick={() => onEdit(integration)}
                      className="btn-ghost btn-sm"
                      title="Edit"
                    >
                      <Edit className="icon-sm" />
                    </button>
                    <button
                      onClick={() => onDelete(integration.id)}
                      className="btn-ghost btn-sm text-red-600 hover:text-red-700"
                      title="Delete"
                    >
                      <Trash2 className="icon-sm" />
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
    <div className="card">
      <div className="card-header">
        <h3 className="text-heading-3"><TranslatedText text="Recent Executions" /></h3>
      </div>
      <div className="card-body">
        <p className="text-muted">Execution logs will be displayed here.</p>
      </div>
    </div>
  );
};

// Analytics Tab Component
const AnalyticsTab = ({ analytics, isLoading }) => {
  if (isLoading) {
    return <div className="loading-skeleton h-64 rounded-lg" />;
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-header">
          <h3 className="text-heading-3"><TranslatedText text="Integration Analytics" /></h3>
        </div>
        <div className="card-body">
          <p className="text-muted">Detailed analytics will be displayed here.</p>
        </div>
      </div>
    </div>
  );
};

// Integration Modal Component
const IntegrationModal = ({ isOpen, mode, integration, onSubmit, onClose, isLoading }) => {
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

  const modalFooter = !isViewMode && (
    <>
      <button onClick={onClose} className="btn-outline">
        Cancel
      </button>
      <button
        onClick={handleSubmit}
        disabled={isLoading}
        className="btn-primary"
      >
        {isLoading ? (
          <>
            <div className="loading-spinner mr-2" />
            Saving...
          </>
        ) : (
          mode === 'create' ? 'Create' : 'Update'
        )}
      </button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'create' ? 'Create Integration' : mode === 'edit' ? 'Edit Integration' : 'Integration Details'}
      size="lg"
      footer={modalFooter}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="form-group">
          <label className="form-label">Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            disabled={isViewMode}
            className="input"
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Type</label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            disabled={isViewMode}
            className="select"
            required
          >
            <option value="api">API</option>
            <option value="webhook">Webhook</option>
            <option value="oauth">OAuth</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Provider</label>
          <input
            type="text"
            value={formData.provider}
            onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
            disabled={isViewMode}
            className="input"
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">API Key</label>
          <input
            type="password"
            value={formData.api_key}
            onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
            disabled={isViewMode}
            className="input"
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">API Secret</label>
          <input
            type="password"
            value={formData.api_secret}
            onChange={(e) => setFormData({ ...formData, api_secret: e.target.value })}
            disabled={isViewMode}
            className="input"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Base URL</label>
          <input
            type="url"
            value={formData.base_url}
            onChange={(e) => setFormData({ ...formData, base_url: e.target.value })}
            disabled={isViewMode}
            className="input"
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Webhook URL</label>
          <input
            type="url"
            value={formData.webhook_url}
            onChange={(e) => setFormData({ ...formData, webhook_url: e.target.value })}
            disabled={isViewMode}
            className="input"
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
          <label className="ml-2 text-body">Active</label>
        </div>
      </form>
    </Modal>
  );
};

export default Integrations;
