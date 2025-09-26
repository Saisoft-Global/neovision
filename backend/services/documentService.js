const processDocument = async (file) => {
  // Mock document processing
  return {
    fields: [
      {
        id: 'invoice_number',
        label: 'Invoice Number',
        value: `INV-${Math.floor(Math.random() * 10000)}`,
        confidence: 0.98,
        bbox: [50, 80, 200, 100]
      },
      {
        id: 'date',
        label: 'Date',
        value: new Date().toISOString().split('T')[0],
        confidence: 0.95,
        bbox: [50, 50, 200, 70]
      },
      {
        id: 'total_amount',
        label: 'Total Amount',
        value: `$${(Math.random() * 1000).toFixed(2)}`,
        confidence: 0.92,
        bbox: [50, 110, 200, 130]
      }
    ],
    documentType: 'invoice',
    confidence: 0.95
  };
};

const trainModel = async (file, { modelName, documentType, fields }) => {
  // Mock training process
  return {
    status: 'success',
    message: 'Model training completed successfully',
    modelId: `model_${Date.now()}`
  };
};

module.exports = {
  processDocument,
  trainModel
};