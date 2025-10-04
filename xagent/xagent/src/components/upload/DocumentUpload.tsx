import React, { useState } from 'react';
import { UploadZone } from './UploadZone';
import { UploadProgress } from './UploadProgress';
import { processFileContent } from '../../utils/document';
import { useDocumentStore } from '../../store/documentStore';
import { DocumentProcessor } from '../../services/document/DocumentProcessor';
import { getFileType } from '../../utils/file';
import { Alert } from '../common/Alert';

export const DocumentUpload: React.FC = () => {
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const { uploadDocument } = useDocumentStore();
  const processor = DocumentProcessor.getInstance();

  const handleFileSelect = async (file: File) => {
    try {
      setCurrentFile(file);
      setError(null);
      setUploadProgress(20);

      // Process file content with retries
      let content;
      try {
        content = await processFileContent(file);
      } catch (error: any) {
        if (error.message.includes('Failed to fetch')) {
          // Retry once with a delay for worker loading
          await new Promise(resolve => setTimeout(resolve, 1000));
          content = await processFileContent(file);
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
        doc_type: getFileType(file.type),
        metadata: {
          uploadedAt: new Date().toISOString(),
          size: file.size,
          mimeType: file.type,
        },
        status: 'pending' as const,
      };

      setUploadProgress(60);

      // Upload document to Supabase
      await uploadDocument(doc);
      setUploadProgress(80);

      // Process document
      try {
        await processor.processDocument(doc);
      } catch (error: any) {
        console.error('Document processing error:', error);
        setError(`Processing warning: ${error.message}`);
        // Don't rethrow - we want to keep the upload "successful"
      }

      setUploadProgress(100);
      setTimeout(() => {
        setCurrentFile(null);
        setUploadProgress(0);
      }, 500);

    } catch (error: any) {
      console.error('Upload error:', error);
      setError(error.message || 'Failed to upload document');
      setCurrentFile(null);
      setUploadProgress(0);
    }
  };

  return (
    <div className="space-y-4">
      <UploadZone onFileSelect={handleFileSelect} />
      
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