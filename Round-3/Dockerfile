# Single Dockerfile for both frontend and backend
FROM node:18-alpine AS frontend-build

WORKDIR /app/frontend

# Copy frontend package files
COPY Round_3/frontend/package*.json ./
RUN npm ci

# Copy frontend source code and build
COPY Round_3/frontend/ ./
RUN npm run build

# Production stage with both frontend and backend
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements and install dependencies
COPY Round_3/backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source code
COPY Round_3/backend/ ./backend/

# Copy built frontend from previous stage
COPY --from=frontend-build /app/frontend/dist ./frontend/dist/

# Create uploads directory
RUN mkdir -p backend/uploads

# Create startup script
RUN echo '#!/bin/bash\n\
echo "Starting FastAPI backend..."\n\
cd backend\n\
uvicorn app:app --host 0.0.0.0 --port 8000 &' > /app/start.sh && \
    echo 'sleep 2\n\
echo "Starting frontend server..."\n\
cd frontend/dist\n\
python3 -m http.server 3000 &' >> /app/start.sh && \
    echo 'wait' >> /app/start.sh && \
    chmod +x /app/start.sh

# Set environment variables
ENV PYTHONPATH=/app

# Expose ports
EXPOSE 8000 3000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/docs || exit 1

# Run the application
CMD ["/app/start.sh"]
