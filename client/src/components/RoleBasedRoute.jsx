import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import TranslatedText from './TranslatedText';

const RoleBasedRoute = ({ children, allowedRoles = [], fallbackPath = '/dashboard' }) => {
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

  // If no specific roles are required, allow access
  if (allowedRoles.length === 0) {
    return children;
  }

  // Check if user's role is in allowed roles
  if (allowedRoles.includes(user.role)) {
    return children;
  }

  // Redirect to fallback path if access denied
  return <Navigate to={fallbackPath} replace />;
};

export default RoleBasedRoute;
