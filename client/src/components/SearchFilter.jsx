import React from 'react';
import { Search } from 'lucide-react';
import TranslatedText from './TranslatedText';

/**
 * Standardized search and filter component
 * 
 * @param {Object} props - Component props
 * @param {string} props.searchValue - Current search value
 * @param {Function} props.onSearchChange - Search change handler
 * @param {string} props.searchPlaceholder - Search input placeholder
 * @param {Array} props.filters - Array of filter objects
 * @param {React.ReactNode} props.actions - Additional action buttons
 * @param {string} props.className - Additional CSS classes
 */
const SearchFilter = ({
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Search...',
  filters = [],
  actions,
  className = ""
}) => {
  return (
    <div className={`search-filter-section ${className}`}>
      <div className="filter-grid">
        {/* Search */}
        <div className="form-group">
          <label className="form-label">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="search-input pl-10"
            />
          </div>
        </div>

        {/* Filters */}
        {filters.map((filter, index) => (
          <div key={filter.key || index} className="form-group">
            <label className="form-label">{filter.label}</label>
            {filter.type === 'select' ? (
              <select
                value={filter.value}
                onChange={(e) => filter.onChange && filter.onChange(e.target.value)}
                className="select"
              >
                {filter.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : filter.type === 'date' ? (
              <input
                type="date"
                value={filter.value}
                onChange={(e) => filter.onChange && filter.onChange(e.target.value)}
                className="input"
              />
            ) : (
              <input
                type={filter.type || 'text'}
                value={filter.value}
                onChange={(e) => filter.onChange && filter.onChange(e.target.value)}
                placeholder={filter.placeholder}
                className="input"
              />
            )}
          </div>
        ))}
      </div>

      {/* Actions */}
      {actions && (
        <div className="flex justify-end mt-4 space-x-3">
          {actions}
        </div>
      )}
    </div>
  );
};

export default SearchFilter;
