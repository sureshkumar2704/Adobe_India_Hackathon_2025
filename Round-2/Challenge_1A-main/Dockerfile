# Base image with Python
FROM --platform=linux/amd64 python:3.10-slim

# Set working directory
WORKDIR /app

# Copy all project files
COPY . .

# Install dependencies
RUN pip install --upgrade pip && pip install -r requirements.txt

# Default command to run your script
CMD ["python", "process_pdfs.py"]
