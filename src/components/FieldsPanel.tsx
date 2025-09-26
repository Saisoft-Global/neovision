import React, { useState } from 'react';
import { Plus, Save, Loader2, Trash2 } from 'lucide-react';
import type { Field } from '../store/documentStore';

interface FieldsPanelProps {
  fields: Field[];
  isProcessing: boolean;
  onFieldsUpdate: (fields: Field[]) => void;
  selectedField?: Field | null;
  onFieldSelect?: (field: Field) => void;
  documentType?: string;
  pipelineUsed?: { ocr?: string; ner?: string };
  rawResponse?: any;
  extractedFields?: Record<string, any>;
  tables?: any[];
}

interface LineItem {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
  total: string;
  fields: Field[];
}

const FieldsPanel: React.FC<FieldsPanelProps> = ({
  fields,
  isProcessing,
  onFieldsUpdate,
  selectedField,
  onFieldSelect,
  documentType = 'unknown',
  pipelineUsed,
  rawResponse,
  extractedFields,
  tables
}) => {
  const [newFieldLabel, setNewFieldLabel] = useState<string>('');
  const [isAddingField, setIsAddingField] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'fields' | 'json'>('fields');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Group fields into line items and regular fields
  const { lineItems, regularFields } = React.useMemo(() => {
    const items: { [key: string]: LineItem } = {};
    const regular: Field[] = [];

    fields.forEach(field => {
      const lineItemMatch = field.id.match(/^line_item_(\d+)_(.+)$/);
      if (lineItemMatch) {
        const [, itemNum, fieldType] = lineItemMatch;
        const itemId = `line_item_${itemNum}`;

        if (!items[itemId]) {
          items[itemId] = {
            id: itemId,
            description: '',
            quantity: '',
            unitPrice: '',
            total: '',
            fields: []
          };
        }

        items[itemId].fields.push(field);

        switch (fieldType) {
          case 'description':
            items[itemId].description = field.value;
            break;
          case 'quantity':
            items[itemId].quantity = field.value;
            break;
          case 'price':
            items[itemId].unitPrice = field.value;
            break;
          case 'total':
            items[itemId].total = field.value;
            break;
        }
      } else {
        regular.push(field);
      }
    });

    return {
      lineItems: Object.values(items),
      regularFields: regular
    };
  }, [fields]);

  const handleFieldChange = (field: Field, value: string) => {
    const updatedFields = fields.map(f =>
      f.id === field.id ? { ...f, value } : f
    );
    onFieldsUpdate(updatedFields);
  };

  const handleLineItemChange = (itemId: string, field: string, value: string) => {
    const updatedFields = fields.map(f => {
      if (f.id.startsWith(itemId) && f.id.endsWith(field)) {
        return { ...f, value };
      }
      return f;
    });
    onFieldsUpdate(updatedFields);
  };

  const addNewLineItem = () => {
    const newItemNum = lineItems.length + 1;
    const itemId = `line_item_${newItemNum}`;
    
    const newFields: Field[] = [
      {
        id: `${itemId}_description`,
        label: 'Description',
        value: '',
        confidence: 1.0
      },
      {
        id: `${itemId}_quantity`,
        label: 'Quantity',
        value: '',
        confidence: 1.0
      },
      {
        id: `${itemId}_price`,
        label: 'Unit Price',
        value: '',
        confidence: 1.0
      },
      {
        id: `${itemId}_total`,
        label: 'Total',
        value: '',
        confidence: 1.0
      }
    ];

    onFieldsUpdate([...fields, ...newFields]);
  };

  const deleteLineItem = (itemId: string) => {
    const updatedFields = fields.filter(f => !f.id.startsWith(itemId));
    onFieldsUpdate(updatedFields);
  };

  const addNewFieldWithSelection = () => {
    if (!newFieldLabel.trim()) return;
    const idBase = newFieldLabel.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const uniqueId = `${idBase}_${Date.now()}`;
    const newField: Field = {
      id: uniqueId,
      label: newFieldLabel.trim(),
      value: '',
      confidence: 1.0
    };
    onFieldsUpdate([...fields, newField]);
    setNewFieldLabel('');
    setIsAddingField(false);
  };

  return (
    <div className="w-96 bg-white border-l border-gray-200 p-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold">Extracted Fields</h3>
        {isProcessing && <Loader2 className="w-5 h-5 animate-spin text-blue-500" />}
      </div>
      <div className="flex items-center justify-between mb-4 text-xs text-gray-600">
        <div className="flex gap-2 items-center">
          {typeof documentType === 'string' && (
            <span className="px-2 py-1 bg-gray-100 rounded-full">{documentType}</span>
          )}
          {pipelineUsed && (
            <span className="px-2 py-1 bg-gray-100 rounded-full">
              {(pipelineUsed.ocr || 'ocr')} · {(pipelineUsed.ner || 'ner')}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            className={`px-2 py-1 rounded ${activeTab === 'fields' ? 'bg-blue-600 text-white' : 'border'}`}
            onClick={() => setActiveTab('fields')}
          >Fields</button>
          <button
            className={`px-2 py-1 rounded ${activeTab === 'json' ? 'bg-blue-600 text-white' : 'border'}`}
            onClick={() => setActiveTab('json')}
          >JSON</button>
          {activeTab === 'fields' && (
            <div className="ml-2 border rounded overflow-hidden">
              <button
                className={`px-2 py-1 ${viewMode === 'table' ? 'bg-gray-100' : ''}`}
                onClick={() => setViewMode('table')}
                title="Table view"
              >Table</button>
              <button
                className={`px-2 py-1 border-l ${viewMode === 'cards' ? 'bg-gray-100' : ''}`}
                onClick={() => setViewMode('cards')}
                title="Cards view"
              >Cards</button>
            </div>
          )}
        </div>
      </div>

      {/* Add new field */}
      <div className="mb-4">
        {isAddingField ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={newFieldLabel}
              onChange={(e) => setNewFieldLabel(e.target.value)}
              placeholder="New field label"
              className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              onClick={addNewFieldWithSelection}
              className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm"
            >
              Add
            </button>
            <button
              onClick={() => { setIsAddingField(false); setNewFieldLabel(''); }}
              className="px-3 py-2 border rounded-md text-sm"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsAddingField(true)}
            className="px-3 py-2 border rounded-md text-sm"
          >
            + New field
          </button>
        )}
      </div>

      {isProcessing ? (
        <div className="text-center py-8 text-gray-500">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Processing document...</p>
          <p className="text-sm">Extracting fields using ML model</p>
        </div>
      ) : (
        <div className="space-y-6">
          {activeTab === 'json' ? (
            <div>
              <div className="flex justify-end mb-2">
                <button
                  onClick={() => {
                    try {
                      const text = JSON.stringify(rawResponse ?? {}, null, 2);
                      navigator.clipboard.writeText(text).catch(() => {
                        // Fallback: create temporary textarea
                        const ta = document.createElement('textarea');
                        ta.value = text;
                        document.body.appendChild(ta);
                        ta.select();
                        document.execCommand('copy');
                        document.body.removeChild(ta);
                      });
                    } catch {}
                  }}
                  className="px-2 py-1 text-xs border rounded hover:bg-gray-50"
                >Copy</button>
              </div>
              <pre className="text-xs bg-gray-50 border p-2 rounded overflow-x-auto">
                {JSON.stringify(rawResponse ?? {}, null, 2)}
              </pre>
            </div>
          ) : (
            <>
            {/* General Information */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-700">General Information</h4>
              {viewMode === 'table' ? (
                <div className="border rounded overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left px-3 py-2 w-1/3">Field</th>
                        <th className="text-left px-3 py-2">Value</th>
                        <th className="text-right px-3 py-2 w-24">Conf</th>
                      </tr>
                    </thead>
                    <tbody>
                      {extractedFields && Object.entries(extractedFields).map(([k, v]) => (
                        <tr key={k} className="border-b last:border-0">
                          <td className="px-3 py-2 text-gray-600">{k}</td>
                          <td className="px-3 py-2 text-gray-900">{String(v)}</td>
                          <td className="px-3 py-2 text-right text-gray-400">–</td>
                        </tr>
                      ))}
                      {regularFields.map((field) => (
                        <tr key={field.id} className={`border-b last:border-0 ${selectedField?.id === field.id ? 'bg-blue-50' : ''}`} onClick={() => onFieldSelect?.(field)}>
                          <td className="px-3 py-2 text-gray-700">{field.label}</td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={field.value}
                              onChange={(e) => handleFieldChange(field, e.target.value)}
                              className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </td>
                          <td className="px-3 py-2 text-right text-gray-600">{(field.confidence * 100).toFixed(0)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="space-y-4">
                  {extractedFields && Object.keys(extractedFields).length > 0 && (
                    <div className="space-y-2">
                      {Object.entries(extractedFields).map(([k, v]) => (
                        <div key={k} className="flex items-center justify-between border rounded p-2">
                          <div className="text-sm text-gray-600 mr-2">{k}</div>
                          <div className="text-sm text-gray-900 truncate max-w-[60%]" title={String(v)}>{String(v)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {regularFields.map((field) => (
                    <div 
                      key={field.id} 
                      className={`border rounded-lg p-3 transition-colors ${
                        selectedField?.id === field.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                      }`}
                      onClick={() => onFieldSelect?.(field)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-gray-700">
                          {field.label}
                        </label>
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                          {(field.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                      <input
                        type="text"
                        value={field.value}
                        onChange={(e) => handleFieldChange(field, e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Line Items Table - render only for invoice/receipt types */}
          {(documentType === 'invoice' || documentType === 'receipt') && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-700">Line Items</h4>
                <button
                  onClick={addNewLineItem}
                  className="p-1 hover:bg-blue-50 rounded-lg text-blue-600"
                  title="Add line item"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-gray-600">Description</th>
                      <th className="px-4 py-2 text-right font-medium text-gray-600">Qty</th>
                      <th className="px-4 py-2 text-right font-medium text-gray-600">Price</th>
                      <th className="px-4 py-2 text-right font-medium text-gray-600">Total</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((item) => (
                      <tr 
                        key={item.id}
                        className="border-b border-gray-200 last:border-0 hover:bg-gray-50"
                        onClick={() => item.fields[0] && onFieldSelect?.(item.fields[0])}
                      >
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => handleLineItemChange(item.id, 'description', e.target.value)}
                            className="w-full bg-transparent border-0 focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={item.quantity}
                            onChange={(e) => handleLineItemChange(item.id, 'quantity', e.target.value)}
                            className="w-full bg-transparent border-0 focus:ring-2 focus:ring-blue-500 rounded px-2 py-1 text-right"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={item.unitPrice}
                            onChange={(e) => handleLineItemChange(item.id, 'price', e.target.value)}
                            className="w-full bg-transparent border-0 focus:ring-2 focus:ring-blue-500 rounded px-2 py-1 text-right"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={item.total}
                            onChange={(e) => handleLineItemChange(item.id, 'total', e.target.value)}
                            className="w-full bg-transparent border-0 focus:ring-2 focus:ring-blue-500 rounded px-2 py-1 text-right"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteLineItem(item.id);
                            }}
                            className="p-1 hover:bg-red-100 rounded text-red-500"
                            title="Delete line item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            )}

          {/* OCR Tables */}
          {Array.isArray(tables) && tables.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-gray-700">Tables</h4>
              {tables.map((t, idx) => (
                <div key={t.table_id || idx} className="border rounded">
                  <div className="px-3 py-2 text-xs text-gray-600 border-b bg-gray-50">
                    {t.type || 'table'} #{t.table_number} · p{t.page} · {t.rows}x{t.columns}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <tbody>
                        {(t.data || []).map((row: any[], rIdx: number) => (
                          <tr key={rIdx} className="border-b last:border-0">
                            {row.map((cell: any, cIdx: number) => (
                              <td key={cIdx} className="px-2 py-1 whitespace-pre">{String(cell)}</td>)
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}

            <button 
              onClick={() => onFieldsUpdate(fields)}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 transition-colors"
            >
              <Save className="w-4 h-4" />
              Save Changes
            </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default FieldsPanel;