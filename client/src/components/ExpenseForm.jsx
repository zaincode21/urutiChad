import React, { useState, useEffect } from 'react';
import { X, Upload, Calendar, DollarSign, Tag, FileText, Building, RefreshCw, Building2 } from 'lucide-react';
import { expensesAPI } from '../lib/api';
import toast from 'react-hot-toast';
import GLAccountSelector from './GLAccountSelector';
import CurrencyInput from './CurrencyInput';
import TranslatedText from './TranslatedText';
import { useTranslation } from '../hooks/useTranslation';

const ExpenseForm = ({ isOpen, onClose, expense = null, onSuccess, shops = [] }) => {
  const { translateBatch } = useTranslation();

  useEffect(() => {
    const placeholders = [
      'Enter expense description...',
      'Select Category',
      'All Shops'
    ];
    translateBatch(placeholders);
  }, []);
  const [formData, setFormData] = useState({
    category: '',
    description: '',
    amount: '',
    currency: 'CFA',
    expense_date: new Date().toISOString().split('T')[0],
    shop_id: '',
    receipt_url: '',
    is_recurring: false,
    recurring_frequency: 'monthly'
  });

  const [glAccounts, setGlAccounts] = useState([]);

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [categories, setCategories] = useState([]);

  // Common expense categories
  const defaultCategories = [
    'Rent & Utilities',
    'Inventory & Supplies',
    'Marketing & Advertising',
    'Employee Salaries',
    'Insurance',
    'Maintenance & Repairs',
    'Transportation',
    'Office Supplies',
    'Professional Services',
    'Other'
  ];

  useEffect(() => {
    if (expense) {
      setFormData({
        category: expense.category || '',
        description: expense.description || '',
        amount: expense.amount || '',
        currency: expense.currency || 'USD',
        expense_date: expense.expense_date ? new Date(expense.expense_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        shop_id: expense.shop_id || '',
        receipt_url: expense.receipt_url || '',
        is_recurring: expense.is_recurring || false,
        recurring_frequency: expense.recurring_frequency || 'monthly'
      });

      // Set GL accounts if they exist
      if (expense.gl_accounts && Array.isArray(expense.gl_accounts)) {
        setGlAccounts(expense.gl_accounts);
      } else {
        setGlAccounts([]);
      }
    } else {
      setGlAccounts([]);
    }
    fetchCategories();
  }, [expense]);

  const fetchCategories = async () => {
    try {
      const response = await expensesAPI.getCategories();
      if (response.data?.categories) {
        const categoryNames = response.data.categories.map(cat => cat.category);
        setCategories([...new Set([...defaultCategories, ...categoryNames])]);
      } else {
        setCategories(defaultCategories);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories(defaultCategories);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.category.trim()) {
      newErrors.category = 'Category is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Valid amount is required';
    }

    if (!formData.expense_date) {
      newErrors.expense_date = 'Expense date is required';
    }

    if (formData.is_recurring && !formData.recurring_frequency) {
      newErrors.recurring_frequency = 'Recurring frequency is required for recurring expenses';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const submitData = {
        ...formData,
        amount: parseFloat(formData.amount),
        shop_id: formData.shop_id || null,
        gl_accounts: glAccounts.length > 0 ? glAccounts : undefined
      };

      if (expense) {
        await expensesAPI.update(expense.id, submitData);
        toast.success('Expense updated successfully');
      } else {
        await expensesAPI.create(submitData);
        toast.success('Expense created successfully');
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving expense:', error);
      toast.error(error.response?.data?.error || 'Failed to save expense');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({
        category: '',
        description: '',
        amount: '',
        currency: 'USD',
        expense_date: new Date().toISOString().split('T')[0],
        shop_id: '',
        receipt_url: '',
        is_recurring: false,
        recurring_frequency: 'monthly'
      });
      setErrors({});
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            {expense ? <TranslatedText text="Edit Expense" /> : <TranslatedText text="Add New Expense" />}
          </h2>
          <button
            onClick={handleClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Category and Description Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Tag className="h-4 w-4 inline mr-2" />
                <TranslatedText text="Category" /> *
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.category ? 'border-red-500' : 'border-gray-300'
                  }`}
              >
                <option value=""><TranslatedText text="Select Category" /></option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              {errors.category && (
                <p className="text-red-500 text-sm mt-1">{errors.category}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Building className="h-4 w-4 inline mr-2" />
                <TranslatedText text="Shop (Optional)" />
              </label>
              <select
                name="shop_id"
                value={formData.shop_id}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value=""><TranslatedText text="All Shops" /></option>
                {shops.map((shop) => (
                  <option key={shop.id} value={shop.id}>
                    {shop.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FileText className="h-4 w-4 inline mr-2" />
              <TranslatedText text="Description" /> *
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
              placeholder="Enter expense description..."
              className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.description ? 'border-red-500' : 'border-gray-300'
                }`}
            />
            {errors.description && (
              <p className="text-red-500 text-sm mt-1">{errors.description}</p>
            )}
          </div>

          {/* Amount and Currency Row */}
          <div className="grid grid-cols-1 gap-4">
            <CurrencyInput
              label="Amount"
              value={formData.amount}
              onChange={(value) => setFormData({ ...formData, amount: value })}
              onCurrencyChange={(currency) => setFormData({ ...formData, currency })}
              placeholder="0.00"
              required
              defaultCurrency={formData.currency}
              targetCurrency="CFA"
              error={errors.amount}
              showConversion={true}
            />
          </div>

          {/* Date and Recurring Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="h-4 w-4 inline mr-2" />
                <TranslatedText text="Expense Date" /> *
              </label>
              <input
                type="date"
                name="expense_date"
                value={formData.expense_date}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.expense_date ? 'border-red-500' : 'border-gray-300'
                  }`}
              />
              {errors.expense_date && (
                <p className="text-red-500 text-sm mt-1">{errors.expense_date}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <RefreshCw className="h-4 w-4 inline mr-2" />
                <TranslatedText text="Recurring Expense" />
              </label>
              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="is_recurring"
                    checked={formData.is_recurring}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700"><TranslatedText text="Recurring" /></span>
                </label>

                {formData.is_recurring && (
                  <select
                    name="recurring_frequency"
                    value={formData.recurring_frequency}
                    onChange={handleInputChange}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="daily"><TranslatedText text="Daily" /></option>
                    <option value="weekly"><TranslatedText text="Weekly" /></option>
                    <option value="monthly"><TranslatedText text="Monthly" /></option>
                    <option value="yearly"><TranslatedText text="Yearly" /></option>
                  </select>
                )}
              </div>
              {errors.recurring_frequency && (
                <p className="text-red-500 text-sm mt-1">{errors.recurring_frequency}</p>
              )}
            </div>
          </div>

          {/* GL Account Allocation */}
          <div>
            <GLAccountSelector
              selectedAccounts={glAccounts}
              onAccountsChange={setGlAccounts}
              totalAmount={parseFloat(formData.amount) || 0}
              currency={formData.currency}
              disabled={loading}
            />
          </div>

          {/* Receipt URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Upload className="h-4 w-4 inline mr-2" />
              <TranslatedText text="Receipt URL (Optional)" />
            </label>
            <input
              type="url"
              name="receipt_url"
              value={formData.receipt_url}
              onChange={handleInputChange}
              placeholder="https://example.com/receipt.pdf"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
            >
              <TranslatedText text="Cancel" />
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-xl hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 flex items-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  <TranslatedText text="Saving..." />
                </>
              ) : (
                expense ? <TranslatedText text="Update Expense" /> : <TranslatedText text="Create Expense" />
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ExpenseForm; 
