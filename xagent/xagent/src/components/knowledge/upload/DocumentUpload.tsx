import React, { useState } from 'react';
import { FileUploadZone } from '../../upload/FileUploadZone';
import { UploadProgress } from '../../upload/UploadProgress';
import { Alert } from '../../common/Alert';
import { useKnowledgeStore } from '../../../store/knowledgeStore';
import { BrowserDocumentProcessor } from '../../../services/document/processors/BrowserDocumentProcessor';

interface DocumentUploadProps {
  onSuccess: () => void;
  onError: (error: string) => void;
}

export const DocumentUpload: React.FC<DocumentUploadProps> = ({ onSuccess, onError }) => {
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const { addDocument } = useKnowledgeStore();
  const processor = BrowserDocumentProcessor.getInstance();

  const handleFileSelect = async (file: File) => {
    try {
      setCurrentFile(file);
      setError(null);
      setUploadProgress(20);

      // Process file content with retries
      let content;
      try {
        content = await processor.processDocument(file);
      } catch (error: any) {
        if (error.message.includes('Failed to fetch')) {
          // Retry once with a delay for worker loading
          await new Promise(resolve => setTimeout(resolve, 1000));
          content = await processor.processDocument(file);
        } else {
          throw error;
        }
      }

      setUploadProgress(40);

      // Create document object
      const doc = {
        id: crypto.randomUUID(),
        title: file.name,
        content,
        doc_type: file.type,
        metadata: {
          uploadedAt: new Date().toISOString(),
          size: file.size,
          mimeType: file.type,
          processingStatus: 'success'
        },
        status: 'pending'
      };

      setUploadProgress(60);

      // Add to knowledge base
      await addDocument(doc);
      setUploadProgress(100);
      onSuccess();

      setTimeout(() => {
        setCurrentFile(null);
        setUploadProgress(0);
      }, 1000);

    } catch (error: any) {
      console.error('Upload error:', error);
      const message = error instanceof Error ? error.message : 'Failed to upload document';
      setError(message);
      onError(message);
      setCurrentFile(null);
      setUploadProgress(0);
    }
  };

  return (
    <div className="space-y-4">
      <FileUploadZone 
        onFileSelect={handleFileSelect}
        error={error}
      />
      
      {currentFile && (
        <UploadProgress
          file={currentFile}
          progress={uploadProgress}
          onCancel={() => setCurrentFile(null)}
        />
      )}

      {error && (
        <Alert
          type="error"
          message={error}
        />
      )}
    </div>
  );
};