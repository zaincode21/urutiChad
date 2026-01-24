import React from 'react';
import TranslatedText from './TranslatedText';

/**
 * Standardized stats card component for displaying metrics
 * 
 * @param {Object} props - Component props
 * @param {string} props.title - Stat title/label
 * @param {string|number} props.value - Stat value
 * @param {React.Component} props.icon - Lucide icon component
 * @param {string} props.iconColor - Icon color class (e.g., 'text-primary-600')
 * @param {string} props.trend - Trend indicator (up, down, neutral)
 * @param {string|number} props.trendValue - Trend percentage or value
 * @param {string} props.subtitle - Optional subtitle
 * @param {Function} props.onClick - Optional click handler
 * @param {string} props.className - Additional CSS classes
 */
const StatsCard = ({
  title,
  value,
  icon: Icon,
  iconColor = 'text-primary-600',
  trend,
  trendValue,
  subtitle,
  onClick,
  className = ""
}) => {
  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return '↗️';
      case 'down':
        return '↘️';
      default:
        return null;
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div
      className={`stat-card ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow duration-200' : ''} ${className}`}
      onClick={onClick}
    >
      <div className="flex items-center">
        <div className="flex-shrink-0">
          {Icon && <Icon className={`stat-icon ${iconColor}`} />}
        </div>
        <div className="ml-4 flex-1">
          <p className="stat-label">{title}</p>
          <div className="flex items-baseline">
            <p className="stat-value">{value}</p>
            {trend && trendValue && (
              <span className={`ml-2 text-sm ${getTrendColor()}`}>
                {getTrendIcon()} {trendValue}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-caption mt-1">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Container for multiple stats cards
 */
export const StatsGrid = ({ children, className = "" }) => {
  return (
    <div className={`stats-grid ${className}`}>
      {children}
    </div>
  );
};

export default StatsCard;
