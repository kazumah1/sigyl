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
      console.log('🔍 getUserWorkspaces: Starting...');
      
      // For GitHub App users, ensure profile exists first
      const githubUserStr = localStorage.getItem('github_app_user');
      console.log('🔍 getUserWorkspaces: GitHub user from localStorage:', githubUserStr ? 'exists' : 'not found');
      
      if (githubUserStr) {
        const githubUser = JSON.parse(githubUserStr);
        const userId = `github_${githubUser.id}`;
        console.log('🔍 getUserWorkspaces: GitHub user ID:', userId);
        console.log('🔍 getUserWorkspaces: GitHub user data:', {
          id: githubUser.id,
          login: githubUser.login,
          email: githubUser.email
        });
        
        // Ensure GitHub App user has a profile
        console.log('🔍 getUserWorkspaces: Ensuring GitHub user profile...');
        const profileId = await this.ensureGitHubUserProfile(userId);
        
        // Query workspaces using the profile UUID
        console.log('🔍 getUserWorkspaces: Querying workspaces for profile ID:', profileId);
        const { data: workspaces, error } = await supabase
          .from('workspaces')
          .select('*')
          .eq('owner_id', profileId)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching workspaces:', error);
          return [];
        }

        console.log('✅ getUserWorkspaces: Found workspaces:', workspaces?.length || 0);
        return workspaces || [];
      }

      console.log('🔍 getUserWorkspaces: Falling back to Supabase auth or no auth...');
      // Fallback for Supabase auth users
      const { data: workspaces, error } = await supabase
        .from('workspaces')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching workspaces:', error);
        return [];
      }

      console.log('✅ getUserWorkspaces: Found workspaces (fallback):', workspaces?.length || 0);
      return workspaces || [];
    } catch (error) {
      console.error('❌ getUserWorkspaces: Unexpected error:', error);
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
      console.log('🔍 ensureGitHubUserProfile: Starting with userId:', userId);
      
      // Get GitHub user data from localStorage
      const githubUserStr = localStorage.getItem('github_app_user');
      if (!githubUserStr) {
        console.error('❌ ensureGitHubUserProfile: No GitHub user data found for profile creation');
        throw new Error('No GitHub user data available');
      }

      const githubUser = JSON.parse(githubUserStr);
      console.log('🔍 ensureGitHubUserProfile: GitHub user data:', {
        id: githubUser.id,
        login: githubUser.login,
        email: githubUser.email
      });
      
      // Check if profile already exists using github_id
      console.log('🔍 ensureGitHubUserProfile: Checking for existing profile with github_id:', githubUser.id.toString());
      const { data: existingProfile, error: existingError } = await supabase
        .from('profiles')
        .select('id')
        .eq('github_id', githubUser.id.toString())
        .single();

      console.log('🔍 ensureGitHubUserProfile: Existing profile check result:', { existingProfile, error: existingError });

      if (existingProfile) {
        console.log('✅ ensureGitHubUserProfile: GitHub App user profile already exists:', githubUser.login);
        return existingProfile.id;
      }

      // Create profile directly
      console.log('🔍 ensureGitHubUserProfile: Creating new profile...');
      const profileData = {
        email: githubUser.email || `${githubUser.login}@github.com`,
        username: githubUser.login,
        full_name: githubUser.name,
        github_username: githubUser.login,
        github_id: githubUser.id.toString(),
        avatar_url: githubUser.avatar_url
      };
      
      console.log('🔍 ensureGitHubUserProfile: Profile data to insert:', profileData);
      
      const { data: newProfile, error } = await supabase
        .from('profiles')
        .insert(profileData)
        .select('id')
        .single();

      if (error) {
        console.error('❌ ensureGitHubUserProfile: Error creating GitHub user profile:', error);
        throw error;
      }

      console.log('✅ ensureGitHubUserProfile: Created profile for GitHub App user:', githubUser.login, 'with ID:', newProfile.id);
      return newProfile.id;
    } catch (error) {
      console.error('❌ ensureGitHubUserProfile: Unexpected error:', error);
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
        
        // Check if demo workspace exists for this user
        const { data: existingWorkspace } = await supabase
          .from('workspaces')
          .select('*')
          .eq('owner_id', profileId)
          .eq('slug', 'demo-workspace')
          .single();

        if (existingWorkspace) {
          console.log('✅ getOrCreateDemoWorkspace: Found existing demo workspace for user');
          return existingWorkspace;
        }

        // Check if any demo workspace exists (in case of shared demo workspace)
        const { data: anyDemoWorkspace } = await supabase
          .from('workspaces')
          .select('*')
          .eq('slug', 'demo-workspace')
          .limit(1);

        if (anyDemoWorkspace && anyDemoWorkspace.length > 0) {
          console.log('✅ getOrCreateDemoWorkspace: Found existing demo workspace, returning it');
          return anyDemoWorkspace[0];
        }

        // Create demo workspace with unique slug
        const uniqueSlug = `demo-workspace-${Date.now()}`;
        console.log('🔍 getOrCreateDemoWorkspace: Creating new demo workspace with slug:', uniqueSlug);
        
        const { data: newWorkspace, error } = await supabase
          .from('workspaces')
          .insert({
            name: 'Demo Workspace',
            slug: uniqueSlug,
            description: 'Demo workspace for testing',
            owner_id: profileId
          })
          .select('*')
          .single();

        if (error) {
          console.error('Error creating demo workspace:', error);
          throw error;
        }

        console.log('✅ getOrCreateDemoWorkspace: Created new demo workspace');
        return newWorkspace;
      }

      // Fallback for Supabase auth users
      const { data: workspaces } = await supabase
        .from('workspaces')
        .select('*')
        .eq('slug', 'demo-workspace')
        .limit(1);

      if (workspaces && workspaces.length > 0) {
        console.log('✅ getOrCreateDemoWorkspace: Found existing demo workspace for Supabase user');
        return workspaces[0];
      }

      // Create demo workspace for Supabase auth users with unique slug
      const uniqueSlug = `demo-workspace-${Date.now()}`;
      console.log('🔍 getOrCreateDemoWorkspace: Creating new demo workspace for Supabase user with slug:', uniqueSlug);
      
      const { data: newWorkspace, error } = await supabase
        .from('workspaces')
        .insert({
          name: 'Demo Workspace',
          slug: uniqueSlug,
          description: 'Demo workspace for testing',
          owner_id: '00000000-0000-0000-0000-000000000000' // Default owner for demo workspaces
        })
        .select('*')
        .single();

      if (error) {
        console.error('Error creating demo workspace:', error);
        throw error;
      }

      console.log('✅ getOrCreateDemoWorkspace: Created new demo workspace for Supabase user');
      return newWorkspace;
    } catch (error) {
      console.error('Error in getOrCreateDemoWorkspace:', error);
      throw error;
    }
  }
};
