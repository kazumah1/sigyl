import express from 'express';
import { supabase } from '../config/database';
import { requireAuth } from '../middleware/auth';
import { encrypt, decrypt } from '../utils/encryption';
import { APIResponse } from '../types';

const router = express.Router();

// Create secret
router.post('/', requireAuth, async (req, res) => {
  try {
    console.log('POST /api/v1/secrets called');
    console.log('req.user:', req.user);
    console.log('body:', req.body);
    const { key, value } = req.body;
    const userId = req.user!.user_id;

    if (!key || !value) {
      const response: APIResponse<null> = {
        success: false,
        error: 'Validation Error',
        message: 'Key and value are required'
      };
      return res.status(400).json(response);
    }

    // Validate key format (should be a valid environment variable name)
    if (!/^[A-Z_][A-Z0-9_]*$/.test(key)) {
      const response: APIResponse<null> = {
        success: false,
        error: 'Validation Error',
        message: 'Key must be a valid environment variable name (uppercase letters, numbers, and underscores only)'
      };
      return res.status(400).json(response);
    }

    const encryptedValue = encrypt(value);

    const { data, error } = await supabase
      .from('mcp_secrets')
      .insert({ 
        user_id: userId, 
        key, 
        value: encryptedValue 
      })
      .select('id, key, created_at')
      .single();

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        const response: APIResponse<null> = {
          success: false,
          error: 'Duplicate Key',
          message: `A secret with key "${key}" already exists`
        };
        return res.status(409).json(response);
      }
      throw error;
    }

    const response: APIResponse<{ id: string; key: string; created_at: string }> = {
      success: true,
      data: {
        id: data.id,
        key: data.key,
        created_at: data.created_at
      },
      message: 'Secret created successfully'
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Error creating secret:', error);
    const response: APIResponse<null> = {
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to create secret'
    };
    res.status(500).json(response);
  }
});

// List secrets (keys only, no values)
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.user_id;

    const { data, error } = await supabase
      .from('mcp_secrets')
      .select('id, key, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const response: APIResponse<Array<{ id: string; key: string; created_at: string }>> = {
      success: true,
      data: data || [],
      message: 'Secrets retrieved successfully'
    };

    res.json(response);
  } catch (error) {
    console.error('Error listing secrets:', error);
    const response: APIResponse<null> = {
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to retrieve secrets'
    };
    res.status(500).json(response);
  }
});

// Get secret by ID (for editing)
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.user_id;
    const secretId = req.params.id;

    const { data, error } = await supabase
      .from('mcp_secrets')
      .select('id, key, created_at')
      .eq('id', secretId)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // No rows returned
        const response: APIResponse<null> = {
          success: false,
          error: 'Not Found',
          message: 'Secret not found'
        };
        return res.status(404).json(response);
      }
      throw error;
    }

    const response: APIResponse<{ id: string; key: string; created_at: string }> = {
      success: true,
      data: {
        id: data.id,
        key: data.key,
        created_at: data.created_at
      },
      message: 'Secret retrieved successfully'
    };

    res.json(response);
  } catch (error) {
    console.error('Error getting secret:', error);
    const response: APIResponse<null> = {
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to retrieve secret'
    };
    res.status(500).json(response);
  }
});

// Update secret
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.user_id;
    const secretId = req.params.id;
    const { key, value } = req.body;

    if (!key || !value) {
      const response: APIResponse<null> = {
        success: false,
        error: 'Validation Error',
        message: 'Key and value are required'
      };
      return res.status(400).json(response);
    }

    // Validate key format
    if (!/^[A-Z_][A-Z0-9_]*$/.test(key)) {
      const response: APIResponse<null> = {
        success: false,
        error: 'Validation Error',
        message: 'Key must be a valid environment variable name (uppercase letters, numbers, and underscores only)'
      };
      return res.status(400).json(response);
    }

    const encryptedValue = encrypt(value);

    const { data, error } = await supabase
      .from('mcp_secrets')
      .update({ 
        key, 
        value: encryptedValue 
      })
      .eq('id', secretId)
      .eq('user_id', userId)
      .select('id, key, created_at')
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // No rows returned
        const response: APIResponse<null> = {
          success: false,
          error: 'Not Found',
          message: 'Secret not found'
        };
        return res.status(404).json(response);
      }
      if (error.code === '23505') { // Unique constraint violation
        const response: APIResponse<null> = {
          success: false,
          error: 'Duplicate Key',
          message: `A secret with key "${key}" already exists`
        };
        return res.status(409).json(response);
      }
      throw error;
    }

    const response: APIResponse<{ id: string; key: string; created_at: string }> = {
      success: true,
      data: {
        id: data.id,
        key: data.key,
        created_at: data.created_at
      },
      message: 'Secret updated successfully'
    };

    res.json(response);
  } catch (error) {
    console.error('Error updating secret:', error);
    const response: APIResponse<null> = {
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to update secret'
    };
    res.status(500).json(response);
  }
});

// Delete secret
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.user_id;
    const secretId = req.params.id;

    const { error } = await supabase
      .from('mcp_secrets')
      .delete()
      .eq('id', secretId)
      .eq('user_id', userId);

    if (error) {
      if (error.code === 'PGRST116') { // No rows returned
        const response: APIResponse<null> = {
          success: false,
          error: 'Not Found',
          message: 'Secret not found'
        };
        return res.status(404).json(response);
      }
      throw error;
    }

    const response: APIResponse<null> = {
      success: true,
      message: 'Secret deleted successfully'
    };

    res.json(response);
  } catch (error) {
    console.error('Error deleting secret:', error);
    const response: APIResponse<null> = {
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to delete secret'
    };
    res.status(500).json(response);
  }
});

// Get secrets for deployment (internal use only - no auth required)
// This endpoint is used by the deployment service to fetch secrets
router.get('/deployment/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;

    const { data, error } = await supabase
      .from('mcp_secrets')
      .select('key, value')
      .eq('user_id', userId);

    if (error) throw error;

    // Decrypt values
    const secrets = data.map(secret => ({
      key: secret.key,
      value: decrypt(secret.value)
    }));

    const response: APIResponse<Array<{ key: string; value: string }>> = {
      success: true,
      data: secrets,
      message: 'Secrets retrieved for deployment'
    };

    res.json(response);
  } catch (error) {
    console.error('Error getting secrets for deployment:', error);
    const response: APIResponse<null> = {
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to retrieve secrets for deployment'
    };
    res.status(500).json(response);
  }
});

export default router; 