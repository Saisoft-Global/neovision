import React from 'react';
import { Settings } from 'lucide-react';
import { useAdminSettings } from '../../../hooks/useAdminSettings';

export const AdminSettings: React.FC = () => {
  const { settings, updateSetting } = useAdminSettings();

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <div className="flex items-center gap-2 mb-4">
        <Settings className="w-5 h-5 text-gray-500" />
        <h3 className="text-lg font-medium">System Settings</h3>
      </div>

      <div className="space-y-4">
        {Object.entries(settings).map(([key, value]) => (
          <div key={key} className="flex items-center justify-between">
            <span className="font-medium">{key}</span>
            <input
              type={typeof value === 'boolean' ? 'checkbox' : 'text'}
              checked={typeof value === 'boolean' ? value : undefined}
              value={typeof value === 'string' ? value : undefined}
              onChange={(e) => updateSetting(key, 
                typeof value === 'boolean' ? e.target.checked : e.target.value
              )}
              className="rounded border-gray-300 focus:ring-blue-500"
            />
          </div>
        ))}
      </div>
    </div>
  );
};