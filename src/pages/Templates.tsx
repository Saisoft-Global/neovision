import { useState } from 'react';
import { Plus, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTemplateStore, DocumentTemplate } from '../store/templateStore';
import TemplateEditor from '../components/TemplateEditor';

const Templates = () => {
  const navigate = useNavigate();
  const { templates, addTemplate } = useTemplateStore();
  const [showEditor, setShowEditor] = useState(false);

  const handleSaveTemplate = (template: Omit<DocumentTemplate, 'id' | 'createdAt' | 'updatedAt'>) => {
    addTemplate(template);
    setShowEditor(false);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Document Templates</h1>
        <button
          onClick={() => setShowEditor(true)}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          New Template
        </button>
      </div>

      {showEditor ? (
        <TemplateEditor
          onSave={handleSaveTemplate}
          onCancel={() => setShowEditor(false)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <div
              key={template.id}
              onClick={() => navigate(`/templates/${template.id}`)}
              className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-center gap-3 mb-4">
                <FileText className="w-8 h-8 text-blue-500" />
                <div>
                  <h3 className="text-lg font-medium">{template.name}</h3>
                  <p className="text-sm text-gray-500">
                    {template.fields.length} fields defined
                  </p>
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                {template.description}
              </p>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Document Type</span>
                  <span className="font-medium capitalize">
                    {template.documentType.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Last Updated</span>
                  <span className="font-medium">
                    {new Date(template.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {templates.length === 0 && (
            <div className="col-span-full text-center py-12 bg-gray-50 rounded-lg">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No templates yet
              </h3>
              <p className="text-gray-500">
                Create your first template to start processing documents
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Templates;