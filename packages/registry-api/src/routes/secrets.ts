import express from 'express';
import { supabase } from '../config/database';
import { requireHybridAuth } from '../middleware/auth';
import { encrypt, decrypt } from '../utils/encryption';
import { APIResponse } from '../types';

const router = express.Router();

// Create secret
router.post('/', requireHybridAuth, async (req, res) => {
  try {
    // console.log('POST /api/v1/secrets called');
    // console.log('req.user:', req.user);
    // console.log('body:', req.body);
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

// Get secrets for MCP wrapper by mcp_server_id (requires auth)
// This endpoint is used by the wrapper to fetch decrypted secrets for a specific package
router.get('/wrapper/:mcpServerId', requireHybridAuth, async (req, res) => {
  try {
    const userId = req.user!.user_id;
    const mcpServerId = req.params.mcpServerId;

    console.log(`[SECRETS] Wrapper fetching secrets for user ${userId}, mcp_server_id: ${mcpServerId}`);

    const { data, error } = await supabase
      .from('mcp_secrets')
      .select('key, value')
      .eq('user_id', userId)
      .eq('mcp_server_id', mcpServerId);

    if (error) throw error;

    // Decrypt values
    const secrets = data.map(secret => ({
      key: secret.key,
      value: decrypt(secret.value)
    }));

    console.log(`[SECRETS] Found ${secrets.length} secrets for mcp_server_id ${mcpServerId}: [${secrets.map(s => s.key).join(', ')}]`);

    const response: APIResponse<Array<{ key: string; value: string }>> = {
      success: true,
      data: secrets,
      message: `Secrets retrieved for MCP server ${mcpServerId}`
    };

    res.json(response);
  } catch (error) {
    console.error('Error getting wrapper secrets:', error);
    const response: APIResponse<null> = {
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to retrieve wrapper secrets'
    };
    res.status(500).json(response);
  }
});

// Get secrets for MCP package (for pre-filling Connect form)
router.get('/package/:packageName', requireHybridAuth, async (req, res) => {
  try {
    const userId = req.user!.user_id;
    const packageName = req.params.packageName;

    console.log(`🔍 [SECRETS-API] === PACKAGE SECRETS REQUEST ===`);
    console.log(`🔍 [SECRETS-API] User ID: ${userId}`);
    console.log(`🔍 [SECRETS-API] Package Name: ${packageName}`);
    // Only fetch secrets for this user and this package (mcp_server_id)
    const { data, error } = await supabase
      .from('mcp_secrets')
      .select('key, value, description')
      .eq('user_id', userId)
      .eq('mcp_server_id', packageName);

    if (error) {
      console.error(`❌ [SECRETS-API] Database error for package ${packageName}:`, error);
      throw error;
    }

    // Decrypt values and return them for pre-filling
    const secrets = (data || []).map(secret => {
      return {
        key: secret.key,
        value: decrypt(secret.value),
        description: secret.description
      };
    });

    const response: APIResponse<Array<{ key: string; value: string; description?: string }>> = {
      success: true,
      data: secrets,
      message: `Package secrets retrieved successfully - found ${secrets.length} secrets`
    };

    res.json(response);
  } catch (error) {
    console.error('❌ [SECRETS-API] Error getting package secrets:', error);
    const response: APIResponse<null> = {
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to retrieve package secrets'
    };
    res.status(500).json(response);
  }
});

// Save secrets for MCP package (from Connect popup)
router.post('/package/:packageName', requireHybridAuth, async (req, res) => {
  try {
    const userId = req.user!.user_id;
    const packageName = req.params.packageName;
    const { secrets } = req.body; // Array of { key, value, description }

    if (!secrets || !Array.isArray(secrets)) {
      const response: APIResponse<null> = {
        success: false,
        error: 'Validation Error',
        message: 'Secrets array is required'
      };
      return res.status(400).json(response);
    }

    const savedSecrets = [];

    for (const secret of secrets) {
      const { key, value, description } = secret;

      if (!key || !value) {
        continue; // Skip invalid secrets
      }

      // Accept any key format (do not require uppercase/underscore)
      // If you want to add further validation, do it here

      const encryptedValue = encrypt(value);

      // Use upsert to avoid duplicates, based on user_id, mcp_server_id, key
      const { data, error } = await supabase
        .from('mcp_secrets')
        .upsert({ 
          user_id: userId, 
          key, 
          value: encryptedValue,
          description: description || `Auto-saved for ${packageName}`,
          mcp_server_id: packageName // Use package name as mcp_server_id for organization
        }, {
          onConflict: 'user_id,mcp_server_id,key'
        })
        .select('*')
        .single();

      if (error) {
        console.error('Error saving secret:', error);
        continue; // Skip failed secrets
      }

      savedSecrets.push({
        id: data.id,
        key: data.key,
        description: data.description,
        created_at: data.created_at
      });
    }

    const response: APIResponse<{ secrets: any[] }> = {
      success: true,
      data: { secrets: savedSecrets },
      message: `Saved ${savedSecrets.length} secrets for ${packageName}`
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Error saving package secrets:', error);
    const response: APIResponse<null> = {
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to save package secrets'
    };
    res.status(500).json(response);
  }
});

export default router; 