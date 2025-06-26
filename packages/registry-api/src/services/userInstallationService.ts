import { createClient } from '@supabase/supabase-js';

export interface UserInstallationRecord {
  id: string;
  user_id: string;
  github_username: string;
  installation_id: number;
  access_token: string | null;
  token_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export class UserInstallationService {
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  /**
   * Check if a user has an existing GitHub App installation
   */
  async getUserInstallation(userId: string): Promise<UserInstallationRecord | null> {
    const { data, error } = await this.supabase
      .from('user_installations')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Error getting user installation:', error);
      throw new Error(`Failed to get user installation: ${error.message}`);
    }

    return data;
  }

  /**
   * Check if a GitHub username has an existing installation
   */
  async getInstallationByGitHubUsername(githubUsername: string): Promise<UserInstallationRecord | null> {
    const { data, error } = await this.supabase
      .from('user_installations')
      .select('*')
      .eq('github_username', githubUsername)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Error getting installation by GitHub username:', error);
      throw new Error(`Failed to get installation by GitHub username: ${error.message}`);
    }

    return data;
  }

  /**
   * Store or update user installation
   */
  async upsertUserInstallation(installationData: {
    user_id: string;
    github_username: string;
    installation_id: number;
    access_token?: string;
    token_expires_at?: string;
  }): Promise<UserInstallationRecord> {
    const { data, error } = await this.supabase
      .from('user_installations')
      .upsert({
        user_id: installationData.user_id,
        github_username: installationData.github_username,
        installation_id: installationData.installation_id,
        access_token: installationData.access_token || null,
        token_expires_at: installationData.token_expires_at || null,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,installation_id'
      })
      .select()
      .single();

    if (error) {
      console.error('Error upserting user installation:', error);
      throw new Error(`Failed to store user installation: ${error.message}`);
    }

    return data;
  }

  /**
   * Delete user installation
   */
  async deleteUserInstallation(userId: string, installationId: number): Promise<void> {
    const { error } = await this.supabase
      .from('user_installations')
      .delete()
      .eq('user_id', userId)
      .eq('installation_id', installationId);

    if (error) {
      console.error('Error deleting user installation:', error);
      throw new Error(`Failed to delete user installation: ${error.message}`);
    }
  }

  /**
   * Update access token for user installation
   */
  async updateAccessToken(userId: string, installationId: number, accessToken: string, expiresAt?: string): Promise<void> {
    const { error } = await this.supabase
      .from('user_installations')
      .update({
        access_token: accessToken,
        token_expires_at: expiresAt || null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('installation_id', installationId);

    if (error) {
      console.error('Error updating access token:', error);
      throw new Error(`Failed to update access token: ${error.message}`);
    }
  }
} 