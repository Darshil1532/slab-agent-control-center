# SLAB Agent Control Center - Isolated Container Runtime
# Enforces OS-level isolation boundary recommended in SECURITY.md

FROM node:20-bookworm-slim

# Install system dependencies required for Chromium headless/runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    gnupg \
    procps \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libdbus-1-3 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies first for Docker layer caching
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application source code
COPY . .

# Ensure security log directory exists with correct permissions
RUN mkdir -p .security && chown -R node:node /app

# Switch to unprivileged user
USER node

# Expose Web Control Center port
EXPOSE 3000

# Container health probe
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/healthz || exit 1

# Launch Control Center Server
CMD ["node", "server.js"]
