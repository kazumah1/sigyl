import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import packagesRouter from './routes/packages';
import { APIResponse } from './types';

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
const allowedOrigins = [
  'http://localhost:3001',
  'http://localhost:8080', 
  'http://localhost:5173',
  process.env.CORS_ORIGIN
].filter((origin): origin is string => Boolean(origin));

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

// Logging middleware
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (_req, res) => {
  const response: APIResponse<{ status: string; timestamp: string }> = {
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString()
    },
    message: 'Registry API is healthy'
  };
  res.json(response);
});

// API routes
app.use('/api/v1/packages', packagesRouter);

// Root endpoint
app.get('/', (_req, res) => {
  const response: APIResponse<{ service: string; version: string }> = {
    success: true,
    data: {
      service: 'MCP Registry API',
      version: '0.1.0'
    },
    message: 'Welcome to the MCP Registry API'
  };
  res.json(response);
});

// 404 handler
app.use('*', (req, res) => {
  const response: APIResponse<null> = {
    success: false,
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} not found`
  };
  res.status(404).json(response);
});

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  
  const response: APIResponse<null> = {
    success: false,
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  };
  
  res.status(500).json(response);
});

export default app; 