import React from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Download } from 'lucide-react';

export const GraphControls: React.FC = () => {
  const handleZoomIn = () => {
    const event = new CustomEvent('graph-zoom', { detail: { scale: 1.2 } });
    window.dispatchEvent(event);
  };

  const handleZoomOut = () => {
    const event = new CustomEvent('graph-zoom', { detail: { scale: 0.8 } });
    window.dispatchEvent(event);
  };

  const handleReset = () => {
    const event = new CustomEvent('graph-reset');
    window.dispatchEvent(event);
  };

  const handleExport = () => {
    const event = new CustomEvent('graph-export');
    window.dispatchEvent(event);
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleZoomIn}
        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
        title="Zoom In"
      >
        <ZoomIn className="w-5 h-5" />
      </button>
      <button
        onClick={handleZoomOut}
        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
        title="Zoom Out"
      >
        <ZoomOut className="w-5 h-5" />
      </button>
      <button
        onClick={handleReset}
        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
        title="Reset View"
      >
        <RotateCcw className="w-5 h-5" />
      </button>
      <button
        onClick={handleExport}
        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
        title="Export Graph"
      >
        <Download className="w-5 h-5" />
      </button>
    </div>
  );
};