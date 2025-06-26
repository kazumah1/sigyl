
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
  }
};
