import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Truck,
  ClipboardList,
  FileCheck,
  Eye,
  Plus,
  Search,
  Filter,
  Download,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Package,
  Users,
  Calendar,
  ArrowUpDown,
  X,
  MapPin,
  Phone,
  Mail,
  User,
  Building,
  CreditCard,
  Star
} from 'lucide-react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';
import { procurementAPI } from '../lib/api';
import TranslatedText from '../components/TranslatedText';
import { useTranslation } from '../hooks/useTranslation';

const Production = () => {
  const { tSync } = useTranslation();
  const navigate = useNavigate();
  const { tab } = useParams();
  const validTabs = ['overview', 'suppliers', 'purchase-orders', 'requisitions'];
  const initialTab = validTabs.includes(tab) ? tab : 'overview';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  // Purchase Order form state
  const [showPurchaseOrderForm, setShowPurchaseOrderForm] = useState(false);
  const [poFormErrors, setPoFormErrors] = useState({});
  const [poIsSubmitting, setPoIsSubmitting] = useState(false);
  const [purchaseOrderForm, setPurchaseOrderForm] = useState({
    supplier_id: '',
    order_date: new Date().toISOString().slice(0, 10),
    items: [
      { material_id: '', quantity_ordered: '', unit_cost: '' }
    ]
  });

  // Supplier form state
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    country: '',
    postal_code: '',
    tax_id: '',
    payment_terms: 'Net 30',
    credit_limit: '',
    supplier_category: 'general',
    rating: '',
    notes: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync state when route param changes
  useEffect(() => {
    if (validTabs.includes(tab) && tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [tab]);

  // Update URL when activeTab changes (for deep links and back/forward support)
  useEffect(() => {
    if (activeTab && activeTab !== (tab || 'overview')) {
      navigate(`/production/${activeTab}`, { replace: true });
    }
  }, [activeTab]);

  // Stepper configuration
  const steps = [
    {
      id: 1,
      title: tSync('Basic Information'),
      description: tSync('Company and contact details'),
      fields: ['name', 'contact_person', 'email', 'phone']
    },
    {
      id: 2,
      title: tSync('Address Details'),
      description: tSync('Location and address information'),
      fields: ['address', 'city', 'state', 'country', 'postal_code']
    },
    {
      id: 3,
      title: tSync('Business Details'),
      description: tSync('Financial and business information'),
      fields: ['tax_id', 'payment_terms', 'credit_limit', 'supplier_category', 'rating']
    },
    {
      id: 4,
      title: tSync('Additional Information'),
      description: tSync('Notes and final details'),
      fields: ['notes']
    }
  ];

  const queryClient = useQueryClient();

  // Create supplier mutation
  const createSupplierMutation = useMutation({
    mutationFn: async (supplierData) => {
      const response = await procurementAPI.createSupplier(supplierData);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Supplier created successfully!');
      setShowSupplierForm(false);
      resetSupplierForm();
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
    onError: (error) => {
      const message = error.response?.data?.error || 'Failed to create supplier';
      toast.error(message);
    }
  });

  // Create purchase order mutation
  const createPurchaseOrderMutation = useMutation({
    mutationFn: async (poData) => {
      const response = await procurementAPI.createPurchaseOrder(poData);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Purchase order created successfully!');
      setShowPurchaseOrderForm(false);
      resetPurchaseOrderForm();
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
    onError: (error) => {
      const message = error.response?.data?.error || 'Failed to create purchase order';
      toast.error(message);
    }
  });

  // Reset supplier form
  const resetSupplierForm = () => {
    setSupplierForm({
      name: '',
      contact_person: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      country: '',
      postal_code: '',
      tax_id: '',
      payment_terms: 'Net 30',
      credit_limit: '',
      supplier_category: 'general',
      rating: '',
      notes: ''
    });
    setFormErrors({});
    setCurrentStep(1);
  };

  const resetPurchaseOrderForm = () => {
    setPurchaseOrderForm({
      supplier_id: '',
      order_date: new Date().toISOString().slice(0, 10),
      items: [
        { material_id: '', quantity_ordered: '', unit_cost: '' }
      ]
    });
    setPoFormErrors({});
  };

  const openPurchaseOrderForm = () => setShowPurchaseOrderForm(true);
  const closePurchaseOrderForm = () => {
    setShowPurchaseOrderForm(false);
    resetPurchaseOrderForm();
  };

  const addPurchaseOrderItem = () => {
    setPurchaseOrderForm(prev => ({
      ...prev,
      items: [...prev.items, { material_id: '', quantity_ordered: '', unit_cost: '' }]
    }));
  };

  const removePurchaseOrderItem = (index) => {
    setPurchaseOrderForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updatePurchaseOrderItem = (index, field, value) => {
    setPurchaseOrderForm(prev => ({
      ...prev,
      items: prev.items.map((it, i) => i === index ? { ...it, [field]: value } : it)
    }));
  };

  const validatePurchaseOrderForm = () => {
    const errors = {};
    if (!purchaseOrderForm.supplier_id) errors.supplier_id = 'Supplier is required';
    if (!purchaseOrderForm.order_date) errors.order_date = 'Order date is required';
    if (!Array.isArray(purchaseOrderForm.items) || purchaseOrderForm.items.length === 0) {
      errors.items = 'At least one item is required';
    }
    purchaseOrderForm.items.forEach((item, idx) => {
      if (!item.material_id) errors[`items.${idx}.material_id`] = 'Material is required';
      const qty = parseFloat(item.quantity_ordered);
      const cost = parseFloat(item.unit_cost);
      if (!(qty > 0)) errors[`items.${idx}.quantity_ordered`] = 'Quantity must be > 0';
      if (!(cost >= 0)) errors[`items.${idx}.unit_cost`] = 'Unit cost must be >= 0';
    });
    setPoFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePurchaseOrderSubmit = async (e) => {
    e.preventDefault();
    if (!validatePurchaseOrderForm()) return;
    try {
      setPoIsSubmitting(true);
      const total_amount = purchaseOrderForm.items.reduce((sum, it) => {
        const qty = parseFloat(it.quantity_ordered) || 0;
        const cost = parseFloat(it.unit_cost) || 0;
        return sum + qty * cost;
      }, 0);
      await createPurchaseOrderMutation.mutateAsync({
        ...purchaseOrderForm,
        total_amount
      });
    } finally {
      setPoIsSubmitting(false);
    }
  };

  // Stepper navigation functions
  const nextStep = () => {
    if (validateCurrentStep()) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const goToStep = (stepNumber) => {
    if (stepNumber <= currentStep || validateCurrentStep()) {
      setCurrentStep(stepNumber);
    }
  };

  // Validate current step
  const validateCurrentStep = () => {
    const currentStepData = steps.find(step => step.id === currentStep);
    if (!currentStepData) return true;

    const errors = {};
    currentStepData.fields.forEach(field => {
      if (field === 'name' && !supplierForm.name.trim()) {
        errors.name = 'Supplier name is required';
      }
      if (field === 'contact_person' && !supplierForm.contact_person.trim()) {
        errors.contact_person = 'Contact person is required';
      }
      if (field === 'email' && !supplierForm.email.trim()) {
        errors.email = 'Email is required';
      } else if (field === 'email' && supplierForm.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supplierForm.email)) {
        errors.email = 'Please enter a valid email address';
      }
      if (field === 'phone' && supplierForm.phone && !/^[\+]?[1-9][\d]{0,15}$/.test(supplierForm.phone.replace(/\s/g, ''))) {
        errors.phone = 'Please enter a valid phone number';
      }
      if (field === 'credit_limit' && supplierForm.credit_limit && parseFloat(supplierForm.credit_limit) < 0) {
        errors.credit_limit = 'Credit limit cannot be negative';
      }
      if (field === 'rating' && supplierForm.rating && (parseFloat(supplierForm.rating) < 0 || parseFloat(supplierForm.rating) > 5)) {
        errors.rating = 'Rating must be between 0 and 5';
      }
    });

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Check if step is completed
  const isStepCompleted = (stepNumber) => {
    const stepData = steps.find(step => step.id === stepNumber);
    if (!stepData) return false;

    return stepData.fields.every(field => {
      if (field === 'name' || field === 'contact_person' || field === 'email') {
        return supplierForm[field]?.trim();
      }
      return true; // Other fields are optional
    });
  };

  // Check if step is accessible
  const isStepAccessible = (stepNumber) => {
    if (stepNumber === 1) return true;
    return isStepCompleted(stepNumber - 1);
  };

  // Handle supplier form input changes
  const handleSupplierFormChange = (e) => {
    const { name, value } = e.target;
    setSupplierForm(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Validate supplier form
  const validateSupplierForm = () => {
    const errors = {};

    if (!supplierForm.name.trim()) errors.name = 'Supplier name is required';
    if (!supplierForm.contact_person.trim()) errors.contact_person = 'Contact person is required';
    if (!supplierForm.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supplierForm.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (supplierForm.phone && !/^[\+]?[1-9][\d]{0,15}$/.test(supplierForm.phone.replace(/\s/g, ''))) {
      errors.phone = 'Please enter a valid phone number';
    }

    if (supplierForm.credit_limit && parseFloat(supplierForm.credit_limit) < 0) {
      errors.credit_limit = 'Credit limit cannot be negative';
    }

    if (supplierForm.rating && (parseFloat(supplierForm.rating) < 0 || parseFloat(supplierForm.rating) > 5)) {
      errors.rating = 'Rating must be between 0 and 5';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle supplier form submission
  const handleSupplierFormSubmit = async (e) => {
    e.preventDefault();

    // Only submit if we're on the final step
    if (currentStep !== steps.length) {
      return;
    }

    if (!validateSupplierForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const supplierData = {
        ...supplierForm,
        credit_limit: supplierForm.credit_limit ? parseFloat(supplierForm.credit_limit) : 0,
        rating: supplierForm.rating ? parseFloat(supplierForm.rating) : 0
      };

      await createSupplierMutation.mutateAsync(supplierData);
    } catch (error) {
      console.error('Supplier creation error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open supplier form
  const openSupplierForm = () => {
    setShowSupplierForm(true);
    resetSupplierForm();
  };

  // Close supplier form
  const closeSupplierForm = () => {
    setShowSupplierForm(false);
    resetSupplierForm();
    setCurrentStep(1);
  };

  // Fetch procurement analytics
  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['procurement-analytics'],
    queryFn: async () => {
      const response = await procurementAPI.getSuppliers();
      return response.data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 60000
  });

  // Fetch suppliers
  const { data: suppliersData, isLoading: suppliersLoading } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const response = await procurementAPI.getSuppliers();
      return response.data;
    }
  });

  // Fetch purchase orders
  const { data: purchaseOrdersData, isLoading: purchaseOrdersLoading } = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: async () => {
      const response = await procurementAPI.getPurchaseOrders();
      return response.data;
    }
  });

  // Fetch requisitions
  const { data: requisitionsData, isLoading: requisitionsLoading } = useQuery({
    queryKey: ['requisitions'],
    queryFn: async () => {
      const response = await procurementAPI.getSuppliers();
      return response.data;
    }
  });

  const suppliers = suppliersData?.suppliers || [];
  const purchaseOrders = purchaseOrdersData?.purchase_orders || [];
  const requisitions = requisitionsData?.requisitions || [];

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved':
      case 'delivered':
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
      case 'in_transit':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'normal':
        return 'bg-blue-100 text-blue-800';
      case 'low':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const toggleSelection = (itemId) => {
    setSelectedItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const selectAll = () => {
    const currentItems = getCurrentItems();
    setSelectedItems(currentItems.map(item => item.id));
  };

  const clearSelection = () => {
    setSelectedItems([]);
  };

  const getCurrentItems = () => {
    switch (activeTab) {
      case 'suppliers':
        return suppliers;
      case 'purchase-orders':
        return purchaseOrders;
      case 'requisitions':
        return requisitions;
      default:
        return [];
    }
  };

  const filteredItems = getCurrentItems().filter(item => {
    const searchLower = searchTerm.toLowerCase();
    if (activeTab === 'suppliers') {
      return item.name?.toLowerCase().includes(searchLower) ||
        item.contact_person?.toLowerCase().includes(searchLower) ||
        item.email?.toLowerCase().includes(searchLower);
    } else if (activeTab === 'purchase-orders') {
      return item.po_number?.toLowerCase().includes(searchLower) ||
        item.supplier_name?.toLowerCase().includes(searchLower);
    } else if (activeTab === 'requisitions') {
      return item.requisition_number?.toLowerCase().includes(searchLower) ||
        item.title?.toLowerCase().includes(searchLower);
    }
    return true;
  });

  const sortedItems = [...filteredItems].sort((a, b) => {
    const aValue = a[sortBy];
    const bValue = b[sortBy];

    if (sortBy === 'created_at') {
      return sortOrder === 'desc'
        ? new Date(bValue || 0).getTime() - new Date(aValue || 0).getTime()
        : new Date(aValue || 0).getTime() - new Date(bValue || 0).getTime();
    }

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortOrder === 'desc'
        ? bValue.localeCompare(aValue)
        : aValue.localeCompare(bValue);
    }

    return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
  });

  const tabs = [
    {
      id: 'overview',
      name: tSync('Overview'),
      icon: BarChart3,
      description: tSync('Production analytics and insights')
    },
    {
      id: 'suppliers',
      name: tSync('Suppliers'),
      icon: Users,
      description: tSync('Manage suppliers and performance')
    },
    {
      id: 'purchase-orders',
      name: tSync('Purchase Orders'),
      icon: FileCheck,
      description: tSync('Create and track purchase orders')
    },
    {
      id: 'requisitions',
      name: tSync('Requisitions'),
      icon: ClipboardList,
      description: tSync('Purchase requisitions and approvals')
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <Truck className="h-8 w-8 text-primary-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900"><TranslatedText text="Production" /></h1>
                <p className="text-sm text-gray-500"><TranslatedText text="Raw material acquisition & supplier management" /></p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={openSupplierForm}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <Plus className="h-4 w-4 mr-2" />
                <TranslatedText text="New Supplier" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={`Search ${activeTab}...`}
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
                Filters
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
                <option value="created_at-desc">Newest First</option>
                <option value="created_at-asc">Oldest First</option>
                <option value="name-asc">Name A-Z</option>
                <option value="name-desc">Name Z-A</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <OverviewTab analytics={analytics} isLoading={analyticsLoading} formatCurrency={formatCurrency} />
        )}

        {activeTab === 'suppliers' && (
          <SuppliersTab
            suppliers={sortedItems}
            isLoading={suppliersLoading}
            searchTerm={searchTerm}
            viewMode={viewMode}
            selectedItems={selectedItems}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onToggleSelection={toggleSelection}
            formatCurrency={formatCurrency}
            getStatusColor={getStatusColor}
          />
        )}

        {activeTab === 'purchase-orders' && (
          <PurchaseOrdersTab
            purchaseOrders={sortedItems}
            isLoading={purchaseOrdersLoading}
            searchTerm={searchTerm}
            viewMode={viewMode}
            selectedItems={selectedItems}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onToggleSelection={toggleSelection}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
            getStatusColor={getStatusColor}
            // Purchase order modal props
            openPurchaseOrderForm={openPurchaseOrderForm}
            closePurchaseOrderForm={closePurchaseOrderForm}
            showPurchaseOrderForm={showPurchaseOrderForm}
            suppliers={suppliers}
            purchaseOrderForm={purchaseOrderForm}
            setPurchaseOrderForm={setPurchaseOrderForm}
            addPurchaseOrderItem={addPurchaseOrderItem}
            removePurchaseOrderItem={removePurchaseOrderItem}
            updatePurchaseOrderItem={updatePurchaseOrderItem}
            handlePurchaseOrderSubmit={handlePurchaseOrderSubmit}
            poFormErrors={poFormErrors}
            poIsSubmitting={poIsSubmitting}
          />
        )}

        {activeTab === 'requisitions' && (
          <RequisitionsTab
            requisitions={sortedItems}
            isLoading={requisitionsLoading}
            searchTerm={searchTerm}
            viewMode={viewMode}
            selectedItems={selectedItems}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onToggleSelection={toggleSelection}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
            getStatusColor={getStatusColor}
            getPriorityColor={getPriorityColor}
          />
        )}
      </div>

      {/* Supplier Form Modal */}
      <SupplierFormModal
        isOpen={showSupplierForm}
        onClose={closeSupplierForm}
        onSubmit={handleSupplierFormSubmit}
        formData={supplierForm}
        onChange={handleSupplierFormChange}
        errors={formErrors}
        isSubmitting={isSubmitting}
        currentStep={currentStep}
        steps={steps}
        nextStep={nextStep}
        prevStep={prevStep}
        goToStep={goToStep}
        isStepCompleted={isStepCompleted}
        isStepAccessible={isStepAccessible}
      />
    </div>
  );
};

// Overview Tab Component
const OverviewTab = ({ analytics, isLoading, formatCurrency }) => {
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
  const topSuppliers = analytics?.top_suppliers || [];
  const materialSpend = analytics?.material_spend || [];
  const qualityMetrics = analytics?.quality_metrics || {};
  const deliveryPerformance = analytics?.delivery_performance || {};

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <FileCheck className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Total Orders</dt>
                <dd className="text-lg font-medium text-gray-900">{stats.total_orders || 0}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Total Spend</dt>
                <dd className="text-lg font-medium text-gray-900">{formatCurrency(stats.total_spend)}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Users className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Active Suppliers</dt>
                <dd className="text-lg font-medium text-gray-900">{stats.active_suppliers || 0}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Quality Rate</dt>
                <dd className="text-lg font-medium text-gray-900">
                  {qualityMetrics.acceptance_rate ? `${qualityMetrics.acceptance_rate.toFixed(1)}%` : 'N/A'}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Charts and Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Suppliers */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900"><TranslatedText text="Top Suppliers by Spend" /></h3>
          </div>
          <div className="p-6">
            {topSuppliers.length > 0 ? (
              <div className="space-y-4">
                {topSuppliers.slice(0, 5).map((supplier, index) => (
                  <div key={supplier.supplier_name} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-900">{supplier.supplier_name}</span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatCurrency(supplier.total_spend)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No supplier data available</p>
            )}
          </div>
        </div>

        {/* Material Spend */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900"><TranslatedText text="Material Spend Analysis" /></h3>
          </div>
          <div className="p-6">
            {materialSpend.length > 0 ? (
              <div className="space-y-4">
                {materialSpend.slice(0, 5).map((material, index) => (
                  <div key={material.material_name} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-900">{material.material_name}</span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatCurrency(material.total_spend)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No material spend data available</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Suppliers Tab Component
const SuppliersTab = ({ suppliers, isLoading, searchTerm, viewMode, selectedItems, sortBy, sortOrder, onToggleSelection, formatCurrency, getStatusColor }) => {
  if (isLoading) {
    return <div className="text-center py-8">Loading suppliers...</div>;
  }

  return (
    <div className="space-y-6">
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {suppliers.map((supplier) => (
            <div key={supplier.id} className="bg-white rounded-lg shadow border border-gray-200 hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900">{supplier.name}</h3>
                    <p className="text-sm text-gray-500">{supplier.contact_person}</p>
                    <p className="text-sm text-gray-500">{supplier.email}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(supplier.is_approved ? 'approved' : 'pending')}`}>
                      {supplier.is_approved ? 'Approved' : 'Pending'}
                    </span>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Category:</span>
                    <span className="text-gray-900">{supplier.supplier_category}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Rating:</span>
                    <span className="text-gray-900">{supplier.rating ? `${supplier.rating}/5` : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Materials:</span>
                    <span className="text-gray-900">{supplier.materials_count || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Orders:</span>
                    <span className="text-gray-900">{supplier.total_orders || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {suppliers.map((supplier) => (
              <li key={supplier.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900">{supplier.name}</h3>
                    <p className="text-sm text-gray-500">{supplier.contact_person} • {supplier.email}</p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(supplier.is_approved ? 'approved' : 'pending')}`}>
                      {supplier.is_approved ? 'Approved' : 'Pending'}
                    </span>
                    <span className="text-sm text-gray-500">{supplier.supplier_category}</span>
                    <span className="text-sm text-gray-500">{supplier.rating ? `${supplier.rating}/5` : 'N/A'}</span>
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

// Purchase Orders Tab Component
const PurchaseOrdersTab = ({ purchaseOrders, isLoading, searchTerm, viewMode, selectedItems, sortBy, sortOrder, onToggleSelection, formatCurrency, formatDate, getStatusColor, openPurchaseOrderForm, closePurchaseOrderForm, showPurchaseOrderForm, suppliers, purchaseOrderForm, setPurchaseOrderForm, addPurchaseOrderItem, removePurchaseOrderItem, updatePurchaseOrderItem, handlePurchaseOrderSubmit, poFormErrors, poIsSubmitting }) => {
  if (isLoading) {
    return <div className="text-center py-8">Loading purchase orders...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          onClick={openPurchaseOrderForm}
          className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-xl hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
        >
          <Plus className="h-5 w-5 mr-2" />
          New Purchase Order
        </button>
      </div>
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {purchaseOrders.map((order) => (
            <div key={order.id} className="bg-white rounded-lg shadow border border-gray-200 hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900">{order.po_number}</h3>
                    <p className="text-sm text-gray-500">{order.supplier_name}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Order Date:</span>
                    <span className="text-gray-900">{formatDate(order.order_date)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Total Amount:</span>
                    <span className="text-gray-900 font-medium">{formatCurrency(order.total_amount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Items:</span>
                    <span className="text-gray-900">{order.items_count || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Quantity:</span>
                    <span className="text-gray-900">{order.total_quantity || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {purchaseOrders.map((order) => (
              <li key={order.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900">{order.po_number}</h3>
                    <p className="text-sm text-gray-500">{order.supplier_name} • {formatDate(order.order_date)}</p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                    <span className="text-sm font-medium text-gray-900">{formatCurrency(order.total_amount)}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      {/* Purchase Order Modal */}
      {showPurchaseOrderForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900"><TranslatedText text="Create Purchase Order" /></h2>
              <button onClick={closePurchaseOrderForm} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handlePurchaseOrderSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Supplier *</label>
                  <select
                    value={purchaseOrderForm.supplier_id}
                    onChange={(e) => setPurchaseOrderForm({ ...purchaseOrderForm, supplier_id: e.target.value })}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${poFormErrors.supplier_id ? 'border-red-300' : 'border-gray-300'}`}
                  >
                    <option value="">Select supplier</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  {poFormErrors.supplier_id && <p className="mt-1 text-sm text-red-600">{poFormErrors.supplier_id}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Order Date *</label>
                  <input
                    type="date"
                    value={purchaseOrderForm.order_date}
                    onChange={(e) => setPurchaseOrderForm({ ...purchaseOrderForm, order_date: e.target.value })}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${poFormErrors.order_date ? 'border-red-300' : 'border-gray-300'}`}
                  />
                  {poFormErrors.order_date && <p className="mt-1 text-sm text-red-600">{poFormErrors.order_date}</p>}
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Items *</label>
                  <button type="button" onClick={addPurchaseOrderItem} className="text-blue-600 hover:text-blue-700 inline-flex items-center">
                    <Plus className="h-4 w-4 mr-1" /> Add Item
                  </button>
                </div>
                <div className="space-y-4">
                  {purchaseOrderForm.items.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Material *</label>
                        <input
                          type="text"
                          value={item.material_id}
                          onChange={(e) => updatePurchaseOrderItem(idx, 'material_id', e.target.value)}
                          placeholder="Material ID"
                          className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${poFormErrors[`items.${idx}.material_id`] ? 'border-red-300' : 'border-gray-300'}`}
                        />
                        {poFormErrors[`items.${idx}.material_id`] && <p className="mt-1 text-sm text-red-600">{poFormErrors[`items.${idx}.material_id`]}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                        <input
                          type="number"
                          step="0.001"
                          value={item.quantity_ordered}
                          onChange={(e) => updatePurchaseOrderItem(idx, 'quantity_ordered', e.target.value)}
                          className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${poFormErrors[`items.${idx}.quantity_ordered`] ? 'border-red-300' : 'border-gray-300'}`}
                        />
                        {poFormErrors[`items.${idx}.quantity_ordered`] && <p className="mt-1 text-sm text-red-600">{poFormErrors[`items.${idx}.quantity_ordered`]}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Unit Cost *</label>
                        <input
                          type="number"
                          step="0.01"
                          value={item.unit_cost}
                          onChange={(e) => updatePurchaseOrderItem(idx, 'unit_cost', e.target.value)}
                          className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${poFormErrors[`items.${idx}.unit_cost`] ? 'border-red-300' : 'border-gray-300'}`}
                        />
                        {poFormErrors[`items.${idx}.unit_cost`] && <p className="mt-1 text-sm text-red-600">{poFormErrors[`items.${idx}.unit_cost`]}</p>}
                      </div>
                      <div className="md:col-span-4 flex justify-end">
                        <button type="button" onClick={() => removePurchaseOrderItem(idx)} className="text-red-600 hover:text-red-700 inline-flex items-center">
                          <X className="h-4 w-4 mr-1" /> Remove
                        </button>
                      </div>
                    </div>
                  ))}
                  {poFormErrors.items && <p className="text-red-600 text-sm">{poFormErrors.items}</p>}
                </div>
              </div>
              <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={closePurchaseOrderForm}
                  className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={poIsSubmitting}
                  className="px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {poIsSubmitting ? 'Creating...' : 'Create Purchase Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Requisitions Tab Component
const RequisitionsTab = ({ requisitions, isLoading, searchTerm, viewMode, selectedItems, sortBy, sortOrder, onToggleSelection, formatCurrency, formatDate, getStatusColor, getPriorityColor }) => {
  if (isLoading) {
    return <div className="text-center py-8">Loading requisitions...</div>;
  }

  return (
    <div className="space-y-6">
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {requisitions.map((requisition) => (
            <div key={requisition.id} className="bg-white rounded-lg shadow border border-gray-200 hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900">{requisition.requisition_number}</h3>
                    <p className="text-sm text-gray-500">{requisition.title}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(requisition.status)}`}>
                      {requisition.status}
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(requisition.priority)}`}>
                      {requisition.priority}
                    </span>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Requested By:</span>
                    <span className="text-gray-900">{requisition.first_name} {requisition.last_name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Estimated Cost:</span>
                    <span className="text-gray-900 font-medium">{formatCurrency(requisition.total_estimated_cost)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Items:</span>
                    <span className="text-gray-900">{requisition.items_count || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Quantity:</span>
                    <span className="text-gray-900">{requisition.total_quantity || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {requisitions.map((requisition) => (
              <li key={requisition.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900">{requisition.requisition_number}</h3>
                    <p className="text-sm text-gray-500">{requisition.title} • {requisition.first_name} {requisition.last_name}</p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(requisition.status)}`}>
                      {requisition.status}
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(requisition.priority)}`}>
                      {requisition.priority}
                    </span>
                    <span className="text-sm font-medium text-gray-900">{formatCurrency(requisition.total_estimated_cost)}</span>
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

// Supplier Form Modal
const SupplierFormModal = ({ isOpen, onClose, onSubmit, formData, onChange, errors, isSubmitting, currentStep, steps, nextStep, prevStep, goToStep, isStepCompleted, isStepAccessible }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900"><TranslatedText text="Add New Supplier" /></h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Stepper Progress */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <button
                    onClick={() => goToStep(step.id)}
                    disabled={!isStepAccessible(step.id)}
                    className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-200 ${currentStep === step.id
                      ? 'border-primary-600 bg-primary-600 text-white'
                      : isStepCompleted(step.id)
                        ? 'border-green-500 bg-green-500 text-white'
                        : isStepAccessible(step.id)
                          ? 'border-gray-300 bg-white text-gray-600 hover:border-primary-400'
                          : 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                  >
                    {isStepCompleted(step.id) ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : (
                      step.id
                    )}
                  </button>
                  {index < steps.length - 1 && (
                    <div className={`w-16 h-0.5 mx-2 ${isStepCompleted(step.id + 1) ? 'bg-green-500' : 'bg-gray-300'
                      }`} />
                  )}
                </div>
              ))}
            </div>

            {/* Step Labels */}
            <div className="flex justify-between mt-4">
              {steps.map((step) => (
                <div key={step.id} className="text-center flex-1">
                  <div className={`text-sm font-medium ${currentStep === step.id ? 'text-primary-600' : 'text-gray-500'
                    }`}>
                    {step.title}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {step.description}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={onSubmit} className="space-y-6">
            {/* Step 1: Basic Information */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Building className="h-4 w-4 inline mr-2" />
                      Supplier Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={onChange}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.name ? 'border-red-500' : 'border-gray-300'
                        }`}
                      placeholder="Enter supplier name"
                    />
                    {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <User className="h-4 w-4 inline mr-2" />
                      Contact Person *
                    </label>
                    <input
                      type="text"
                      name="contact_person"
                      value={formData.contact_person}
                      onChange={onChange}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.contact_person ? 'border-red-500' : 'border-gray-300'
                        }`}
                      placeholder="Enter contact person name"
                    />
                    {errors.contact_person && <p className="mt-1 text-sm text-red-600">{errors.contact_person}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Mail className="h-4 w-4 inline mr-2" />
                      Email *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={onChange}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.email ? 'border-red-500' : 'border-gray-300'
                        }`}
                      placeholder="Enter email address"
                    />
                    {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Phone className="h-4 w-4 inline mr-2" />
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={onChange}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.phone ? 'border-red-500' : 'border-gray-300'
                        }`}
                      placeholder="Enter phone number"
                    />
                    {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Address Details */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <MapPin className="h-4 w-4 inline mr-2" />
                    Address
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={onChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Enter street address"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={onChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Enter city"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">State/Province</label>
                    <input
                      type="text"
                      name="state"
                      value={formData.state}
                      onChange={onChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Enter state/province"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                    <input
                      type="text"
                      name="country"
                      value={formData.country}
                      onChange={onChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Enter country"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Postal Code</label>
                    <input
                      type="text"
                      name="postal_code"
                      value={formData.postal_code}
                      onChange={onChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Enter postal code"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Business Details */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tax ID</label>
                    <input
                      type="text"
                      name="tax_id"
                      value={formData.tax_id}
                      onChange={onChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Enter tax identification number"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <CreditCard className="h-4 w-4 inline mr-2" />
                      Payment Terms
                    </label>
                    <select
                      name="payment_terms"
                      value={formData.payment_terms}
                      onChange={onChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="Net 15">Net 15</option>
                      <option value="Net 30">Net 30</option>
                      <option value="Net 45">Net 45</option>
                      <option value="Net 60">Net 60</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <DollarSign className="h-4 w-4 inline mr-2" />
                      Credit Limit
                    </label>
                    <input
                      type="number"
                      name="credit_limit"
                      value={formData.credit_limit}
                      onChange={onChange}
                      step="0.01"
                      min="0"
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.credit_limit ? 'border-red-500' : 'border-gray-300'
                        }`}
                      placeholder="Enter credit limit"
                    />
                    {errors.credit_limit && <p className="mt-1 text-sm text-red-600">{errors.credit_limit}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Star className="h-4 w-4 inline mr-2" />
                      Rating (0-5)
                    </label>
                    <input
                      type="number"
                      name="rating"
                      value={formData.rating}
                      onChange={onChange}
                      step="0.1"
                      min="0"
                      max="5"
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.rating ? 'border-red-500' : 'border-gray-300'
                        }`}
                      placeholder="Enter rating (0-5)"
                    />
                    {errors.rating && <p className="mt-1 text-sm text-red-600">{errors.rating}</p>}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Supplier Category</label>
                    <select
                      name="supplier_category"
                      value={formData.supplier_category}
                      onChange={onChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="general">General</option>
                      <option value="raw_materials">Raw Materials</option>
                      <option value="packaging">Packaging</option>
                      <option value="equipment">Equipment</option>
                      <option value="services">Services</option>
                      <option value="logistics">Logistics</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Additional Information */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={onChange}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Enter any additional notes about the supplier"
                  />
                </div>
              </div>
            )}

            {/* Form Actions */}
            <div className="flex justify-between pt-4 border-t border-gray-200">
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Cancel
                </button>
              </div>

              <div className="flex space-x-3">
                {currentStep > 1 && (
                  <button
                    type="button"
                    onClick={prevStep}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    Previous
                  </button>
                )}

                {currentStep < steps.length ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    Next
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Creating...' : 'Create Supplier'}
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Production; 