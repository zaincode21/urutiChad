import React, { useState, useEffect } from 'react';
import { ChevronDown, Plus, X, Building2, Calculator } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { glAccountsAPI } from '../lib/api';
import TranslatedText from './TranslatedText';

const GLAccountSelector = ({ 
  selectedAccounts = [], 
  onAccountsChange, 
  totalAmount = 0,
  currency = 'USD',
  disabled = false 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  // Fetch GL accounts
  const { data: glAccountsData, isLoading: accountsLoading } = useQuery({
    queryKey: ['gl-accounts', filterType],
    queryFn: () => glAccountsAPI.getAccounts({ account_type: filterType === 'all' ? undefined : filterType }),
    staleTime: 300000, // 5 minutes
  });

  // Fetch GL categories for filtering
  const { data: glCategoriesData, isLoading: categoriesLoading } = useQuery({
    queryKey: ['gl-categories'],
    queryFn: () => glAccountsAPI.getCategories(),
    staleTime: 300000, // 5 minutes
  });

  const glAccounts = glAccountsData?.accounts || [];
  const glCategories = glCategoriesData?.categories || [];

  // Filter accounts based on search term
  const filteredAccounts = glAccounts.filter(account => 
    account.account_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    account.account_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    account.category_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate total allocated amount
  const totalAllocated = selectedAccounts.reduce((sum, account) => sum + (account.amount || 0), 0);
  const remainingAmount = totalAmount - totalAllocated;

  // Add account to selection
  const addAccount = (account) => {
    if (selectedAccounts.find(a => a.gl_account_id === account.id)) {
      return; // Already selected
    }

    const newAccount = {
      gl_account_id: account.id,
      account_code: account.account_code,
      account_name: account.account_name,
      category_name: account.category_name,
      amount: remainingAmount > 0 ? Math.min(remainingAmount, totalAmount) : 0,
      allocation_percentage: remainingAmount > 0 ? Math.min((remainingAmount / totalAmount) * 100, 100) : 0,
      notes: ''
    };

    onAccountsChange([...selectedAccounts, newAccount]);
    setIsOpen(false);
    setSearchTerm('');
  };

  // Remove account from selection
  const removeAccount = (accountId) => {
    onAccountsChange(selectedAccounts.filter(a => a.gl_account_id !== accountId));
  };

  // Update account amount
  const updateAccountAmount = (accountId, amount) => {
    const newAmount = Math.max(0, Math.min(amount, totalAmount));
    const percentage = totalAmount > 0 ? (newAmount / totalAmount) * 100 : 0;
    
    onAccountsChange(selectedAccounts.map(account => 
      account.gl_account_id === accountId 
        ? { ...account, amount: newAmount, allocation_percentage: percentage }
        : account
    ));
  };

  // Update account notes
  const updateAccountNotes = (accountId, notes) => {
    onAccountsChange(selectedAccounts.map(account => 
      account.gl_account_id === accountId 
        ? { ...account, notes }
        : account
    ));
  };

  // Auto-allocate remaining amount
  const autoAllocate = () => {
    if (selectedAccounts.length === 0 || remainingAmount <= 0) return;

    const accounts = [...selectedAccounts];
    const amountPerAccount = remainingAmount / accounts.length;
    
    accounts.forEach(account => {
      account.amount = (account.amount || 0) + amountPerAccount;
      account.allocation_percentage = (account.amount / totalAmount) * 100;
    });

    onAccountsChange(accounts);
  };

  // Clear all allocations
  const clearAllocations = () => {
    onAccountsChange([]);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Building2 className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900"><TranslatedText text="GL Account Allocation" /></h3>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <span>Total: {currency} {totalAmount.toFixed(2)}</span>
          <span>•</span>
          <span>Allocated: {currency} {totalAllocated.toFixed(2)}</span>
          <span>•</span>
          <span className={remainingAmount < 0 ? 'text-red-600 font-medium' : ''}>
            Remaining: {currency} {remainingAmount.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Selected Accounts */}
      {selectedAccounts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-700">Allocated Accounts</h4>
            <div className="flex space-x-2">
              <button
                onClick={autoAllocate}
                disabled={remainingAmount <= 0}
                className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Auto-allocate
              </button>
              <button
                onClick={clearAllocations}
                className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded-md hover:bg-red-200"
              >
                Clear All
              </button>
            </div>
          </div>
          
          {selectedAccounts.map((account, index) => (
            <div key={account.gl_account_id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-900">{account.account_code}</span>
                    <span className="text-sm text-gray-600">•</span>
                    <span className="text-sm text-gray-900">{account.account_name}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{account.category_name}</div>
                </div>
                <button
                  onClick={() => removeAccount(account.gl_account_id)}
                  disabled={disabled}
                  className="text-gray-400 hover:text-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Amount ({currency})
                  </label>
                  <input
                    type="number"
                    value={account.amount || 0}
                    onChange={(e) => updateAccountAmount(account.gl_account_id, parseFloat(e.target.value) || 0)}
                    disabled={disabled}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                    step="0.01"
                    min="0"
                    max={totalAmount}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Allocation %
                  </label>
                  <input
                    type="number"
                    value={account.allocation_percentage?.toFixed(2) || 0}
                    onChange={(e) => {
                      const percentage = parseFloat(e.target.value) || 0;
                      const amount = (percentage / 100) * totalAmount;
                      updateAccountAmount(account.gl_account_id, amount);
                    }}
                    disabled={disabled}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                    step="0.01"
                    min="0"
                    max="100"
                  />
                </div>
              </div>
              
              <div className="mt-3">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  value={account.notes || ''}
                  onChange={(e) => updateAccountNotes(account.gl_account_id, e.target.value)}
                  disabled={disabled}
                  placeholder="Optional notes for this allocation"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Account Button */}
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={disabled}
          className="w-full px-4 py-3 text-left bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Plus className="h-5 w-5 text-gray-400" />
              <span className="text-gray-700">Add GL Account</span>
            </div>
            <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-96 overflow-hidden">
            {/* Search and Filters */}
            <div className="p-3 border-b border-gray-200">
              <div className="flex space-x-2 mb-3">
                <input
                  type="text"
                  placeholder="Search accounts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Types</option>
                  <option value="expense">Expense</option>
                  <option value="asset">Asset</option>
                  <option value="liability">Liability</option>
                  <option value="equity">Equity</option>
                  <option value="revenue">Revenue</option>
                </select>
              </div>
            </div>

            {/* Account List */}
            <div className="max-h-64 overflow-y-auto">
              {accountsLoading ? (
                <div className="p-4 text-center text-gray-500">Loading accounts...</div>
              ) : filteredAccounts.length === 0 ? (
                <div className="p-4 text-center text-gray-500">No accounts found</div>
              ) : (
                filteredAccounts.map((account) => (
                  <button
                    key={account.id}
                    onClick={() => addAccount(account)}
                    disabled={selectedAccounts.find(a => a.gl_account_id === account.id)}
                    className="w-full p-3 text-left hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed border-b border-gray-100 last:border-b-0"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-900">{account.account_code}</span>
                          <span className="text-sm text-gray-600">•</span>
                          <span className="text-sm text-gray-900">{account.account_name}</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{account.category_name}</div>
                      </div>
                      <div className="text-xs text-gray-400">
                        {account.account_type}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Validation Messages */}
      {remainingAmount < 0 && (
        <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200">
          <strong>Warning:</strong> Total allocated amount exceeds expense amount by {currency} {Math.abs(remainingAmount).toFixed(2)}
        </div>
      )}
      
      {remainingAmount > 0 && selectedAccounts.length > 0 && (
        <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-md border border-amber-200">
          <strong>Note:</strong> {currency} {remainingAmount.toFixed(2)} remains unallocated
        </div>
      )}
    </div>
  );
};

export default GLAccountSelector;
