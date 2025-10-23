import React, { useState } from 'react';

interface TravelConfirmDialogProps {
  open: boolean;
  onConfirm: (selection: { portal?: string }) => void;
  onCancel: () => void;
  summary: string;
  suggestedPortals?: string[];
}

export const TravelConfirmDialog: React.FC<TravelConfirmDialogProps> = ({
  open,
  onConfirm,
  onCancel,
  summary,
  suggestedPortals = ['Google Flights', 'Kayak', 'Skyscanner', 'MakeMyTrip']
}) => {
  const [portal, setPortal] = useState<string>('');

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl p-6">
        <h2 className="text-lg font-semibold mb-2">Confirm travel booking search</h2>
        <p className="text-sm text-gray-600 mb-4">{summary}</p>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Preferred portal (optional)</label>
          <select
            className="w-full border rounded-lg px-3 py-2"
            value={portal}
            onChange={e => setPortal(e.target.value)}
          >
            <option value="">Auto select best</option>
            {suggestedPortals.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-2">
          <button
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
            onClick={() => onConfirm({ portal })}
          >
            Confirm & search
          </button>
        </div>
      </div>
    </div>
  );
};

export default TravelConfirmDialog;




