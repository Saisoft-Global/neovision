const express = require('express');
const multer = require('multer');
const { processDocument, trainModel } = require('../services/documentService');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.post('/process-document', upload.single('file'), async (req, res) => {
  try {
    const result = await processDocument(req.file);
    res.json(result);
  } catch (error) {
    console.error('Error processing document:', error);
    res.status(500).json({ error: 'Failed to process document' });
  }
});

router.post('/train-model', upload.single('file'), async (req, res) => {
  try {
    const { modelName, documentType, fields } = req.body;
    const result = await trainModel(req.file, { modelName, documentType, fields });
    res.json(result);
  } catch (error) {
    console.error('Error training model:', error);
    res.status(500).json({ error: 'Failed to train model' });
  }
});

module.exports = router;