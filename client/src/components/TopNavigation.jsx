import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Bell,
  User,
  Settings,
  LogOut,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSidebar } from '../contexts/SidebarContext';
import LanguageSwitcher from './LanguageSwitcher';
import TranslatedText from './TranslatedText';

const TopNavigation = () => {
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const { user, logout } = useAuth();
  const { isDesktopSidebarOpen, setIsDesktopSidebarOpen, isMobileMenuOpen, setIsMobileMenuOpen } = useSidebar();

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleLogout = async () => {
    try {
      setIsProfileDropdownOpen(false);
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div className="sticky top-0 z-navigation bg-white/80 backdrop-blur-sm border-b border-gray-200">
      <div className="flex items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        {/* Mobile menu button */}
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors min-h-[44px] min-w-[44px] touch-target flex items-center justify-center"
          aria-label="Open mobile menu"
        >
          <Menu className="h-5 w-5 text-gray-600" />
        </button>

        {/* Desktop sidebar toggle button */}
        <button
          onClick={() => setIsDesktopSidebarOpen(!isDesktopSidebarOpen)}
          className="hidden lg:flex p-2 rounded-lg hover:bg-gray-100 transition-colors"
          title={isDesktopSidebarOpen ? "Close sidebar" : "Open sidebar"}
        >
          {isDesktopSidebarOpen ? (
            <PanelLeftClose className="h-5 w-5 text-gray-600" />
          ) : (
            <PanelLeftOpen className="h-5 w-5 text-gray-600" />
          )}
        </button>

        {/* Search bar */}
        <div className="flex-1 max-w-lg mx-4 lg:mx-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search products, customers, orders..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 hover:bg-white transition-colors"
            />
          </div>
        </div>

        {/* Right side actions */}
        <div className="flex items-center space-x-4">
          <LanguageSwitcher />

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors relative"
            >
              <Bell className="h-5 w-5 text-gray-600" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            {/* Notifications dropdown */}
            {isNotificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-dropdown">
                <div className="px-4 py-2 border-b border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900"><TranslatedText text="Notifications" /></h3>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  <div className="px-4 py-3 hover:bg-gray-50 cursor-pointer">
                    <p className="text-sm font-medium text-gray-900">Low stock alert</p>
                    <p className="text-xs text-gray-500">Product "Lavender Fields" is running low</p>
                    <p className="text-xs text-gray-400 mt-1">2 minutes ago</p>
                  </div>
                  <div className="px-4 py-3 hover:bg-gray-50 cursor-pointer">
                    <p className="text-sm font-medium text-gray-900">New order received</p>
                    <p className="text-xs text-gray-500">Order #1234 from John Doe</p>
                    <p className="text-xs text-gray-400 mt-1">5 minutes ago</p>
                  </div>
                </div>
                <div className="px-4 py-2 border-t border-gray-200">
                  <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                    View all notifications
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Profile dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
              className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                {getInitials(user?.firstName + ' ' + user?.lastName)}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-gray-900">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
              </div>
              <ChevronDown className="hidden sm:block h-4 w-4 text-gray-400" />
            </button>

            {/* Profile dropdown menu */}
            {isProfileDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-dropdown">
                <Link
                  to="/profile"
                  className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  onClick={() => setIsProfileDropdownOpen(false)}
                >
                  <User className="mr-3 h-4 w-4" />
                  Profile
                </Link>
                <Link
                  to="/settings"
                  className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  onClick={() => setIsProfileDropdownOpen(false)}
                >
                  <Settings className="mr-3 h-4 w-4" />
                  Settings
                </Link>
                <hr className="my-2" />
                <button
                  onClick={handleLogout}
                  className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <LogOut className="mr-3 h-4 w-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Close dropdowns when clicking outside */}
      {(isProfileDropdownOpen || isNotificationsOpen) && (
        <div
          className="fixed inset-0 z-dropdown-backdrop"
          onClick={() => {
            setIsProfileDropdownOpen(false);
            setIsNotificationsOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default TopNavigation; 
