import React from 'react';
import { File, X } from 'lucide-react';

interface UploadProgressProps {
  file: File;
  progress: number;
  onCancel: () => void;
}

export const UploadProgress: React.FC<UploadProgressProps> = ({
  file,
  progress,
  onCancel,
}) => {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center space-x-3">
        <File className="w-5 h-5 text-gray-500" />
        <div>
          <p className="font-medium">{file.name}</p>
          <p className="text-sm text-gray-500">
            {(file.size / 1024 / 1024).toFixed(2)} MB
          </p>
        </div>
      </div>
      
      <div className="flex items-center space-x-4">
        <div className="w-24 bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        
        <button
          onClick={onCancel}
          className="p-1 text-gray-400 hover:text-red-500 rounded-full"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};