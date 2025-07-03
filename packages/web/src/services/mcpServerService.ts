// Remove direct supabase import and replace with API calls
const API_BASE_URL = import.meta.env.VITE_REGISTRY_API_URL || 'http://localhost:3000/api/v1';

export interface MCPServer {
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

// Helper function to get auth token
const getAuthToken = (): string | null => {
  // Try to get Supabase session token first
  const supabaseSession = JSON.parse(localStorage.getItem('sb-zcudhsyvfrlfgqqhjrqv-auth-token') || '{}');
  if (supabaseSession?.access_token) {
    return supabaseSession.access_token;
  }

  // Fallback to GitHub token
  const githubToken = localStorage.getItem('github_app_token');
  if (githubToken && githubToken !== 'db_restored_token') {
    return githubToken;
  }

  return null;
};

// Helper function to make API calls
const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const token = getAuthToken();
  const baseUrl = import.meta.env.VITE_REGISTRY_API_URL || 'http://localhost:3000';
  
  const finalUrl = baseUrl.endsWith('/api/v1') 
    ? `${baseUrl}${endpoint}` 
    : `${baseUrl}/api/v1${endpoint}`;

  const response = await fetch(finalUrl, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API call failed: ${response.statusText}`);
  }

  return response.json();
};

export const mcpServerService = {
  async getMCPServers(workspaceId: string): Promise<MCPServer[]> {
    try {
      const result = await apiCall(`/mcp-servers/${workspaceId}`);
      return result.data || [];
    } catch (error) {
      console.error('Error fetching MCP servers:', error);
      return [];
    }
  },

  async createMCPServer(serverData: Omit<MCPServer, 'id' | 'created_at' | 'updated_at'>): Promise<MCPServer | null> {
    try {
      const result = await apiCall('/mcp-servers', {
        method: 'POST',
        body: JSON.stringify(serverData),
      });
      return result.data || null;
    } catch (error) {
      console.error('Error creating MCP server:', error);
      return null;
    }
  },

  async updateMCPServer(id: string, updates: Partial<MCPServer>): Promise<MCPServer | null> {
    try {
      const result = await apiCall(`/mcp-servers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      return result.data || null;
    } catch (error) {
      console.error('Error updating MCP server:', error);
      return null;
    }
  },

  async getUserMCPServers(githubId: string): Promise<MCPServer[]> {
    try {
      const result = await apiCall(`/mcp-servers/user/${githubId}`);
      return result.data || [];
    } catch (error) {
      console.error('Error fetching user MCP servers:', error);
      return [];
    }
  }
};
