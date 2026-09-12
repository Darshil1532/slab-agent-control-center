# SLAB Agent Control Center Dockerfile
FROM node:20-bookworm-slim

# Install system dependencies required for Chromium/browser automation
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libglib2.0-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    xdg-utils \
    procps \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies first for efficient layer caching
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application source code
COPY . .

# Expose server port (3000) and webcmd daemon port (9777)
EXPOSE 3000 9777

ENV NODE_ENV=production
ENV PORT=3000

CMD ["npm", "start"]
