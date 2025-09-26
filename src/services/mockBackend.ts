import { ProcessDocumentResponse } from './documentService';

const generateRandomAddress = () => {
  const streets = ['Main St', 'Oak Avenue', 'Maple Road', 'Cedar Lane', 'Pine Street'];
  const cities = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix'];
  const states = ['NY', 'CA', 'IL', 'TX', 'AZ'];
  
  const streetNum = Math.floor(Math.random() * 1000) + 1;
  const street = streets[Math.floor(Math.random() * streets.length)];
  const city = cities[Math.floor(Math.random() * cities.length)];
  const state = states[Math.floor(Math.random() * states.length)];
  const zip = Math.floor(Math.random() * 90000) + 10000;
  
  return `${streetNum} ${street}, ${city}, ${state} ${zip}`;
};

const generateRandomPhone = () => {
  const area = Math.floor(Math.random() * 900) + 100;
  const prefix = Math.floor(Math.random() * 900) + 100;
  const line = Math.floor(Math.random() * 9000) + 1000;
  return `(${area}) ${prefix}-${line}`;
};

const generateRandomEmail = (company: string) => {
  const domains = ['example.com', 'business.com', 'company.net', 'enterprise.org'];
  const domain = domains[Math.floor(Math.random() * domains.length)];
  return `info@${company.toLowerCase().replace(/\s+/g, '')}.${domain}`;
};

export const mockProcessDocument = (): ProcessDocumentResponse => {
  const companyName = 'Tech Solutions Inc';
  const customerName = 'Global Enterprises Ltd';
  
  return {
    fields: [
      // Header Information
      {
        id: 'vendor_name',
        label: 'Vendor Name',
        value: companyName,
        confidence: 0.99,
        bbox: [50, 20, 300, 40]
      },
      {
        id: 'vendor_address',
        label: 'Vendor Address',
        value: generateRandomAddress(),
        confidence: 0.95,
        bbox: [50, 45, 300, 65]
      },
      {
        id: 'vendor_phone',
        label: 'Vendor Phone',
        value: generateRandomPhone(),
        confidence: 0.97,
        bbox: [50, 70, 300, 90]
      },
      {
        id: 'vendor_email',
        label: 'Vendor Email',
        value: generateRandomEmail(companyName),
        confidence: 0.98,
        bbox: [50, 95, 300, 115]
      },
      
      // Customer Information
      {
        id: 'customer_name',
        label: 'Customer Name',
        value: customerName,
        confidence: 0.96,
        bbox: [350, 20, 600, 40]
      },
      {
        id: 'customer_address',
        label: 'Customer Address',
        value: generateRandomAddress(),
        confidence: 0.94,
        bbox: [350, 45, 600, 65]
      },
      {
        id: 'customer_phone',
        label: 'Customer Phone',
        value: generateRandomPhone(),
        confidence: 0.95,
        bbox: [350, 70, 600, 90]
      },
      {
        id: 'customer_email',
        label: 'Customer Email',
        value: generateRandomEmail(customerName),
        confidence: 0.97,
        bbox: [350, 95, 600, 115]
      },

      // Document Details
      {
        id: 'invoice_number',
        label: 'Invoice Number',
        value: `INV-${Math.floor(Math.random() * 10000)}`,
        confidence: 0.98,
        bbox: [50, 140, 200, 160]
      },
      {
        id: 'date',
        label: 'Date',
        value: new Date().toISOString().split('T')[0],
        confidence: 0.95,
        bbox: [350, 140, 500, 160]
      },
      {
        id: 'po_number',
        label: 'PO Number',
        value: `PO-${Math.floor(Math.random() * 10000)}`,
        confidence: 0.96,
        bbox: [50, 165, 200, 185]
      },
      {
        id: 'due_date',
        label: 'Due Date',
        value: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        confidence: 0.95,
        bbox: [350, 165, 500, 185]
      },

      // Line Items
      {
        id: 'line_item_1_description',
        label: 'Description',
        value: 'Professional Services - Web Development',
        confidence: 0.90,
        bbox: [50, 220, 300, 240]
      },
      {
        id: 'line_item_1_quantity',
        label: 'Quantity',
        value: '40',
        confidence: 0.95,
        bbox: [310, 220, 380, 240]
      },
      {
        id: 'line_item_1_price',
        label: 'Unit Price',
        value: '$150.00',
        confidence: 0.93,
        bbox: [390, 220, 480, 240]
      },
      {
        id: 'line_item_1_total',
        label: 'Total',
        value: '$6,000.00',
        confidence: 0.94,
        bbox: [490, 220, 580, 240]
      },
      {
        id: 'line_item_2_description',
        label: 'Description',
        value: 'UI/UX Design Services',
        confidence: 0.91,
        bbox: [50, 245, 300, 265]
      },
      {
        id: 'line_item_2_quantity',
        label: 'Quantity',
        value: '25',
        confidence: 0.96,
        bbox: [310, 245, 380, 265]
      },
      {
        id: 'line_item_2_price',
        label: 'Unit Price',
        value: '$175.00',
        confidence: 0.94,
        bbox: [390, 245, 480, 265]
      },
      {
        id: 'line_item_2_total',
        label: 'Total',
        value: '$4,375.00',
        confidence: 0.95,
        bbox: [490, 245, 580, 265]
      },

      // Totals
      {
        id: 'subtotal',
        label: 'Subtotal',
        value: '$10,375.00',
        confidence: 0.97,
        bbox: [390, 280, 580, 300]
      },
      {
        id: 'tax_amount',
        label: 'Tax (10%)',
        value: '$1,037.50',
        confidence: 0.96,
        bbox: [390, 305, 580, 325]
      },
      {
        id: 'total_amount',
        label: 'Total Amount',
        value: '$11,412.50',
        confidence: 0.98,
        bbox: [390, 330, 580, 350]
      }
    ],
    documentType: 'invoice',
    confidence: 0.95
  };
};