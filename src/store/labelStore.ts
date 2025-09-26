import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Label {
  id: string;
  name: string;
  description?: string;
  documentTypes: string[];
  isCustom: boolean;
}

interface LabelStore {
  labels: Label[];
  addLabel: (label: Omit<Label, 'id'>) => void;
  removeLabel: (id: string) => void;
  updateLabel: (id: string, updates: Partial<Label>) => void;
  getLabelsByDocType: (docType: string) => Label[];
}

// Predefined labels for different document types
const defaultLabels: Label[] = [
  // Invoice labels
  {
    id: 'invoice_number',
    name: 'Invoice Number',
    description: 'Unique identifier for the invoice',
    documentTypes: ['invoice'],
    isCustom: false
  },
  {
    id: 'invoice_date',
    name: 'Invoice Date',
    description: 'Date when the invoice was issued',
    documentTypes: ['invoice'],
    isCustom: false
  },
  {
    id: 'due_date',
    name: 'Due Date',
    description: 'Payment due date',
    documentTypes: ['invoice'],
    isCustom: false
  },
  {
    id: 'total_amount',
    name: 'Total Amount',
    description: 'Total invoice amount including taxes',
    documentTypes: ['invoice'],
    isCustom: false
  },
  {
    id: 'subtotal',
    name: 'Subtotal',
    description: 'Amount before taxes and discounts',
    documentTypes: ['invoice'],
    isCustom: false
  },
  {
    id: 'tax_amount',
    name: 'Tax Amount',
    description: 'Total tax amount',
    documentTypes: ['invoice'],
    isCustom: false
  },
  
  // Purchase Order labels
  {
    id: 'po_number',
    name: 'PO Number',
    description: 'Purchase order reference number',
    documentTypes: ['purchase_order'],
    isCustom: false
  },
  {
    id: 'order_date',
    name: 'Order Date',
    description: 'Date when the order was placed',
    documentTypes: ['purchase_order'],
    isCustom: false
  },
  {
    id: 'delivery_date',
    name: 'Delivery Date',
    description: 'Expected delivery date',
    documentTypes: ['purchase_order'],
    isCustom: false
  },
  
  // Receipt labels
  {
    id: 'receipt_number',
    name: 'Receipt Number',
    description: 'Unique receipt identifier',
    documentTypes: ['receipt'],
    isCustom: false
  },
  {
    id: 'transaction_date',
    name: 'Transaction Date',
    description: 'Date of purchase',
    documentTypes: ['receipt'],
    isCustom: false
  },
  {
    id: 'payment_method',
    name: 'Payment Method',
    description: 'Method of payment used',
    documentTypes: ['receipt'],
    isCustom: false
  },
  
  // Common labels
  {
    id: 'vendor_name',
    name: 'Vendor Name',
    description: 'Name of the vendor/supplier',
    documentTypes: ['invoice', 'purchase_order', 'receipt'],
    isCustom: false
  },
  {
    id: 'vendor_address',
    name: 'Vendor Address',
    description: 'Address of the vendor/supplier',
    documentTypes: ['invoice', 'purchase_order', 'receipt'],
    isCustom: false
  },
  {
    id: 'customer_name',
    name: 'Customer Name',
    description: 'Name of the customer/buyer',
    documentTypes: ['invoice', 'purchase_order'],
    isCustom: false
  },
  {
    id: 'customer_address',
    name: 'Customer Address',
    description: 'Address of the customer/buyer',
    documentTypes: ['invoice', 'purchase_order'],
    isCustom: false
  }
];

export const useLabelStore = create<LabelStore>()(
  persist(
    (set, get) => ({
      labels: defaultLabels,
      
      addLabel: (label) => set((state) => ({
        labels: [...state.labels, { ...label, id: Date.now().toString() }]
      })),
      
      removeLabel: (id) => set((state) => ({
        labels: state.labels.filter((label) => label.id !== id || !label.isCustom)
      })),
      
      updateLabel: (id, updates) => set((state) => ({
        labels: state.labels.map((label) =>
          label.id === id && label.isCustom ? { ...label, ...updates } : label
        )
      })),
      
      getLabelsByDocType: (docType) => {
        return get().labels.filter((label) => 
          label.documentTypes.includes(docType)
        );
      }
    }),
    {
      name: 'label-store'
    }
  )
);