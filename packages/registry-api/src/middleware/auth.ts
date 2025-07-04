import { Request, Response, NextFunction } from 'express';
import { APIKeyService } from '../services/apiKeyService';
import { supabase } from '../config/database';
import type { AuthenticatedUser, Permission } from '../types';
import fetch from 'node-fetch';

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

/**
 * Hybrid authentication middleware that supports both GitHub App tokens and Supabase JWT tokens
 */
export const authenticateHybrid = (options: AuthOptions = {}) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader) {
        if (options.required) {
          return res.status(401).json({
            success: false,
            error: 'Authentication required',
            message: 'Please provide a token in the Authorization header'
          });
        }
        return next();
      }

      // Extract token from Authorization header
      const token = authHeader.startsWith('Bearer ') 
        ? authHeader.substring(7) 
        : authHeader;

      console.log('🔍 Hybrid Auth Debug:', {
        tokenPrefix: token.substring(0, 20) + '...',
        tokenLength: token.length,
        endpoint: req.path
      });

      let authenticatedUser: AuthenticatedUser | null = null;

      // Try GitHub App token authentication first
      try {
        console.log('🔍 Trying GitHub token validation...');
        const githubUser = await validateGitHubToken(token);
        if (githubUser) {
          console.log('✅ GitHub token valid:', { id: githubUser.id, login: githubUser.login });
          // Create or get the user in our database
          const user = await APIKeyService.createOrGetGitHubUser(
            githubUser.id.toString(),
            githubUser.email || `${githubUser.login}@users.noreply.github.com`,
            githubUser.name || githubUser.login
          );

          authenticatedUser = {
            key_id: `github_${githubUser.id}`,
            user_id: user.id,
            permissions: ['read', 'write', 'admin'], // GitHub App users get full permissions
            is_active: true
          };
        } else {
          console.log('❌ GitHub token validation returned null');
        }
      } catch (githubError) {
        console.log('❌ GitHub token validation failed:', githubError instanceof Error ? githubError.message : String(githubError));
      }

      // If GitHub auth failed, try Supabase JWT authentication
      if (!authenticatedUser) {
        try {
          console.log('🔍 Trying Supabase JWT validation...');
          const supabaseUser = await validateSupabaseJWT(token);
          if (supabaseUser) {
            console.log('✅ Supabase JWT valid:', { id: supabaseUser.id, email: supabaseUser.email });
            // If user has a GitHub provider_id or sub, use createOrGetGitHubUser
            const githubId = supabaseUser.user_metadata?.provider_id || supabaseUser.user_metadata?.sub;
            let user;
            if (githubId) {
              user = await APIKeyService.createOrGetGitHubUser(
                githubId,
                supabaseUser.email,
                supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.user_name || 'User'
              );
            } else {
              user = await APIKeyService.createOrGetUser(
                supabaseUser.email,
                supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.user_name || 'User'
              );
            }
            authenticatedUser = {
              key_id: `supabase_${supabaseUser.id}`,
              user_id: user.id,
              permissions: ['read', 'write'],
              is_active: true
            };
          } else {
            console.log('❌ Supabase JWT validation returned null');
          }
        } catch (supabaseError) {
          console.log('❌ Supabase JWT validation failed:', supabaseError instanceof Error ? supabaseError.message : String(supabaseError));
        }
      }

      // DEBUG LOGS
      console.log('DEBUG: Raw JWT:', token);
      console.log('DEBUG: Decoded user ID:', authenticatedUser?.user_id);

      if (!authenticatedUser) {
        console.log('❌ Both authentication methods failed');
        if (options.required) {
          return res.status(401).json({
            success: false,
            error: 'Invalid authentication token',
            message: 'The provided authentication token is invalid or has expired'
          });
        }
        return next();
      }

      console.log('✅ Authentication successful:', {
        key_id: authenticatedUser.key_id,
        user_id: authenticatedUser.user_id,
        permissions: authenticatedUser.permissions
      });

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
      next();
    } catch (error) {
      console.error('Hybrid authentication error:', error);
      return res.status(500).json({
        success: false,
        error: 'Authentication failed',
        message: 'An error occurred during authentication'
      });
    }
  };
};

/**
 * Validate GitHub token by making a request to GitHub API
 */
async function validateGitHubToken(token: string): Promise<any> {
  try {
    console.log('🔍 Validating GitHub token...');
    
    // Check if token looks like a GitHub token
    if (!token.startsWith('gho_') && !token.startsWith('ghp_') && !token.startsWith('github_pat_')) {
      console.log('❌ Token does not look like a GitHub token (wrong prefix)');
      return null;
    }

    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      console.log('❌ GitHub API response not ok:', response.status, response.statusText);
      return null;
    }

    const user = await response.json() as any;
    console.log('✅ GitHub token validation successful:', {
      id: user.id,
      login: user.login,
      email: user.email
    });
    
    return user;
  } catch (error) {
    console.log('❌ GitHub token validation exception:', error instanceof Error ? error.message : String(error));
    return null;
  }
}

/**
 * Validate Supabase JWT token
 */
async function validateSupabaseJWT(token: string): Promise<any> {
  try {
    console.log('🔍 Validating Supabase JWT token...');
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      console.log('❌ Token does not look like a JWT (wrong number of parts)');
      return null;
    }
    console.log('🔍 Calling supabase.auth.getUser with token:', token.substring(0, 20) + '...');
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error) {
      console.log('❌ Supabase auth error:', error.message);
      return null;
    }
    if (!user) {
      console.log('❌ No user returned from Supabase');
      return null;
    }
    console.log('✅ Supabase JWT validation successful:', {
      userId: user.id,
      email: user.email,
      metadata: user.user_metadata
    });
    return user;
  } catch (error) {
    console.log('❌ Supabase JWT validation exception:', error instanceof Error ? error.message : String(error));
    return null;
  }
}

/**
 * Require hybrid authentication for all requests
 */
export const requireHybridAuth = authenticateHybrid({ required: true }); 