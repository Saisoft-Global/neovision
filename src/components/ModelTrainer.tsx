import React, { useState, useCallback } from 'react';
import { Upload, Save, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import type { Field } from '../store/documentStore';
import { trainModel } from '../services/trainingService';
import DocumentViewer from './DocumentViewer';
import { extractByBbox } from '../services/document';

// Annotation service functions
const saveAnnotations = async (documentId: string, annotations: any[]) => {
  const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/annotation/save`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      document_id: documentId,
      annotations: annotations
    })
  });
  
  if (!response.ok) {
    throw new Error('Failed to save annotations');
  }
  
  return response.json();
};

const loadAnnotations = async (documentId: string) => {
  const encodedDocumentId = encodeURIComponent(documentId);
  const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/annotation/${encodedDocumentId}`);
  
  if (!response.ok) {
    if (response.status === 404) {
      return null; // No annotations found
    }
    throw new Error('Failed to load annotations');
  }
  
  return response.json();
};

const ACCEPTED_TYPES = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png']
};

interface ModelTrainerProps {
  onTrainingComplete?: () => void;
}

const ModelTrainer: React.FC<ModelTrainerProps> = ({ onTrainingComplete }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [annotations, setAnnotations] = useState<any[]>([]);
  const [modelName, setModelName] = useState('');
  const [documentType, setDocumentType] = useState('invoice');
  const [isTraining, setIsTraining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [redrawIndex, setRedrawIndex] = useState<number | null>(null);
  const [selectedField, setSelectedField] = useState<Field | null>(null);
  const [documentIds, setDocumentIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: ACCEPTED_TYPES,
    onDrop: async acceptedFiles => {
      setFiles(acceptedFiles);
      
      // Generate unique document IDs for each file
      const newDocumentIds = acceptedFiles.map(file => 
        `training_${Date.now()}_${Math.random().toString(36).slice(2)}_${file.name.replace(/[^a-zA-Z0-9]/g, '_')}`
      );
      setDocumentIds(newDocumentIds);
      
      // Initialize annotations array and try to load existing annotations
      const initialAnnotations = [];
      for (let i = 0; i < acceptedFiles.length; i++) {
        try {
          const existingAnnotations = await loadAnnotations(newDocumentIds[i]);
          if (existingAnnotations && existingAnnotations.annotations) {
            initialAnnotations.push({ labels: existingAnnotations.annotations });
            console.log(`Loaded existing annotations for ${acceptedFiles[i].name}`);
          } else {
            initialAnnotations.push({ labels: [] });
          }
        } catch (error) {
          console.log(`No existing annotations for ${acceptedFiles[i].name}, starting fresh`);
          initialAnnotations.push({ labels: [] });
        }
      }
      
      setAnnotations(initialAnnotations);
    },
    disabled: isTraining,
  });

  // Debounced auto-save to avoid spamming server while annotating
  const [saveTimer, setSaveTimer] = useState<NodeJS.Timeout | null>(null);

  const handleFieldsUpdate = useCallback((fields: Field[]) => {
    const updatedAnnotations = [...annotations];
    updatedAnnotations[currentFileIndex] = {
      labels: fields.map(field => ({
        text: field.value,
        bbox: field.bbox || [0, 0, 0, 0],
        label_id: getLabelId(field.label),
        pageNumber: field.pageNumber || 1,
        stableId: field.id // Ensure stableId is preserved
      }))
    };
    setAnnotations(updatedAnnotations);
    
    // Debounced auto-save (1s idle)
    if (documentIds[currentFileIndex]) {
      if (saveTimer) clearTimeout(saveTimer);
      const t = setTimeout(() => {
        saveAnnotations(documentIds[currentFileIndex], updatedAnnotations[currentFileIndex].labels)
          .then(() => console.log('Annotations auto-saved'))
          .catch(error => console.error('Failed to auto-save annotations:', error));
      }, 1000);
      setSaveTimer(t);
    }
  }, [annotations, currentFileIndex, documentIds, saveTimer]);

  const getLabelId = (label: string): number => {
    const labelMap: { [key: string]: number } = {
      'Invoice Number': 1,
      'Date': 2,
      'Total Amount': 3,
      'Vendor Name': 4,
      'Customer Name': 5,
      'Line Item': 6
    };
    return labelMap[label] || 0;
  };

  const handleSaveAnnotations = async () => {
    if (files.length === 0) return;
    
    setIsSaving(true);
    setError(null);
    
    try {
      // Save all annotations for all documents
      const savePromises = annotations.map((annotation, index) => {
        if (documentIds[index] && annotation.labels.length > 0) {
          return saveAnnotations(documentIds[index], annotation.labels);
        }
        return Promise.resolve();
      });
      
      await Promise.all(savePromises);
      console.log('All annotations saved successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save annotations');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTrainModel = async () => {
    if (!modelName || files.length === 0) {
      setError('Please upload documents and enter a model name');
      return;
    }

    setIsTraining(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Save all annotations before training
      await handleSaveAnnotations();
      
      console.log('Starting training with:', {
        files: files.length,
        annotations: annotations.length,
        modelName,
        documentType
      });
      
      const response = await trainModel({
        files,
        annotations,
        modelName,
        documentType
      });
      
      console.log('Training response:', response);
      setSuccessMessage(`Model "${modelName}" trained successfully! 
        Documents: ${response.num_documents || files.length}
        Annotations: ${response.total_annotations || 'N/A'}
        Model saved to: ${response.model_path || 'models/trained'}`);
      
      onTrainingComplete?.();
    } catch (err) {
      console.error('Training error:', err);
      setError(err instanceof Error ? err.message : 'Training failed');
    } finally {
      setIsTraining(false);
    }
  };

  const LABEL_OPTIONS = [
    { id: 1, name: 'Invoice Number' },
    { id: 2, name: 'Date' },
    { id: 3, name: 'Total Amount' },
    { id: 4, name: 'Vendor Name' },
    { id: 5, name: 'Customer Name' },
    { id: 6, name: 'Line Item' },
  ];


  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-medium mb-4">Model Configuration</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Model Name
            </label>
            <input
              type="text"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="e.g., invoice-processor-v1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Document Type
            </label>
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="invoice">Invoice</option>
              <option value="receipt">Receipt</option>
              <option value="purchase_order">Purchase Order</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-medium mb-4">Training Documents</h2>
        
        {files.length === 0 ? (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors
              ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'}
              ${isTraining ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <input {...getInputProps()} />
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-700 mb-2">
              Upload training documents
            </p>
            <p className="text-sm text-gray-500">
              Drag & drop files or click to select
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-4 mb-4">
              {files.map((file, index) => (
                <button
                  key={file.name}
                  onClick={() => {
                    setCurrentFileIndex(index);
                    setSelectedField(null); // Clear selection when switching documents
                  }}
                  className={`px-4 py-2 rounded-lg text-sm ${
                    index === currentFileIndex
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Document {index + 1}
                </button>
              ))}
            </div>

            <DocumentViewer
              key={`training_${currentFileIndex}`}
              document={{
                id: `training_${currentFileIndex}`,
                name: files[currentFileIndex].name,
                type: files[currentFileIndex].type,
                url: URL.createObjectURL(files[currentFileIndex]),
                status: 'completed',
                documentType,
                fields: annotations[currentFileIndex]?.labels.map((label: any) => ({
                  id: label.stableId || `field_${label.label_id}_${label.tempId || 'stable'}`,
                  label: LABEL_OPTIONS.find(o => o.id === label.label_id)?.name || 'Invoice Number',
                  value: label.text,
                  confidence: 1,
                  bbox: label.bbox,
                  pageNumber: label.pageNumber || 1
                })) || [],
                createdAt: new Date().toISOString()
              }}
              selectedField={selectedField}
              onFieldSelect={async (field, canvasW, canvasH) => {
                console.log('Field selected:', field); // Debug
                setSelectedField(field);
                
                // Always try to extract value when selecting a field (for re-extraction)
                if (field && field.bbox) {
                  // Skip if same field+bbox was just extracted
                  const lastKeyRef = (window as any).__lastExtractKey || null;
                  const key = `${files[currentFileIndex]?.name}:${field.id}:${(field.bbox || []).join(',')}:${canvasW || 0}x${canvasH || 0}`;
                  if (lastKeyRef === key) {
                    return;
                  }
                  (window as any).__lastExtractKey = key;
                  console.log('Attempting value extraction for field:', field.id); // Debug
                  try {
                    // Prefer actual canvas size from DocumentViewer when provided
                    const extractedValue = await extractByBbox(
                      files[currentFileIndex],
                      field.bbox,
                      { width: canvasW || 800, height: canvasH || 600 }
                    );
                    console.log('Extracted value for field:', extractedValue); // Debug
                    
                    if (extractedValue && extractedValue.trim() !== '') {
                      // Update the field with the extracted value
                      const updatedField = { ...field, value: extractedValue };
                      setSelectedField(updatedField);
                      
                      // Update the annotation data
                      const updated = [...annotations];
                      const fileAnn = { ...(updated[currentFileIndex] || { labels: [] }) };
                      const labels = [...(fileAnn.labels || [])];
                      const idx = labels.findIndex((l: any) => l && l.stableId === field.id);
                      if (idx !== -1) {
                        labels[idx] = { ...labels[idx], text: extractedValue };
                        fileAnn.labels = labels;
                        updated[currentFileIndex] = fileAnn;
                        setAnnotations(updated);
                        console.log('Updated annotation with extracted value'); // Debug
                      }
                    }
                  } catch (e) {
                    console.log('Failed to extract value for field:', e); // Debug
                  }
                }
              }}
              onFieldsUpdate={handleFieldsUpdate}
              onTableCreate={async (bbox, canvasW, canvasH, pageNumber, rows, cols) => {
                // Create table fields with auto-extraction
                const base = [...annotations];
                const fileAnn = { ...(base[currentFileIndex] || { labels: [] }) };
                const labels = [...(fileAnn.labels || [])];
                
                const cellWidth = bbox[2] / cols;
                const cellHeight = bbox[3] / rows;
                
                for (let row = 0; row < rows; row++) {
                  for (let col = 0; col < cols; col++) {
                    const cellBbox: [number, number, number, number] = [
                      bbox[0] + col * cellWidth,
                      bbox[1] + row * cellHeight,
                      cellWidth,
                      cellHeight
                    ];
                    
                    const stableId = `table_${Date.now()}_${row}_${col}_${Math.random().toString(36).slice(2)}`;
                    const tempId = `tmp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
                    
                    labels.push({ 
                      text: '', 
                      bbox: cellBbox, 
                      label_id: 1, // Default to "Invoice Number"
                      tempId, 
                      pageNumber, 
                      stableId 
                    } as any);
                    
                    // Try to extract text from each cell
                    try {
                      // Use actual PDF dimensions for better scaling if available
                      const value = await extractByBbox(
                        files[currentFileIndex],
                        cellBbox,
                        { width: canvasW, height: canvasH }
                      );
                      console.log(`Table cell [${row},${col}] extracted value:`, value); // Debug
                      
                      const labelIndex = labels.findIndex((l: any) => l && (l as any).tempId === tempId);
                      if (labelIndex !== -1) {
                        labels[labelIndex] = { ...(labels[labelIndex] as any), text: value } as any;
                      }
                    } catch (e) {
                      console.log(`Table cell [${row},${col}] extraction failed:`, e); // Debug
                      // Ignore extraction failures
                    }
                  }
                }
                
                fileAnn.labels = labels;
                base[currentFileIndex] = fileAnn;
                setAnnotations(base);
              }}
              onBoxCreate={async (bbox, canvasW, canvasH, pageNumber) => {
                // Ensure annotations array is initialized
                const base = [...annotations];
                const fileAnn = { ...(base[currentFileIndex] || { labels: [] }) };
                const labels = [...(fileAnn.labels || [])];
                // If we are redrawing existing label, update its bbox; else add a new temp entry
                let tempId: string | null = null;
                let targetIndex: number | null = null;
                if (redrawIndex !== null && labels[redrawIndex]) {
                  targetIndex = redrawIndex;
                  labels[targetIndex] = { ...(labels[targetIndex] as any), bbox } as any;
                  setRedrawIndex(null);
                } else {
                  tempId = `tmp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
                  const stableId = `annotation_${Date.now()}_${Math.random().toString(36).slice(2)}`;
                  labels.push({ text: '', bbox, label_id: 1, tempId, pageNumber, stableId } as any); // Default to "Invoice Number" (ID: 1)
                  targetIndex = labels.length - 1;
                }
                fileAnn.labels = labels;
                base[currentFileIndex] = fileAnn;
                setAnnotations(base);
                
                // Try to extract text from the bbox using backend FIRST
                let extractedValue = '';
                try {
                  extractedValue = await extractByBbox(
                    files[currentFileIndex],
                    bbox,
                    { width: canvasW, height: canvasH }
                  );
                  console.log('Extracted value:', extractedValue); // Debug
                } catch (e) {
                  console.log('Text extraction failed:', e); // Debug
                  // Ignore extraction failures; user can type value manually
                }

                // Update the annotation with the extracted text
                const next = [...base];
                const fa = { ...(next[currentFileIndex] || { labels: [] }) };
                const ls = [...(fa.labels || [])];
                if (tempId) {
                  const idx = ls.findIndex((l: any) => l && (l as any).tempId === tempId);
                  if (idx !== -1) ls[idx] = { ...(ls[idx] as any), text: extractedValue } as any;
                } else if (targetIndex !== null && ls[targetIndex]) {
                  ls[targetIndex] = { ...(ls[targetIndex] as any), text: extractedValue } as any;
                }
                fa.labels = ls;
                next[currentFileIndex] = fa;
                setAnnotations(next);

                // Auto-select the newly created field to show popover WITH the extracted value
                if (targetIndex !== null && ls[targetIndex]) {
                  const newField: Field = {
                    id: ls[targetIndex].stableId,
                    label: 'Invoice Number', // Default label
                    value: extractedValue, // Use the extracted value
                    confidence: 1,
                    bbox: ls[targetIndex].bbox,
                    pageNumber: ls[targetIndex].pageNumber || 1
                  };
                  console.log('Setting selected field with value:', newField); // Debug
                  setSelectedField(newField);
                }
              }}
              onDeleteField={(fieldId) => {
                const updated = [...annotations];
                const fileAnn = { ...(updated[currentFileIndex] || { labels: [] }) };
                fileAnn.labels = (fileAnn.labels || []).filter((l: any) => l && l.stableId !== fieldId);
                updated[currentFileIndex] = fileAnn;
                setAnnotations(updated);
              }}
              onUpdateField={(field) => {
                // Find matching label by stable ID
                const updated = [...annotations];
                const fileAnn = { ...(updated[currentFileIndex] || { labels: [] }) };
                const labels = [...(fileAnn.labels || [])];
                const idx = labels.findIndex(l => l && l.stableId === field.id);
                if (idx !== -1) {
                  labels[idx] = { ...labels[idx], text: field.value, bbox: field.bbox };
                  fileAnn.labels = labels;
                  updated[currentFileIndex] = fileAnn;
                  setAnnotations(updated);
                  
                  // Update the selected field to reflect the value change
                  if (selectedField && selectedField.id === field.id) {
                    setSelectedField({ ...selectedField, value: field.value });
                  }
                }
              }}
              labelOptions={LABEL_OPTIONS}
              onChangeLabel={(field, labelName) => {
                console.log('onChangeLabel called:', { field, labelName }); // Debug
                const updated = [...annotations];
                const fileAnn = { ...(updated[currentFileIndex] || { labels: [] }) };
                const labels = [...(fileAnn.labels || [])];
                const idx = labels.findIndex(l => l && l.stableId === field.id);
                const opt = LABEL_OPTIONS.find(o => o.name === labelName);
                console.log('Found label index:', idx, 'Label option:', opt); // Debug
                if (idx !== -1 && opt) {
                  labels[idx] = { ...labels[idx], label_id: opt.id };
                  fileAnn.labels = labels;
                  updated[currentFileIndex] = fileAnn;
                  setAnnotations(updated);
                  
                  // Update the selected field to reflect the label change
                  if (selectedField && selectedField.id === field.id) {
                    setSelectedField({ ...selectedField, label: labelName });
                  }
                  
                  console.log('Label updated successfully'); // Debug
                } else {
                  console.log('Failed to update label - idx:', idx, 'opt:', opt); // Debug
                }
              }}
            />

            {/* Instructions for annotation */}
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium mb-2 text-blue-800">Annotation Instructions</h3>
              <div className="text-sm text-blue-700 space-y-1">
                <p>• <strong>Draw boxes</strong> on the document to create field annotations</p>
                <p>• <strong>Click on boxes</strong> to edit labels and values directly on the document</p>
                <p>• <strong>Use Table mode</strong> to capture line items in one click</p>
                <p>• <strong>Press Shift</strong> while drawing for square boxes</p>
                <p>• <strong>Press Esc</strong> to cancel drawing</p>
                <p>• <strong>Annotations auto-save</strong> as you work</p>
              </div>
            </div>
            
            {/* Annotation status */}
            {documentIds[currentFileIndex] && (
              <div className="mt-2 text-xs text-gray-500">
                Document ID: {documentIds[currentFileIndex]}
                <br />
                Annotations: {annotations[currentFileIndex]?.labels?.length || 0} fields
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-green-50 text-green-700 rounded-lg flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          <span className="whitespace-pre-line">{successMessage}</span>
        </div>
      )}

      <div className="flex gap-4">
        <button
          onClick={handleSaveAnnotations}
          disabled={isSaving || files.length === 0}
          className="flex-1 btn btn-secondary flex items-center justify-center gap-2"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Save Annotations
            </>
          )}
        </button>

      <button
        onClick={handleTrainModel}
        disabled={isTraining || !modelName || files.length === 0}
          className="flex-1 btn btn-primary flex items-center justify-center gap-2"
      >
        {isTraining ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Training Model...
          </>
        ) : (
          <>
            <Save className="w-5 h-5" />
            Train Model
          </>
        )}
      </button>
      </div>
    </div>
  );
};

export default ModelTrainer;