import express from 'express';
import { supabase } from '../config/database';
import { requireHybridAuth } from '../middleware/auth';
import { encrypt, decrypt } from '../utils/encryption';
import { APIResponse } from '../types';

const router = express.Router();

// Create secret
router.post('/', requireHybridAuth, async (req, res) => {
  try {
    console.log('POST /api/v1/secrets called');
    console.log('req.user:', req.user);
    console.log('body:', req.body);
    const { key, value, description, mcp_server_id } = req.body;
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
        value: encryptedValue,
        description,
        mcp_server_id
      })
      .select('*')
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

    const response: APIResponse<{ secret: any }> = {
      success: true,
      data: {
        secret: {
          id: data.id,
          key: data.key,
          value: value, // Return decrypted value for new secrets
          description: data.description,
          mcp_server_id: data.mcp_server_id,
          is_encrypted: true,
          created_at: data.created_at,
          updated_at: data.updated_at
        }
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

// List secrets
router.get('/', requireHybridAuth, async (req, res) => {
  try {
    const userId = req.user!.user_id;
    const { mcp_server_id } = req.query;

    let query = supabase
      .from('mcp_secrets')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (mcp_server_id) {
      query = query.eq('mcp_server_id', mcp_server_id);
    }

    const { data, error } = await query;

    if (error) throw error;

    // DO NOT return value in list response
    const secrets = data?.map(secret => ({
      id: secret.id,
      key: secret.key,
      description: secret.description,
      mcp_server_id: secret.mcp_server_id,
      is_encrypted: true,
      created_at: secret.created_at,
      updated_at: secret.updated_at
    })) || [];

    const response: APIResponse<{ secrets: any[] }> = {
      success: true,
      data: { secrets },
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

// Get secret by ID
router.get('/:id', requireHybridAuth, async (req, res) => {
  try {
    const userId = req.user!.user_id;
    const secretId = req.params.id;

    const { data, error } = await supabase
      .from('mcp_secrets')
      .select('*')
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

    // DO NOT return value in get-by-id response
    const response: APIResponse<{ secret: any }> = {
      success: true,
      data: {
        secret: {
          id: data.id,
          key: data.key,
          description: data.description,
          mcp_server_id: data.mcp_server_id,
          is_encrypted: true,
          created_at: data.created_at,
          updated_at: data.updated_at
        }
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
router.put('/:id', requireHybridAuth, async (req, res) => {
  try {
    const userId = req.user!.user_id;
    const secretId = req.params.id;
    const { key, value, description, mcp_server_id } = req.body;

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
        value: encryptedValue,
        description,
        mcp_server_id
      })
      .eq('id', secretId)
      .eq('user_id', userId)
      .select('*')
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

    const response: APIResponse<{ secret: any }> = {
      success: true,
      data: {
        secret: {
          id: data.id,
          key: data.key,
          value: value, // Return decrypted value for updated secrets
          description: data.description,
          mcp_server_id: data.mcp_server_id,
          is_encrypted: true,
          created_at: data.created_at,
          updated_at: data.updated_at
        }
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
router.delete('/:id', requireHybridAuth, async (req, res) => {
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