import { Request, Response, NextFunction } from 'express';
import { APIKeyService } from '../services/apiKeyService';
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

export interface GitHubAuthOptions {
  required?: boolean;
  permissions?: Permission[];
}

/**
 * Authentication middleware that validates GitHub App tokens
 */
export const authenticateGitHub = (options: GitHubAuthOptions = {}) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader) {
        if (options.required) {
          return res.status(401).json({
            success: false,
            error: 'GitHub token required',
            message: 'Please provide a GitHub App token in the Authorization header'
          });
        }
        return next();
      }

      // Extract token from Authorization header
      const token = authHeader.startsWith('Bearer ') 
        ? authHeader.substring(7) 
        : authHeader;

      // Validate GitHub token by making a request to GitHub API
      const githubUser = await validateGitHubToken(token);
      
      if (!githubUser) {
        if (options.required) {
          return res.status(401).json({
            success: false,
            error: 'Invalid GitHub token',
            message: 'The provided GitHub token is invalid or has expired'
          });
        }
        return next();
      }

      // Create or get the user in our database
      const user = await APIKeyService.createOrGetGitHubUser(
        githubUser.id.toString(),
        githubUser.email || `${githubUser.login}@users.noreply.github.com`,
        githubUser.name || githubUser.login
      );

      // Create a user object that matches the API key authentication format
      const authenticatedUser: AuthenticatedUser = {
        key_id: `github_${githubUser.id}`,
        user_id: user.id, // Use the database user ID
        permissions: ['read', 'write', 'admin'], // GitHub App users get full permissions
        is_active: true
      };

      // Attach user to request
      req.user = authenticatedUser;

      next();
    } catch (error) {
      console.error('GitHub authentication error:', error);
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
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Error validating GitHub token:', error);
    return null;
  }
}

/**
 * Require GitHub authentication for all requests
 */
export const requireGitHubAuth = authenticateGitHub({ required: true });

/**
 * Require specific permissions (for GitHub App users, they have all permissions)
 */
export const requireGitHubPermissions = (permissions: Permission[]) => 
  authenticateGitHub({ required: true, permissions });

/**
 * Optional GitHub authentication (for endpoints that work with or without auth)
 */
export const optionalGitHubAuth = authenticateGitHub({ required: false }); 