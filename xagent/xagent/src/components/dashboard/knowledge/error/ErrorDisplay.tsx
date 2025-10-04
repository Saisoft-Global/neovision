import React from 'react';

interface ErrorDisplayProps {
  message: string;
  onRetry: () => void;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ message, onRetry }) => (
  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
    <p className="text-red-700">Error: {message}</p>
    <button 
      onClick={onRetry}
      className="mt-2 px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200"
    >
      Retry
    </button>
  </div>
);