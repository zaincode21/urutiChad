import React, { useState } from 'react';
import { 
  Plus, Edit, Trash2, Search, Filter, Building2, 
  ChevronDown, ChevronRight, Eye, EyeOff 
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { glAccountsAPI } from '../lib/api';
import toast from 'react-hot-toast';
import TranslatedText from './TranslatedText';

const GLAccountManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showCreateCategoryForm, setShowCreateCategoryForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [showInactive, setShowInactive] = useState(false);
  const [pendingAccountForm, setPendingAccountForm] = useState(null); // Store account form data when creating category

  const queryClient = useQueryClient();

  // Fetch GL accounts and categories
  const { data: accountsData, isLoading: accountsLoading } = useQuery({
    queryKey: ['gl-accounts', filterType, showInactive],
    queryFn: () => glAccountsAPI.getAccounts({ 
      account_type: filterType === 'all' ? undefined : filterType,
      include_inactive: showInactive 
    }),
    staleTime: 300000,
  });

  const { data: categoriesData, isLoading: categoriesLoading } = useQuery({
    queryKey: ['gl-categories'],
    queryFn: () => glAccountsAPI.getCategories(),
    staleTime: 300000,
  });

  const { data: hierarchyData, isLoading: hierarchyLoading } = useQuery({
    queryKey: ['gl-hierarchy'],
    queryFn: () => glAccountsAPI.getHierarchy(),
    staleTime: 300000,
  });

  // Mutations
  const createAccountMutation = useMutation({
    mutationFn: glAccountsAPI.createAccount,
    onSuccess: () => {
      queryClient.invalidateQueries(['gl-accounts']);
      queryClient.invalidateQueries(['gl-hierarchy']);
      toast.success('GL account created successfully');
      setShowCreateForm(false);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to create GL account');
    }
  });

  const updateAccountMutation = useMutation({
    mutationFn: ({ id, data }) => glAccountsAPI.updateAccount(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['gl-accounts']);
      queryClient.invalidateQueries(['gl-hierarchy']);
      toast.success('GL account updated successfully');
      setEditingAccount(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to update GL account');
    }
  });

  const deleteAccountMutation = useMutation({
    mutationFn: glAccountsAPI.deleteAccount,
    onSuccess: () => {
      queryClient.invalidateQueries(['gl-accounts']);
      queryClient.invalidateQueries(['gl-hierarchy']);
      toast.success('GL account deleted successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to delete GL account');
    }
  });

  const createCategoryMutation = useMutation({
    mutationFn: glAccountsAPI.createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries(['gl-categories']);
      queryClient.invalidateQueries(['gl-hierarchy']);
      toast.success('GL category created successfully! You can now select it from the dropdown.');
      setShowCreateCategoryForm(false);
      
      // If there was a pending account form, reopen it
      if (pendingAccountForm) {
        setShowCreateForm(true);
        setPendingAccountForm(null);
      }
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to create GL category');
    }
  });

  const accounts = accountsData?.accounts || [];
  const categories = categoriesData?.categories || [];
  const hierarchy = hierarchyData?.hierarchy || [];

  // Filter accounts based on search term
  const filteredAccounts = accounts.filter(account => 
    account.account_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    account.account_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    account.category_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Toggle category expansion
  const toggleCategory = (categoryId) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  // Get accounts for a specific category
  const getAccountsForCategory = (categoryId) => {
    return filteredAccounts.filter(account => account.category_id === categoryId);
  };

  // Get account type color
  const getAccountTypeColor = (type) => {
    const colors = {
      asset: 'bg-green-100 text-green-800',
      liability: 'bg-red-100 text-red-800',
      equity: 'bg-blue-100 text-blue-800',
      revenue: 'bg-purple-100 text-purple-800',
      expense: 'bg-orange-100 text-orange-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  // Get normal balance color
  const getBalanceColor = (balance) => {
    return balance === 'debit' ? 'text-blue-600' : 'text-green-600';
  };

  if (accountsLoading || categoriesLoading || hierarchyLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900"><TranslatedText text="GL Account Management" /></h1>
          <p className="text-gray-600">Manage your chart of accounts and general ledger structure</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowCreateCategoryForm(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Category</span>
          </button>
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Account</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search accounts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Types</option>
            <option value="asset">Assets</option>
            <option value="liability">Liabilities</option>
            <option value="equity">Equity</option>
            <option value="revenue">Revenue</option>
            <option value="expense">Expenses</option>
          </select>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">Show Inactive</span>
          </label>
        </div>
      </div>

      {/* Account Hierarchy */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900"><TranslatedText text="Chart of Accounts" /></h2>
          <p className="text-sm text-gray-600">Hierarchical view of your GL accounts</p>
        </div>
        
        <div className="divide-y divide-gray-200">
          {hierarchy.map((category) => (
            <div key={category.id} className="p-4">
              {/* Category Header */}
              <div 
                className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded-lg"
                onClick={() => toggleCategory(category.id)}
              >
                <div className="flex items-center space-x-3">
                  {expandedCategories.has(category.id) ? (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  )}
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900">{category.code}</span>
                      <span className="text-gray-600">•</span>
                      <span className="text-gray-900">{category.name}</span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {category.account_count} account{category.account_count !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getAccountTypeColor(category.account_type)}`}>
                  {category.account_type}
                </span>
              </div>

              {/* Category Accounts */}
              {expandedCategories.has(category.id) && (
                <div className="mt-4 ml-8 space-y-2">
                  {getAccountsForCategory(category.id).map((account) => (
                    <div key={account.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-900">{account.account_code}</span>
                          <span className="text-gray-600">•</span>
                          <span className="text-gray-900">{account.account_name}</span>
                        </div>
                        {account.description && (
                          <div className="text-sm text-gray-500 mt-1">{account.description}</div>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <span className={`text-sm font-medium ${getBalanceColor(account.normal_balance)}`}>
                          {account.normal_balance}
                        </span>
                        
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setEditingAccount(account)}
                            className="p-1 text-gray-400 hover:text-blue-600"
                            title="Edit Account"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          
                          <button
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this account?')) {
                                deleteAccountMutation.mutate(account.id);
                              }
                            }}
                            className="p-1 text-gray-400 hover:text-red-600"
                            title="Delete Account"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {getAccountsForCategory(category.id).length === 0 && (
                    <div className="text-sm text-gray-500 italic">No accounts in this category</div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Create/Edit Account Modal */}
      {(showCreateForm || editingAccount) && (
        <GLAccountForm
          account={editingAccount}
          pendingFormData={pendingAccountForm}
          categories={categories}
          onClose={() => {
            setShowCreateForm(false);
            setEditingAccount(null);
            setPendingAccountForm(null);
          }}
          onCreateCategory={(formData) => {
            setPendingAccountForm(formData);
            setShowCreateForm(false);
            setEditingAccount(null);
            setShowCreateCategoryForm(true);
          }}
          onSubmit={(data) => {
            if (editingAccount) {
              updateAccountMutation.mutate({ id: editingAccount.id, data });
            } else {
              createAccountMutation.mutate(data);
            }
          }}
          loading={createAccountMutation.isPending || updateAccountMutation.isPending}
        />
      )}

      {/* Create Category Modal */}
      {showCreateCategoryForm && (
        <GLCategoryForm
          categories={categories}
          onClose={() => setShowCreateCategoryForm(false)}
          onSubmit={(data) => createCategoryMutation.mutate(data)}
          loading={createCategoryMutation.isPending}
        />
      )}
    </div>
  );
};

// GL Account Form Component
const GLAccountForm = ({ account, pendingFormData, categories, onClose, onCreateCategory, onSubmit, loading }) => {
  const [formData, setFormData] = useState({
    account_code: account?.account_code || pendingFormData?.account_code || '',
    account_name: account?.account_name || pendingFormData?.account_name || '',
    description: account?.description || pendingFormData?.description || '',
    category_id: account?.category_id || pendingFormData?.category_id || '',
    account_type: account?.account_type || pendingFormData?.account_type || 'expense',
    normal_balance: account?.normal_balance || pendingFormData?.normal_balance || 'debit'
  });

  const [errors, setErrors] = useState({});

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.account_code.trim()) {
      newErrors.account_code = 'Account code is required';
    }
    
    if (!formData.account_name.trim()) {
      newErrors.account_name = 'Account name is required';
    }
    
    if (!formData.category_id) {
      newErrors.category_id = 'Category is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {account ? 'Edit GL Account' : 'Create GL Account'}
          </h3>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account Code *
            </label>
            <input
              type="text"
              name="account_code"
              value={formData.account_code}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.account_code ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="e.g., 6201"
            />
            {errors.account_code && (
              <p className="text-red-500 text-xs mt-1">{errors.account_code}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account Name *
            </label>
            <input
              type="text"
              name="account_name"
              value={formData.account_name}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.account_name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="e.g., Office Rent"
            />
            {errors.account_name && (
              <p className="text-red-500 text-xs mt-1">{errors.account_name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows="2"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Optional description"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">
                Category *
              </label>
              <button
                type="button"
                onClick={() => onCreateCategory(formData)}
                className="text-xs text-green-600 hover:text-green-700 underline"
              >
                + Create New Category
              </button>
            </div>
            <select
              name="category_id"
              value={formData.category_id}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.category_id ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Select Category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.code} - {category.name}
                </option>
              ))}
            </select>
            {errors.category_id && (
              <p className="text-red-500 text-xs mt-1">{errors.category_id}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Account Type
              </label>
              <select
                name="account_type"
                value={formData.account_type}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="asset">Asset</option>
                <option value="liability">Liability</option>
                <option value="equity">Equity</option>
                <option value="revenue">Revenue</option>
                <option value="expense">Expense</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Normal Balance
              </label>
              <select
                name="normal_balance"
                value={formData.normal_balance}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="debit">Debit</option>
                <option value="credit">Credit</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : (account ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// GL Category Form Component
const GLCategoryForm = ({ categories, onClose, onSubmit, loading }) => {
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    account_type: 'expense',
    parent_id: '',
    level: 0,
    sort_order: 0
  });

  const [errors, setErrors] = useState({});

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.code.trim()) {
      newErrors.code = 'Category code is required';
    }
    
    if (!formData.name.trim()) {
      newErrors.name = 'Category name is required';
    }
    
    if (!formData.account_type) {
      newErrors.account_type = 'Account type is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  // Filter parent categories by account type
  const availableParents = categories.filter(cat => 
    cat.account_type === formData.account_type && !cat.parent_id
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900"><TranslatedText text="Create GL Category" /></h3>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category Code *
            </label>
            <input
              type="text"
              name="code"
              value={formData.code}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                errors.code ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="e.g., 6200"
            />
            {errors.code && (
              <p className="text-red-500 text-xs mt-1">{errors.code}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="e.g., Administrative Expenses"
            />
            {errors.name && (
              <p className="text-red-500 text-xs mt-1">{errors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows="2"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
              placeholder="Optional description"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account Type *
            </label>
            <select
              name="account_type"
              value={formData.account_type}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                errors.account_type ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="asset">Asset</option>
              <option value="liability">Liability</option>
              <option value="equity">Equity</option>
              <option value="revenue">Revenue</option>
              <option value="expense">Expense</option>
            </select>
            {errors.account_type && (
              <p className="text-red-500 text-xs mt-1">{errors.account_type}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Parent Category
            </label>
            <select
              name="parent_id"
              value={formData.parent_id}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="">No Parent (Top Level)</option>
              {availableParents.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.code} - {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Level
              </label>
              <input
                type="number"
                name="level"
                value={formData.level}
                onChange={handleInputChange}
                min="0"
                max="5"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sort Order
              </label>
              <input
                type="number"
                name="sort_order"
                value={formData.sort_order}
                onChange={handleInputChange}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GLAccountManagement;
