# syntax=docker/dockerfile:1
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install build tools if any native modules need compilation
RUN apk add --no-cache python3 make g++

# Copy package files first for better Docker layer caching
COPY package*.json ./

# Install production dependencies
RUN npm ci --omit=dev

# Copy application source code and default config
COPY . .

# Ensure config.json exists if only config.example.json is present
RUN if [ ! -f config.json ]; then cp config.example.json config.json; fi

# Default command to run Zoltraak
CMD ["node", "bot.js"]
