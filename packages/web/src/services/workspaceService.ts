import { supabase } from '@/integrations/supabase/client';

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export const workspaceService = {
  async getUserWorkspaces(userId: string): Promise<Workspace[]> {
    try {
      const { data, error } = await supabase
        .from('workspaces')
        .select('*')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching workspaces:', error);
        // Return empty array if there's an error - let the UI handle empty state
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Error fetching workspaces:', error);
      return [];
    }
  },

  async getWorkspaceById(id: string): Promise<Workspace | null> {
    try {
      const { data, error } = await supabase
        .from('workspaces')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching workspace:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching workspace:', error);
      return null;
    }
  },

  async createWorkspace(workspaceData: Omit<Workspace, 'id' | 'created_at' | 'updated_at'>): Promise<Workspace | null> {
    try {
      const { data, error } = await supabase
        .from('workspaces')
        .insert(workspaceData)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating workspace:', error);
      return null;
    }
  },

  async updateWorkspace(id: string, updates: Partial<Workspace>): Promise<Workspace | null> {
    try {
      const { data, error } = await supabase
        .from('workspaces')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating workspace:', error);
      return null;
    }
  },

  // Helper method to get or create a demo workspace for the current user
  async getOrCreateDemoWorkspace(userId: string): Promise<Workspace | null> {
    try {
      // First try to find an existing demo workspace
      const { data: existing, error: findError } = await supabase
        .from('workspaces')
        .select('*')
        .eq('owner_id', userId)
        .eq('slug', 'demo-workspace')
        .single();

      if (existing) {
        return existing;
      }

      // If no demo workspace exists, create one
      const { data: newWorkspace, error: createError } = await supabase
        .from('workspaces')
        .insert({
          name: 'Demo Workspace',
          slug: 'demo-workspace',
          description: 'Demo workspace for testing and demonstration',
          owner_id: userId
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating demo workspace:', createError);
        return null;
      }

      return newWorkspace;
    } catch (error) {
      console.error('Error getting or creating demo workspace:', error);
      return null;
    }
  }
};
