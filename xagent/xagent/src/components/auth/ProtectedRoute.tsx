import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { LoadingSpinner } from '../common/LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requiredRole?: string;
  requiredPermissions?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAuth = true,
  requiredRole,
  requiredPermissions = [],
}) => {
  const { user, isLoading, isInitialized } = useAuthStore();
  const location = useLocation();

  // Wait for auth initialization
  if (!isInitialized || isLoading) {
    return <LoadingSpinner message="Checking authentication..." />;
  }

  // Check if authentication is required
  if (requireAuth && !user) {
    // Redirect to login, but save the attempted location
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role requirement
  if (requiredRole && user?.role !== requiredRole && user?.role !== 'admin') {
    return <Navigate to="/unauthorized" replace />;
  }

  // Check permissions
  if (requiredPermissions.length > 0 && user) {
    const userPermissions = user.permissions || [];
    const hasAllPermissions = requiredPermissions.every(
      (permission) => userPermissions.includes(permission) || userPermissions.includes('*')
    );

    if (!hasAllPermissions) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <>{children}</>;
};

// Helper component for public routes (redirect to dashboard if already logged in)
export const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading, isInitialized } = useAuthStore();
  const location = useLocation();

  if (!isInitialized || isLoading) {
    return <LoadingSpinner message="Loading..." />;
  }

  if (user) {
    // User is already logged in, redirect to the page they were trying to access or dashboard
    const from = (location.state as any)?.from?.pathname || '/';
    return <Navigate to={from} replace />;
  }

  return <>{children}</>;
};