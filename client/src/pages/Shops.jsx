import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Search,
  MapPin,
  Phone,
  Mail,
  Users,
  TrendingUp,
  Store,
  Edit,
  Trash2,
  Eye,
  X,
  Save,
  BarChart3
} from 'lucide-react';
import { api } from '../lib/api';
import { shopsAPI, usersAPI } from '../lib/api';
import TranslatedText from '../components/TranslatedText';
import { useTranslation } from '../hooks/useTranslation';

const Shops = () => {
  const { tSync } = useTranslation();
  console.log('Shops component is rendering...');

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedShop, setSelectedShop] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    country: '',
    postal_code: '',
    phone: '',
    email: '',
    manager_id: ''
  });
  const [errors, setErrors] = useState({});

  const queryClient = useQueryClient();

  // Fetch shops
  const { data: shopsData, isLoading, error } = useQuery({
    queryKey: ['shops'],
    queryFn: () => shopsAPI.getAll().then(res => res.data),
    onSuccess: (data) => {
      console.log('Shops data received:', data);
    },
    onError: (error) => {
      console.error('Shops fetch error:', error);
    }
  });

  // Fetch users for manager selection
  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersAPI.getAll().then(res => res.data),
  });

  // Ensure shops is always an array
  const shops = Array.isArray(shopsData?.shops) ? shopsData.shops : [];
  const users = Array.isArray(usersData?.users) ? usersData.users : [];

  // Debug logging
  console.log('Shops component render:', { shopsData, shops, isLoading, error });

  // Mutations
  const createShopMutation = useMutation({
    mutationFn: (shopData) => shopsAPI.create(shopData),
    onSuccess: () => {
      queryClient.invalidateQueries(['shops']);
      setShowAddModal(false);
      resetForm();
      alert('Shop created successfully!');
    },
    onError: (error) => {
      alert(error.response?.data?.error || 'Failed to create shop');
    }
  });

  const updateShopMutation = useMutation({
    mutationFn: ({ id, shopData }) => api.put(`/shops/${id}`, shopData),
    onSuccess: () => {
      queryClient.invalidateQueries(['shops']);
      setShowEditModal(false);
      resetForm();
      alert('Shop updated successfully!');
    },
    onError: (error) => {
      alert(error.response?.data?.error || 'Failed to update shop');
    }
  });

  const deleteShopMutation = useMutation({
    mutationFn: (id) => api.delete(`/shops/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['shops']);
      alert('Shop deleted successfully!');
    },
    onError: (error) => {
      alert(error.response?.data?.error || 'Failed to delete shop');
    }
  });

  // Filter shops
  const filteredShops = shops.filter(shop => {
    const matchesSearch = shop.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shop.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shop.address.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = selectedFilter === 'all' ||
      (selectedFilter === 'active' && shop.is_active) ||
      (selectedFilter === 'inactive' && !shop.is_active);
    return matchesSearch && matchesFilter;
  });

  // Form handling
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      city: '',
      state: '',
      country: '',
      postal_code: '',
      phone: '',
      email: '',
      manager_id: ''
    });
    setErrors({});
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Shop name is required';
    if (!formData.address.trim()) newErrors.address = 'Address is required';
    if (!formData.city.trim()) newErrors.city = 'City is required';
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (showEditModal) {
      updateShopMutation.mutate({ id: selectedShop.id, shopData: formData });
    } else {
      createShopMutation.mutate(formData);
    }
  };

  const handleEdit = (shop) => {
    setSelectedShop(shop);
    setFormData({
      name: shop.name,
      address: shop.address,
      city: shop.city,
      state: shop.state || '',
      country: shop.country || '',
      postal_code: shop.postal_code || '',
      phone: shop.phone || '',
      email: shop.email || '',
      manager_id: shop.manager_id || ''
    });
    setShowEditModal(true);
  };

  const handleView = (shop) => {
    setSelectedShop(shop);
    setShowViewModal(true);
  };

  const handleDelete = (shop) => {
    if (window.confirm(`Are you sure you want to delete "${shop.name}"? This action cannot be undone.`)) {
      deleteShopMutation.mutate(shop.id);
    }
  };

  if (isLoading) {
    console.log('Shops component is loading...');
    return (
      <div className="animate-pulse space-y-8">
        <div className="h-8 bg-gray-200 rounded-lg w-1/4"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-6 shadow-sm">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <div className="h-6 w-6 text-red-600">!</div>
        </div>
        <h3 className="text-lg font-medium text-red-900 mb-2"><TranslatedText text="Error loading shops" /></h3>
        <p className="text-red-500">{error.message}</p>
      </div>
    );
  }

  console.log('Shops component rendering main content...', { shops, isLoading, error });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            <TranslatedText text="Shops" />
          </h1>
          <p className="text-gray-600 mt-2">
            <TranslatedText text="Manage your retail locations and shop settings" />
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-xl hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
        >
          <Plus className="h-5 w-5 mr-2" />
          <TranslatedText text="Add New Shop" />
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-xl">
              <Store className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">{tSync('Total Shops')}</p>
              <p className="text-2xl font-bold text-gray-900">{shops.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-xl">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">{tSync('Active Shops')}</p>
              <p className="text-2xl font-bold text-gray-900">
                {shops.filter(shop => shop.is_active).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-xl">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">{tSync('Total Staff')}</p>
              <p className="text-2xl font-bold text-gray-900">
                {users.filter(user => user.shop_id).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="p-3 bg-orange-100 rounded-xl">
              <MapPin className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">{tSync('Cities')}</p>
              <p className="text-2xl font-bold text-gray-900">
                {new Set(shops.map(shop => shop.city)).size}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder={tSync('search.placeholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <select
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">{tSync('All Shops')}</option>
              <option value="active">{tSync('Active')}</option>
              <option value="inactive">{tSync('Inactive')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Shops Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredShops.map((shop) => (
          <div key={shop.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="p-6">
              {/* Shop Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <Store className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-lg font-semibold text-gray-900">{shop.name}</h3>
                    <div className="flex items-center text-sm text-gray-500">
                      <MapPin className="h-4 w-4 mr-1" />
                      {shop.city}, {shop.state}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleView(shop)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="View Details"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleEdit(shop)}
                    className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    title="Edit Shop"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(shop)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete Shop"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Shop Details */}
              <div className="space-y-3">
                {shop.phone && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Phone className="h-4 w-4 mr-2 text-gray-400" />
                    {shop.phone}
                  </div>
                )}
                {shop.email && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Mail className="h-4 w-4 mr-2 text-gray-400" />
                    {shop.email}
                  </div>
                )}
                {shop.manager_first_name && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Users className="h-4 w-4 mr-2 text-gray-400" />
                    Manager: {shop.manager_first_name} {shop.manager_last_name}
                  </div>
                )}
              </div>

              {/* Status Badge */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${shop.is_active
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                    }`}>
                    {shop.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <span className="text-xs text-gray-500">
                    ID: {shop.id.slice(0, 8)}...
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredShops.length === 0 && (
        <div className="text-center py-12">
          <Store className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2"><TranslatedText text="No shops found" /></h3>
          <p className="text-gray-500 mb-6">
            {searchTerm || selectedFilter !== 'all'
              ? 'Try adjusting your search or filter criteria.'
              : 'Get started by adding your first retail location.'
            }
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-5 w-5 mr-2" />
            <TranslatedText text="Add First Shop" />
          </button>
        </div>
      )}

      {/* Add/Edit Shop Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {showEditModal ? <TranslatedText text="Edit Shop" /> : <TranslatedText text="Add New Shop" />}
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                  resetForm();
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {tSync('Shop Name *')}
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.name ? 'border-red-300' : 'border-gray-300'
                      }`}
                    placeholder={tSync('Enter shop name')}
                  />
                  {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {tSync('Manager')}
                  </label>
                  <select
                    name="manager_id"
                    value={formData.manager_id}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">{tSync('Select Manager')}</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.first_name} {user.last_name} ({user.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {tSync('Address *')}
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.address ? 'border-red-300' : 'border-gray-300'
                      }`}
                    placeholder={tSync('Enter address')}
                  />
                  {errors.address && <p className="mt-1 text-sm text-red-600">{errors.address}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {tSync('City *')}
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.city ? 'border-red-300' : 'border-gray-300'
                      }`}
                    placeholder={tSync('Enter city')}
                  />
                  {errors.city && <p className="mt-1 text-sm text-red-600">{errors.city}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {tSync('State/Province')}
                  </label>
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={tSync('Enter state')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {tSync('Country')}
                  </label>
                  <input
                    type="text"
                    name="country"
                    value={formData.country}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={tSync('Enter country')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {tSync('Postal Code')}
                  </label>
                  <input
                    type="text"
                    name="postal_code"
                    value={formData.postal_code}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={tSync('Enter postal code')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {tSync('Phone')}
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={tSync('Enter phone number')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {tSync('Email')}
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.email ? 'border-red-300' : 'border-gray-300'
                      }`}
                    placeholder={tSync('Enter email')}
                  />
                  {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
                </div>
              </div>

              <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setShowEditModal(false);
                    resetForm();
                  }}
                  className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <TranslatedText text="Cancel" />
                </button>
                <button
                  type="submit"
                  disabled={createShopMutation.isPending || updateShopMutation.isPending}
                  className="px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createShopMutation.isPending || updateShopMutation.isPending ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {showEditModal ? <TranslatedText text="Updating..." /> : <TranslatedText text="Creating..." />}
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <Save className="h-4 w-4 mr-2" />
                      {showEditModal ? <TranslatedText text="Update Shop" /> : <TranslatedText text="Create Shop" />}
                    </div>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Shop Details Modal */}
      {showViewModal && selectedShop && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900"><TranslatedText text="Shop Details" /></h2>
              <button
                onClick={() => setShowViewModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Basic Information */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4"><TranslatedText text="Basic Information" /></h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500">{tSync('Shop Name')}</label>
                      <p className="text-lg text-gray-900">{selectedShop.name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">{tSync('Address')}</label>
                      <p className="text-lg text-gray-900">{selectedShop.address}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">{tSync('Location')}</label>
                      <p className="text-lg text-gray-900">
                        {selectedShop.city}, {selectedShop.state} {selectedShop.postal_code}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">{tSync('Country')}</label>
                      <p className="text-lg text-gray-900">{selectedShop.country || 'Not specified'}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4"><TranslatedText text="Contact Information" /></h3>
                  <div className="space-y-4">
                    {selectedShop.phone && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500">{tSync('Phone')}</label>
                        <p className="text-lg text-gray-900">{selectedShop.phone}</p>
                      </div>
                    )}
                    {selectedShop.email && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500">{tSync('Email')}</label>
                        <p className="text-lg text-gray-900">{selectedShop.email}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4"><TranslatedText text="Management" /></h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500">{tSync('Manager')}</label>
                      <p className="text-lg text-gray-900">
                        {selectedShop.manager_first_name && selectedShop.manager_last_name
                          ? `${selectedShop.manager_first_name} ${selectedShop.manager_last_name}`
                          : tSync('Not assigned')
                        }
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">{tSync('Status')}</label>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${selectedShop.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                        }`}>
                        {selectedShop.is_active ? tSync('Active') : tSync('Inactive')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4"><TranslatedText text="Quick Actions" /></h3>
                  <div className="space-y-3">
                    <button
                      onClick={() => {
                        setShowViewModal(false);
                        handleEdit(selectedShop);
                      }}
                      className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      {tSync('Edit Shop')}
                    </button>
                    <button
                      onClick={() => handleDelete(selectedShop)}
                      className="w-full flex items-center justify-center px-4 py-3 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {tSync('Delete Shop')}
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4"><TranslatedText text="Shop Information" /></h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500">{tSync('Shop ID')}</label>
                      <p className="text-sm text-gray-900 font-mono">{selectedShop.id}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">{tSync('Created')}</label>
                      <p className="text-sm text-gray-900">
                        {new Date(selectedShop.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    {selectedShop.updated_at && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500">{tSync('Last Updated')}</label>
                        <p className="text-sm text-gray-900">
                          {new Date(selectedShop.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Shops;
