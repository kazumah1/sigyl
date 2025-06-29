import { supabase } from '@/lib/supabase';

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

export const mcpServerService = {
  async getMCPServers(workspaceId: string): Promise<MCPServer[]> {
    try {
      const { data, error } = await supabase
        .from('mcp_servers')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(server => ({
        ...server,
        status: server.status as 'active' | 'inactive' | 'error',
        deployment_status: server.deployment_status as 'deployed' | 'deploying' | 'failed'
      }));
    } catch (error) {
      console.error('Error fetching MCP servers:', error);
      return [];
    }
  },

  async createMCPServer(serverData: Omit<MCPServer, 'id' | 'created_at' | 'updated_at'>): Promise<MCPServer | null> {
    try {
      const { data, error } = await supabase
        .from('mcp_servers')
        .insert({
          name: serverData.name,
          description: serverData.description,
          status: serverData.status,
          deployment_status: serverData.deployment_status,
          endpoint_url: serverData.endpoint_url,
          github_repo: serverData.github_repo,
          workspace_id: serverData.workspace_id
        })
        .select()
        .single();

      if (error) throw error;
      return {
        ...data,
        status: data.status as 'active' | 'inactive' | 'error',
        deployment_status: data.deployment_status as 'deployed' | 'deploying' | 'failed'
      };
    } catch (error) {
      console.error('Error creating MCP server:', error);
      return null;
    }
  },

  async updateMCPServer(id: string, updates: Partial<MCPServer>): Promise<MCPServer | null> {
    try {
      const { data, error } = await supabase
        .from('mcp_servers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return {
        ...data,
        status: data.status as 'active' | 'inactive' | 'error',
        deployment_status: data.deployment_status as 'deployed' | 'deploying' | 'failed'
      };
    } catch (error) {
      console.error('Error updating MCP server:', error);
      return null;
    }
  },

  async getUserMCPServers(githubId: string): Promise<MCPServer[]> {
    try {
      // 1. Get the user's profile UUID from profiles table using github_id
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('github_id', githubId)
        .single();
      if (profileError || !profile) {
        console.error('Error fetching user profile for githubId', githubId, profileError);
        return [];
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
        return [];
      }

      // 3. Map to MCPServer interface (defaulting fields as needed)
      return (packages || []).map(pkg => ({
        id: pkg.id,
        name: pkg.name,
        description: pkg.description || '',
        status: 'active', // Default to active (or derive if you have a status field)
        deployment_status: 'deployed', // Default to deployed (or derive if you have a deployment status)
        endpoint_url: pkg.source_api_url || '',
        github_repo: '', // Not available in mcp_packages, leave blank or add if you store it
        created_at: pkg.created_at || new Date().toISOString(),
        updated_at: pkg.updated_at || new Date().toISOString(),
        workspace_id: '', // Not available in mcp_packages, leave blank or add if you store it
      }));
    } catch (error) {
      console.error('Error fetching user MCP servers:', error);
      return [];
    }
  }
};
