import React, { useState, useEffect, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Users,
  ShoppingCart,
  Store,
  Settings,
  LogOut,
  X,
  ChevronDown,
  FileText,
  Bell,
  Scissors,
  PanelLeftClose,
  PanelLeftOpen,
  Home
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSidebar } from '../contexts/SidebarContext';
import UrutiLaRoseLogo from './UrutiLaRoseLogo';
import TranslatedText from './TranslatedText';
import { useTranslation } from '../hooks/useTranslation';

const Navigation = () => {
  const { tSync } = useTranslation();
  const [expandedMenus, setExpandedMenus] = useState({});
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { isDesktopSidebarOpen, setIsDesktopSidebarOpen, isMobileMenuOpen, setIsMobileMenuOpen } = useSidebar();

  // Close mobile menu when window is resized to desktop size
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024 && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobileMenuOpen, setIsMobileMenuOpen]);

  // Simplified toggle function
  const toggleMenuExpansion = (menuKey) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuKey]: !prev[menuKey]
    }));
  };

  // Role-based navigation configuration
  const navigationConfig = useMemo(() => {
    const baseConfig = {
      cashier: [
        {
          name: tSync('Sales'),
          icon: ShoppingCart,
          href: '/orders/create',
          description: tSync('Create new sales orders')
        },
        {
          name: tSync('Sales Records'),
          icon: FileText,
          href: '/orders',
          description: tSync('View sales history')
        },
        {
          name: tSync('Customers'),
          icon: Users,
          href: '/customers',
          description: tSync('Manage customer information')
        },
        {
          name: tSync('Atelier Orders'),
          icon: Scissors,
          href: '/orders/atelier',
          description: tSync('Manage atelier orders')
        },
        {
          name: tSync('Expenses'),
          icon: FileText,
          href: '/expenses',
          description: tSync('Expense management')
        }
      ],
      manager: [
        {
          name: tSync('Dashboard'),
          icon: LayoutDashboard,
          href: '/dashboard',
          description: tSync('Business overview')
        },
        {
          id: 'products',
          name: tSync('Products'),
          icon: Package,
          hasSubmenu: true,
          submenu: [
            { name: tSync('Products'), href: '/products' },
            { name: tSync('Categories'), href: '/categories' },
            { name: tSync('Brands'), href: '/brands' }
          ]
        },
        {
          name: tSync('Inventory'),
          icon: Package,
          href: '/stocks',
          description: tSync('Stock management')
        },
        {
          name: tSync('Atelier Materials'),
          icon: Scissors,
          href: '/atelier/materials',
          description: tSync('Raw materials')
        }
      ],
      admin: [
        {
          name: tSync('Dashboard'),
          icon: LayoutDashboard,
          href: '/dashboard',
          description: tSync('Business overview')
        },
        {
          id: 'products',
          name: tSync('Products'),
          icon: Package,
          hasSubmenu: true,
          submenu: [
            { name: tSync('Products'), href: '/products' },
            { name: tSync('Categories'), href: '/categories' },
            { name: tSync('Brands'), href: '/brands' },
            { name: tSync('Shops'), href: '/shops' }
          ]
        },
        {
          id: 'sales',
          name: tSync('Sales'),
          icon: ShoppingCart,
          hasSubmenu: true,
          submenu: [
            { name: tSync('Sales Dashboard'), href: '/sales-dashboard' },
            { name: tSync('Create Order'), href: '/orders/create' },
            { name: tSync('Orders'), href: '/orders' },
            { name: tSync('Discounts'), href: '/discounts' }
          ]
        },
        {
          id: 'customers',
          name: tSync('Customers'),
          icon: Users,
          hasSubmenu: true,
          submenu: [
            { name: tSync('Customers'), href: '/customers' },
            { name: tSync('Loyalty'), href: '/loyalty' }
          ]
        },
        {
          id: 'atelier',
          name: tSync('Atelier'),
          icon: Scissors,
          hasSubmenu: true,
          submenu: [
            { name: tSync('Orders'), href: '/orders/atelier' },
            { name: tSync('Materials'), href: '/atelier/materials' }
          ]
        },
        {
          id: 'inventory',
          name: tSync('Inventory'),
          icon: Package,
          hasSubmenu: true,
          submenu: [
            { name: tSync('Stock Levels'), href: '/inventory' },
            { name: tSync('Shop Stocks'), href: '/stocks' }
          ]
        },
        {
          name: tSync('Notifications'),
          icon: Bell,
          href: '/notifications',
          description: tSync('System notifications')
        },
        {
          name: tSync('Expenses'),
          icon: FileText,
          href: '/expenses',
          description: tSync('Expense management')
        },
        {
          name: tSync('Reports'),
          icon: FileText,
          href: '/reports/income',
          description: tSync('Financial reports')
        }
      ]
    };

    return baseConfig[user?.role] || baseConfig.admin;
  }, [user?.role, tSync]);

  const isActive = (href) => {
    if (href.startsWith('/settings')) {
      const urlParams = new URLSearchParams(location.search);
      const tab = urlParams.get('tab');
      if (href.includes('tab=')) {
        const hrefTab = href.split('tab=')[1];
        return tab === hrefTab;
      }
      return location.pathname === '/settings' && !tab;
    }
    return location.pathname === href;
  };

  const isSubmenuActive = (submenu) => {
    return submenu.some(item => isActive(item.href));
  };

  const handleLogout = async () => {
    try {
      setIsMobileMenuOpen(false);
      setExpandedMenus({});
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
      navigate('/login');
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const renderNavigationItem = (item, isMobile = false) => {
    const Icon = item.icon;

    if (item.hasSubmenu) {
      const isExpanded = expandedMenus[item.id];
      const isMenuActive = isSubmenuActive(item.submenu);

      return (
        <div key={item.id}>
          <button
            onClick={() => toggleMenuExpansion(item.id)}
            className={`w-full group flex items-center justify-between px-3 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
              isMenuActive
                ? 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 border border-blue-200'
                : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center">
              <Icon className={`mr-3 h-5 w-5 ${
                isMenuActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'
              }`} />
              {item.name}
            </div>
            <ChevronDown className={`h-4 w-4 transition-transform ${
              isExpanded ? 'rotate-180' : ''
            }`} />
          </button>

          {isExpanded && (
            <div className="mt-2 ml-6 space-y-1">
              {item.submenu.map((subItem) => (
                <Link
                  key={subItem.name}
                  to={subItem.href}
                  onClick={() => isMobile && setIsMobileMenuOpen(false)}
                  className={`group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                    isActive(subItem.href)
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  {subItem.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (item.href) {
      return (
        <Link
          key={item.name}
          to={item.href}
          onClick={() => isMobile && setIsMobileMenuOpen(false)}
          className={`group flex items-center px-3 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
            isActive(item.href)
              ? 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 border border-blue-200'
              : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          <Icon className={`mr-3 h-5 w-5 ${
            isActive(item.href) ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'
          }`} />
          {item.name}
        </Link>
      );
    }

    return null;
  };

  return (
    <>
      {/* Mobile menu backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile menu */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl transform transition-transform duration-300 ease-in-out lg:hidden flex flex-col ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <UrutiLaRoseLogo className="h-16 w-48" />
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Close mobile menu"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        <nav className="mt-6 px-3 flex-1 overflow-y-auto">
          <div className="space-y-1">
            {navigationConfig.map(item => renderNavigationItem(item, true))}

            {/* Settings for Admin */}
            {user?.role === 'admin' && (
              <div className="border-t border-gray-200 pt-4 mt-4">
                <Link
                  to="/settings"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`group flex items-center px-3 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                    location.pathname === '/settings'
                      ? 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 border border-blue-200'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Settings className={`mr-3 h-5 w-5 ${
                    location.pathname === '/settings' ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'
                  }`} />
                  <TranslatedText text="Settings" />
                </Link>
              </div>
            )}
          </div>
        </nav>

        {/* Mobile user profile */}
        <div className="mt-auto p-4 border-t border-gray-200">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
              {getInitials(`${user?.firstName} ${user?.lastName}`)}
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-gray-900">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              title="Logout"
            >
              <LogOut className="h-4 w-4 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className={`hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:z-40 transition-transform duration-300 ease-in-out ${
        isDesktopSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200 shadow-sm">
          {/* Logo */}
          <div className="flex items-center justify-between px-6 py-6 border-b border-gray-200">
            <UrutiLaRoseLogo className="h-16 w-48" />
            <button
              onClick={() => setIsDesktopSidebarOpen(false)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              title="Close sidebar"
            >
              <PanelLeftClose className="h-5 w-5 text-gray-600" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
            {navigationConfig.map(item => renderNavigationItem(item))}

            {/* Settings for Admin */}
            {user?.role === 'admin' && (
              <div className="border-t border-gray-200 pt-4 mt-4">
                <Link
                  to="/settings"
                  className={`group flex items-center px-3 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                    location.pathname === '/settings'
                      ? 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 border border-blue-200'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                  title="System settings"
                >
                  <Settings className={`mr-3 h-5 w-5 ${
                    location.pathname === '/settings' ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'
                  }`} />
                  <TranslatedText text="Settings" />
                </Link>
              </div>
            )}
          </nav>

          {/* User profile */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                {getInitials(`${user?.firstName} ${user?.lastName}`)}
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                title="Logout"
              >
                <LogOut className="h-4 w-4 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Floating sidebar toggle button */}
      {!isDesktopSidebarOpen && (
        <button
          onClick={() => setIsDesktopSidebarOpen(true)}
          className="fixed left-4 top-20 z-40 hidden lg:flex p-3 bg-white border border-gray-200 rounded-lg shadow-lg hover:bg-gray-50 transition-all duration-200"
          title="Open sidebar"
        >
          <PanelLeftOpen className="h-5 w-5 text-gray-600" />
        </button>
      )}
    </>
  );
};

export default Navigation;