import React, { useState } from 'react';
import { Plus, Trash2, Save } from 'lucide-react';
import { useLabelStore } from '../store/labelStore';

const LabelManager: React.FC = () => {
  const { labels, addLabel, removeLabel } = useLabelStore();
  const [isAdding, setIsAdding] = useState(false);
  const [newLabel, setNewLabel] = useState({
    name: '',
    description: '',
    documentTypes: [] as string[],
  });

  const documentTypes = ['invoice', 'purchase_order', 'receipt'];

  const handleAddLabel = () => {
    if (newLabel.name && newLabel.documentTypes.length > 0) {
      addLabel({
        ...newLabel,
        isCustom: true
      });
      setNewLabel({ name: '', description: '', documentTypes: [] });
      setIsAdding(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium">Field Labels</h2>
        <button
          onClick={() => setIsAdding(true)}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Custom Label
        </button>
      </div>

      {isAdding && (
        <div className="bg-gray-50 border rounded-lg p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Label Name
            </label>
            <input
              type="text"
              value={newLabel.name}
              onChange={(e) => setNewLabel({ ...newLabel, name: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <input
              type="text"
              value={newLabel.description}
              onChange={(e) => setNewLabel({ ...newLabel, description: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Document Types
            </label>
            <div className="mt-2 space-y-2">
              {documentTypes.map((type) => (
                <label key={type} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newLabel.documentTypes.includes(type)}
                    onChange={(e) => {
                      const types = e.target.checked
                        ? [...newLabel.documentTypes, type]
                        : newLabel.documentTypes.filter(t => t !== type);
                      setNewLabel({ ...newLabel, documentTypes: types });
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 capitalize">
                    {type.replace('_', ' ')}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setIsAdding(false)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleAddLabel}
              className="btn btn-primary flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save Label
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {documentTypes.map((docType) => (
          <div key={docType} className="border rounded-lg p-4">
            <h3 className="text-lg font-medium capitalize mb-4">
              {docType.replace('_', ' ')} Fields
            </h3>
            <div className="space-y-2">
              {labels
                .filter((label) => label.documentTypes.includes(docType))
                .map((label) => (
                  <div
                    key={label.id}
                    className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{label.name}</p>
                      {label.description && (
                        <p className="text-sm text-gray-500">{label.description}</p>
                      )}
                    </div>
                    {label.isCustom && (
                      <button
                        onClick={() => removeLabel(label.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LabelManager;