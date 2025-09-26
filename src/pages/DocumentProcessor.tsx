import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useDocumentStore, Field } from '../store/documentStore';
import DocumentViewer from '../components/DocumentViewer';
import FieldsPanel from '../components/FieldsPanel';
import FeedbackPanel from '../components/FeedbackPanel';
import { processDocument } from '../services/documentService';
import { submitFeedback } from '../services/feedbackService';
import type { FieldFeedback } from '../store/feedbackStore';

const DocumentProcessor: React.FC = () => {
  const { id } = useParams();
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedField, setSelectedField] = useState<Field | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const { documents, updateFields, setDocumentError, setDocumentMeta } = useDocumentStore();
  const document = documents.find(doc => doc.id === id);
  const [pipelineUsed, setPipelineUsed] = useState<{ ocr?: string; ner?: string } | undefined>();
  const [rawResponse, setRawResponse] = useState<any>(undefined);
  const [documentType, setDocumentType] = useState<string>('unknown');
  const [extractedFields, setExtractedFields] = useState<Record<string, any> | undefined>();
  const [tables, setTables] = useState<any[] | undefined>();

  useEffect(() => {
    const processUploadedDocument = async () => {
      if (!document || document.status !== 'processing' || isProcessing) return;

      setIsProcessing(true);
      try {
        const result = await processDocument(document);
        updateFields(document.id, result.fields);
        setPipelineUsed(result.pipelineUsed);
        setRawResponse(result.raw);
        setDocumentType(result.documentType);
        // Be lenient with shapes coming from backend
        setExtractedFields(
          result.extractedFields || (result.raw && (result.raw.extracted_fields || result.raw.extractedFields))
        );
        setTables(result.tables || (result.raw && result.raw.tables) || []);
        setDocumentMeta(document.id, {
          raw: result.raw,
          pipelineUsed: result.pipelineUsed,
          documentType: result.documentType,
          extractedFields: result.extractedFields || (result.raw && (result.raw.extracted_fields || result.raw.extractedFields)),
          tables: result.tables || (result.raw && result.raw.tables) || []
        });
      } catch (error) {
        console.error('Error processing document:', error);
        setDocumentError(document.id);
      } finally {
        setIsProcessing(false);
      }
    };

    processUploadedDocument();
  }, [document, updateFields, setDocumentError, isProcessing]);

  if (!document) {
    return <div>Document not found</div>;
  }

  const handleFieldsUpdate = (fields: Field[]) => {
    updateFields(document.id, fields);
  };

  const handleFeedbackSubmit = (feedback: FieldFeedback[]) => {
    if (!document) return;
    submitFeedback(document.id, feedback).catch(console.error);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{document.name}</h1>
        <button
          onClick={() => setShowFeedback(!showFeedback)}
          className="btn btn-secondary"
        >
          {showFeedback ? 'Hide Feedback' : 'Show Feedback'}
        </button>
      </div>
      
      <div className="flex gap-6">
        <DocumentViewer 
          document={document} 
          onFieldsUpdate={handleFieldsUpdate}
          selectedField={selectedField}
          onFieldSelect={setSelectedField}
        />
        <FieldsPanel 
          fields={document.fields}
          isProcessing={isProcessing}
          onFieldsUpdate={handleFieldsUpdate}
          selectedField={selectedField}
          onFieldSelect={setSelectedField}
          documentType={documentType}
          pipelineUsed={pipelineUsed || document.meta?.pipelineUsed}
          rawResponse={rawResponse || document.meta?.raw}
          extractedFields={
            extractedFields || document.meta?.extractedFields || document.meta?.raw?.extracted_fields || document.meta?.raw?.extractedFields
          }
          tables={tables || document.meta?.tables}
        />
        {showFeedback && (
          <FeedbackPanel
            documentId={document.id}
            fields={document.fields}
            onFeedbackSubmit={handleFeedbackSubmit}
          />
        )}
      </div>
    </div>
  );
};

export default DocumentProcessor;