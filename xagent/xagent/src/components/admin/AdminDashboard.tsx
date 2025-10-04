import React, { Suspense } from 'react';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { Alert } from '../common/Alert';
import { useAuthStore } from '../../store/authStore';

// Lazy load admin components
const DatabaseHealth = React.lazy(() => import('./health/DatabaseHealth').then(module => ({ default: module.DatabaseHealth })));
const SystemMetrics = React.lazy(() => import('./metrics/SystemMetrics').then(module => ({ default: module.SystemMetrics })));
const AdminSettings = React.lazy(() => import('./settings/AdminSettings').then(module => ({ default: module.AdminSettings })));
const UserManagement = React.lazy(() => import('./users/UserManagement').then(module => ({ default: module.UserManagement })));

const AdminDashboard: React.FC = () => {
  const { user } = useAuthStore();

  if (!user || user.role !== 'admin') {
    return <Alert type="error" message="Unauthorized access" />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>
      
      <Suspense fallback={<LoadingSpinner message="Loading health status..." />}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <DatabaseHealth />
          <SystemMetrics />
        </div>
      </Suspense>

      <Suspense fallback={<LoadingSpinner message="Loading management tools..." />}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <UserManagement />
          <AdminSettings />
        </div>
      </Suspense>
    </div>
  );
};

export default AdminDashboard;