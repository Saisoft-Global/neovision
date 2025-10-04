import React from 'react';
import { Upload, AlertCircle } from 'lucide-react';
import { validateFile } from '../../utils/file';

interface UploadZoneProps {
  onFileSelect: (file: File) => void;
  error?: string | null;
}

export const UploadZone: React.FC<UploadZoneProps> = ({ onFileSelect, error }) => {
  const [isDragging, setIsDragging] = React.useState(false);

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      const validation = await validateFile(file);
      if (validation.isValid) {
        onFileSelect(file);
      }
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validation = await validateFile(file);
      if (validation.isValid) {
        onFileSelect(file);
      }
    }
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-blue-500'
        }`}
      >
        <input
          type="file"
          onChange={handleFileInput}
          className="hidden"
          accept=".pdf,.txt,.doc,.docx,.xls,.xlsx"
          id="file-upload"
        />
        <label htmlFor="file-upload" className="cursor-pointer">
          <div className="flex flex-col items-center space-y-4">
            <Upload className="w-12 h-12 text-gray-400" />
            <div>
              <p className="text-lg font-medium">Drop files here or click to upload</p>
              <p className="text-sm text-gray-500">
                Support for PDF, TXT, and Office files (max 10MB)
              </p>
            </div>
          </div>
        </label>
      </div>

      {error && (
        <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};