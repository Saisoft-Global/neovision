const config = {
  port: process.env.PORT || 8000,
  uploadDir: 'uploads/',
  allowedFileTypes: [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ],
  maxFileSize: 10 * 1024 * 1024 // 10MB
};

module.exports = config;