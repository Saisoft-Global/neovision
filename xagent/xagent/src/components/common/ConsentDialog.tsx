import React from 'react';

interface ConsentDialogProps {
  open: boolean;
  onConfirm: (details?: Record<string, unknown>) => void;
  onCancel: () => void;
  title?: string;
  summary: string;
  extra?: React.ReactNode;
}

export const ConsentDialog: React.FC<ConsentDialogProps> = ({
  open,
  onConfirm,
  onCancel,
  title = 'Confirm action',
  summary,
  extra
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl p-6">
        <h2 className="text-lg font-semibold mb-2">{title}</h2>
        <p className="text-sm text-gray-600 mb-4">{summary}</p>

        {extra}

        <div className="flex justify-end gap-2 mt-4">
          <button
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
            onClick={() => onConfirm()}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConsentDialog;




