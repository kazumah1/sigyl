
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

      if (error) throw error;
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

      if (error) throw error;
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
  }
};
