import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/Tabs';
import { URLInput } from './url/URLInput';
import { TextInput } from './text/TextInput';
import { DocumentUpload } from './upload/DocumentUpload';
import { Alert } from '../common/Alert';
import { useKnowledgeStore } from '../../store/knowledgeStore';
import { Plus, Upload, Link as LinkIcon, FileText } from 'lucide-react';

export const KnowledgeToolbar: React.FC = () => {
  const { fetchDocuments } = useKnowledgeStore();
  const [error, setError] = useState<string | null>(null);

  const handleSuccess = () => {
    setError(null);
    fetchDocuments();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Add Knowledge</h2>
      </div>

      <Tabs defaultValue="file" className="w-full">
        <TabsList className="grid w-full grid-cols-3 gap-4 bg-gray-100 p-1 rounded-lg">
          <TabsTrigger 
            value="file"
            className="flex items-center gap-2 py-2 px-4 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            <Upload className="w-4 h-4" />
            <span>Upload File</span>
          </TabsTrigger>
          
          <TabsTrigger 
            value="url"
            className="flex items-center gap-2 py-2 px-4 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            <LinkIcon className="w-4 h-4" />
            <span>Add URL</span>
          </TabsTrigger>
          
          <TabsTrigger 
            value="text"
            className="flex items-center gap-2 py-2 px-4 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            <FileText className="w-4 h-4" />
            <span>Add Text</span>
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="file">
            <DocumentUpload onSuccess={handleSuccess} onError={setError} />
          </TabsContent>
          
          <TabsContent value="url">
            <URLInput onSuccess={handleSuccess} onError={setError} />
          </TabsContent>
          
          <TabsContent value="text">
            <TextInput onSuccess={handleSuccess} onError={setError} />
          </TabsContent>
        </div>
      </Tabs>

      {error && (
        <Alert
          type="error"
          message={error}
        />
      )}
    </div>
  );
};