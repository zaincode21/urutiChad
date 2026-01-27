import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SidebarProvider, useSidebar } from './contexts/SidebarContext';

import Navigation from './components/Navigation';
import TopNavigation from './components/TopNavigation';
import RoleBasedRoute from './components/RoleBasedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Customers from './pages/Customers';
import Orders from './pages/Orders';
import CreateOrder from './pages/CreateOrder';
import AtelierOrders from './pages/AtelierOrders';
import AtelierMaterials from './pages/AtelierMaterials';
import SalesDashboard from './pages/SalesDashboard';
import Shops from './pages/Shops';
import Perfumes from './pages/Perfumes';
// SMART BOTTLING - COMMENTED OUT (Advanced recipe-based bottling system)
// Features: Recipe management, raw materials inventory, forecasting, analytics
// Uncomment if you need: Production-scale operations, detailed cost tracking, material forecasting
// import SmartBottling from './pages/SmartBottling';
import Production from './pages/Production';
import Notifications from './pages/Notifications';
import Integrations from './pages/Integrations';
import Inventory from './pages/Inventory';
import Stocks from './pages/Stocks';
import Loyalty from './pages/Loyalty';
import Layaway from './pages/Layaway';
import Expenses from './pages/Expenses';
import GLAccounts from './pages/GLAccounts';
import Analytics from './pages/Analytics';
import IncomeReport from './pages/IncomeReport';
import Settings from './pages/Settings';
import Categories from './pages/Categories';
import Brands from './pages/Brands';
import Discounts from './pages/Discounts';
import PricingManagement from './pages/PricingManagement';
import TranslationDemo from './pages/TranslationDemo';
import Cars from './pages/Cars';
import './index.css';

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Layout Component
const Layout = ({ children }) => {
  const { isDesktopSidebarOpen } = useSidebar();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className={`transition-all duration-300 ease-in-out ${isDesktopSidebarOpen ? 'lg:pl-64' : 'lg:pl-0'}`}>
        <TopNavigation />
        <main className="flex-1 px-2 sm:px-4 lg:px-6 xl:px-8 pb-4 sm:pb-6">
          {children}
        </main>
      </div>
    </div>
  );
};

// Main App Component
const AppContent = () => {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/login"
        element={
          user ? (
            user.role === 'cashier' ? <Navigate to="/orders/create" replace /> :
              user.role === 'manager' ? <Navigate to="/stocks" replace /> :
                <Navigate to="/dashboard" replace />
          ) : <Login />
        }
      />

      {/* Protected Routes */}
      <Route path="/" element={
        user?.role === 'cashier' ? <Navigate to="/orders/create" replace /> :
          user?.role === 'manager' ? <Navigate to="/stocks" replace /> :
            <Navigate to="/dashboard" replace />
      } />

      <Route
        path="/dashboard"
        element={
          <RoleBasedRoute allowedRoles={['admin', 'inventory']} fallbackPath="/stocks">
            <Layout>
              <Dashboard />
            </Layout>
          </RoleBasedRoute>
        }
      />

      <Route
        path="/products"
        element={
          <RoleBasedRoute allowedRoles={['admin', 'inventory', 'manager']} fallbackPath="/stocks">
            <Layout>
              <Products />
            </Layout>
          </RoleBasedRoute>
        }
      />

      <Route
        path="/categories"
        element={
          <RoleBasedRoute allowedRoles={['admin', 'manager']} fallbackPath="/stocks">
            <Layout>
              <Categories />
            </Layout>
          </RoleBasedRoute>
        }
      />

      <Route
        path="/brands"
        element={
          <RoleBasedRoute allowedRoles={['admin', 'manager']} fallbackPath="/stocks">
            <Layout>
              <Brands />
            </Layout>
          </RoleBasedRoute>
        }
      />

      <Route
        path="/customers"
        element={
          <RoleBasedRoute allowedRoles={['admin', 'cashier']}>
            <Layout>
              <Customers />
            </Layout>
          </RoleBasedRoute>
        }
      />

      <Route
        path="/sales-dashboard"
        element={
          <RoleBasedRoute allowedRoles={['admin', 'manager', 'inventory']} fallbackPath="/orders/create">
            <Layout>
              <SalesDashboard />
            </Layout>
          </RoleBasedRoute>
        }
      />

      <Route
        path="/orders"
        element={
          <RoleBasedRoute allowedRoles={['admin', 'cashier']}>
            <Layout>
              <Orders />
            </Layout>
          </RoleBasedRoute>
        }
      />

      <Route
        path="/orders/create"
        element={
          <RoleBasedRoute allowedRoles={['admin', 'cashier']}>
            <CreateOrder />
          </RoleBasedRoute>
        }
      />

      <Route
        path="/orders/atelier"
        element={
          <RoleBasedRoute allowedRoles={['admin', 'cashier']}>
            <Layout>
              <AtelierOrders />
            </Layout>
          </RoleBasedRoute>
        }
      />



      <Route
        path="/atelier/materials"
        element={
          <RoleBasedRoute allowedRoles={['admin', 'manager', 'inventory']}>
            <Layout>
              <AtelierMaterials />
            </Layout>
          </RoleBasedRoute>
        }
      />

      <Route
        path="/shops"
        element={
          <RoleBasedRoute allowedRoles={['admin']}>
            <Layout>
              <Shops />
            </Layout>
          </RoleBasedRoute>
        }
      />

      <Route
        path="/perfumes"
        element={
          <RoleBasedRoute allowedRoles={['admin', 'manager', 'inventory']}>
            <Layout>
              <Perfumes />
            </Layout>
          </RoleBasedRoute>
        }
      />

      <Route
        path="/cars"
        element={
          <RoleBasedRoute allowedRoles={['admin', 'manager', 'cashier']} fallbackPath="/dashboard">
            <Layout>
              <Cars />
            </Layout>
          </RoleBasedRoute>
        }
      />

      {/* SMART BOTTLING ROUTE - COMMENTED OUT */}
      {/* Uncomment the route below to enable Smart Bottling system */}
      {/* 
      <Route 
        path="/smart-bottling" 
        element={
          <RoleBasedRoute allowedRoles={['admin', 'inventory']}>
            <Layout>
              <SmartBottling />
            </Layout>
          </RoleBasedRoute>
        } 
      />
      */}

      <Route
        path="/production"
        element={
          <RoleBasedRoute allowedRoles={['admin', 'inventory']}>
            <Layout>
              <Production />
            </Layout>
          </RoleBasedRoute>
        }
      />

      <Route
        path="/production/:tab"
        element={
          <RoleBasedRoute allowedRoles={['admin', 'inventory']}>
            <Layout>
              <Production />
            </Layout>
          </RoleBasedRoute>
        }
      />

      <Route
        path="/inventory"
        element={
          <RoleBasedRoute allowedRoles={['admin', 'inventory']}>
            <Layout>
              <Inventory />
            </Layout>
          </RoleBasedRoute>
        }
      />

      <Route
        path="/inventory/:tab"
        element={
          <RoleBasedRoute allowedRoles={['admin', 'inventory']}>
            <Layout>
              <Inventory />
            </Layout>
          </RoleBasedRoute>
        }
      />

      <Route
        path="/stocks"
        element={
          <RoleBasedRoute allowedRoles={['admin', 'manager', 'inventory']}>
            <Layout>
              <Stocks />
            </Layout>
          </RoleBasedRoute>
        }
      />

      <Route
        path="/notifications"
        element={
          <RoleBasedRoute allowedRoles={['admin', 'cashier']}>
            <Layout>
              <Notifications />
            </Layout>
          </RoleBasedRoute>
        }
      />

      <Route
        path="/integrations"
        element={
          <ProtectedRoute>
            <Layout>
              <Integrations />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/loyalty"
        element={
          <ProtectedRoute>
            <Layout>
              <Loyalty />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/layaway"
        element={
          <ProtectedRoute>
            <Layout>
              <Layaway />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/discounts"
        element={
          <ProtectedRoute>
            <Layout>
              <Discounts />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/expenses"
        element={
          <RoleBasedRoute allowedRoles={['admin', 'cashier']}>
            <Layout>
              <Expenses />
            </Layout>
          </RoleBasedRoute>
        }
      />

      <Route
        path="/gl-accounts"
        element={
          <RoleBasedRoute allowedRoles={['admin', 'manager']}>
            <Layout>
              <GLAccounts />
            </Layout>
          </RoleBasedRoute>
        }
      />

      <Route
        path="/analytics"
        element={
          <RoleBasedRoute allowedRoles={['admin']}>
            <Layout>
              <Analytics />
            </Layout>
          </RoleBasedRoute>
        }
      />

      <Route
        path="/reports/income"
        element={
          <RoleBasedRoute allowedRoles={['admin', 'manager']}>
            <Layout>
              <IncomeReport />
            </Layout>
          </RoleBasedRoute>
        }
      />

      <Route
        path="/pricing"
        element={
          <RoleBasedRoute allowedRoles={['admin']}>
            <Layout>
              <PricingManagement />
            </Layout>
          </RoleBasedRoute>
        }
      />

      <Route
        path="/settings"
        element={
          <RoleBasedRoute allowedRoles={['admin']}>
            <Layout>
              <Settings />
            </Layout>
          </RoleBasedRoute>
        }
      />

      <Route
        path="/translation-demo"
        element={
          <ProtectedRoute>
            <Layout>
              <TranslationDemo />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Catch all route */}
      <Route
        path="*"
        element={
          <ProtectedRoute>
            {user?.role === 'cashier' ? (
              <Navigate to="/orders/create" replace />
            ) : user?.role === 'manager' ? (
              <Navigate to="/stocks" replace />
            ) : (
              <Navigate to="/dashboard" replace />
            )}
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

// Root App Component
const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SidebarProvider>
          <AppContent />
        </SidebarProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App; 