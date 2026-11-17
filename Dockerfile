# Node.js LTS Base Image
FROM node:20-alpine

# Install curl for Docker health checks
RUN apk add --no-cache curl

# Set environment
ENV NODE_ENV=production

# Set working directory
WORKDIR /usr/src/app

# Copy dependency manifests first for layer caching
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy application source code
COPY . .

# Set up storage and uploads directory permissions
RUN mkdir -p storage/logs storage/uploads \
    && chown -R node:node /usr/src/app

# Use non-root user
USER node

# Expose application port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start the application via entrypoint (waits for db, migrates safely, seeds safely, starts server)
CMD ["node", "docker-entrypoint.js"]
