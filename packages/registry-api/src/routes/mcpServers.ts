// ENFORCEMENT: All endpoints using requireHybridAuth only use the API key for validation/identification.
// All privileged logic (DB writes, updates, etc.) uses SIGYL_MASTER_KEY or internal credentials.
// No permission-based logic grants access based on the user key’s permissions.
import { Router, Request, Response } from 'express';
import { supabase } from '../config/database';
import { requireHybridAuth } from '../middleware/auth';
import { APIResponse } from '../types';

const router = Router();

interface MCPServer {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive' | 'error';
  deployment_status: 'deployed' | 'deploying' | 'failed';
  endpoint_url: string;
  github_repo: string;
  created_at: string;
  updated_at: string;
  workspace_id: string;
}

// GET /api/v1/mcp-servers/:workspaceId - Get MCP servers for a workspace
router.get('/:workspaceId', requireHybridAuth, async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;

    const { data, error } = await supabase
      .from('mcp_servers')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching MCP servers:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch MCP servers',
        message: error.message
      });
    }

    const servers = (data || []).map(server => ({
      ...server,
      status: server.status as 'active' | 'inactive' | 'error',
      deployment_status: server.deployment_status as 'deployed' | 'deploying' | 'failed'
    }));

    const response: APIResponse<MCPServer[]> = {
      success: true,
      data: servers,
      message: 'MCP servers retrieved successfully'
    };

    return res.json(response);
  } catch (error) {
    console.error('Error fetching MCP servers:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch MCP servers'
    });
  }
});

// POST /api/v1/mcp-servers - Create a new MCP server
router.post('/', requireHybridAuth, async (req: Request, res: Response) => {
  try {
    const { name, description, status, deployment_status, endpoint_url, github_repo, workspace_id } = req.body;

    if (!name || !workspace_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Name and workspace_id are required'
      });
    }

    const { data, error } = await supabase
      .from('mcp_servers')
      .insert({
        name,
        description,
        status: status || 'inactive',
        deployment_status: deployment_status || 'deploying',
        endpoint_url,
        github_repo,
        workspace_id
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating MCP server:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to create MCP server',
        message: error.message
      });
    }

    const server = {
      ...data,
      status: data.status as 'active' | 'inactive' | 'error',
      deployment_status: data.deployment_status as 'deployed' | 'deploying' | 'failed'
    };

    const response: APIResponse<MCPServer> = {
      success: true,
      data: server,
      message: 'MCP server created successfully'
    };

    return res.status(201).json(response);
  } catch (error) {
    console.error('Error creating MCP server:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to create MCP server'
    });
  }
});

// PUT /api/v1/mcp-servers/:id - Update an MCP server
router.put('/:id', requireHybridAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const { data, error } = await supabase
      .from('mcp_servers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating MCP server:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update MCP server',
        message: error.message
      });
    }

    if (!data) {
      return res.status(404).json({
        success: false,
        error: 'MCP server not found',
        message: 'The specified MCP server does not exist'
      });
    }

    const server = {
      ...data,
      status: data.status as 'active' | 'inactive' | 'error',
      deployment_status: data.deployment_status as 'deployed' | 'deploying' | 'failed'
    };

    const response: APIResponse<MCPServer> = {
      success: true,
      data: server,
      message: 'MCP server updated successfully'
    };

    return res.json(response);
  } catch (error) {
    console.error('Error updating MCP server:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to update MCP server'
    });
  }
});

// GET /api/v1/mcp-servers/user/:githubId - Get MCP servers for a user by GitHub ID
router.get('/user/:githubId', requireHybridAuth, async (req: Request, res: Response) => {
  try {
    const { githubId } = req.params;

    // 1. Get the user's profile UUID from profiles table using github_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('github_id', githubId)
      .single();

    if (profileError || !profile) {
      console.error('Error fetching user profile for githubId', githubId, profileError);
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'No user found with the specified GitHub ID'
      });
    }

    const userUuid = profile.id;

    // 2. Fetch all MCP packages where author_id matches the user's UUID
    const { data: packages, error: packagesError } = await supabase
      .from('mcp_packages')
      .select('*')
      .eq('author_id', userUuid)
      .order('created_at', { ascending: false });

    if (packagesError) {
      console.error('Error fetching MCP packages for user', userUuid, packagesError);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch user MCP packages',
        message: packagesError.message
      });
    }

    // 3. Map to MCPServer interface (defaulting fields as needed)
    const servers: MCPServer[] = (packages || []).map(pkg => ({
      id: pkg.id,
      name: pkg.name,
      description: pkg.description || '',
      status: 'active' as const, // Default to active
      deployment_status: 'deployed' as const, // Default to deployed
      endpoint_url: pkg.source_api_url || '',
      github_repo: '', // Not available in mcp_packages
      created_at: pkg.created_at || new Date().toISOString(),
      updated_at: pkg.updated_at || new Date().toISOString(),
      workspace_id: '', // Not available in mcp_packages
    }));

    const response: APIResponse<MCPServer[]> = {
      success: true,
      data: servers,
      message: 'User MCP servers retrieved successfully'
    };

    return res.json(response);
  } catch (error) {
    console.error('Error fetching user MCP servers:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch user MCP servers'
    });
  }
});

export default router; 