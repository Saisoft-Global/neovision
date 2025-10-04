import React, { useState } from 'react';
import { FileUploadZone } from '../upload/FileUploadZone';
import { UploadProgress } from '../upload/UploadProgress';
import { Alert } from '../common/Alert';
import { useDocumentStore } from '../../store/documentStore';
import { BrowserDocumentProcessor } from '../../services/document/processors/BrowserDocumentProcessor';

interface DocumentUploadProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export const DocumentUpload: React.FC<DocumentUploadProps> = ({ 
  onSuccess, 
  onError 
}) => {
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const { uploadDocument } = useDocumentStore();
  const processor = BrowserDocumentProcessor.getInstance();

  const handleFileSelect = async (file: File) => {
    try {
      setCurrentFile(file);
      setError(null);
      setUploadProgress(20);

      // Process file content with retries and validation
      let content: string;
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          content = await processor.processDocument(file);
          
          // Validate content
          if (!content?.trim()) {
            throw new Error('No content could be extracted from file');
          }
          
          break;
        } catch (error: any) {
          retryCount++;
          
          // Handle specific errors
          if (error.message.includes('worker')) {
            if (retryCount < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
              continue;
            }
          }
          
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
          originalName: file.name,
          processingStatus: 'success'
        },
        status: 'pending'
      };

      setUploadProgress(60);

      // Add to knowledge base
      await uploadDocument(doc);
      setUploadProgress(100);
      onSuccess?.();

      setTimeout(() => {
        setCurrentFile(null);
        setUploadProgress(0);
      }, 1000);

    } catch (error: any) {
      console.error('Upload error:', error);
      const message = error instanceof Error ? error.message : 'Failed to upload document';
      setError(message);
      onError?.(message);
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
          onCancel={() => {
            setCurrentFile(null);
            setUploadProgress(0);
            setError(null);
          }}
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