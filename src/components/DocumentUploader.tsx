// project/src/components/DocumentUploader.tsx
import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Loader2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDocumentStore } from '../store/documentStore';
import { processDocument, createDocument } from '../services/documentService';

const ACCEPTED_TYPES = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png']
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const DocumentUploader: React.FC = () => {
  const navigate = useNavigate();
  const { addDocument, updateFields, setDocumentError, setDocumentMeta } = useDocumentStore();
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    setError(null);
    setIsProcessing(true);
    
    const file = acceptedFiles[0];
    const doc = createDocument(file);
    
    try {
      addDocument(doc);
      const result = await processDocument(doc);
      
      if (!result || !result.fields) {
        throw new Error('Invalid response from server');
      }

      const serializedFields = result.fields.map(field => ({
        ...field,
        bbox: field.bbox && field.bbox.length === 4 ? (field.bbox as [number, number, number, number]) : undefined,
      }));

      updateFields(doc.id, serializedFields);
      setDocumentMeta(doc.id, {
        raw: result.raw,
        pipelineUsed: result.pipelineUsed,
        documentType: result.documentType,
        extractedFields: result.extractedFields,
        tables: result.tables
      });
      navigate(`/documents/${doc.id}`);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to process document';
      setError(errorMessage);
      setDocumentError(doc.id);
    } finally {
      setIsProcessing(false);
    }
  }, [addDocument, navigate, updateFields, setDocumentError]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    disabled: isProcessing,
    maxSize: MAX_FILE_SIZE,
    multiple: false,
  });

  return (
    <div>
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'}
          ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} />
        {isProcessing ? (
          <Loader2 className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-spin" />
        ) : (
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        )}
        <p className="text-lg font-medium text-gray-700 mb-2">
          {isProcessing ? 'Processing...' : isDragActive ? 'Drop files here' : 'Drag & drop files here'}
        </p>
        <p className="text-sm text-gray-500">
          {isProcessing ? 'Please wait while we process your document' : 'or click to select files'}
        </p>
        <p className="text-xs text-gray-400 mt-2">
          Supported formats: PDF, JPEG, PNG (max 10MB)
        </p>
      </div>
      
      {error && (
        <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default DocumentUploader;