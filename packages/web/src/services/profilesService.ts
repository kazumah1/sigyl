const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface Profile {
  id: string;
  email: string;
  full_name?: string;
  username?: string;
  avatar_url?: string;
  github_id?: string;
  github_username?: string;
  created_at: string;
  updated_at: string;
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
  
  const response = await fetch(`${API_BASE_URL}/api/v1${endpoint}`, {
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

export const profilesService = {
  async getCurrentProfile(): Promise<Profile | null> {
    try {
      const result = await apiCall('/profiles/me');
      return result.data || null;
    } catch (error) {
      console.error('Error fetching current profile:', error);
      return null;
    }
  },

  async updateCurrentProfile(updates: Partial<Profile>): Promise<Profile | null> {
    try {
      const result = await apiCall('/profiles/me', {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      return result.data || null;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  },

  async deleteCurrentProfile(): Promise<boolean> {
    try {
      await apiCall('/profiles/me', {
        method: 'DELETE',
      });
      return true;
    } catch (error) {
      console.error('Error deleting profile:', error);
      throw error;
    }
  },

  async getProfileById(id: string): Promise<Partial<Profile> | null> {
    try {
      const result = await apiCall(`/profiles/${id}`);
      return result.data || null;
    } catch (error) {
      console.error('Error fetching profile by ID:', error);
      return null;
    }
  },

  async getProfileByGitHubId(githubId: string): Promise<Profile | null> {
    try {
      const result = await apiCall(`/profiles/github/${githubId}`);
      return result.data || null;
    } catch (error) {
      console.error('Error fetching profile by GitHub ID:', error);
      return null;
    }
  }
}; 