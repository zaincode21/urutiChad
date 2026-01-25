import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Plus,
  Search,
  Filter,
  Award,
  Users,
  TrendingUp,
  DollarSign,
  Star,
  Edit,
  Trash2,
  Eye,
  BarChart3,
  Crown,
  Gift
} from 'lucide-react';
import { api } from '../lib/api';
import { customersAPI } from '../lib/api';
import TranslatedText from '../components/TranslatedText';
import { useTranslation } from '../hooks/useTranslation';

const Loyalty = () => {
  const { tSync } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');

  const { data: customersData, isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: () => customersAPI.getAll().then(res => res.data.customers),
  });

  const customers = customersData || [];

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = customer.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = selectedFilter === 'all' ||
      (selectedFilter === 'gold' && customer.loyalty_tier === 'gold') ||
      (selectedFilter === 'silver' && customer.loyalty_tier === 'silver') ||
      (selectedFilter === 'bronze' && customer.loyalty_tier === 'bronze');
    return matchesSearch && matchesFilter;
  });

  const getTierColor = (tier) => {
    switch (tier) {
      case 'gold': return 'from-yellow-400 to-yellow-600';
      case 'silver': return 'from-gray-400 to-gray-600';
      case 'bronze': return 'from-orange-400 to-orange-600';
      default: return 'from-gray-400 to-gray-600';
    }
  };

  const getTierIcon = (tier) => {
    switch (tier) {
      case 'gold': return <Crown className="h-4 w-4" />;
      case 'silver': return <Star className="h-4 w-4" />;
      case 'bronze': return <Award className="h-4 w-4" />;
      default: return <Award className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded-lg mb-6 w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl p-6 shadow-sm">
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                  <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900"><TranslatedText text="Loyalty Program" /></h1>
              <p className="text-gray-600 mt-2">{tSync('Customer loyalty tiers and points management')}</p>
            </div>
            <div className="flex gap-3">
              <button className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-600 text-white font-medium rounded-xl hover:from-yellow-600 hover:to-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
                <Gift className="h-5 w-5 mr-2" />
                {tSync('Manage Rewards')}
              </button>
              <button className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-xl hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
                <Plus className="h-5 w-5 mr-2" />
                {tSync('Add Customer')}
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-100 rounded-xl">
                <Award className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{tSync('Total Members')}</p>
                <p className="text-2xl font-bold text-gray-900">{customers.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-100 rounded-xl">
                <Crown className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{tSync('Gold Members')}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {customers.filter(c => c.loyalty_tier === 'gold').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center">
              <div className="p-3 bg-gray-100 rounded-xl">
                <Star className="h-6 w-6 text-gray-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{tSync('Silver Members')}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {customers.filter(c => c.loyalty_tier === 'silver').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center">
              <div className="p-3 bg-orange-100 rounded-xl">
                <Award className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{tSync('Total Points')}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {customers.reduce((sum, c) => sum + (c.loyalty_points || 0), 0).toLocaleString()}
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
                  placeholder={tSync('Search customers by name or email...')}
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
                <option value="all">{tSync('All Tiers')}</option>
                <option value="gold">{tSync('Gold')}</option>
                <option value="silver">{tSync('Silver')}</option>
                <option value="bronze">{tSync('Bronze')}</option>
              </select>
              <button className="inline-flex items-center px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <BarChart3 className="h-5 w-5 text-gray-400" />
              </button>
            </div>
          </div>
        </div>

        {/* Customers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCustomers.map((customer) => (
            <div key={customer.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="p-6">
                {/* Customer Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <div className={`w-12 h-12 bg-gradient-to-r ${getTierColor(customer.loyalty_tier)} rounded-xl flex items-center justify-center`}>
                      {getTierIcon(customer.loyalty_tier)}
                    </div>
                    <div className="ml-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {customer.first_name} {customer.last_name}
                      </h3>
                      <div className="text-sm text-gray-500">
                        {customer.email}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                      <Eye className="h-4 w-4" />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                      <Edit className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Customer Details */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{tSync('Loyalty Tier:')}</span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${customer.loyalty_tier === 'gold' ? 'bg-yellow-100 text-yellow-800' :
                      customer.loyalty_tier === 'silver' ? 'bg-gray-100 text-gray-800' :
                        'bg-orange-100 text-orange-800'
                      }`}>
                      {getTierIcon(customer.loyalty_tier)}
                      <span className="ml-1">{customer.loyalty_tier}</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{tSync('Points:')}</span>
                    <span className="font-semibold text-gray-900">{customer.loyalty_points || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{tSync('Total Spent:')}</span>
                    <span className="font-semibold text-gray-900">${customer.total_spent || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{tSync('Phone:')}</span>
                    <span className="text-gray-900">{customer.phone}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                      {tSync('View History')}
                    </button>
                    <button className="text-sm text-green-600 hover:text-green-700 font-medium">
                      {tSync('Add Points')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredCustomers.length === 0 && (
          <div className="text-center py-12">
            <Award className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2"><TranslatedText text="No customers found" /></h3>
            <p className="text-gray-500 mb-6">
              {searchTerm || selectedFilter !== 'all'
                ? tSync('Try adjusting your search or filter criteria.')
                : tSync('Get started by adding your first loyalty member.')
              }
            </p>
            <button className="inline-flex items-center px-4 py-2 bg-yellow-600 text-white font-medium rounded-xl hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500">
              <Plus className="h-5 w-5 mr-2" />
              {tSync('Add First Member')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Loyalty; 