import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, Trash2, Save } from 'lucide-react';
import { useTemplateStore, type DocumentTemplate } from '../store/templateStore';
import TemplateEditor from '../components/TemplateEditor';

const TemplateDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { templates, updateTemplate, deleteTemplate } = useTemplateStore();
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const template = templates.find(t => t.id === id);

  useEffect(() => {
    if (!template) {
      navigate('/templates');
    }
  }, [template, navigate]);

  if (!template) {
    return null;
  }

  const handleDelete = () => {
    deleteTemplate(template.id);
    navigate('/templates');
  };

  const handleUpdate = (updatedTemplate: Omit<DocumentTemplate, 'id' | 'createdAt' | 'updatedAt'>) => {
    updateTemplate(template.id, updatedTemplate);
    setIsEditing(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/templates')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Templates
          </button>
          <h1 className="text-2xl font-bold">{template.name}</h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="btn btn-secondary flex items-center gap-2"
          >
            {isEditing ? (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            ) : (
              <>
                <Edit2 className="w-4 h-4" />
                Edit Template
              </>
            )}
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="btn btn-secondary text-red-600 flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>

      {isEditing ? (
        <TemplateEditor
          template={template}
          onSave={handleUpdate}
          onCancel={() => setIsEditing(false)}
        />
      ) : (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-medium mb-4">Template Details</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">Description</label>
                <p className="mt-1">{template.description}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500">Document Type</label>
                <p className="mt-1 capitalize">{template.documentType.replace('_', ' ')}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500">Last Updated</label>
                <p className="mt-1">{new Date(template.updatedAt).toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-medium mb-4">Fields</h2>
            <div className="space-y-4">
              {template.fields.map((field) => (
                <div key={field.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium">{field.label}</h3>
                      <p className="text-sm text-gray-500 mt-1">Type: {field.type}</p>
                    </div>
                    {field.required && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                        Required
                      </span>
                    )}
                  </div>
                  {field.regex && (
                    <div className="mt-2">
                      <label className="block text-xs font-medium text-gray-500">Regex Pattern</label>
                      <code className="text-sm bg-gray-50 px-2 py-1 rounded mt-1">
                        {field.regex}
                      </code>
                    </div>
                  )}
                  {field.description && (
                    <p className="text-sm text-gray-500 mt-2">{field.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md">
            <h3 className="text-lg font-medium mb-4">Delete Template</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this template? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="btn btn-primary bg-red-600 hover:bg-red-700"
              >
                Delete Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplateDetails;