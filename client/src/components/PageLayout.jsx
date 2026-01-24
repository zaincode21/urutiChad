import React from 'react';
import TranslatedText from './TranslatedText';

/**
 * Standardized page layout component that ensures consistent styling across all pages
 * 
 * @param {Object} props - Component props
 * @param {string} props.title - Page title
 * @param {string} props.subtitle - Optional page subtitle/description
 * @param {React.ReactNode} props.headerActions - Optional header actions (buttons, etc.)
 * @param {React.ReactNode} props.children - Page content
 * @param {boolean} props.showTabs - Whether to show tabs section
 * @param {Array} props.tabs - Array of tab objects {id, name, icon}
 * @param {string} props.activeTab - Currently active tab id
 * @param {Function} props.onTabChange - Tab change handler
 * @param {string} props.className - Additional CSS classes
 */
const PageLayout = ({
  title,
  subtitle,
  headerActions,
  children,
  showTabs = false,
  tabs = [],
  activeTab,
  onTabChange,
  className = ""
}) => {
  return (
    <div className={`page-container ${className}`}>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-content">
          <div className="page-header-inner">
            <div>
              <h1 className="page-title">{title}</h1>
              {subtitle && <p className="page-subtitle">{subtitle}</p>}
            </div>
            {headerActions && (
              <div className="flex items-center space-x-3">
                {headerActions}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs (if enabled) */}
      {showTabs && tabs.length > 0 && (
        <div className="nav-tabs">
          <div className="nav-tabs-container">
            <nav className="nav-tabs-list">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => onTabChange && onTabChange(tab.id)}
                    className={
                      activeTab === tab.id ? 'nav-tab-active' : 'nav-tab-inactive'
                    }
                  >
                    {Icon && <Icon className="icon-sm mr-2" />}
                    {tab.name}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="page-content">
        {children}
      </div>
    </div>
  );
};

export default PageLayout;
