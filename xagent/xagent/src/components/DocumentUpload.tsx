import React, { useState } from 'react';
import { FileUploadZone } from './upload/FileUploadZone';
import { UploadProgress } from './upload/UploadProgress';
import { processFileContent } from '../utils/document';
import { useDocumentStore } from '../store/documentStore';
import { getFileType } from '../utils/file';

export const DocumentUpload: React.FC = () => {
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { uploadDocument } = useDocumentStore();

  const handleFileSelect = async (file: File) => {
    setCurrentFile(file);
    setError(null);
    setUploadProgress(0);

    try {
      const content = await processFileContent(file);
      
      const doc = {
        id: crypto.randomUUID(),
        title: file.name,
        content,
        type: getFileType(file.type),
        metadata: {
          uploadedAt: new Date(),
          size: file.size,
          mimeType: file.type,
        },
        status: 'pending',
      };

      // Simulate upload progress
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 10;
        });
      }, 200);

      await uploadDocument(doc);
      setCurrentFile(null);
      setUploadProgress(0);
    } catch (err: any) {
      setError(err.message);
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
          onCancel={() => setCurrentFile(null)}
          progress={uploadProgress}
        />
      )}
    </div>
  );
};