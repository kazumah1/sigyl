# Production Dockerfile for Sigil MCP Registry API
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/registry-api/package*.json ./packages/registry-api/
COPY packages/container-builder/package*.json ./packages/container-builder/
COPY packages/shared/package*.json ./packages/shared/

# Install dependencies
RUN npm ci --only=production

# Build the application
FROM base AS builder
WORKDIR /app

# Copy package files and source code
COPY package*.json ./
COPY packages/ ./packages/

# Install all dependencies (including dev)
RUN npm ci

# Build the registry API and dependencies
RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=packages/container-builder  
RUN npm run build --workspace=packages/registry-api

# Production image
FROM base AS runner
WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 apiuser
RUN adduser --system --uid 1001 apiuser

# Copy built application
COPY --from=builder --chown=apiuser:apiuser /app/packages/registry-api/dist ./dist
COPY --from=builder --chown=apiuser:apiuser /app/packages/container-builder/dist ./node_modules/@sigil/container-builder/dist
COPY --from=builder --chown=apiuser:apiuser /app/packages/shared ./node_modules/@sigil/shared
COPY --from=deps --chown=apiuser:apiuser /app/node_modules ./node_modules
COPY --from=builder --chown=apiuser:apiuser /app/packages/registry-api/package.json ./package.json

# Switch to non-root user
USER apiuser

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["node", "dist/index.js"] 