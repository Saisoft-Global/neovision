import React from 'react';
import { useLabelStore } from '../store/labelStore';

interface FieldSelectorProps {
  documentType: string;
  selectedText: string;
  onLabelSelect: (labelId: string) => void;
  onClose: () => void;
  position: { x: number; y: number };
}

const FieldSelector: React.FC<FieldSelectorProps> = ({
  documentType,
  selectedText,
  onLabelSelect,
  onClose,
  position
}) => {
  const { getLabelsByDocType } = useLabelStore();
  const labels = getLabelsByDocType(documentType);

  return (
    <div
      className="absolute bg-white rounded-lg shadow-lg border p-2 z-50"
      style={{
        top: position.y,
        left: position.x,
        maxHeight: '300px',
        overflowY: 'auto'
      }}
    >
      <div className="mb-2 p-2 bg-gray-50 rounded">
        <p className="text-sm font-medium">Selected Text:</p>
        <p className="text-sm text-gray-600">{selectedText}</p>
      </div>
      
      <div className="space-y-1">
        {labels.map((label) => (
          <button
            key={label.id}
            onClick={() => {
              onLabelSelect(label.id);
              onClose();
            }}
            className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 rounded-lg"
          >
            <p className="font-medium">{label.name}</p>
            {label.description && (
              <p className="text-xs text-gray-500">{label.description}</p>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default FieldSelector;