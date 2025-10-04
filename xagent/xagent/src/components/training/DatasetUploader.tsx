import React, { useState } from 'react';
import { Upload, File, AlertCircle } from 'lucide-react';
import { DatasetManager } from '../../services/training/DatasetManager';
import type { TrainingDataset } from '../../types/training';

export const DatasetUploader: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const dataset: TrainingDataset = {
        name: file.name,
        description: 'Uploaded training dataset',
        data: await file.text(),
        metadata: {
          size: file.size,
          type: file.type,
          uploadedAt: new Date(),
        },
      };

      await DatasetManager.getInstance().uploadDataset(dataset);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div
        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors"
        onDrop={(e) => {
          e.preventDefault();
          const droppedFile = e.dataTransfer.files[0];
          if (droppedFile) setFile(droppedFile);
        }}
        onDragOver={(e) => e.preventDefault()}
      >
        <div className="flex flex-col items-center space-y-4">
          <Upload className="w-12 h-12 text-gray-400" />
          <div>
            <p className="text-lg font-medium">Drop training dataset here</p>
            <p className="text-sm text-gray-500">Support for CSV, JSON, or TXT files</p>
          </div>
        </div>
      </div>

      {file && (
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-3">
            <File className="w-5 h-5 text-gray-500" />
            <span>{file.name}</span>
          </div>
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center space-x-2 text-red-600">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};