# NeoVision - Intelligent Document Processing Platform

## 🚀 Overview

NeoVision is a comprehensive **Intelligent Document Processing (IDP)** solution that combines advanced AI/ML models with a modern web interface to extract, process, and analyze documents intelligently.

## ✨ Features

### 🧠 Core IDP Capabilities
- **Multi-format Document Processing**: PDF, Images (JPG, PNG), Office docs, Text files
- **Advanced OCR**: PaddleOCR integration for high-accuracy text extraction
- **AI-Powered Field Extraction**: LayoutLMv3, TrOCR, and Donut models
- **Intelligent Document Classification**: Automatic document type detection
- **Table Detection & Extraction**: Advanced table recognition and data extraction

### 🤖 Agentic IDP Features
- **Human-in-the-Loop Learning**: Continuous improvement through user feedback
- **Automated Training Pipelines**: Self-improving models based on usage patterns
- **Intelligent Workflow Management**: Smart routing and processing decisions
- **Multi-modal Processing**: Text, images, and structured data handling

### 🎯 User Experience
- **Modern React Frontend**: TypeScript + Vite + Tailwind CSS
- **Real-time Processing**: Live document processing with progress tracking
- **Interactive Annotation**: Visual feedback and correction tools
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## 🏗️ Architecture

```
neovision/
├── frontend/          # React + TypeScript + Vite
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Application pages
│   │   ├── services/      # API services
│   │   └── store/         # State management
│   ├── package.json
│   └── vite.config.ts
├── backend/           # FastAPI + Python
│   ├── models/            # ML models and processors
│   ├── routers/           # API endpoints
│   ├── services/          # Business logic
│   ├── main.py            # FastAPI application
│   └── requirements.txt
├── docs/              # Documentation
├── docker/            # Docker configurations
└── .github/           # CI/CD workflows
```

## 🛠️ Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Axios** for API communication

### Backend
- **FastAPI** for high-performance API
- **Python 3.9+** with async support
- **PaddleOCR** for optical character recognition
- **LayoutLMv3** for document understanding
- **TrOCR** for text recognition
- **Donut** for document parsing
- **spaCy** for NLP processing

### Database & Storage
- **Supabase** (recommended) for database and authentication
- **PostgreSQL** (alternative) for data storage
- **Redis** for caching and session management

### Deployment
- **Docker** for containerization
- **Render** for cloud deployment
- **GitHub Actions** for CI/CD

## 🚀 Quick Start

### Prerequisites
- Python 3.9+
- Node.js 18+
- Git

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/saisoftglobal/neovision.git
   cd neovision
   ```

2. **Backend Setup**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   python main.py
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **Access the Application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up --build
```

## 📚 Documentation

- [Deployment Guide](DEPLOYMENT_GUIDE.md)
- [Database Setup](DATABASE_SETUP_GUIDE.md)
- [Production Architecture](PRODUCTION_ARCHITECTURE.md)
- [API Documentation](http://localhost:8000/docs)

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_TYPE=supabase
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Application
ENVIRONMENT=development
FRONTEND_URL=http://localhost:5173
PYTHONPATH=/app/backend

# Security
SECRET_KEY=your_secret_key_here
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Contact: kishor@saisoftglobal.com

## 🎯 Roadmap

- [ ] Advanced document templates
- [ ] Multi-language support
- [ ] API rate limiting
- [ ] Advanced analytics dashboard
- [ ] Mobile app development
- [ ] Enterprise SSO integration

---

**NeoVision** - Transforming documents into intelligent insights 🚀