import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import packagesRouter from './routes/packages';
import githubAppRouter from './routes/githubApp';
import apiKeysRouter from './routes/apiKeys';
import deployRouter from './routes/deploy';
import deploymentsRouter from './routes/deployments';
import secretsRouter from './routes/secrets';
import gatewayRouter from './routes/gateway';
import healthRouter from './routes/health';
import workspacesRouter from './routes/workspaces';
import contactRouter from './routes/contact';
import emailsRouter from './routes/emails';
import mcpProxyRouter from './routes/mcpProxy';
import analyticsRouter from './routes/analytics';
import mcpServersRouter from './routes/mcpServers';
import profilesRouter from './routes/profiles';
import docsRouter from './routes/docs';
import notificationsRouter from './routes/notifications';
import sessionAnalyticsRouter from './routes/sessionAnalytics';
import { APIResponse } from './types';
import {
  generalRateLimit,
  authRateLimit,
  deploymentRateLimit,
  corsOptions,
  validateContentType,
  validateRequestSize,
  securityHeaders,
  errorHandler,
  requestLogger
} from './middleware/security';

const app = express();

// Trust proxy for accurate IP addresses behind load balancers
app.set('trust proxy', 1);

// Request logging (before other middleware for complete logs)
app.use(requestLogger);

// Security headers
app.use(securityHeaders);

// Helmet for additional security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.github.com", "https://*.supabase.co"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration with enhanced security
app.use(cors(corsOptions));

// Rate limiting - apply general rate limit to all routes
app.use(generalRateLimit as any);

// Request validation middleware
app.use(validateRequestSize);
app.use(validateContentType);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoints (no rate limiting for monitoring)
app.use('/health', healthRouter);

// Root endpoint
app.get('/', (_req, res) => {
  const response: APIResponse<{ service: string; version: string; status: string }> = {
    success: true,
    data: {
      service: 'Sigyl MCP Registry API',
      version: '1.0.0',
      status: 'production'
    },
    message: 'Welcome to the Sigyl MCP Registry API'
  };
  res.json(response);
});

// API routes with specific rate limiting
app.use('/api/v1/packages', packagesRouter);
app.use('/api/v1/github', authRateLimit as any, githubAppRouter); // Auth endpoints have stricter limits
app.use('/api/v1/keys', apiKeysRouter);
app.use('/api/v1', deploymentRateLimit as any, deployRouter); // Deployment endpoints have strict limits
app.use('/api/v1/deployments', deploymentsRouter);
app.use('/api/v1/secrets', secretsRouter);
app.use('/api/v1/gateway', gatewayRouter);
app.use('/api/v1/workspaces', workspacesRouter);
app.use('/api/v1/contact', contactRouter);
app.use('/api/v1/emails', emailsRouter);
app.use('/api/v1/mcp', mcpProxyRouter);
app.use('/api/v1/analytics', analyticsRouter);
app.use('/api/v1/session-analytics', sessionAnalyticsRouter);
app.use('/api/v1/mcp-servers', mcpServersRouter);
app.use('/api/v1/profiles', profilesRouter);
app.use('/api/v1/docs', docsRouter);
app.use('/internal', notificationsRouter);

// API documentation endpoint
app.get('/api', (_req, res) => {
  const response: APIResponse<{ 
    endpoints: string[];
    documentation: string;
    rateLimits: Record<string, string>;
  }> = {
    success: true,
    data: {
      endpoints: [
        'GET /health - Health check',
        'GET /health/detailed - Detailed health check',
        'GET /api/v1/packages - List packages',
        'POST /api/v1/deploy - Deploy MCP server',
        'GET /api/v1/github/* - GitHub integration',
        'GET /api/v1/secrets - Manage secrets',
      ],
      documentation: 'https://docs.sigyl.com/api',
      rateLimits: {
        general: '100 requests/15min',
        auth: '10 requests/15min', 
        deployment: '20 requests/hour'
      }
    },
    message: 'Sigyl MCP Registry API - Production Ready'
  };
  res.json(response);
});

// Debug endpoint for authentication testing
app.get('/debug-auth', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
  
  res.json({
    success: true,
    data: {
      hasAuthHeader: !!authHeader,
      authHeader: authHeader ? `${authHeader.substring(0, 20)}...` : null,
      tokenLength: token?.length || 0,
      tokenPrefix: token ? token.substring(0, 20) + '...' : null,
      tokenType: token ? (
        token.startsWith('gho_') || token.startsWith('ghp_') || token.startsWith('github_pat_') ? 'github' :
        token.split('.').length === 3 ? 'jwt' :
        token.startsWith('sk_') ? 'api_key' :
        'unknown'
      ) : null
    }
  });
});

// 404 handler with enhanced logging
app.use('*', (req, res) => {
  console.warn(`404 - Route not found: ${req.method} ${req.originalUrl} from ${req.ip}`);
  
  const response: APIResponse<null> = {
    success: false,
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} not found`
  };
  res.status(404).json(response);
});

// Global error handler (use our custom error handler)
app.use(errorHandler);

export default app; 