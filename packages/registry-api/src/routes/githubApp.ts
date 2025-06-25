import express, { Request, Response } from 'express';
import { GitHubAppService } from '../services/githubApp';
import { APIResponse } from '../types';

const router = express.Router();

// Initialize GitHub App service - temporarily disabled for testing
// const githubAppService = new GitHubAppService({
//   appId: process.env.GITHUB_APP_ID!,
//   privateKey: process.env.GITHUB_PRIVATE_KEY!.replace(/\\n/g, '\n'),
//   webhookSecret: process.env.GITHUB_WEBHOOK_SECRET || undefined,
// });

/**
 * GET /api/v1/github/installations/:installationId/repositories
 * List repositories accessible to a GitHub App installation
 */
router.get('/installations/:installationId/repositories', async (req: Request, res: Response) => {
  try {
    const { installationId } = req.params;
    const installationIdNum = parseInt(installationId, 10);

    if (isNaN(installationIdNum)) {
      const response: APIResponse<null> = {
        success: false,
        error: 'Invalid Installation ID',
        message: 'Installation ID must be a valid number'
      };
      return res.status(400).json(response);
    }

    // Temporary mock response for testing
    const response: APIResponse<any[]> = {
      success: true,
      data: [
        {
          id: 123456789,
          name: 'test-repo',
          full_name: 'test-owner/test-repo',
          private: false,
          description: 'Test repository',
          html_url: 'https://github.com/test-owner/test-repo',
          hasMCP: true,
          mcpFiles: ['mcp.yaml'],
        }
      ],
      message: `GitHub App integration not yet configured. This is a mock response for installation ${installationId}`
    };

    return res.json(response);
  } catch (error: any) {
    console.error('Error listing installation repositories:', error);
    
    const response: APIResponse<null> = {
      success: false,
      error: 'Failed to list repositories',
      message: error.message || 'Internal server error'
    };
    
    return res.status(500).json(response);
  }
});

/**
 * GET /api/v1/github/installations/:installationId/repositories/:owner/:repo/mcp
 * Get MCP configuration from a specific repository
 */
router.get('/installations/:installationId/repositories/:owner/:repo/mcp', async (req: Request, res: Response) => {
  try {
    const { installationId, owner, repo } = req.params;
    const installationIdNum = parseInt(installationId, 10);

    if (isNaN(installationIdNum)) {
      const response: APIResponse<null> = {
        success: false,
        error: 'Invalid Installation ID',
        message: 'Installation ID must be a valid number'
      };
      return res.status(400).json(response);
    }

    // Temporary mock response for testing
    const response: APIResponse<{
      repository: string;
      mcpFile: string;
      content: any;
      files: string[];
    }> = {
      success: true,
      data: {
        repository: `${owner}/${repo}`,
        mcpFile: 'mcp.yaml',
        content: {
          name: 'test-mcp',
          description: 'Test MCP server',
          version: '1.0.0',
          port: 3000,
          tools: []
        },
        files: ['mcp.yaml'],
      },
      message: `GitHub App integration not yet configured. This is a mock response for ${owner}/${repo}`
    };

    return res.json(response);
  } catch (error: any) {
    console.error('Error getting MCP configuration:', error);
    
    const response: APIResponse<null> = {
      success: false,
      error: 'Failed to get MCP configuration',
      message: error.message || 'Internal server error'
    };
    
    return res.status(500).json(response);
  }
});

/**
 * GET /api/v1/github/installations/:installationId
 * Get installation information
 */
router.get('/installations/:installationId', async (req: Request, res: Response) => {
  try {
    const { installationId } = req.params;
    const installationIdNum = parseInt(installationId, 10);

    if (isNaN(installationIdNum)) {
      const response: APIResponse<null> = {
        success: false,
        error: 'Invalid Installation ID',
        message: 'Installation ID must be a valid number'
      };
      return res.status(400).json(response);
    }

    // Temporary mock response for testing
    const response: APIResponse<any> = {
      success: true,
      data: {
        id: installationIdNum,
        account: {
          login: 'test-account',
          type: 'User'
        },
        app_id: 1459404,
        target_type: 'User',
        permissions: {
          contents: 'read',
          metadata: 'read'
        }
      },
      message: 'GitHub App integration not yet configured. This is a mock response.'
    };

    return res.json(response);
  } catch (error: any) {
    console.error('Error getting installation info:', error);
    
    const response: APIResponse<null> = {
      success: false,
      error: 'Failed to get installation info',
      message: error.message || 'Internal server error'
    };
    
    return res.status(500).json(response);
  }
});

/**
 * POST /api/v1/github/installations/:installationId/deploy
 * Deploy an MCP from a GitHub repository using installation token
 */
router.post('/installations/:installationId/deploy', async (req: Request, res: Response) => {
  try {
    const { installationId } = req.params;
    const { owner, repo, branch = 'main' } = req.body;
    const installationIdNum = parseInt(installationId, 10);

    if (isNaN(installationIdNum)) {
      const response: APIResponse<null> = {
        success: false,
        error: 'Invalid Installation ID',
        message: 'Installation ID must be a valid number'
      };
      return res.status(400).json(response);
    }

    if (!owner || !repo) {
      const response: APIResponse<null> = {
        success: false,
        error: 'Missing Repository Information',
        message: 'Owner and repository name are required'
      };
      return res.status(400).json(response);
    }

    // Temporary mock response for testing
    const response: APIResponse<{
      repository: string;
      mcpFile: string;
      content: any;
      installationId: number;
    }> = {
      success: true,
      data: {
        repository: `${owner}/${repo}`,
        mcpFile: 'mcp.yaml',
        content: {
          name: 'test-mcp',
          description: 'Test MCP server',
          version: '1.0.0',
          port: 3000,
          tools: []
        },
        installationId: installationIdNum,
      },
      message: `GitHub App integration not yet configured. Mock deployment ready for ${owner}/${repo}`
    };

    return res.json(response);
  } catch (error: any) {
    console.error('Error deploying MCP:', error);
    
    const response: APIResponse<null> = {
      success: false,
      error: 'Failed to deploy MCP',
      message: error.message || 'Internal server error'
    };
    
    return res.status(500).json(response);
  }
});

export default router; 