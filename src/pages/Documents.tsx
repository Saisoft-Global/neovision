import { useNavigate } from 'react-router-dom';
import { File, Clock, CheckCircle, XCircle, Brain, Plus } from 'lucide-react';
import DocumentUploader from '../components/DocumentUploader';
import { useDocumentStore } from '../store/documentStore';
import { useEffect, useState } from 'react';
import { listDocuments, reprocessDocument as reprocessDoc, deleteDocument as deleteDoc } from '../services/api/document';

const Documents = () => {
  const documents = useDocumentStore((state) => state.documents);
  const navigate = useNavigate();
  const addDocument = useDocumentStore((state) => state.addDocument);
  const setDocuments = useDocumentStore((state) => state.setDocuments);
  const [currentUser, setCurrentUser] = useState<{id: string, organization_id: string} | null>(null);
  const [aiKbStatus, setAiKbStatus] = useState<{[key: string]: boolean}>({});

  // Get current user from auth context or default admin user
  useEffect(() => {
    const getUser = async () => {
      // Try to get from localStorage (if using simple auth)
      const userData = localStorage.getItem('user');
      if (userData) {
        try {
          const user = JSON.parse(userData);
          setCurrentUser({ id: user.id, organization_id: user.organization_id });
        } catch (e) {
          // Fallback to default admin user
          await getDefaultAdminUser();
        }
      } else {
        // Get default admin user from backend
        await getDefaultAdminUser();
      }
    };
    getUser();
  }, []);

  const getDefaultAdminUser = async () => {
    try {
      const response = await fetch('/api/admin/default-user');
      const data = await response.json();
      if (data.status === 'success' && data.user) {
        setCurrentUser({ 
          id: data.user.user_id, 
          organization_id: data.user.organization_id 
        });
        // Store in localStorage for future use
        localStorage.setItem('user', JSON.stringify({
          id: data.user.user_id,
          organization_id: data.user.organization_id,
          email: data.user.email,
          role: data.user.role
        }));
      } else {
        // Final fallback
        setCurrentUser({ id: 'user123', organization_id: 'org123' });
      }
    } catch (e) {
      // Final fallback
      setCurrentUser({ id: 'user123', organization_id: 'org123' });
    }
  };

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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My Documents</h1>
        {/* Optional backend badge: only shown after hydration succeeds */}
        <BackendStatusBadge />
      </div>
      
      <DocumentUploader />

      {/* Non-breaking: try to hydrate from backend persistence when available */}
      <HydrateFromBackend currentUser={currentUser} onHydrated={(docs) => {
        if (Array.isArray(docs) && docs.length > 0) {
          setDocuments(docs.map((d: any) => ({
            id: d.id,
            name: d.name || d.original_filename || 'Document',
            createdAt: d.created_at || new Date().toISOString(),
            status: d.status || 'completed',
            fields: Array.isArray(d.latest_extraction?.fields_json) ? d.latest_extraction.fields_json : [],
            meta: { backend: true }
          }))
          );
        }
      }} />

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
            <div className="mt-2 flex gap-2">
              <button
                className="text-xs text-blue-600 hover:underline"
                onClick={(e) => { e.stopPropagation(); reprocess(doc.id); }}
              >
                Reprocess
              </button>
              <button
                className="text-xs text-green-600 hover:underline flex items-center gap-1"
                onClick={(e) => { 
                  e.stopPropagation(); 
                  if (currentUser) {
                    addToAIKB(doc.id, currentUser.id);
                  }
                }}
                title="Add to AI Knowledge Base"
              >
                <Brain className="w-3 h-3" />
                Add to AI KB
              </button>
              <button
                className="text-xs text-red-600 hover:underline"
                onClick={(e) => { e.stopPropagation(); remove(doc.id); }}
              >
                Delete
              </button>
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

// Helper component to hydrate store from backend (no UI change if fails)
const HydrateFromBackend: React.FC<{ 
  currentUser: {id: string, organization_id: string} | null;
  onHydrated?: (docs: any[]) => void 
}> = ({ currentUser, onHydrated }) => {
  useEffect(() => {
    if (!currentUser) return;
    
    let active = true;
    (async () => {
      try {
        const data = await listDocuments(currentUser.id, 20, 0);
        if (active && Array.isArray(data?.documents)) {
          onHydrated?.(data.documents);
        }
      } catch {
        // ignore; backend persistence may be disabled
      }
    })();
    return () => { active = false; };
  }, [currentUser, onHydrated]);
  return null;
};

// Document operations backed by API (non-blocking)
async function reprocess(id: string) {
  try {
    await reprocessDoc(id);
  } catch {}
}

async function remove(id: string) {
  try {
    await deleteDoc(id);
  } catch {}
}

async function addToAIKB(documentId: string, userId: string) {
  try {
    const response = await fetch('/api/ai/knowledge/add-document', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        document_id: documentId,
        user_id: userId
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('Document added to AI KB:', result);
      return true;
    } else {
      throw new Error('Failed to add to AI KB');
    }
  } catch (error) {
    console.error('Error adding document to AI KB:', error);
    return false;
  }
}

// Small badge showing if backend persistence is detected
const BackendStatusBadge: React.FC = () => {
  const docs = useDocumentStore((s) => s.documents);
  const hasBackendDocs = docs.some((d) => d.meta?.backend);
  if (!hasBackendDocs) return null;
  return (
    <span className="inline-flex items-center gap-2 text-xs px-2 py-1 rounded bg-green-50 text-green-700 border border-green-200">
      <span className="w-2 h-2 rounded-full bg-green-500"></span>
      Live from backend
    </span>
  );
};