import { Router, Request, Response } from 'express';
import { APIKeyService } from '../services/apiKeyService';
import { requireHybridAuth } from '../middleware/auth';
import type { CreateAPIKeyRequest } from '../types';

const router = Router();

/**
 * Create a new API key
 * POST /api/keys
 */
router.post('/', requireHybridAuth, async (req: Request, res: Response) => {
  try {
    const { name, permissions, expires_at }: CreateAPIKeyRequest = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field',
        message: 'API key name is required'
      });
    }

    // Validate permissions
    const validPermissions = ['read', 'write', 'admin'];
    if (permissions && permissions.some(p => !validPermissions.includes(p))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid permissions',
        message: `Valid permissions are: ${validPermissions.join(', ')}`
      });
    }

    // Validate expiration date
    if (expires_at) {
      const expirationDate = new Date(expires_at);
      if (isNaN(expirationDate.getTime()) || expirationDate <= new Date()) {
        return res.status(400).json({
          success: false,
          error: 'Invalid expiration date',
          message: 'Expiration date must be a valid future date'
        });
      }
    }

    const { apiKey, keyData } = await APIKeyService.createAPIKey(
      req.user!.user_id,
      { 
        name, 
        permissions: permissions || [], 
        ...(expires_at && { expires_at })
      }
    );

    return res.status(201).json({
      success: true,
      data: {
        api_key: apiKey, // Only returned once
        key: {
          id: keyData.id,
          name: keyData.name,
          key_prefix: keyData.key_prefix,
          permissions: keyData.permissions,
          expires_at: keyData.expires_at,
          created_at: keyData.created_at
        }
      },
      message: 'API key created successfully'
    });
  } catch (error) {
    console.error('Error creating API key:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create API key',
      message: 'An error occurred while creating the API key'
    });
  }
});

/**
 * List all API keys for the authenticated user
 * GET /api/keys
 */
router.get('/', requireHybridAuth, async (req: Request, res: Response) => {
  try {
    const apiKeys = await APIKeyService.getUserAPIKeys(req.user!.user_id);

    return res.json({
      success: true,
      data: {
        keys: apiKeys.map(key => ({
          id: key.id,
          name: key.name,
          key_prefix: key.key_prefix,
          permissions: key.permissions,
          is_active: key.is_active,
          last_used: key.last_used,
          expires_at: key.expires_at,
          created_at: key.created_at
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching API keys:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch API keys',
      message: 'An error occurred while fetching API keys'
    });
  }
});

/**
 * Get a specific API key
 * GET /api/keys/:id
 */
router.get('/:id', requireHybridAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const apiKey = await APIKeyService.getAPIKey(id);

    if (!apiKey) {
      return res.status(404).json({
        success: false,
        error: 'API key not found',
        message: 'The specified API key does not exist'
      });
    }

    // Check if the user owns this API key
    if (apiKey.user_id !== req.user!.user_id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You can only view your own API keys'
      });
    }

    return res.json({
      success: true,
      data: {
        key: {
          id: apiKey.id,
          name: apiKey.name,
          key_prefix: apiKey.key_prefix,
          permissions: apiKey.permissions,
          is_active: apiKey.is_active,
          last_used: apiKey.last_used,
          expires_at: apiKey.expires_at,
          created_at: apiKey.created_at
        }
      }
    });
  } catch (error) {
    console.error('Error fetching API key:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch API key',
      message: 'An error occurred while fetching the API key'
    });
  }
});

/**
 * Get API key usage statistics
 * GET /api/keys/:id/stats
 */
router.get('/:id/stats', requireHybridAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { days } = req.query;

    const apiKey = await APIKeyService.getAPIKey(id);

    if (!apiKey) {
      return res.status(404).json({
        success: false,
        error: 'API key not found',
        message: 'The specified API key does not exist'
      });
    }

    // Check if the user owns this API key
    if (apiKey.user_id !== req.user!.user_id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You can only view stats for your own API keys'
      });
    }

    const daysNumber = days ? parseInt(days as string) : 30;
    const stats = await APIKeyService.getAPIKeyStats(id, daysNumber);

    return res.json({
      success: true,
      data: {
        key_id: id,
        stats,
        period_days: daysNumber
      }
    });
  } catch (error) {
    console.error('Error fetching API key stats:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch API key stats',
      message: 'An error occurred while fetching API key statistics'
    });
  }
});

/**
 * Deactivate an API key
 * PATCH /api/keys/:id/deactivate
 */
router.patch('/:id/deactivate', requireHybridAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const apiKey = await APIKeyService.getAPIKey(id);

    if (!apiKey) {
      return res.status(404).json({
        success: false,
        error: 'API key not found',
        message: 'The specified API key does not exist'
      });
    }

    // Check if the user owns this API key
    if (apiKey.user_id !== req.user!.user_id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You can only deactivate your own API keys'
      });
    }

    await APIKeyService.deactivateAPIKey(id, req.user!.user_id);

    return res.json({
      success: true,
      message: 'API key deactivated successfully'
    });
  } catch (error) {
    console.error('Error deactivating API key:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to deactivate API key',
      message: 'An error occurred while deactivating the API key'
    });
  }
});

/**
 * Delete an API key
 * DELETE /api/keys/:id
 */
router.delete('/:id', requireHybridAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const apiKey = await APIKeyService.getAPIKey(id);

    if (!apiKey) {
      return res.status(404).json({
        success: false,
        error: 'API key not found',
        message: 'The specified API key does not exist'
      });
    }

    // Check if the user owns this API key
    if (apiKey.user_id !== req.user!.user_id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You can only delete your own API keys'
      });
    }

    await APIKeyService.deleteAPIKey(id, req.user!.user_id);

    return res.json({
      success: true,
      message: 'API key deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting API key:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete API key',
      message: 'An error occurred while deleting the API key'
    });
  }
});

/**
 * Get current user profile
 * GET /api/keys/profile
 */
router.get('/profile/me', requireHybridAuth, async (req: Request, res: Response) => {
  try {
    const user = await APIKeyService.getUser(req.user!.user_id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'User profile not found'
      });
    }

    return res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          github_id: user.github_id,
          created_at: user.created_at
        }
      }
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch user profile',
      message: 'An error occurred while fetching the user profile'
    });
  }
});

router.post('/validate', async (req: Request, res: Response) => {
  const { apiKey } = req.body;
  if (!apiKey) {
    return res.status(400).json({ valid: false, error: 'Missing API Key'});
  }
  try {
    const user = await APIKeyService.validateAPIKey(apiKey);
    if (user) {
      return res.json({ valid: true, user_id: user.user_id });
    } else {
      return res.json({ valid: false, error: 'Invalid API Key' });
    }
  } catch (error) {
    console.error('Error validating API key:', error);
    return res.status(500).json({ valid: false, error: 'Failed to validate API key' });
  }
})

export default router; 