import React, { useState, useEffect } from 'react';
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
  BarChart3,
  Award,
  CreditCard,
  FileText,
  FlaskConical,
  Home,
  Shield,
  Palette,
  Receipt,
  Globe,
  Database,
  Truck,
  ClipboardList,
  FileCheck,
  Eye,
  Plus,
  Percent,
  PanelLeftClose,
  PanelLeftOpen,

  Bell,
  Scissors
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSidebar } from '../contexts/SidebarContext';
import UrutiLaRoseLogo from './UrutiLaRoseLogo';
import TranslatedText from './TranslatedText';
import { useTranslation } from '../hooks/useTranslation';

const Navigation = () => {
  const { tSync } = useTranslation();
  // Simplified accordion behavior with a single state object
  const [expandedMenus, setExpandedMenus] = useState({
    settings: false,
    productManager: false,
    crm: false,
    ordersManager: false,
    salesManager: false,
    production: false,
    inventory: false,
    atelier: false
  });

  // Debug: Log state changes
  useEffect(() => {
    console.log('Navigation expandedMenus state:', expandedMenus);
  }, [expandedMenus]);

  // Robust toggle function
  const toggleMenuExpansion = (menuKey) => {
    setExpandedMenus(prev => {
      const newState = { ...prev };
      const isAlreadyOpen = newState[menuKey];

      // Close all menus
      Object.keys(newState).forEach(key => {
        newState[key] = false;
      });

      // If it wasn't open, open it. If it was already open, we leave it closed (toggle effect).
      if (!isAlreadyOpen) {
        newState[menuKey] = true;
      }

      return newState;
    });
  };
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { isDesktopSidebarOpen, setIsDesktopSidebarOpen, isMobileMenuOpen, setIsMobileMenuOpen } = useSidebar();

  // Debug: Log user info
  useEffect(() => {
    console.log('Current user:', user);
    console.log('User role:', user?.role);
  }, [user]);

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

  // Role-based navigation filtering
  const getFilteredNavigationItems = () => {
    if (!user) return [];

    // Cashier role - limited access
    if (user.role === 'cashier') {
      return [
        {
          name: tSync('Sales'),
          icon: ShoppingCart,
          description: tSync('Create new sales orders'),
          href: '/orders/create'
        },
        {
          name: tSync('Sales Records'),
          icon: FileText,
          description: tSync('View sales history'),
          href: '/orders'
        },
        {
          name: tSync('Customers'),
          icon: Users,
          description: tSync('Manage customer information'),
          href: '/customers'
        },
        {
          name: tSync('Expenses'),
          icon: Receipt,
          description: tSync('Expense management'),
          href: '/expenses'
        },
        {
          name: tSync('Atelier Orders'),
          icon: Scissors,
          description: tSync('Manage atelier orders'),
          href: '/orders/atelier'
        },

      ];
    }

    // Manager role - access to stock management, production, and products
    if (user.role === 'manager') {
      return [
        {
          id: 'productManager',
          name: tSync('Product Manager'),
          icon: Package,
          description: tSync('Manage products, categories, and brands'),
          hasSubmenu: true,
          submenu: [
            {
              name: tSync('Products'),
              href: '/products',
              description: tSync('Manage your product catalog')
            },
            {
              name: tSync('Categories'),
              href: '/categories',
              description: tSync('Organize products by categories')
            },
            {
              name: tSync('Brands'),
              href: '/brands',
              description: tSync('Manage product brands')
            }
          ]
        },
        {
          id: 'inventory',
          name: tSync('Inventory'),
          icon: Package,
          description: tSync('Inventory management'),
          hasSubmenu: true,
          submenu: [
            {
              name: tSync('Shop Stocks'),
              href: '/stocks',
              description: tSync('Shop-specific inventory')
            }
          ]
        },


        {
          id: 'atelier',
          name: tSync('Atelier'),
          icon: Scissors,
          description: tSync('Atelier management'),
          hasSubmenu: true,
          submenu: [
            {
              name: tSync('Raw Materials'),
              href: '/atelier/materials',
              description: tSync('Manage raw materials')
            }
          ]
        }
      ];
    }

    // For admin and other roles - show all navigation items
    return navigationItems;
  };

  const navigationItems = [
    {
      name: tSync('Dashboard'),
      href: '/dashboard',
      icon: LayoutDashboard,
      description: tSync('Overview of your business metrics')
    },
    {
      id: 'productManager',
      name: tSync('Product'),
      icon: Package,
      description: tSync('Manage products, categories, and brands'),
      hasSubmenu: true,
      submenu: [
        {
          name: tSync('Products'),
          href: '/products',
          description: tSync('Manage your product catalog')
        },
        {
          name: tSync('Categories'),
          href: '/categories',
          description: tSync('Organize products by categories')
        },
        {
          name: tSync('Brands'),
          href: '/brands',
          description: tSync('Manage product brands')
        },
        {
          name: tSync('Shops'),
          href: '/shops',
          description: tSync('Manage retail locations')
        }
      ]
    },
    {
      id: 'crm',
      name: tSync('CRM'),
      icon: Users,
      description: tSync('Customer relationship management'),
      hasSubmenu: true,
      submenu: [
        {
          name: tSync('Customers'),
          href: '/customers',
          description: tSync('Manage customer information')
        },
        {
          name: tSync('Loyalty'),
          href: '/loyalty',
          description: tSync('Customer loyalty programs')
        },

      ]
    },
    {
      id: 'ordersManager',
      name: tSync('Order'),
      icon: ShoppingCart,
      description: tSync('Manage sales and orders'),
      hasSubmenu: true,
      submenu: [
        {
          name: tSync('Sales Dashboard'),
          href: '/sales-dashboard',
          description: tSync('Sales overview and metrics')
        },
        {
          name: tSync('Sales'),
          href: '/orders/create',
          description: tSync('Create new sales orders')
        },
        {
          name: tSync('Sales Records'),
          href: '/orders',
          description: tSync('View sales history')
        },
        {
          name: tSync('Discounts'),
          href: '/discounts',
          description: tSync('Manage discount programs')
        }
      ]
    },


    {
      id: 'atelier',
      name: tSync('Atelier'),
      icon: Scissors,
      description: tSync('Atelier management'),
      hasSubmenu: true,
      submenu: [
        {
          name: tSync('Orders'),
          href: '/orders/atelier',
          description: tSync('Manage atelier orders')
        },
        {
          name: tSync('Raw Materials'),
          href: '/atelier/materials',
          description: tSync('Manage raw materials')
        }
      ]
    },
    {
      id: 'inventory',
      name: tSync('Inventory'),
      icon: Package,
      description: tSync('Inventory management'),
      hasSubmenu: true,
      submenu: [
        {
          name: tSync('Stock Levels'),
          href: '/inventory',
          description: tSync('Monitor stock levels')
        },
        {
          name: tSync('Shop Stocks'),
          href: '/stocks',
          description: tSync('Shop-specific inventory')
        }
      ]
    },

    {
      name: tSync('Notifications'),
      href: '/notifications',
      icon: Bell,
      description: tSync('System notifications')
    },
    {
      name: tSync('Expenses'),
      href: '/expenses',
      icon: FileText,
      description: tSync('Expense management')
    },
    {
      name: tSync('Shops'),
      href: '/shops',
      icon: Store,
      description: tSync('Manage shop locations')
    },
    {
      name: tSync('Income Report'),
      href: '/reports/income',
      icon: FileText,
      description: tSync('Financial reports')
    }
  ];

  const settingsSubmenus = [
    {
      name: tSync('User Management'),
      href: '/settings?tab=users',
      icon: Users,
      description: tSync('Manage system users')
    },
    {
      name: tSync('Security Settings'),
      href: '/settings?tab=security',
      icon: Shield,
      description: tSync('Security configuration')
    },
    {
      name: tSync('Appearance'),
      href: '/settings?tab=appearance',
      icon: Palette,
      description: tSync('Theme and appearance settings')
    },
    {
      name: tSync('Notifications'),
      href: '/settings?tab=notifications',
      icon: Bell,
      description: tSync('Notification preferences')
    },
    {
      name: tSync('Integrations'),
      href: '/settings?tab=integrations',
      icon: Globe,
      description: tSync('Third-party integrations')
    },
    {
      name: tSync('Billing'),
      href: '/settings?tab=billing',
      icon: CreditCard,
      description: tSync('Billing and subscription')
    },
    {
      name: tSync('Database'),
      href: '/settings?tab=database',
      icon: Database,
      description: tSync('Database management')
    }
  ];

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
      // Close all dropdowns
      setIsMobileMenuOpen(false);
      setExpandedMenus({
        settings: false,
        productManager: false,
        crm: false,
        ordersManager: false,
        salesManager: false,
        production: false,
        inventory: false,
        atelier: false
      });

      await logout();
      // Navigation will be handled by the ProtectedRoute component
      // when user becomes null, it will redirect to /login
    } catch (error) {
      console.error('Logout failed:', error);
      // Force navigation to login even if logout fails
      navigate('/login');
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <>
      {/* Mobile menu backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile menu */}
      <div className={`fixed inset-y-0 left-0 z-dropdown w-64 bg-white shadow-xl transform transition-transform duration-300 ease-in-out lg:hidden flex flex-col ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <UrutiLaRoseLogo className="h-16 w-48" />
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors min-h-[44px] min-w-[44px] touch-target flex items-center justify-center"
            aria-label="Close mobile menu"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        <nav className="mt-6 px-3 flex-1 overflow-y-auto custom-scrollbar relative">
          <div className="space-y-1">
            {getFilteredNavigationItems().map((item) => {
              const Icon = item.icon;

              // Handle submenu items
              if (item.hasSubmenu) {
                const isExpanded = expandedMenus[item.id];

                return (
                  <div key={item.name}>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleMenuExpansion(item.id);
                      }}
                      className={`w-full group flex items-center justify-between px-3 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${isSubmenuActive(item.submenu)
                        ? 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 border border-blue-200'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                    >
                      <div className="flex items-center">
                        <Icon className={`mr-3 h-5 w-5 ${isSubmenuActive(item.submenu) ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'
                          }`} />
                        {item.name}
                      </div>
                      <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''
                        }`} />
                    </button>

                    {isExpanded && (
                      <div className="mt-2 ml-6 space-y-1">
                        {item.submenu.map((subItem) => (
                          <Link
                            key={subItem.name}
                            to={subItem.href}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={`group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${isActive(subItem.href)
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

              // Handle regular navigation items (only if they have href)
              if (item.href) {
                return (
                  <div key={item.name}>
                    <Link
                      to={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`group flex items-center px-3 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${isActive(item.href)
                        ? 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 border border-blue-200'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                    >
                      <Icon className={`mr-3 h-5 w-5 ${isActive(item.href) ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'
                        }`} />
                      {item.name}
                    </Link>

                    {/* Quick Action Button */}
                    {item.quickAction && (
                      <Link
                        to={item.quickAction.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="mt-2 ml-8 group flex items-center px-3 py-2 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all duration-200"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        {item.quickAction.label}
                      </Link>
                    )}
                  </div>
                );
              }

              // If item has no href and no submenu, return null
              return null;
            })}

            {/* Settings Menu - Only for Admin */}
            {user?.role === 'admin' && (
              <div className="border-t border-gray-200 pt-4 mt-4">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleMenuExpansion('settings');
                  }}
                  className={`w-full group flex items-center justify-between px-3 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${location.pathname === '/settings'
                    ? 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 border border-blue-200'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                >
                  <div className="flex items-center">
                    <Settings className={`mr-3 h-5 w-5 ${location.pathname === '/settings' ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'
                      }`} />
                    Settings
                  </div>
                  <ChevronDown className={`h-4 w-4 transition-transform ${expandedMenus.settings ? 'rotate-180' : ''
                    }`} />
                </button>

                {expandedMenus.settings && (
                  <div className="mt-2 ml-6 space-y-1">
                    {settingsSubmenus.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.name}
                          to={item.href}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={`group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${isActive(item.href)
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            }`}
                        >
                          <Icon className={`mr-2 h-4 w-4 ${isActive(item.href) ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'
                            }`} />
                          {item.name}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </nav>

        {/* Mobile user profile */}
        <div className="mt-auto p-4 border-t border-gray-200">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
              {getInitials(user?.firstName + ' ' + user?.lastName)}
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
            >
              <LogOut className="h-4 w-4 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className={`hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:z-navigation transition-transform duration-300 ease-in-out ${isDesktopSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200 shadow-sm">
          {/* Logo */}
          <div className="flex items-center px-6 py-6 border-b border-gray-200">
            <div className="flex items-center">
              <UrutiLaRoseLogo className="h-16 w-48" />
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto custom-scrollbar relative">
            {getFilteredNavigationItems().map((item) => {
              const Icon = item.icon;

              // Handle submenu items
              if (item.hasSubmenu) {
                const isExpanded = expandedMenus[item.id];

                return (
                  <div key={item.name}>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleMenuExpansion(item.id);
                      }}
                      className={`w-full group flex items-center justify-between px-3 py-3 text-sm font-medium rounded-xl transition-all duration-200 relative ${isSubmenuActive(item.submenu)
                        ? 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 border border-blue-200 shadow-sm'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      title={item.description}
                    >
                      <div className="flex items-center">
                        <Icon className={`mr-3 h-5 w-5 ${isSubmenuActive(item.submenu) ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'
                          }`} />
                        {item.name}
                      </div>
                      <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''
                        }`} />
                      {isSubmenuActive(item.submenu) && (
                        <div className="absolute right-2 w-2 h-2 bg-blue-600 rounded-full"></div>
                      )}
                    </button>

                    {isExpanded && (
                      <div className="mt-2 ml-6 space-y-1">
                        {item.submenu.map((subItem) => (
                          <Link
                            key={subItem.name}
                            to={subItem.href}
                            onClick={() => setIsDesktopSidebarOpen(false)}
                            className={`group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 relative ${isActive(subItem.href)
                              ? 'bg-blue-50 text-blue-700'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                              }`}
                            title={subItem.description}
                          >
                            {subItem.name}
                            {isActive(subItem.href) && (
                              <div className="absolute right-2 w-2 h-2 bg-blue-600 rounded-full"></div>
                            )}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              // Handle regular navigation items (only if they have href)
              if (item.href) {
                return (
                  <div key={item.name}>
                    <Link
                      to={item.href}
                      onClick={() => setIsDesktopSidebarOpen(false)}
                      className={`group flex items-center px-3 py-3 text-sm font-medium rounded-xl transition-all duration-200 relative ${isActive(item.href)
                        ? 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 border border-blue-200 shadow-sm'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      title={item.description}
                    >
                      <Icon className={`mr-3 h-5 w-5 ${isActive(item.href) ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'
                        }`} />
                      {item.name}
                      {isActive(item.href) && (
                        <div className="absolute right-2 w-2 h-2 bg-blue-600 rounded-full"></div>
                      )}
                    </Link>

                    {/* Quick Action Button */}
                    {item.quickAction && (
                      <Link
                        to={item.quickAction.href}
                        onClick={() => setIsDesktopSidebarOpen(false)}
                        className="mt-2 ml-8 group flex items-center px-3 py-2 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all duration-200"
                        title={item.quickAction.description}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        {item.quickAction.label}
                      </Link>
                    )}
                  </div>
                );
              }

              // If item has no href and no submenu, return null
              return null;
            })}

            {/* Settings Menu - Only for Admin */}
            {user?.role === 'admin' && (
              <div className="border-t border-gray-200 pt-4 mt-4">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleMenuExpansion('settings');
                  }}
                  className={`w-full group flex items-center justify-between px-3 py-3 text-sm font-medium rounded-xl transition-all duration-200 relative ${location.pathname === '/settings'
                    ? 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 border border-blue-200 shadow-sm'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  title="System configuration and settings"
                >
                  <div className="flex items-center">
                    <Settings className={`mr-3 h-5 w-5 ${location.pathname === '/settings' ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'
                      }`} />
                    Settings
                  </div>
                  <ChevronDown className={`h-4 w-4 transition-transform ${expandedMenus.settings ? 'rotate-180' : ''
                    }`} />
                  {location.pathname === '/settings' && (
                    <div className="absolute right-2 w-2 h-2 bg-blue-600 rounded-full"></div>
                  )}
                </button>

                {expandedMenus.settings && (
                  <div className="mt-2 ml-6 space-y-1">
                    {settingsSubmenus.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.name}
                          to={item.href}
                          onClick={() => setIsDesktopSidebarOpen(false)}
                          className={`group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 relative ${isActive(item.href)
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            }`}
                          title={item.description}
                        >
                          <Icon className={`mr-2 h-4 w-4 ${isActive(item.href) ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'
                            }`} />
                          {item.name}
                          {isActive(item.href) && (
                            <div className="absolute right-2 w-2 h-2 bg-blue-600 rounded-full"></div>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </nav>

          {/* User profile */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                {getInitials(user?.firstName + ' ' + user?.lastName)}
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





    </>
  );
};

export default Navigation; 