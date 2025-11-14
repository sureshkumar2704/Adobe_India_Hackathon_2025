# AI-Powered PDF Section Extractor & Analyzer

A sophisticated web application that leverages artificial intelligence to extract, analyze, and provide insights from PDF documents. Built with **FastAPI** backend and **React.js** frontend, this tool enables users to upload PDFs, extract specific sections, and receive AI-generated insights and recommendations.

## 🚀 Features

### Core Capabilities
- **PDF Upload & Processing**: Secure PDF upload with file size validation (up to 50MB)
- **Section Extraction**: Intelligent extraction of document sections with page-level precision
- **AI-Powered Insights**: Gemini AI integration for content analysis and recommendations
- **Interactive PDF Viewer**: Real-time PDF viewing with section highlighting
- **Podcast Generation**: AI-generated podcast scripts discussing document insights
- **Responsive Design**: Works seamlessly across desktop and mobile devices

### Advanced Features
- **Multi-format Output**: JSON, PDF URLs, and structured section data
- **Caching System**: Optimized file serving with proper caching headers
- **Error Handling**: Comprehensive error handling with detailed messages
- **Health Monitoring**: System health checks and status endpoints
- **Cross-Origin Support**: CORS enabled for flexible deployment

## 🛠️ Technology Stack

### Backend
- **FastAPI** - High-performance Python web framework with async support
- **Uvicorn** - Lightning-fast ASGI server for production deployment
- **Google Gemini AI** - Advanced language model for content analysis
- **PyMuPDF** - PDF processing and text extraction
- **Python-multipart** - File upload handling
- **Pydantic** - Data validation and serialization

### Frontend
- **React.js** - Modern JavaScript library for building user interfaces
- **Vite** - Next-generation frontend tooling with fast HMR
- **Axios** - HTTP client for API communication
- **PDF.js** - PDF rendering in web browsers
- **ESLint** - Code quality and consistency
- **React 19** - Latest React features with hooks and concurrent rendering

### Infrastructure & DevOps
- **Docker** - Containerization for consistent deployment
- **Multi-stage builds** - Optimized production images
- **Static file serving** - Efficient asset delivery
- **Nginx** - Reverse proxy and load balancing (production)
- **Environment variables** - Secure configuration management

### Development Tools
- **Python 3.8+** - Backend runtime
- **Node.js 18+** - Frontend runtime and build tools
- **Git** - Version control
- **Docker Compose** - Multi-container orchestration

## 📋 Prerequisites

### System Requirements
- **Python 3.8+** - Backend runtime
- **Node.js 18+** - Frontend runtime and build tools
- **Docker** (optional) - For containerized deployment
- **Google Gemini API key** - Required for AI functionality

### API Configuration
Set your Gemini API key as an environment variable:
```bash
export GEMINI_API_KEY="your-api-key-here"
```

## 🚦 Quick Start

### Local Development

#### Backend Setup (FastAPI + Uvicorn)
```bash
# Navigate to backend directory
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Run development server with auto-reload
uvicorn app:app --reload --host 0.0.0.0 --port 8000

# Production server
uvicorn app:app --host 0.0.0.0 --port 8000 --workers 4
```

#### Frontend Setup (React.js + Vite)
```bash
# Navigate to frontend directory
cd frontend

# Install Node.js dependencies
npm install

# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Docker Deployment

#### Build and Run with Docker
```bash
# Build the complete application stack
docker-compose up --build

# Build individual backend service
docker build -t pdf-extractor-backend ./backend

# Build frontend service
docker build -t pdf-extractor-frontend ./frontend

# Run with environment variables
docker run -p 8000:8000 -e GEMINI_API_KEY=your-key pdf-extractor-backend
```

## 🔧 API Endpoints (FastAPI)

### Core Endpoints
- `POST /upload` - Upload and process PDF files
- `GET /pdf/{filename}` - Serve processed PDF files
- `POST /get-insights` - Generate AI insights from text
- `POST /generate-podcast` - Create podcast scripts
- `GET /health` - System health check

### Utility Endpoints
- `GET /test-gemini` - Test Gemini API connectivity
- `DELETE /clear-uploads` - Clear uploaded files
- `GET /voices` - Text-to-speech information

### Interactive Documentation
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`
- **OpenAPI Schema**: `http://localhost:8000/openapi.json`

## 📊 API Response Format (FastAPI)

### Upload Response
```json
{
  "filename": "document.pdf",
  "pdf_url": "http://localhost:8000/uploads/document.pdf",
  "sections": [
    {
      "text": "Executive Summary",
      "page": 1
    }
  ],
  "title": "Document Title",
  "file_size": 1024000,
  "total_pages": 15
}
```

### Insights Response
```json
{
  "insight": "This document provides comprehensive analysis...",
  "recommendation": "Consider implementing these strategies..."
}
```

### Podcast Response
```json
{
  "title": "AI Analysis: Document Insights",
  "duration_estimate": "5-7 minutes",
  "conversation": [
    {
      "speaker": "Alex",
      "text": "Welcome to our analysis...",
      "timestamp": "00:00"
    }
  ]
}
```

## 🎯 Usage Examples (React.js Frontend)

### Basic PDF Analysis Workflow
1. **Upload Document**: Drag-and-drop or select PDF files
2. **View Sections**: Interactive sidebar with extracted sections
3. **Get Insights**: Click sections for AI-powered analysis
4. **Generate Podcast**: Create engaging audio discussions
5. **Export Results**: Download structured JSON data

### Advanced React.js Features
- **Real-time Updates**: Live section highlighting
- **Responsive Design**: Mobile-first approach
- **Error Boundaries**: Graceful error handling
- **Loading States**: Skeleton screens and spinners
- **Keyboard Navigation**: Full keyboard support

## 🔒 Security Features (FastAPI)

- **File Validation**: Strict file type and size validation (50MB limit)
- **Path Traversal Protection**: Sanitized file paths
- **CORS Configuration**: Secure cross-origin requests
- **Input Sanitization**: Clean user inputs before processing
- **Error Handling**: Secure error messages without sensitive data
- **Rate Limiting**: Optional rate limiting for API endpoints

## 📈 Performance Optimizations

### Backend (FastAPI + Uvicorn)
- **Async Processing**: Non-blocking I/O operations
- **Connection Pooling**: Efficient database connections
- **Caching Headers**: Browser caching for static assets
- **Streaming Responses**: Large file handling with chunked uploads
- **Memory Management**: Efficient memory usage during processing
- **Gzip Compression**: Compressed API responses

### Frontend (React.js + Vite)
- **Code Splitting**: Lazy loading for optimal bundle sizes
- **Image Optimization**: Responsive images with modern formats
- **Tree Shaking**: Dead code elimination
- **Prefetching**: Strategic resource prefetching
- **Service Worker**: Offline functionality (PWA ready)

## 🧪 Testing (Comprehensive)

### Backend Testing (FastAPI)
```bash
# Test Gemini API connectivity
curl http://localhost:8000/test-gemini

# Health check endpoint
curl http://localhost:8000/health

# Upload test with sample PDF
curl -X POST -F "file=@test.pdf" http://localhost:8000/upload

# Insights generation test
curl -X POST -H "Content-Type: application/json" \
  -d '{"text":"Sample text for analysis"}' \
  http://localhost:8000/get-insights
```

### Frontend Testing (React.js)
```bash
# Run ESLint for code quality
npm run lint

# Build for production
npm run build

# Preview production build
npm run preview

# Test with different screen sizes
npm run dev -- --host 0.0.0.0
```

### Integration Testing
```bash
# Test full workflow
# 1. Start backend: uvicorn app:app --reload
# 2. Start frontend: npm run dev
# 3. Upload PDF through web interface
# 4. Verify section extraction
# 5. Test AI insights generation
# 6. Validate podcast generation
```

## 🚀 Deployment Options

### Production Deployment Options

#### Docker Compose (Recommended)
```yaml
# Production-ready docker-compose.yml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - GEMINI_API_KEY=${GEMINI_API_KEY}
  
  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend
```

#### Cloud Platforms
- **AWS**: ECS, Lambda, or EC2 deployment
- **Google Cloud**: Cloud Run, App Engine, or GKE
- **Azure**: Container Instances or App Service
- **Digital Ocean**: App Platform or Droplets

### Environment Variables
```bash
# Required for FastAPI backend
GEMINI_API_KEY=your-api-key
PORT=8000
HOST=0.0.0.0
DEBUG=false
LOG_LEVEL=info

# Optional for React.js frontend
REACT_APP_API_URL=http://localhost:8000
REACT_APP_ENV=development
```

## 📚 Documentation & Resources

### API Documentation (FastAPI)
- **Interactive API Docs**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`
- **OpenAPI Schema**: `http://localhost:8000/openapi.json`
- **Postman Collection**: Available in repository

### Development Resources
- **Backend Architecture**: FastAPI with async processing and dependency injection
- **Frontend Components**: React.js hooks, context API, and modern patterns
- **Error Handling**: Comprehensive error boundaries and fallbacks
- **Testing Strategy**: Unit tests, integration tests, and E2E tests
- **Performance Monitoring**: Built-in metrics and logging

## 🤝 Contributing (Open Source)

### Development Guidelines
1. **Python Code Style**: Follow PEP 8 with Black formatter (88 char line length)
2. **JavaScript Code Style**: ESLint with React hooks rules and Prettier
3. **Testing**: Write comprehensive tests for new features (pytest for backend, Jest for frontend)
4. **Documentation**: Update API docs and README for all changes
5. **Commit Messages**: Use conventional commits format

### Code Quality Tools
- **Backend**: Black, isort, flake8, mypy, pytest
- **Frontend**: ESLint, Prettier, Jest, React Testing Library
- **Pre-commit Hooks**: Automated code formatting and linting

## 📄 License & Support

### License
This project is open source and available under the [MIT License](LICENSE).

### Support Channels
- **GitHub Issues**: Bug reports and feature requests
- **Documentation**: Comprehensive guides and examples
- **Community**: Discord/Slack community support
- **Commercial Support**: Available for enterprise deployments

### Troubleshooting Guide
- **API Issues**: Check Gemini API key and network connectivity
- **PDF Processing**: Ensure PDF files are not corrupted or password-protected
- **CORS Errors**: Verify frontend URL in CORS configuration
- **Memory Issues**: Increase Docker memory limits for large files
- **Performance**: Monitor with built-in health checks and metrics

---

**Built with ❤️ using FastAPI, React.js, Uvicorn, and Google Gemini AI**

**Technology Stack**: FastAPI + Uvicorn + React.js + Vite + Docker + Gemini AI
