import { useNavigate } from 'react-router-dom';
import { FileText, Brain, Zap } from 'lucide-react';
import { useDocumentStore } from '../store/documentStore';

const Dashboard = () => {
  const documents = useDocumentStore((state) => state.documents);
  const navigate = useNavigate();

  const stats = {
    totalDocuments: documents.length,
    processedDocuments: documents.filter(d => d.status === 'completed').length,
    averageAccuracy: documents
      .flatMap(d => d.fields)
      .reduce((acc, field) => acc + field.confidence, 0) / documents.length || 0
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-4">
            <FileText className="w-8 h-8 text-blue-500" />
            <div>
              <h3 className="text-lg font-medium text-gray-900">Total Documents</h3>
              <p className="text-2xl font-bold">{stats.totalDocuments}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-4">
            <Brain className="w-8 h-8 text-green-500" />
            <div>
              <h3 className="text-lg font-medium text-gray-900">Processed</h3>
              <p className="text-2xl font-bold">{stats.processedDocuments}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-4">
            <Zap className="w-8 h-8 text-yellow-500" />
            <div>
              <h3 className="text-lg font-medium text-gray-900">Avg. Accuracy</h3>
              <p className="text-2xl font-bold">
                {(stats.averageAccuracy * 100).toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-medium mb-4">Recent Documents</h2>
        <div className="space-y-4">
          {documents.slice(0, 5).map((doc) => (
            <div
              key={doc.id}
              onClick={() => navigate(`/documents/${doc.id}`)}
              className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <FileText className="w-6 h-6 text-gray-400" />
                <div>
                  <h4 className="font-medium text-gray-900">{doc.name}</h4>
                  <p className="text-sm text-gray-500">
                    {new Date(doc.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="text-sm text-gray-600">
                {doc.fields.length} fields extracted
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;