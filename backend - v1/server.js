const express = require('express');
const cors = require('cors');
const documentRoutes = require('./routes/document');
const errorHandler = require('./middleware/errorHandler');
const config = require('./config');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', documentRoutes);

// Error handling
app.use(errorHandler);

// Start server
app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});