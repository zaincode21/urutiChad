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
  ChevronDown,
  X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSidebar } from '../contexts/SidebarContext';
import { useI18n } from '../contexts/I18nContext';
import LanguageSwitcher from './LanguageSwitcher';
import TranslatedText from './TranslatedText';

const TopNavigation = () => {
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const { user, logout } = useAuth();
  const { tSync } = useI18n();
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
    <div className="sticky top-0 z-navigation bg-white/95 backdrop-blur-sm border-b border-gray-200">
      <div className="flex items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Mobile menu button */}
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="lg:hidden touch-target p-2 rounded-lg hover:bg-gray-100 transition-colors"
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

        {/* Search bar - Mobile optimized */}
        <div className="flex-1 max-w-lg mx-2 sm:mx-4 lg:mx-8">
          <div className="relative">
            {/* Mobile: Collapsible search */}
            <div className="sm:hidden">
              {isSearchExpanded ? (
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder={tSync('Search...')}
                      className="mobile-input w-full pl-10 pr-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                      autoFocus
                    />
                  </div>
                  <button
                    onClick={() => setIsSearchExpanded(false)}
                    className="touch-target p-2 text-gray-500 hover:text-gray-700"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsSearchExpanded(true)}
                  className="touch-target p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <Search className="h-5 w-5 text-gray-600" />
                </button>
              )}
            </div>
            
            {/* Desktop: Always visible search */}
            <div className="hidden sm:block relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder={tSync('Search products, customers, orders...')}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 hover:bg-white transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Right side actions */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* Language switcher - Hidden on small screens */}
          <div className="hidden sm:block">
            <LanguageSwitcher />
          </div>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="touch-target p-2 rounded-lg hover:bg-gray-100 transition-colors relative"
            >
              <Bell className="h-5 w-5 text-gray-600" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            {/* Mobile-optimized notifications dropdown */}
            {isNotificationsOpen && (
              <>
                {/* Mobile: Bottom sheet */}
                <div className="sm:hidden mobile-dropdown">
                  <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900"><TranslatedText text="Notifications" /></h3>
                    <button
                      onClick={() => setIsNotificationsOpen(false)}
                      className="touch-target p-1 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    <div className="px-4 py-4 border-b border-gray-100 active:bg-gray-50">
                      <p className="text-sm font-medium text-gray-900">Low stock alert</p>
                      <p className="text-xs text-gray-500 mt-1">Product "Lavender Fields" is running low</p>
                      <p className="text-xs text-gray-400 mt-2">2 minutes ago</p>
                    </div>
                    <div className="px-4 py-4 border-b border-gray-100 active:bg-gray-50">
                      <p className="text-sm font-medium text-gray-900">New order received</p>
                      <p className="text-xs text-gray-500 mt-1">Order #1234 from John Doe</p>
                      <p className="text-xs text-gray-400 mt-2">5 minutes ago</p>
                    </div>
                  </div>
                  <div className="px-4 py-3 border-t border-gray-200">
                    <button className="mobile-btn w-full bg-blue-600 text-white hover:bg-blue-700">
                      View all notifications
                    </button>
                  </div>
                </div>
                
                {/* Desktop: Regular dropdown */}
                <div className="hidden sm:block absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-dropdown">
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
              </>
            )}
          </div>

          {/* Profile dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
              className="flex items-center space-x-2 sm:space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors touch-target"
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

            {/* Mobile-optimized profile dropdown */}
            {isProfileDropdownOpen && (
              <>
                {/* Mobile: Bottom sheet */}
                <div className="sm:hidden mobile-dropdown">
                  <div className="px-4 py-4 border-b border-gray-200">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                        {getInitials(user?.firstName + ' ' + user?.lastName)}
                      </div>
                      <div>
                        <p className="text-lg font-medium text-gray-900">
                          {user?.firstName} {user?.lastName}
                        </p>
                        <p className="text-sm text-gray-500 capitalize">{user?.role}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="py-2">
                    <Link
                      to="/profile"
                      className="mobile-nav-item flex items-center px-4 text-gray-700 hover:bg-gray-50"
                      onClick={() => setIsProfileDropdownOpen(false)}
                    >
                      <User className="mr-3 h-5 w-5" />
                      Profile
                    </Link>
                    <Link
                      to="/settings"
                      className="mobile-nav-item flex items-center px-4 text-gray-700 hover:bg-gray-50"
                      onClick={() => setIsProfileDropdownOpen(false)}
                    >
                      <Settings className="mr-3 h-5 w-5" />
                      Settings
                    </Link>
                    <div className="block sm:hidden px-4 py-2">
                      <LanguageSwitcher />
                    </div>
                  </div>
                  
                  <div className="px-4 py-3 border-t border-gray-200">
                    <button
                      onClick={handleLogout}
                      className="mobile-btn w-full bg-red-600 text-white hover:bg-red-700 flex items-center justify-center"
                    >
                      <LogOut className="mr-2 h-5 w-5" />
                      Logout
                    </button>
                  </div>
                </div>
                
                {/* Desktop: Regular dropdown */}
                <div className="hidden sm:block absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-dropdown">
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
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile backdrop for dropdowns */}
      {(isProfileDropdownOpen || isNotificationsOpen) && (
        <div
          className="sm:hidden fixed inset-0 bg-black bg-opacity-50 z-dropdown-backdrop"
          onClick={() => {
            setIsProfileDropdownOpen(false);
            setIsNotificationsOpen(false);
          }}
        />
      )}
      
      {/* Desktop backdrop for dropdowns */}
      {(isProfileDropdownOpen || isNotificationsOpen) && (
        <div
          className="hidden sm:block fixed inset-0 z-dropdown-backdrop"
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
