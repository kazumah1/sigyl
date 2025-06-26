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
  async getUserWorkspaces(): Promise<Workspace[]> {
    try {
      // For GitHub App users, ensure profile exists first
      const githubUserStr = localStorage.getItem('github_app_user');
      if (githubUserStr) {
        const githubUser = JSON.parse(githubUserStr);
        const userId = `github_${githubUser.id}`;
        
        // Ensure GitHub App user has a profile
        await this.ensureGitHubUserProfile(userId);
        
        // Get the profile UUID for querying workspaces
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('auth_type', 'github_app')
          .eq('auth_user_id', userId)
          .single();

        if (profile) {
          // Query workspaces using the profile UUID
          const { data: workspaces, error } = await supabase
            .from('workspaces')
            .select('*')
            .eq('owner_id', profile.id)
            .order('created_at', { ascending: false });

          if (error) {
            console.error('Error fetching workspaces:', error);
            return [];
          }

          return workspaces || [];
        }
      }

      // Fallback for Supabase auth users
      const { data: workspaces, error } = await supabase
        .from('workspaces')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching workspaces:', error);
        return [];
      }

      return workspaces || [];
    } catch (error) {
      console.error('Error in getUserWorkspaces:', error);
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

  // Helper method to ensure GitHub App users have a profile
  async ensureGitHubUserProfile(userId: string): Promise<string> {
    try {
      // Get GitHub user data from localStorage
      const githubUserStr = localStorage.getItem('github_app_user');
      if (!githubUserStr) {
        console.error('No GitHub user data found for profile creation');
        throw new Error('No GitHub user data available');
      }

      const githubUser = JSON.parse(githubUserStr);
      
      // Check if profile already exists using github_id (which should exist)
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('github_id', githubUser.id.toString())
        .single();

      if (existingProfile) {
        console.log('GitHub App user profile already exists:', githubUser.login);
        return existingProfile.id;
      }

      // Create profile directly
      const { data: newProfile, error } = await supabase
        .from('profiles')
        .insert({
          email: githubUser.email || `${githubUser.login}@github.com`,
          username: githubUser.login,
          full_name: githubUser.name,
          github_username: githubUser.login,
          github_id: githubUser.id.toString(),
          avatar_url: githubUser.avatar_url
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error creating GitHub user profile:', error);
        throw error;
      }

      console.log('Created profile for GitHub App user:', githubUser.login);
      return newProfile.id;
    } catch (error) {
      console.error('Error ensuring GitHub user profile:', error);
      throw error;
    }
  },

  // Get or create demo workspace with GitHub App support
  async getOrCreateDemoWorkspace(): Promise<Workspace> {
    try {
      // For GitHub App users, ensure profile exists first
      const githubUserStr = localStorage.getItem('github_app_user');
      if (githubUserStr) {
        const githubUser = JSON.parse(githubUserStr);
        const userId = `github_${githubUser.id}`;
        
        // Ensure GitHub App user has a profile
        const profileId = await this.ensureGitHubUserProfile(userId);
        
        // Check if demo workspace exists
        const { data: existingWorkspace } = await supabase
          .from('workspaces')
          .select('*')
          .eq('owner_id', profileId)
          .eq('slug', 'demo-workspace')
          .single();

        if (existingWorkspace) {
          return existingWorkspace;
        }

        // Create demo workspace
        const { data: newWorkspace, error } = await supabase
          .from('workspaces')
          .insert({
            name: 'Demo Workspace',
            slug: 'demo-workspace',
            description: 'Demo workspace for testing',
            owner_id: profileId
          })
          .select('*')
          .single();

        if (error) {
          console.error('Error creating demo workspace:', error);
          throw error;
        }

        return newWorkspace;
      }

      // Fallback for Supabase auth users
      const { data: workspaces } = await supabase
        .from('workspaces')
        .select('*')
        .eq('slug', 'demo-workspace')
        .limit(1);

      if (workspaces && workspaces.length > 0) {
        return workspaces[0];
      }

      // Create demo workspace for Supabase auth users
      const { data: newWorkspace, error } = await supabase
        .from('workspaces')
        .insert({
          name: 'Demo Workspace',
          slug: 'demo-workspace',
          description: 'Demo workspace for testing'
        })
        .select('*')
        .single();

      if (error) {
        console.error('Error creating demo workspace:', error);
        throw error;
      }

      return newWorkspace;
    } catch (error) {
      console.error('Error in getOrCreateDemoWorkspace:', error);
      throw error;
    }
  }
};
