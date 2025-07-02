# Production Dockerfile for Sigil MCP Registry API (Monorepo Root)
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy root package files
COPY package.json package-lock.json ./

# Copy all package.json files for workspaces
COPY packages/shared/package*.json ./packages/shared/
COPY packages/container-builder/package*.json ./packages/container-builder/
COPY packages/registry-api/package*.json ./packages/registry-api/

# Install dependencies (including workspaces)
RUN npm ci

# Build the application
FROM base AS builder
WORKDIR /app

# Copy all source code
COPY . .

# Build all workspaces
RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=packages/container-builder
RUN npm run build --workspace=packages/registry-api

# Production image
FROM base AS runner
WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 apiuser
RUN adduser --system --uid 1001 apiuser

# Copy built application and dependencies
COPY --from=builder --chown=apiuser:apiuser /app/packages/registry-api/dist ./dist
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