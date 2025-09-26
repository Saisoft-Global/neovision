import { useState } from 'react';
import { Save, Tags } from 'lucide-react';
import LabelManager from '../components/LabelManager';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('general');

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <div className="flex gap-6">
        <div className="w-64">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <nav className="space-y-1">
              <button
                onClick={() => setActiveTab('general')}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg ${
                  activeTab === 'general'
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Save className="w-5 h-5" />
                General
              </button>
              <button
                onClick={() => setActiveTab('labels')}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg ${
                  activeTab === 'labels'
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Tags className="w-5 h-5" />
                Field Labels
              </button>
            </nav>
          </div>
        </div>

        <div className="flex-1">
          <div className="bg-white rounded-lg shadow-sm p-6">
            {activeTab === 'general' ? (
              <div className="space-y-6">
                <h2 className="text-lg font-medium mb-4">General Settings</h2>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-1">
                      Default Language
                    </label>
                    <select
                      id="language"
                      className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="en">English</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                      <option value="de">German</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 mb-1">
                      Timezone
                    </label>
                    <select
                      id="timezone"
                      className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="UTC">UTC</option>
                      <option value="EST">Eastern Time</option>
                      <option value="PST">Pacific Time</option>
                      <option value="GMT">GMT</option>
                    </select>
                  </div>

                  <div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">
                        Enable automatic processing for new documents
                      </span>
                    </label>
                  </div>

                  <div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">
                        Save processing history
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            ) : (
              <LabelManager />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;