import express, { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/database';
import { APIKeyService } from '../services/apiKeyService';

const router = express.Router();

// Custom middleware to support both API key and GitHub App token auth
const authenticateWorkspace = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'Please provide an API key or GitHub token in the Authorization header'
      });
    }

    // Extract token from Authorization header
    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : authHeader;

    // Try API key authentication first
    if (token.startsWith('sk_')) {
      const authenticatedUser = await APIKeyService.validateAPIKey(token);
      if (authenticatedUser) {
        req.user = authenticatedUser;
        return next();
      }
    }

    // Try GitHub App token authentication
    try {
      // Verify GitHub token by making a request to GitHub API
      const githubResponse = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (githubResponse.ok) {
        const githubUser = await githubResponse.json() as { id: number; login: string };
        req.user = {
          user_id: `github_${githubUser.id}`,
          key_id: `github_${githubUser.id}`,
          permissions: ['workspace:write'],
          is_active: true
        };
        return next();
      }
    } catch (error) {
      console.error('GitHub token validation error:', error);
    }

    return res.status(401).json({
      success: false,
      error: 'Invalid authentication',
      message: 'The provided token is invalid or has expired'
    });
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed',
      message: 'An error occurred during authentication'
    });
  }
};

// PATCH /api/v1/workspaces/:id - Update workspace name
router.patch('/:id', authenticateWorkspace, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Invalid workspace name' });
    }
    
    // Fetch workspace
    const { data: workspace, error: fetchError } = await supabase
      .from('workspaces')
      .select('*')
      .eq('id', id)
      .single();
      
    if (fetchError || !workspace) {
      return res.status(404).json({ success: false, error: 'Workspace not found' });
    }
    
    // Check if user is the owner
    if (workspace.owner_id !== req.user!.user_id) {
      return res.status(403).json({ success: false, error: 'Not authorized to update this workspace' });
    }
    
    // Update name
    const { data: updated, error: updateError } = await supabase
      .from('workspaces')
      .update({ name: name.trim(), updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
      
    if (updateError) {
      console.error('Error updating workspace:', updateError);
      return res.status(500).json({ success: false, error: 'Failed to update workspace name' });
    }
    
    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Workspace update error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router; 