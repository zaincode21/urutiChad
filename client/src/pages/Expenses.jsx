import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Search,
  Filter,
  FileText,
  DollarSign,
  TrendingUp,
  Calendar,
  Edit,
  Trash2,
  Eye,
  BarChart3,
  Receipt,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { api, expensesAPI, shopsAPI } from '../lib/api';
import ExpenseForm from '../components/ExpenseForm';
import { useCurrencyConversion } from '../hooks/useCurrencyConversion';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

import TranslatedText from '../components/TranslatedText';
import { useTranslation } from '../hooks/useTranslation';

const Expenses = () => {
  const { tSync } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState(null);
  const [showRwfConversions, setShowRwfConversions] = useState(true);

  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { formatCurrency, convertToRwf, isLoading: conversionLoading, lastUpdated } = useCurrencyConversion();

  const { data: expensesData, isLoading } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => api.get('/expenses').then(res => res.data.expenses),
  });

  const { data: shopsData } = useQuery({
    queryKey: ['shops'],
    queryFn: () => shopsAPI.getAll().then(res => res.data),
  });

  const expenses = expensesData || [];
  const shops = shopsData?.shops || [];

  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = expense.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.category?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = selectedFilter === 'all' ||
      (selectedFilter === 'recurring' && expense.is_recurring) ||
      (selectedFilter === 'one-time' && !expense.is_recurring);
    return matchesSearch && matchesFilter;
  });

  const handleAddExpense = () => {
    setEditingExpense(null);
    setShowExpenseForm(true);
  };

  const handleEditExpense = (expense) => {
    setEditingExpense(expense);
    setShowExpenseForm(true);
  };

  const handleDeleteExpense = (expense) => {
    setExpenseToDelete(expense);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteExpense = async () => {
    try {
      await expensesAPI.delete(expenseToDelete.id);
      toast.success('Expense deleted successfully');
      queryClient.invalidateQueries(['expenses']);
      setShowDeleteConfirm(false);
      setExpenseToDelete(null);
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast.error('Failed to delete expense');
    }
  };

  const handleExpenseSuccess = () => {
    queryClient.invalidateQueries(['expenses']);
  };

  if (isLoading) {
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900"><TranslatedText text="Expenses" /></h1>
          <p className="text-gray-600 mt-2"><TranslatedText text="Track and manage your business expenses" /></p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-medium rounded-xl hover:from-green-600 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
            <Receipt className="h-5 w-5 mr-2" />
            <TranslatedText text="Upload Receipt" />
          </button>
          <button
            onClick={handleAddExpense}
            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-xl hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <Plus className="h-5 w-5 mr-2" />
            <TranslatedText text="Add Expense" />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="p-3 bg-red-100 rounded-xl">
              <FileText className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600"><TranslatedText text="Total Expenses" /></p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(
                  (expenses?.reduce((sum, e) => {
                    const rwfAmount = convertToRwf(e.amount, e.currency || 'CFA') || 0;
                    return sum + rwfAmount;
                  }, 0) || 0),
                  'CFA'
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="p-3 bg-orange-100 rounded-xl">
              <Calendar className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600"><TranslatedText text="This Month" /></p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(
                  (expenses?.filter(e => {
                    const expenseDate = new Date(e.expense_date);
                    const now = new Date();
                    return expenseDate.getMonth() === now.getMonth() &&
                      expenseDate.getFullYear() === now.getFullYear();
                  })?.reduce((sum, e) => {
                    const rwfAmount = convertToRwf(e.amount, e.currency || 'CFA') || 0;
                    return sum + rwfAmount;
                  }, 0) || 0),
                  'CFA'
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-xl">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600"><TranslatedText text="Recurring" /></p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(
                  (expenses?.filter(e => e.is_recurring)?.reduce((sum, e) => {
                    const rwfAmount = convertToRwf(e.amount, e.currency || 'CFA') || 0;
                    return sum + rwfAmount;
                  }, 0) || 0),
                  'CFA'
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-xl">
              <AlertTriangle className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600"><TranslatedText text="Categories" /></p>
              <p className="text-2xl font-bold text-gray-900">
                {new Set(expenses.map(e => e.category)).size}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Currency Conversion Status */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <DollarSign className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-blue-900"><TranslatedText text="Currency Conversion" /></h3>
              <p className="text-xs text-blue-700">
                {showRwfConversions ? <TranslatedText text="Showing amounts in CFA" /> : <TranslatedText text="CFA conversion hidden" />}
                {lastUpdated && (
                  <span className="ml-2">• <TranslatedText text="Updated at" /> {new Date(lastUpdated).toLocaleTimeString()}</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {conversionLoading && (
              <div className="flex items-center space-x-2 text-blue-600">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span className="text-sm"><TranslatedText text="Updating rates..." /></span>
              </div>
            )}
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={showRwfConversions}
                onChange={(e) => setShowRwfConversions(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm text-blue-700"><TranslatedText text="Show CFA" /></span>
            </label>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8">
        <div className="flex flex-col sm:flex-row gap-4 expenses-filters">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder={tSync("Search expenses...")}
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
              <option value="all">{tSync('All Expenses')}</option>
              <option value="recurring">{tSync('Recurring Only')}</option>
              <option value="one-time">{tSync('One-time Only')}</option>
            </select>
            <button className="inline-flex items-center px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <BarChart3 className="h-5 w-5 text-gray-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Expenses Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {filteredExpenses.map((expense) => (
          <div key={expense.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="p-6">
              {/* Expense Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-pink-600 rounded-xl flex items-center justify-center">
                    <FileText className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {expense.category}
                    </h3>
                    <div className="text-sm text-gray-500">
                      {expense.description}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleEditExpense(expense)}
                    className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteExpense(expense)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Expense Details */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600"><TranslatedText text="Amount" />:</span>
                  <div className="text-right">
                    <div className="font-semibold text-red-600">
                      {formatCurrency(
                        convertToRwf(expense.amount, expense.currency || 'CFA') || expense.amount,
                        'CFA'
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600"><TranslatedText text="Date" />:</span>
                  <span className="text-gray-900">
                    {new Date(expense.expense_date).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600"><TranslatedText text="Shop" />:</span>
                  <span className="text-gray-900">{expense.shop_name || 'All Shops'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600"><TranslatedText text="Currency" />:</span>
                  <span className="text-gray-900">CFA</span>
                </div>
              </div>

              {/* Recurring Badge */}
              {expense.is_recurring && (
                <div className="mt-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    <TranslatedText text="Recurring" /> ({expense.recurring_frequency})
                  </span>
                </div>
              )}

              {/* Actions */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                    <TranslatedText text="View Receipt" />
                  </button>
                  <button
                    onClick={() => handleEditExpense(expense)}
                    className="text-sm text-green-600 hover:text-green-700 font-medium"
                  >
                    <TranslatedText text="Edit" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredExpenses.length === 0 && (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2"><TranslatedText text="No expenses found" /></h3>
          <p className="text-gray-500 mb-6">
            {searchTerm || selectedFilter !== 'all'
              ? <TranslatedText text="Try adjusting your search or filters" />
              : <TranslatedText text="Get started by adding your first expense" />
            }
          </p>
          <button
            onClick={handleAddExpense}
            className="inline-flex items-center px-4 py-2 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            <Plus className="h-5 w-5 mr-2" />
            <TranslatedText text="Add First Expense" />
          </button>
        </div>
      )}

      {/* Expense Form Modal */}
      <ExpenseForm
        isOpen={showExpenseForm}
        onClose={() => {
          setShowExpenseForm(false);
          setEditingExpense(null);
        }}
        expense={editingExpense}
        onSuccess={handleExpenseSuccess}
        shops={shops}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4"><TranslatedText text="Delete Expense" /></h3>
              <p className="text-gray-600 mb-6">
                <TranslatedText text="Are you sure you want to delete" /> "{expenseToDelete?.description}"?
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setExpenseToDelete(null);
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50"
                >
                  <TranslatedText text="Cancel" />
                </button>
                <button
                  onClick={confirmDeleteExpense}
                  className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700"
                >
                  <TranslatedText text="Delete" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Expenses; 