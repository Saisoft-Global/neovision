import React, { useState, useRef, useEffect, memo } from 'react';
import { Document as PDFDocument, Page, pdfjs } from 'react-pdf';
import { Download, Share2, Trash2, ZoomIn, ZoomOut, Edit2, Save } from 'lucide-react';
import type { Document, Field } from '../store/documentStore';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface DocumentViewerProps {
  document: Document;
  onFieldsUpdate?: (fields: Field[]) => void;
  selectedField?: Field | null;
  onFieldSelect?: (field: Field | null, canvasWidth?: number, canvasHeight?: number) => void;
  onBoxCreate?: (bbox: [number, number, number, number], canvasWidth: number, canvasHeight: number, pageNumber: number) => void;
  onTableCreate?: (bbox: [number, number, number, number], canvasWidth: number, canvasHeight: number, pageNumber: number, rows: number, cols: number) => void;
  onDeleteField?: (fieldId: string) => void;
  onUpdateField?: (field: Field) => void;
  labelOptions?: { id: number; name: string }[];
  onChangeLabel?: (field: Field, labelName: string) => void;
}

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

const DocumentViewer: React.FC<DocumentViewerProps> = memo(({ document, onFieldsUpdate, selectedField, onFieldSelect, onBoxCreate, onTableCreate, onDeleteField, onUpdateField, labelOptions = [], onChangeLabel }) => {
  const [scale, setScale] = useState(1);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [isEditing, setIsEditing] = useState(false);
  // Selection is controlled by parent via props for cross-panel highlighting
  const [imageData, setImageData] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentBox, setCurrentBox] = useState<BoundingBox | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [movingFieldId, setMovingFieldId] = useState<string | null>(null);
  const [resizingFieldId, setResizingFieldId] = useState<string | null>(null);
  const [resizeCorner, setResizeCorner] = useState<'tl'|'tr'|'bl'|'br'|null>(null);
  const [popoverValue, setPopoverValue] = useState<string>('');
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const [drawingMode, setDrawingMode] = useState<'field' | 'table'>('field');
  const [tableRows, setTableRows] = useState<number>(1);
  const [tableCols, setTableCols] = useState<number>(4);
  // const [pdfPageSize, setPdfPageSize] = useState<{ width: number; height: number } | null>(null);

  const isPDF = document.type === 'application/pdf';
  const isExcel = document.type.includes('spreadsheet') || document.type.includes('excel');
  const isImage = document.type.startsWith('image/');

  // Get PDF page dimensions for better scaling
  // const getPdfPageSize = async () => {
  //   if (!isPDF) return null;
  //   try {
  //     const response = await fetch(document.url);
  //     const arrayBuffer = await response.arrayBuffer();
  //     const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  //     const page = await pdf.getPage(pageNumber);
  //     const viewport = page.getViewport({ scale: 1 });
  //     return { width: viewport.width, height: viewport.height };
  //   } catch (error) {
  //     console.error('Error getting PDF page size:', error);
  //     return null;
  //   }
  // };

  useEffect(() => {
    const setupDocument = async () => {
      try {
        if (isExcel) {
          // For Excel files, we'll receive a rendered image from the backend
          const response = await fetch(document.url);
          const blob = await response.blob();
          setImageData(URL.createObjectURL(blob));
        } else if (isPDF) {
          // Get PDF page dimensions
          // const pageSize = await getPdfPageSize();
          // setPdfPageSize(pageSize);
        }
      } catch (err) {
        setError('Failed to load document');
        console.error('Error setting up document:', err);
      }
    };

    setupDocument();
  }, [document.url, isExcel, isPDF, pageNumber]);

  // Update popover value when selectedField changes
  useEffect(() => {
    if (selectedField) {
      console.log('Selected field changed, updating popover value:', selectedField.value); // Debug
      setPopoverValue(selectedField.value || '');
    } else {
      setPopoverValue('');
    }
  }, [selectedField?.id, selectedField?.value]); // Only depend on specific properties

  useEffect(() => {
    if (!canvasRef.current || !document.fields) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw all bounding boxes
    document.fields.forEach((field) => {
      if (!field.bbox) return;
      const [x, y, width, height] = field.bbox;
      const isSelected = selectedField?.id === field.id;
      
      // Draw selection highlight
      if (isSelected) {
        ctx.fillStyle = 'rgba(37, 99, 235, 0.1)';
        ctx.fillRect(x * scale, y * scale, width * scale, height * scale);
      }
      
      // Draw border
      ctx.strokeStyle = isSelected ? '#2563eb' : '#64748b';
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.strokeRect(x * scale, y * scale, width * scale, height * scale);
      
      // Draw label background
      ctx.fillStyle = isSelected ? 'rgba(37, 99, 235, 0.95)' : 'rgba(100, 116, 139, 0.9)';
      const labelWidth = ctx.measureText(field.label).width + 20;
      ctx.fillRect(x * scale, (y * scale) - 20, labelWidth, 20);
      
      // Draw label text
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px sans-serif';
      ctx.fillText(field.label, (x * scale) + 5, (y * scale) - 5);

      // Draw resize handles when selected
      if (isSelected) {
        const handles: [number, number][] = [
          [x, y], [x + width, y], [x, y + height], [x + width, y + height]
        ];
        ctx.fillStyle = '#2563eb';
        handles.forEach(([hx, hy]) => ctx.fillRect(hx * scale - 4, hy * scale - 4, 8, 8));
      }
    });

    // Draw current box if drawing
    if (currentBox) {
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 2;
      ctx.strokeRect(
        currentBox.x,
        currentBox.y,
        currentBox.width,
        currentBox.height
      );
    }
  }, [document.fields, selectedField, scale, currentBox]);

  // Keyboard event handlers
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Delete selected field
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedField && onDeleteField) {
        onDeleteField(selectedField.id);
      }
      
      // Cancel drawing with Esc
      if (e.key === 'Escape' && drawing) {
        setDrawing(false);
        setCurrentBox(null);
      }
      
      // Track Shift key for constrained drawing
      if (e.key === 'Shift') {
        setIsShiftPressed(true);
      }
    };
    
    const keyUpHandler = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setIsShiftPressed(false);
      }
    };
    
    window.addEventListener('keydown', handler);
    window.addEventListener('keyup', keyUpHandler);
    return () => {
      window.removeEventListener('keydown', handler);
      window.removeEventListener('keyup', keyUpHandler);
    };
  }, [selectedField, onDeleteField, drawing]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isEditing || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    // Check if clicking inside existing field to move/resize
    const hit = document.fields.find(f => {
      if (!f.bbox) return false;
      const [bx, by, bw, bh] = f.bbox;
      return x >= bx && x <= bx + bw && y >= by && y <= by + bh;
    });
    if (hit) {
      const cw = canvasRef.current?.width;
      const ch = canvasRef.current?.height;
      onFieldSelect?.(hit, cw, ch);
      setStartPos({ x, y });
      // Check corners for resize
      const [bx, by, bw, bh] = hit.bbox!;
      const corners: {c:'tl'|'tr'|'bl'|'br', px:number, py:number}[] = [
        { c: 'tl', px: bx, py: by },
        { c: 'tr', px: bx + bw, py: by },
        { c: 'bl', px: bx, py: by + bh },
        { c: 'br', px: bx + bw, py: by + bh }
      ];
      const near = corners.find(k => Math.abs(k.px - x) * scale < 6 && Math.abs(k.py - y) * scale < 6);
      if (near) {
        setResizingFieldId(hit.id);
        setResizeCorner(near.c);
        return;
      }
      setMovingFieldId(hit.id);
      return;
    }

    // Start drawing a new box
    setResizingFieldId(null);
    setMovingFieldId(null);
    setDrawing(true);
    setStartPos({ x, y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const currentX = (e.clientX - rect.left) / scale;
    const currentY = (e.clientY - rect.top) / scale;
    if (movingFieldId && onFieldsUpdate) {
      const dx = currentX - startPos.x;
      const dy = currentY - startPos.y;
      setStartPos({ x: currentX, y: currentY });
      const updated = document.fields.map(f => {
        if (f.id !== movingFieldId || !f.bbox) return f;
        const [bx, by, bw, bh] = f.bbox;
        return { ...f, bbox: [bx + dx, by + dy, bw, bh] as [number, number, number, number] };
      });
      onFieldsUpdate(updated);
      return;
    }
    if (resizingFieldId && resizeCorner && onFieldsUpdate) {
      const updated = document.fields.map(f => {
        if (f.id !== resizingFieldId || !f.bbox) return f;
        let [bx, by, bw, bh] = f.bbox;
        let nx = bx, ny = by, nw = bw, nh = bh;
        if (resizeCorner === 'br') { nw = Math.max(1, currentX - bx); nh = Math.max(1, currentY - by); }
        if (resizeCorner === 'tr') { nw = Math.max(1, currentX - bx); ny = currentY; nh = Math.max(1, by + bh - currentY); }
        if (resizeCorner === 'bl') { nx = currentX; nw = Math.max(1, bx + bw - currentX); nh = Math.max(1, currentY - by); }
        if (resizeCorner === 'tl') { nx = currentX; ny = currentY; nw = Math.max(1, bx + bw - currentX); nh = Math.max(1, by + bh - currentY); }
        return { ...f, bbox: [nx, ny, nw, nh] as [number, number, number, number] };
      });
      onFieldsUpdate(updated);
      return;
    }
    if (!drawing) return;

    let width = Math.abs(currentX - startPos.x);
    let height = Math.abs(currentY - startPos.y);
    
    // Constrain to square when Shift is pressed
    if (isShiftPressed) {
      const size = Math.max(width, height);
      width = size;
      height = size;
    }

    setCurrentBox({
      x: Math.min(startPos.x, currentX),
      y: Math.min(startPos.y, currentY),
      width,
      height
    });
  };

  const handleMouseUp = () => {
    if (movingFieldId) { setMovingFieldId(null); return; }
    if (resizingFieldId) { setResizingFieldId(null); setResizeCorner(null); return; }
    if (!drawing || !currentBox) return;

    const bbox: [number, number, number, number] = [
      currentBox.x,
      currentBox.y,
      currentBox.width,
      currentBox.height
    ];

    if (drawingMode === 'table' && onTableCreate) {
      const cw = canvasRef.current?.width || 1;
      const ch = canvasRef.current?.height || 1;
      onTableCreate(bbox, cw, ch, pageNumber, tableRows, tableCols);
    } else if (onBoxCreate) {
      const cw = canvasRef.current?.width || 1;
      const ch = canvasRef.current?.height || 1;
      onBoxCreate(bbox, cw, ch, pageNumber);
    } else if (onFieldsUpdate) {
      if (drawingMode === 'table') {
        // Create table fields
        const newFields: Field[] = [];
        const cellWidth = bbox[2] / tableCols;
        const cellHeight = bbox[3] / tableRows;
        
        for (let row = 0; row < tableRows; row++) {
          for (let col = 0; col < tableCols; col++) {
            const cellBbox: [number, number, number, number] = [
              bbox[0] + col * cellWidth,
              bbox[1] + row * cellHeight,
              cellWidth,
              cellHeight
            ];
            
            const fieldType = row === 0 ? 
              ['Description', 'Quantity', 'Price', 'Total'][col] || `Col ${col + 1}` :
              `Row ${row + 1} Col ${col + 1}`;
            
            newFields.push({
              id: `table_${Date.now()}_${row}_${col}`,
              label: fieldType,
              value: '',
              confidence: 1,
              bbox: cellBbox,
              pageNumber
            });
          }
        }
        onFieldsUpdate([...document.fields, ...newFields]);
      } else {
        // Create single field
    const newField: Field = {
      id: `field_${Date.now()}`,
      label: 'New Field',
      value: '',
      confidence: 1,
          bbox,
          pageNumber
    };
    onFieldsUpdate([...document.fields, newField]);
      }
    }

    setDrawing(false);
    setCurrentBox(null);
  };

  // Click on box to select field and show popover
  const handleCanvasClick = (e: React.MouseEvent) => {
    if (!onFieldSelect || !canvasRef.current) return;
    
    // Don't handle clicks if we're in drawing mode
    if (drawing) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    // Convert to unscaled coords
    const ux = clickX / scale;
    const uy = clickY / scale;
    
    console.log('Canvas click:', { clickX, clickY, ux, uy, scale }); // Debug
    console.log('Available fields:', document.fields); // Debug
    
    // Find first matching field
    const hit = document.fields.find(f => {
      if (!f.bbox) return false;
      const [x, y, w, h] = f.bbox;
      const isHit = ux >= x && ux <= x + w && uy >= y && uy <= y + h;
      console.log('Checking field:', f.id, { x, y, w, h, isHit }); // Debug
      return isHit;
    });
    
    if (hit) {
      console.log('Field selected:', hit); // Debug log
      const cw = canvasRef.current?.width;
      const ch = canvasRef.current?.height;
      onFieldSelect(hit, cw, ch);
    } else {
      console.log('No field hit, deselecting'); // Debug
      // Clicked outside any field, deselect
      const cw = canvasRef.current?.width;
      const ch = canvasRef.current?.height;
      onFieldSelect && onFieldSelect(null, cw, ch);
    }
  };

  const renderDocument = () => {
    if (error) {
      return (
        <div className="flex items-center justify-center h-full text-red-500">
          {error}
        </div>
      );
    }

    if (isPDF) {
      return (
        <PDFDocument
          file={document.url}
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
          loading={
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          }
          error={
            <div className="flex items-center justify-center h-full text-red-500">
              Failed to load PDF
            </div>
          }
        >
          <Page
            pageNumber={pageNumber}
            scale={scale}
            renderAnnotationLayer={true}
            renderTextLayer={true}
          />
        </PDFDocument>
      );
    }

    if (isExcel && imageData) {
      return (
        <img
          src={imageData}
          alt="Excel Preview"
          style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}
          className="max-w-full"
        />
      );
    }

    if (isImage) {
      return (
        <img
          src={document.url}
          alt="Document Preview"
          style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}
          className="max-w-full"
        />
      );
    }

    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        Unsupported document type
      </div>
    );
  };

  return (
    <div className="flex-1 bg-gray-50 p-4">
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold">Document Viewer</h2>
            {/* Debug info - only show in development */}
            {process.env.NODE_ENV === 'development' && (
              <div className="text-xs text-gray-500">
                Fields: {document.fields.length} | Selected: {selectedField?.id || 'none'}
              </div>
            )}
            {/* Test button */}
            <button
              onClick={() => {
                const testField = {
                  id: 'test-field',
                  label: 'Test Field',
                  value: 'Test Value',
                  confidence: 1,
                  bbox: [100, 100, 200, 50] as [number, number, number, number],
                  pageNumber: 1
                };
                onFieldSelect && onFieldSelect(testField);
              }}
              className="px-2 py-1 bg-green-500 text-white text-xs rounded"
            >
              Test Popover
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setScale(s => Math.max(0.5, s - 0.1))}
                className="p-2 hover:bg-gray-100 rounded-lg"
                title="Zoom Out"
              >
                <ZoomOut className="w-5 h-5" />
              </button>
              <span className="text-sm">{Math.round(scale * 100)}%</span>
              <button
                onClick={() => setScale(s => Math.min(2, s + 0.1))}
                className="p-2 hover:bg-gray-100 rounded-lg"
                title="Zoom In"
              >
                <ZoomIn className="w-5 h-5" />
              </button>
              {isEditing && isShiftPressed && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                  Square Mode
                </span>
              )}
            </div>
          </div>
          
          <div className="flex gap-2">
            {isEditing && (
              <div className="flex items-center gap-2 mr-4">
                <span className="text-sm text-gray-600">Mode:</span>
                <button
                  onClick={() => setDrawingMode('field')}
                  className={`px-3 py-1 rounded text-sm ${
                    drawingMode === 'field' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  Field
                </button>
                <button
                  onClick={() => setDrawingMode('table')}
                  className={`px-3 py-1 rounded text-sm ${
                    drawingMode === 'table' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  Table
                </button>
                {drawingMode === 'table' && (
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={tableRows}
                      onChange={(e) => setTableRows(parseInt(e.target.value) || 1)}
                      className="w-12 px-1 py-1 border rounded text-sm"
                      title="Rows"
                    />
                    <span className="text-xs text-gray-500">×</span>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={tableCols}
                      onChange={(e) => setTableCols(parseInt(e.target.value) || 4)}
                      className="w-12 px-1 py-1 border rounded text-sm"
                      title="Columns"
                    />
                  </div>
                )}
              </div>
            )}
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`p-2 rounded-lg ${isEditing ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
              title={isEditing ? 'Save Annotations (Esc to cancel drawing)' : 'Edit Annotations (Shift for square boxes)'}
            >
              {isEditing ? <Save className="w-5 h-5" /> : <Edit2 className="w-5 h-5" />}
            </button>
            <button 
              onClick={() => window.open(document.url, '_blank')}
              className="p-2 hover:bg-gray-100 rounded-lg" 
              title="Download"
            >
              <Download className="w-5 h-5" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-lg" title="Share">
              <Share2 className="w-5 h-5" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-lg text-red-500" title="Delete">
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div 
          ref={containerRef}
          className="relative border rounded-lg h-[600px] overflow-auto bg-gray-50"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => setDrawing(false)}
        >
          {renderDocument()}
          <canvas
            ref={canvasRef}
            className="absolute top-0 left-0"
            width={containerRef.current?.clientWidth}
            height={containerRef.current?.clientHeight}
            onClick={handleCanvasClick}
          />

          {/* Show popover when field is selected */}
          {selectedField && (
            <div
              className="absolute bg-white border-2 border-blue-500 rounded-lg shadow-xl p-4 text-sm z-50 min-w-[280px]"
              style={{ 
                left: selectedField.bbox ? Math.max(10, selectedField.bbox[0] * scale - 10) : 50, 
                top: selectedField.bbox ? Math.max(10, selectedField.bbox[1] * scale - 10) : 50
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="font-semibold text-blue-800">{selectedField.label}</div>
                <button
                  onClick={() => onFieldSelect && onFieldSelect(null as any)}
                  className="text-gray-400 hover:text-gray-600 text-lg leading-none"
                  title="Close"
                >
                  ×
                </button>
              </div>
              
              {labelOptions.length > 0 && (
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Label Type:</label>
                  {/* Debug info - only show in development */}
                  {process.env.NODE_ENV === 'development' && (
                    <div className="text-xs text-gray-400 mb-1">
                      Debug: label="{selectedField.label}", value="{selectedField.value}"
                    </div>
                  )}
                  <select
                    value={selectedField.label}
                    onChange={(e) => {
                      console.log('Dropdown changed to:', e.target.value); // Debug
                      console.log('Selected field before change:', selectedField); // Debug
                      onChangeLabel && onChangeLabel(selectedField, e.target.value);
                    }}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {labelOptions.map(opt => (
                      <option key={opt.id} value={opt.name}>{opt.name}</option>
                    ))}
                  </select>
                </div>
              )}
              
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-600 mb-1">Value:</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={popoverValue}
                    dir={/[\u0600-\u06FF]/.test(popoverValue) ? 'rtl' : 'auto'}
                    style={{ unicodeBidi: 'plaintext' as any }}
                    onChange={(e) => setPopoverValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        onUpdateField && onUpdateField({ ...selectedField, value: popoverValue });
                      }
                    }}
                    className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter extracted value..."
                    autoFocus
                  />
                  <button
                    onClick={() => onUpdateField && onUpdateField({ ...selectedField, value: popoverValue })}
                    className="px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 font-medium"
                    title="Save changes"
                  >
                    Save
                  </button>
                </div>
                {/* Re-extract button */}
                <div className="mt-2">
                  <button
                    onClick={() => {
                      // Trigger re-extraction by calling onFieldSelect again
                      const cw = canvasRef.current?.width;
                      const ch = canvasRef.current?.height;
                      onFieldSelect && onFieldSelect(selectedField, cw, ch);
                    }}
                    className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 font-medium"
                    title="Re-extract text from this area"
                  >
                    🔄 Re-extract
                  </button>
                </div>
              </div>
              
              <div className="flex gap-2 text-xs text-gray-500">
                <span>Press Enter to save</span>
                <span>•</span>
                <span>Click outside to close</span>
              </div>
            </div>
          )}
        </div>
        
        {isPDF && numPages && (
          <div className="mt-4 flex justify-center items-center gap-4">
            <button
              onClick={() => setPageNumber(p => Math.max(1, p - 1))}
              disabled={pageNumber <= 1}
              className="btn btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span>
              Page {pageNumber} of {numPages}
            </span>
            <button
              onClick={() => setPageNumber(p => Math.min(numPages, p + 1))}
              disabled={pageNumber >= numPages}
              className="btn btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

DocumentViewer.displayName = 'DocumentViewer';

export default DocumentViewer;