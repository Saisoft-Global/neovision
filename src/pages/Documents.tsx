import { useNavigate } from 'react-router-dom';
import { File, Clock, CheckCircle, XCircle } from 'lucide-react';
import DocumentUploader from '../components/DocumentUploader';
import { useDocumentStore } from '../store/documentStore';

const Documents = () => {
  const documents = useDocumentStore((state) => state.documents);
  const navigate = useNavigate();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'processing':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">My Documents</h1>
      
      <DocumentUploader />

      <div className="mt-8 grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {documents.map((doc) => (
          <div
            key={doc.id}
            onClick={() => navigate(`/documents/${doc.id}`)}
            className="bg-white rounded-lg shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <File className="w-8 h-8 text-blue-500" />
                <div>
                  <h3 className="font-medium text-gray-900">{doc.name}</h3>
                  <p className="text-sm text-gray-500">
                    {new Date(doc.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              {getStatusIcon(doc.status)}
            </div>
            
            <div className="text-sm text-gray-600">
              {doc.fields.length} fields extracted
            </div>
            {process.env.NODE_ENV === 'development' && doc.meta?.raw && (
              <div className="mt-2 text-xs text-gray-400">Raw captured ✓</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Documents;