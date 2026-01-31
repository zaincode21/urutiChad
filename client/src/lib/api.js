import axios from 'axios'
import toast from 'react-hot-toast'
import config from './config'

const api = axios.create({
  baseURL: config.api.baseURL,
  timeout: config.api.timeout,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    // Don't show error toasts for blob responses (like PDF downloads)
    const isBlob = error.config?.responseType === 'blob';

    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
      if (!isBlob) {
        toast.error('Session expired. Please login again.')
      }
    } else if (error.response?.data?.error && !isBlob) {
      toast.error(error.response.data.error)
    } else if (!isBlob) {
      toast.error('An error occurred. Please try again.')
    }
    return Promise.reject(error)
  }
)

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  logout: () => api.post('/auth/logout'),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.put('/auth/change-password', data),
}

// Products API
export const productsAPI = {
  getAll: (params) => api.get('/products', { params }),
  getById: (id) => api.get(`/products/${id}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
  getLowStock: () => api.get('/products/low-stock/alert'),
  bulkUpdate: (data) => api.post('/products/bulk-update', data),
  assignAllToShop: (data) => api.post('/products/assign-all-to-shop', data),
  unassignAllFromShop: (data) => api.post('/products/unassign-all-from-shop', data),
}

// Categories API
export const categoriesAPI = {
  getAll: () => api.get('/categories'),
  getById: (id) => api.get(`/categories/${id}`),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  delete: (id) => api.delete(`/categories/${id}`),
}

// Customers API
export const customersAPI = {
  getAll: (params) => api.get('/customers', { params }),
  getById: (id) => api.get(`/customers/${id}`),
  create: (data) => api.post('/customers', data),
  update: (id, data) => api.put(`/customers/${id}`, data),
  delete: (id) => api.delete(`/customers/${id}`),
  getOrders: (id, params) => api.get(`/customers/${id}/orders`, { params }),
}

// Orders API
export const ordersAPI = {
  getAll: (params) => api.get('/orders', { params }),
  getById: (id) => api.get(`/orders/${id}`),
  create: (data) => api.post('/orders', data),
  updatePayment: (id, data) => api.put(`/orders/${id}/payment`, data),
  updateStatus: (id, status) => api.put(`/orders/${id}/status`, { status }),
  getStats: (params) => api.get('/orders/stats/overview', { params }),
  getIncomeReport: (params) => api.get('/orders/income-report', { params }),
  getIncomeReportPDF: (params) => api.get('/orders/income-report/pdf', {
    params,
    responseType: 'blob'
  }),
  getIncomeReportExcel: (params) => api.get('/orders/income-report/excel', {
    params,
    responseType: 'blob'
  }),
}

// Inventory API
export const inventoryAPI = {
  getTransactions: (params) => api.get('/inventory/transactions', { params }),
  getLevels: (params) => api.get('/inventory/levels', { params }),
  // Manual product stock adjustment (product-level)
  adjustProductStock: (productId, data) => api.post(`/inventory/products/${productId}/adjust-stock`, data),
  // Assign stock to a location (shop or warehouse)
  assign: (data) => api.post('/inventory/assign', data),
  // Transfer stock between locations
  transfer: (data) => api.post('/inventory/transfer', data),
  // Get transfer history
  getTransfers: (params) => api.get('/inventory/transfers', { params }),
  // Update existing assignment
  updateAssignment: (assignmentId, data) => api.put(`/inventory/assignments/${assignmentId}`, data),
  // Delete assignment
  deleteAssignment: (assignmentId) => api.delete(`/inventory/assignments/${assignmentId}`),
  getStats: () => api.get('/inventory/stats'),
  bulkUpdate: (data) => api.post('/inventory/bulk-update', data),
  // Reassign product quantities based on sales
  reassignProduct: (data) => api.post('/inventory/reassign-product', data),
  // Update shop product quantity (for cashiers)
  updateShopProductQuantity: (data) => api.put('/inventory/shop-product-quantity', data),
}

// Currency API
export const currencyAPI = {
  getSupported: () => api.get('/currency/supported'),
  getRates: (params) => api.get('/currency/rates', { params }),
  getRwfRates: () => api.get('/currency/rwf-rates'),
  convert: (data) => api.post('/currency/convert', data),
  updateRates: (data) => api.post('/currency/update-rates', data),
  getStats: () => api.get('/currency/stats'),
}

// Dashboard API
export const dashboardAPI = {
  getOverview: (params) => api.get('/dashboard/overview', { params }),
  getSalesAnalytics: (params) => api.get('/dashboard/sales-analytics', { params }),
  getInventoryAnalytics: () => api.get('/dashboard/inventory-analytics'),
  getCustomerAnalytics: (params) => api.get('/dashboard/customer-analytics', { params }),
  getRevenueTrends: (params) => api.get('/dashboard/revenue-trends', { params }),
}

// Expenses API
export const expensesAPI = {
  getAll: (params) => api.get('/expenses', { params }),
  getById: (id) => api.get(`/expenses/${id}`),
  create: (data) => api.post('/expenses', data),
  update: (id, data) => api.put(`/expenses/${id}`, data),
  delete: (id) => api.delete(`/expenses/${id}`),
  getCategories: () => api.get('/expenses/categories/list'),
  getStats: (params) => api.get('/expenses/stats/overview', { params }),
  getVsRevenue: (params) => api.get('/expenses/stats/vs-revenue', { params }),
  bulkImport: (data) => api.post('/expenses/bulk-import', data),
  getByGLAccount: (glAccountId, params) => api.get(`/expenses/by-gl-account/${glAccountId}`, { params }),
  getGLSummary: (params) => api.get('/expenses/gl-summary', { params })
}

// GL Accounts API
export const glAccountsAPI = {
  getCategories: () => api.get('/gl-accounts/categories'),
  createCategory: (data) => api.post('/gl-accounts/categories', data),
  updateCategory: (id, data) => api.put(`/gl-accounts/categories/${id}`, data),
  deleteCategory: (id) => api.delete(`/gl-accounts/categories/${id}`),
  getAccounts: (params) => api.get('/gl-accounts/accounts', { params }),
  getAccountById: (id) => api.get(`/gl-accounts/accounts/${id}`),
  createAccount: (data) => api.post('/gl-accounts/accounts', data),
  updateAccount: (id, data) => api.put(`/gl-accounts/accounts/${id}`, data),
  deleteAccount: (id) => api.delete(`/gl-accounts/accounts/${id}`),
  getHierarchy: () => api.get('/gl-accounts/hierarchy'),
  getBalances: (params) => api.get('/gl-accounts/balances', { params })
};

// Financial Reports API (Professional)
export const financialReportsAPI = {
  getTrialBalance: (params) => api.get('/financial-reports/trial-balance', { params }),
  getIncomeStatement: (params) => api.get('/financial-reports/income-statement', { params }),
  getBalanceSheet: (params) => api.get('/financial-reports/balance-sheet', { params }),
  getCashFlow: (params) => api.get('/financial-reports/cash-flow', { params }),
  getAccountBalances: (accountId, params) => api.get(`/financial-reports/account-balances/${accountId}`, { params }),
  getSummary: (params) => api.get('/financial-reports/summary', { params }),
  getDailySales: (params) => api.get('/financial-reports/daily-sales', { params }),
  getDailyExpenses: (params) => api.get('/financial-reports/daily-expenses', { params }),
  getMonthlySales: (params) => api.get('/financial-reports/monthly-sales', { params }),
  getMonthlyExpenses: (params) => api.get('/financial-reports/monthly-expenses', { params }),
  getYearlySales: (params) => api.get('/financial-reports/yearly-sales', { params }),
  getYearlyExpenses: (params) => api.get('/financial-reports/yearly-expenses', { params })
};

// Shops API
export const shopsAPI = {
  getAll: (params) => api.get('/shops', { params }),
  getById: (id) => api.get(`/shops/${id}`),
  create: (data) => api.post('/shops', data),
  update: (id, data) => api.put(`/shops/${id}`, data),
  delete: (id) => api.delete(`/shops/${id}`),
}

// Sales Analytics API
export const salesAnalyticsAPI = {
  getOverview: (params) => api.get('/sales-analytics/overview', { params }),
  getPerformance: (params) => api.get('/sales-analytics/performance', { params }),
  getTrends: (params) => api.get('/sales-analytics/trends', { params }),
  getTopProducts: (params) => api.get('/sales-analytics/top-products', { params }),
  getRevenueByPeriod: (params) => api.get('/sales-analytics/revenue-by-period', { params }),
}

// Notifications API
export const notificationsAPI = {
  getAnalytics: () => api.get('/notifications/analytics'),
  getTemplates: () => api.get('/notifications/templates'),
  getCampaigns: () => api.get('/notifications/campaigns'),
  getTriggers: () => api.get('/notifications/triggers'),
  createTemplate: (data) => api.post('/notifications/templates', data),
  updateTemplate: (id, data) => api.put(`/notifications/templates/${id}`, data),
  deleteTemplate: (id) => api.delete(`/notifications/templates/${id}`),
  createCampaign: (data) => api.post('/notifications/campaigns', data),
  updateCampaign: (id, data) => api.put(`/notifications/campaigns/${id}`, data),
  deleteCampaign: (id) => api.delete(`/notifications/campaigns/${id}`),
  sendTest: (data) => api.post('/notifications/send-test', data),
}

// Loyalty API
export const loyaltyAPI = {
  getStats: () => api.get('/loyalty/stats'),
  getCustomer: (customerId) => api.get(`/loyalty/customer/${customerId}`),
  addPoints: (data) => api.post('/loyalty/points/add', data),
  redeemPoints: (data) => api.post('/loyalty/points/redeem', data),
  getTiers: () => api.get('/loyalty/tiers'),
  createTier: (data) => api.post('/loyalty/tiers', data),
  updateTier: (id, data) => api.put(`/loyalty/tiers/${id}`, data),
  deleteTier: (id) => api.delete(`/loyalty/tiers/${id}`),
}

// Settings API
export const settingsAPI = {
  getAppearance: () => api.get('/settings/appearance'),
  updateAppearance: (data) => api.put('/settings/appearance', data),
  uploadAsset: (formData) => api.post('/settings/upload-asset', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getGeneral: () => api.get('/settings/general'),
  updateGeneral: (data) => api.put('/settings/general', data),
}

// Users API
export const usersAPI = {
  getAll: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  getRoles: () => api.get('/users/roles'),
  updateRole: (id, data) => api.put(`/users/${id}/role`, data),
}

// Invoices API
export const invoicesAPI = {
  getPreview: (orderId) => api.get(`/invoices/${orderId}/preview`),
  generate: (orderId, options) => api.get(`/invoices/${orderId}/invoice`, {
    params: options,
    responseType: 'blob'
  }),
  download: (orderId, options) => api.get(`/invoices/${orderId}/download`, {
    params: options,
    responseType: 'blob'
  }),
  print: (orderId, options) => api.get(`/invoices/${orderId}/print`, {
    params: options,
    responseType: 'blob'
  }),
}

// Pricing API
export const pricingAPI = {
  getStrategies: () => api.get('/pricing/strategies'),
  calculateBulk: (data) => api.post('/pricing/calculate/bulk', data),
  updateBulk: (data) => api.put('/pricing/update/bulk', data),
  getAnalysis: (params) => api.get('/pricing/analysis', { params }),
  getRecommendations: (params) => api.get('/pricing/recommendations', { params }),
}

// Integrations API
export const integrationsAPI = {
  getAll: (params) => api.get('/integrations', { params }),
  getById: (id) => api.get(`/integrations/${id}`),
  create: (data) => api.post('/integrations', data),
  update: (id, data) => api.put(`/integrations/${id}`, data),
  delete: (id) => api.delete(`/integrations/${id}`),
  test: (id) => api.post(`/integrations/${id}/test`),
  execute: (id, data) => api.post(`/integrations/${id}/execute`, data),
  getAnalytics: () => api.get('/integrations/analytics'),
}

// SMART BOTTLING API - COMMENTED OUT
// Advanced recipe-based bottling system with:
// - Recipe management (Bill of Materials)
// - Raw materials inventory management
// - Material forecasting and analytics
// - Low stock alerts
// - Production planning and optimization
// - Currency conversion (USD to CFA)
// Uncomment the block below to enable Smart Bottling API
/*
export const smartBottlingAPI = {
  getStats: () => api.get('/smart-bottling/stats'),
  getRawMaterials: () => api.get('/smart-bottling/raw-materials'),
  createRawMaterial: (data) => api.post('/smart-bottling/raw-materials', data),
  updateRawMaterial: (id, data) => api.put(`/smart-bottling/raw-materials/${id}`, data),
  deleteRawMaterial: (id) => api.delete(`/smart-bottling/raw-materials/${id}`),
  getRecipes: () => api.get('/smart-bottling/recipes'),
  createRecipe: (data) => api.post('/smart-bottling/recipes', data),
  updateRecipe: (id, data) => api.put(`/smart-bottling/recipes/${id}`, data),
  deleteRecipe: (id) => api.delete(`/smart-bottling/recipes/${id}`),
  getBatches: () => api.get('/smart-bottling/batches'),
  createBatch: (data) => api.post('/smart-bottling/batch', data),
  updateBatch: (id, data) => api.put(`/smart-bottling/batches/${id}`, data),
  deleteBatch: (id) => api.delete(`/smart-bottling/batches/${id}`),
  getForecast: () => api.get('/smart-bottling/forecast'),
  getLowStockAlerts: () => api.get('/smart-bottling/low-stock-alerts'),
  getPopularSizes: () => api.get('/smart-bottling/popular-sizes'),
}
*/

// Procurement API
export const procurementAPI = {
  getSuppliers: () => api.get('/procurement/suppliers'),
  getSupplierMaterials: () => api.get('/procurement/supplier-materials'),
  getPurchaseOrders: () => api.get('/procurement/purchase-orders'),
  createSupplier: (data) => api.post('/procurement/suppliers', data),
  updateSupplier: (id, data) => api.put(`/procurement/suppliers/${id}`, data),
  deleteSupplier: (id) => api.delete(`/procurement/suppliers/${id}`),
  createPurchaseOrder: (data) => api.post('/procurement/purchase-orders', data),
  updatePurchaseOrder: (id, data) => api.put(`/procurement/purchase-orders/${id}`, data),
  deletePurchaseOrder: (id) => api.delete(`/procurement/purchase-orders/${id}`),
}

// Perfume API
export const perfumeAPI = {
  getBottleSizes: () => api.get('/perfume/bottle-sizes'),
  createBottleSize: (data) => api.post('/perfume/bottle-sizes', data),
  updateBottleSize: (id, data) => api.put(`/perfume/bottle-sizes/${id}`, data),
  deleteBottleSize: (id) => api.delete(`/perfume/bottle-sizes/${id}`),
  getBulk: (params) => api.get('/perfume/bulk', { params }),
  createBulk: (data) => api.post('/perfume/bulk', data),
  updateBulk: (id, data) => api.put(`/perfume/bulk/${id}`, data),
  deleteBulk: (id) => api.delete(`/perfume/bulk/${id}`),
  bottle: (data) => api.post('/perfume/bottle', data),
  bottleAllSizes: (data) => api.post('/perfume/bottle-all-sizes', data),
  bottleAllBulk: (data) => api.post('/perfume/bottle-all-bulk', data),
  returnShopInventory: () => api.post('/perfume/return-shop-inventory'),
  getRecipes: () => api.get('/perfume/recipes'),
  createRecipe: (data) => api.post('/perfume/recipes', data),
  updateRecipe: (id, data) => api.put(`/perfume/recipes/${id}`, data),
  deleteRecipe: (id) => api.delete(`/perfume/recipes/${id}`),
}

// Discounts API
export const discountsAPI = {
  getAll: (params) => api.get('/discounts', { params }),
  getById: (id) => api.get(`/discounts/${id}`),
  create: (data) => api.post('/discounts', data),
  update: (id, data) => api.put(`/discounts/${id}`, data),
  delete: (id) => api.delete(`/discounts/${id}`),
  getTypes: () => api.get('/discounts/types'),
  getStats: () => api.get('/discounts/stats'),
}

// Brands API
export const brandsAPI = {
  getAll: (params) => api.get('/brands', { params }),
  getById: (id) => api.get(`/brands/${id}`),
  create: (data) => api.post('/brands', data),
  update: (id, data) => api.put(`/brands/${id}`, data),
  delete: (id) => api.delete(`/brands/${id}`),
  getStats: () => api.get('/brands/stats'),
}

// Measurements API
export const measurementsAPI = {
  getByCustomerId: (customerId) => api.get(`/measurements/customer/${customerId}`),
  getByOrderId: (orderId) => api.get(`/measurements/order/${orderId}`),
  create: (data) => api.post('/measurements', data),
  update: (id, data) => api.put(`/measurements/${id}`, data),
  delete: (id) => api.delete(`/measurements/${id}`),
}

export { api } 