import { Request, Response, NextFunction } from 'express';
import { APIKeyService } from '../services/apiKeyService';
import type { AuthenticatedUser, Permission } from '../types';

// Extend Express Request interface to include authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export interface AuthOptions {
  required?: boolean;
  permissions?: Permission[];
}

/**
 * Authentication middleware that validates API keys
 */
export const authenticate = (options: AuthOptions = {}) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader) {
        if (options.required) {
          return res.status(401).json({
            success: false,
            error: 'API key required',
            message: 'Please provide an API key in the Authorization header'
          });
        }
        return next();
      }

      // Extract API key from Authorization header
      // Supports both "Bearer sk_..." and "sk_..." formats
      const apiKey = authHeader.startsWith('Bearer ') 
        ? authHeader.substring(7) 
        : authHeader;

      // Validate API key
      const authenticatedUser = await APIKeyService.validateAPIKey(apiKey);
      
      if (!authenticatedUser) {
        if (options.required) {
          return res.status(401).json({
            success: false,
            error: 'Invalid API key',
            message: 'The provided API key is invalid or has expired'
          });
        }
        return next();
      }

      // Check permissions if required
      if (options.permissions && options.permissions.length > 0) {
        const hasPermission = APIKeyService.hasPermission(
          authenticatedUser.permissions,
          options.permissions
        );

        if (!hasPermission) {
          return res.status(403).json({
            success: false,
            error: 'Insufficient permissions',
            message: `This endpoint requires the following permissions: ${options.permissions.join(', ')}`
          });
        }
      }

      // Attach user to request
      req.user = authenticatedUser;

      // Log usage asynchronously (don't wait for it)
      const startTime = Date.now();
      
      // Override res.json to capture response time
      const originalJson = res.json;
      res.json = function(data: any) {
        const responseTime = Date.now() - startTime;
        
        // Log usage in background
        APIKeyService.logUsage(
          authenticatedUser.key_id,
          req.path,
          req.method,
          res.statusCode,
          responseTime,
          req.ip,
          req.get('User-Agent')
        ).catch(err => {
          console.error('Failed to log API usage:', err);
        });

        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      console.error('Authentication error:', error);
      return res.status(500).json({
        success: false,
        error: 'Authentication failed',
        message: 'An error occurred during authentication'
      });
    }
  };
};

/**
 * Require authentication for all requests
 */
export const requireAuth = authenticate({ required: true });

/**
 * Require specific permissions
 */
export const requirePermissions = (permissions: Permission[]) => 
  authenticate({ required: true, permissions });

/**
 * Optional authentication (for endpoints that work with or without auth)
 */
export const optionalAuth = authenticate({ required: false });

/**
 * Rate limiting middleware based on API key
 */
export const rateLimit = (options: {
  windowMs: number;
  maxRequests: number;
  message?: string;
} = { windowMs: 60000, maxRequests: 100 }) => {
  const { windowMs, maxRequests, message } = options;
  const requests = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(); // Skip rate limiting for unauthenticated requests
    }

    const key = req.user.key_id;
    const now = Date.now();

    const userRequests = requests.get(key);
    
    if (!userRequests || userRequests.resetTime < now) {
      // First request or window expired
      requests.set(key, { count: 1, resetTime: now + windowMs });
    } else {
      // Increment request count
      userRequests.count++;
      
      if (userRequests.count > maxRequests) {
        return res.status(429).json({
          success: false,
          error: 'Rate limit exceeded',
          message: message || `Too many requests. Limit: ${maxRequests} requests per ${windowMs / 1000} seconds`
        });
      }
    }

    next();
  };
}; 