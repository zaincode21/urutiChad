import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import {
  X,
  Plus,
  Send,
  Mail,
  MessageSquare,
  Smartphone,
  AlertCircle,
  User,
  FileText,
  Zap
} from 'lucide-react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';
import { customersAPI } from '../lib/api';
import TranslatedText from './TranslatedText';

import { useTranslation } from '../hooks/useTranslation';

const AddNotificationModal = ({ isOpen, onClose, mode = 'template' }) => {
  const { tSync, translateBatch } = useTranslation();
  const [activeTab, setActiveTab] = useState(mode); // 'template', 'campaign', 'single'
  const queryClient = useQueryClient();

  useEffect(() => {
    translateBatch([
      'Enter template name',
      'Enter email subject',
      'Enter campaign name',
      'Describe your campaign purpose and goals',
      'New Template', 'New Campaign', 'Send Notification',
      'Create reusable notification template', 'Create targeted campaign', 'Send individual notification'
    ]);
  }, []);

  // Update activeTab when mode prop changes
  useEffect(() => {
    setActiveTab(mode);
  }, [mode]);

  // Template form state
  const [templateFormData, setTemplateFormData] = useState({
    name: '',
    type: 'email',
    subject: '',
    content: '',
    variables: {},
    is_active: true
  });

  // Campaign form state  
  const [campaignFormData, setCampaignFormData] = useState({
    name: '',
    description: '',
    template_id: '',
    campaign_type: 'promotion',
    target_audience: 'all',
    filters: {},
    scheduled_at: ''
  });

  // Single notification form state
  const [singleFormData, setSingleFormData] = useState({
    customer_id: '',
    type: 'email',
    subject: '',
    content: '',
    recipient: ''
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Fetch templates for campaign creation
  const { data: templatesData } = useQuery({
    queryKey: ['notification-templates'],
    queryFn: () => api.get('/notifications/templates').then(res => res.data),
    enabled: activeTab === 'campaign'
  });

  // Fetch customers for single notifications
  const { data: customersData } = useQuery({
    queryKey: ['customers'],
    queryFn: () => customersAPI.getAll().then(res => res.data),
    enabled: activeTab === 'single'
  });

  const templates = templatesData?.templates || [];
  const customers = customersData?.customers || [];

  // Template creation mutation
  const createTemplateMutation = useMutation({
    mutationFn: (templateData) => api.post('/notifications/templates', templateData),
    onSuccess: () => {
      queryClient.invalidateQueries(['notification-templates']);
      toast.success('Template created successfully!');
      resetForms();
      onClose();
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to create template');
    }
  });

  // Campaign creation mutation
  const createCampaignMutation = useMutation({
    mutationFn: (campaignData) => api.post('/notifications/campaigns', campaignData),
    onSuccess: () => {
      queryClient.invalidateQueries(['notification-campaigns']);
      toast.success('Campaign created successfully!');
      resetForms();
      onClose();
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to create campaign');
    }
  });

  // Single notification mutation
  const sendNotificationMutation = useMutation({
    mutationFn: (notificationData) => api.post('/notifications/send', notificationData),
    onSuccess: () => {
      toast.success('Notification sent successfully!');
      resetForms();
      onClose();
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to send notification');
    }
  });

  const resetForms = () => {
    setTemplateFormData({
      name: '',
      type: 'email',
      subject: '',
      content: '',
      variables: {},
      is_active: true
    });
    setCampaignFormData({
      name: '',
      description: '',
      template_id: '',
      campaign_type: 'promotion',
      target_audience: 'all',
      filters: {},
      scheduled_at: ''
    });
    setSingleFormData({
      customer_id: '',
      type: 'email',
      subject: '',
      content: '',
      recipient: ''
    });
    setErrors({});
  };

  const validateTemplateForm = () => {
    const newErrors = {};

    if (!templateFormData.name.trim()) {
      newErrors.name = 'Template name is required';
    }

    if (!templateFormData.content.trim()) {
      newErrors.content = 'Template content is required';
    }

    if (templateFormData.type === 'email' && !templateFormData.subject.trim()) {
      newErrors.subject = 'Email subject is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateCampaignForm = () => {
    const newErrors = {};

    if (!campaignFormData.name.trim()) {
      newErrors.name = 'Campaign name is required';
    }

    if (!campaignFormData.template_id) {
      newErrors.template_id = 'Template selection is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateSingleForm = () => {
    const newErrors = {};

    if (!singleFormData.customer_id) {
      newErrors.customer_id = 'Customer selection is required';
    }

    if (!singleFormData.content.trim()) {
      newErrors.content = 'Notification content is required';
    }

    if (singleFormData.type === 'email' && !singleFormData.subject.trim()) {
      newErrors.subject = 'Email subject is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleTemplateSubmit = async (e) => {
    e.preventDefault();

    if (!validateTemplateForm()) {
      return;
    }

    try {
      await createTemplateMutation.mutateAsync(templateFormData);
    } catch (error) {
      // Error handled in mutation
    }
  };

  const handleCampaignSubmit = async (e) => {
    e.preventDefault();

    if (!validateCampaignForm()) {
      return;
    }

    try {
      await createCampaignMutation.mutateAsync(campaignFormData);
    } catch (error) {
      // Error handled in mutation
    }
  };

  const handleSingleSubmit = async (e) => {
    e.preventDefault();

    if (!validateSingleForm()) {
      return;
    }

    try {
      await sendNotificationMutation.mutateAsync(singleFormData);
    } catch (error) {
      // Error handled in mutation
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'sms': return MessageSquare;
      case 'email': return Mail;
      case 'push': return Smartphone;
      default: return FileText;
    }
  };

  if (!isOpen) {
    return null;
  }

  const tabs = [
    {
      id: 'template',
      name: tSync('New Template'),
      icon: FileText,
      description: tSync('Create reusable notification template')
    },
    {
      id: 'campaign',
      name: tSync('New Campaign'),
      icon: Zap,
      description: tSync('Create targeted campaign')
    },
    {
      id: 'single',
      name: tSync('Send Notification'),
      icon: Send,
      description: tSync('Send individual notification')
    }
  ];

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999
      }}
    >
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[95vh] overflow-y-auto" style={{ zIndex: 10000 }}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h3 className="text-xl font-semibold text-gray-900"><TranslatedText text="Add Notification" /></h3>
            <p className="text-sm text-gray-500 mt-1"><TranslatedText text="Create templates, campaigns, or send notifications" /></p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-6">
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setErrors({});
                  }}
                  className={`flex-1 flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === tab.id
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {tab.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Template Form */}
          {activeTab === 'template' && (
            <form onSubmit={handleTemplateSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Template Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <TranslatedText text="Template Name" /> *
                  </label>
                  <input
                    type="text"
                    value={templateFormData.name}
                    onChange={(e) => setTemplateFormData({ ...templateFormData, name: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${errors.name ? 'border-red-500' : 'border-gray-300'
                      }`}
                    placeholder={tSync("Enter template name")}
                  />
                  {errors.name && (
                    <p className="text-red-600 text-sm mt-1">{errors.name}</p>
                  )}
                </div>

                {/* Template Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <TranslatedText text="Notification Type" /> *
                  </label>
                  <select
                    value={templateFormData.type}
                    onChange={(e) => setTemplateFormData({ ...templateFormData, type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="email">📧 Email</option>
                    <option value="sms">📱 SMS</option>
                    <option value="push">🔔 Push Notification</option>
                  </select>
                </div>
              </div>

              {/* Subject (for email) */}
              {templateFormData.type === 'email' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <TranslatedText text="Email Subject" /> *
                  </label>
                  <input
                    type="text"
                    value={templateFormData.subject}
                    onChange={(e) => setTemplateFormData({ ...templateFormData, subject: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${errors.subject ? 'border-red-500' : 'border-gray-300'
                      }`}
                    placeholder={tSync("Enter email subject")}
                  />
                  {errors.subject && (
                    <p className="text-red-600 text-sm mt-1">{errors.subject}</p>
                  )}
                </div>
              )}

              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <TranslatedText text="Template Content" /> *
                </label>
                <textarea
                  value={templateFormData.content}
                  onChange={(e) => setTemplateFormData({ ...templateFormData, content: e.target.value })}
                  rows={templateFormData.type === 'email' ? 10 : 6}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${errors.content ? 'border-red-500' : 'border-gray-300'
                    }`}
                  placeholder={tSync("Enter {{type}} content. Use {{variable_name}} for dynamic content.", { type: templateFormData.type })}
                />
                {errors.content && (
                  <p className="text-red-600 text-sm mt-1">{errors.content}</p>
                )}
              </div>

              {/* Variables Help */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-800 mb-2">📝 <TranslatedText text="Available Variables" /></h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-blue-600">
                  <div>• {'{'}customer_name{'}'}</div>
                  <div>• {'{'}shop_name{'}'}</div>
                  <div>• {'{'}order_number{'}'}</div>
                  <div>• {'{'}total_amount{'}'}</div>
                  <div>• {'{'}pickup_location{'}'}</div>
                  <div>• {'{'}discount_percentage{'}'}</div>
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="template_active"
                  checked={templateFormData.is_active}
                  onChange={(e) => setTemplateFormData({ ...templateFormData, is_active: e.target.checked })}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="template_active" className="ml-2 text-sm text-gray-700">
                  <TranslatedText text="Make template active immediately" />
                </label>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-6 border-t">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createTemplateMutation.isLoading}
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {createTemplateMutation.isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      <TranslatedText text="Creating..." />
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      <TranslatedText text="Create Template" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Campaign Form */}
          {activeTab === 'campaign' && (
            <form onSubmit={handleCampaignSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Campaign Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <TranslatedText text="Campaign Name" /> *
                  </label>
                  <input
                    type="text"
                    value={campaignFormData.name}
                    onChange={(e) => setCampaignFormData({ ...campaignFormData, name: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${errors.name ? 'border-red-500' : 'border-gray-300'
                      }`}
                    placeholder={tSync("Enter campaign name")}
                  />
                  {errors.name && (
                    <p className="text-red-600 text-sm mt-1">{errors.name}</p>
                  )}
                </div>

                {/* Campaign Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <TranslatedText text="Campaign Type" />
                  </label>
                  <select
                    value={campaignFormData.campaign_type}
                    onChange={(e) => setCampaignFormData({ ...campaignFormData, campaign_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="promotion">🎯 <TranslatedText text="Promotion" /></option>
                    <option value="loyalty">💎 <TranslatedText text="Loyalty" /></option>
                    <option value="payment_reminder">💳 <TranslatedText text="Payment Reminder" /></option>
                    <option value="custom">⚙️ <TranslatedText text="Custom" /></option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <TranslatedText text="Description" />
                </label>
                <textarea
                  value={campaignFormData.description}
                  onChange={(e) => setCampaignFormData({ ...campaignFormData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder={tSync("Describe your campaign purpose and goals")}
                />
              </div>

              {/* Template Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <TranslatedText text="Select Template" /> *
                </label>
                <select
                  value={campaignFormData.template_id}
                  onChange={(e) => setCampaignFormData({ ...campaignFormData, template_id: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${errors.template_id ? 'border-red-500' : 'border-gray-300'
                    }`}
                >
                  <option value=""><TranslatedText text="Choose a template..." /></option>
                  {templates.map((template) => {
                    const TypeIcon = getTypeIcon(template.type);
                    return (
                      <option key={template.id} value={template.id}>
                        {template.type.toUpperCase()} - {template.name}
                      </option>
                    );
                  })}
                </select>
                {errors.template_id && (
                  <p className="text-red-600 text-sm mt-1">{errors.template_id}</p>
                )}
              </div>

              {/* Target Audience */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <TranslatedText text="Target Audience" />
                </label>
                <select
                  value={campaignFormData.target_audience}
                  onChange={(e) => setCampaignFormData({ ...campaignFormData, target_audience: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="all">👥 <TranslatedText text="All Customers" /></option>
                  <option value="new_customers">🆕 <TranslatedText text="New Customers" /></option>
                  <option value="returning_customers">🔄 <TranslatedText text="Returning Customers" /></option>
                  <option value="vip_customers">⭐ <TranslatedText text="VIP Customers" /></option>
                </select>
              </div>

              {/* Schedule (Optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <TranslatedText text="Schedule Send Time (Optional)" />
                </label>
                <input
                  type="datetime-local"
                  value={campaignFormData.scheduled_at}
                  onChange={(e) => setCampaignFormData({ ...campaignFormData, scheduled_at: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  <TranslatedText text="Leave empty to send immediately" />
                </p>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-6 border-t">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <TranslatedText text="Cancel" />
                </button>
                <button
                  type="submit"
                  disabled={createCampaignMutation.isLoading}
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {createCampaignMutation.isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      <TranslatedText text="Creating..." />
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      <TranslatedText text="Create Campaign" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Single Notification Form */}
          {activeTab === 'single' && (
            <form onSubmit={handleSingleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Customer Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <TranslatedText text="Select Customer" /> *
                  </label>
                  <select
                    value={singleFormData.customer_id}
                    onChange={(e) => {
                      const customer = customers.find(c => c.id === e.target.value);
                      setSingleFormData({
                        ...singleFormData,
                        customer_id: e.target.value,
                        recipient: singleFormData.type === 'email' ? customer?.email : customer?.phone
                      });
                    }}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${errors.customer_id ? 'border-red-500' : 'border-gray-300'
                      }`}
                  >
                    <option value=""><TranslatedText text="Choose a customer..." /></option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.first_name} {customer.last_name} - {customer.email}
                      </option>
                    ))}
                  </select>
                  {errors.customer_id && (
                    <p className="text-red-600 text-sm mt-1">{errors.customer_id}</p>
                  )}
                </div>

                {/* Notification Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <TranslatedText text="Notification Type" />
                  </label>
                  <select
                    value={singleFormData.type}
                    onChange={(e) => setSingleFormData({ ...singleFormData, type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="email">📧 Email</option>
                    <option value="sms">📱 SMS</option>
                    <option value="push">🔔 Push Notification</option>
                  </select>
                </div>
              </div>

              {/* Subject (for email) */}
              {singleFormData.type === 'email' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <TranslatedText text="Email Subject" /> *
                  </label>
                  <input
                    type="text"
                    value={singleFormData.subject}
                    onChange={(e) => setSingleFormData({ ...singleFormData, subject: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${errors.subject ? 'border-red-500' : 'border-gray-300'
                      }`}
                    placeholder={tSync("Enter email subject")}
                  />
                  {errors.subject && (
                    <p className="text-red-600 text-sm mt-1">{errors.subject}</p>
                  )}
                </div>
              )}

              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <TranslatedText text="Message Content" /> *
                </label>
                <textarea
                  value={singleFormData.content}
                  onChange={(e) => setSingleFormData({ ...singleFormData, content: e.target.value })}
                  rows={singleFormData.type === 'email' ? 8 : 5}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${errors.content ? 'border-red-500' : 'border-gray-300'
                    }`}
                  placeholder={tSync("Enter your {{type}} message content", { type: singleFormData.type })}
                />
                {errors.content && (
                  <p className="text-red-600 text-sm mt-1">{errors.content}</p>
                )}
              </div>

              {/* Recipient Info */}
              {singleFormData.customer_id && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <User className="h-5 w-5 text-green-600 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-green-800">
                        {singleFormData.type === 'email' ? <TranslatedText text="Email will be sent to:" /> : <TranslatedText text="SMS will be sent to:" />}
                      </p>
                      <p className="text-sm text-green-700">
                        {customers.find(c => c.id === singleFormData.customer_id)?.[singleFormData.type === 'email' ? 'email' : 'phone']}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-6 border-t">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <TranslatedText text="Cancel" />
                </button>
                <button
                  type="submit"
                  disabled={sendNotificationMutation.isLoading}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {sendNotificationMutation.isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      <TranslatedText text="Sending..." />
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      <TranslatedText text="Send Notification" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddNotificationModal;
