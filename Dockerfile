# ==========================================
# Stage 1: Build React Frontend
# ==========================================
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci || npm install
COPY frontend/ ./
RUN npm run build

# ==========================================
# Stage 2: Python Backend + Playwright Runtime
# ==========================================
FROM python:3.10-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    DEBIAN_FRONTEND=noninteractive \
    PORT=5000 \
    FLASK_PORT=5000

WORKDIR /app

# Install runtime system dependencies for Playwright Chromium, OpenCV headless, PyZbar & OpenMP (LightGBM/XGBoost):
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    libgomp1 \
    libglib2.0-0 \
    libnss3 \
    libnspr4 \
    libdbus-1-3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libatspi2.0-0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libxkbcommon0 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2t64 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxext6 \
    libdrm2 \
    libgbm1 \
    fonts-liberation \
    fonts-unifont \
    libzbar0 \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Install Python requirements (using tensorflow-cpu to save ~3.8GB)
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Install Playwright Chromium browser binary only
RUN playwright install chromium

# Copy active production AI models (~550 MB total)
COPY models_advance/ ./models_advance/
RUN ln -s /app/models_advance /app/models

# Copy compiled frontend build from Stage 1
COPY --from=frontend-builder /app/frontend/build ./frontend/build

# Copy environment variables & API keys
COPY .env* ./

# Copy application backend source code
COPY backend/ ./backend/
RUN mkdir -p Uploads

# Expose port 5000
EXPOSE 5000

# Entrypoint to run Flask Web Server
CMD ["python", "backend/app.py"]

