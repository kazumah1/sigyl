# Production Dockerfile for Sigil MCP Registry API (Monorepo Root)
FROM node:18-alpine AS builder

WORKDIR /app

# Copy all files (including all workspaces and their package.json)
COPY . .

# Install dependencies for all workspaces
RUN npm ci

# Debug: List contents of packages/shared and show its package.json
RUN ls -l /app/packages/shared && cat /app/packages/shared/package.json

# Build only the registry-api workspace
RUN npm run build --workspace=packages/registry-api

# Production image
FROM node:18-alpine AS runner

WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 apiuser
RUN adduser --system --uid 1001 apiuser

# Copy built application and dependencies
COPY --from=builder --chown=apiuser:apiuser /app/packages/registry-api/dist ./dist
COPY --from=builder --chown=apiuser:apiuser /app/node_modules ./node_modules
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