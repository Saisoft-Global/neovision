import React from 'react';
import { Users, UserPlus, Edit, Trash } from 'lucide-react';
import { useUserManagement } from '../../../hooks/useUserManagement';
import { LoadingSpinner } from '../../common/LoadingSpinner';
import { Alert } from '../../common/Alert';

export const UserManagement: React.FC = () => {
  const { users, isLoading, error, deleteUser, updateUserRole } = useUserManagement();

  if (isLoading) {
    return <LoadingSpinner message="Loading users..." />;
  }

  if (error) {
    return <Alert type="error" message={error} />;
  }

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-gray-500" />
          <h3 className="text-lg font-medium">User Management</h3>
        </div>
        <button className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <UserPlus className="w-4 h-4" />
          Add User
        </button>
      </div>

      <div className="space-y-2">
        {users.map(user => (
          <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium">{user.email}</p>
              <p className="text-sm text-gray-500">Role: {user.role}</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-1 text-gray-400 hover:text-blue-500">
                <Edit className="w-4 h-4" />
              </button>
              <button 
                onClick={() => deleteUser(user.id)}
                className="p-1 text-gray-400 hover:text-red-500"
              >
                <Trash className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UserManagement;