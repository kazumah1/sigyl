import { createClient } from '@supabase/supabase-js';

export interface InstallationRecord {
  id: string;
  installation_id: number;
  account_login: string;
  account_type: string;
  repositories: string[];
  created_at: string;
  updated_at: string;
}

export interface RepositoryRecord {
  id: string;
  installation_id: number;
  repo_id: number;
  owner: string;
  name: string;
  full_name: string;
  private: boolean;
  has_mcp: boolean;
  mcp_files: string[];
  last_checked: string;
  created_at: string;
  updated_at: string;
}

export class InstallationService {
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  /**
   * Store or update installation information
   */
  async upsertInstallation(installationData: {
    installation_id: number;
    account_login: string;
    account_type: string;
    repositories: string[];
  }): Promise<InstallationRecord> {
    const { data, error } = await this.supabase
      .from('github_installations')
      .upsert({
        installation_id: installationData.installation_id,
        account_login: installationData.account_login,
        account_type: installationData.account_type,
        repositories: installationData.repositories,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'installation_id'
      })
      .select()
      .single();

    if (error) {
      console.error('Error upserting installation:', error);
      throw new Error(`Failed to store installation: ${error.message}`);
    }

    return data;
  }

  /**
   * Store or update repository information
   */
  async upsertRepository(repoData: {
    installation_id: number;
    repo_id: number;
    owner: string;
    name: string;
    full_name: string;
    private: boolean;
    has_mcp: boolean;
    mcp_files: string[];
  }): Promise<RepositoryRecord> {
    const { data, error } = await this.supabase
      .from('github_repositories')
      .upsert({
        installation_id: repoData.installation_id,
        repo_id: repoData.repo_id,
        owner: repoData.owner,
        name: repoData.name,
        full_name: repoData.full_name,
        private: repoData.private,
        has_mcp: repoData.has_mcp,
        mcp_files: repoData.mcp_files,
        last_checked: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'installation_id,repo_id'
      })
      .select()
      .single();

    if (error) {
      console.error('Error upserting repository:', error);
      throw new Error(`Failed to store repository: ${error.message}`);
    }

    return data;
  }

  /**
   * Get installation by ID
   */
  async getInstallation(installationId: number): Promise<InstallationRecord | null> {
    const { data, error } = await this.supabase
      .from('github_installations')
      .select('*')
      .eq('installation_id', installationId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Error getting installation:', error);
      throw new Error(`Failed to get installation: ${error.message}`);
    }

    return data;
  }

  /**
   * Get repositories for an installation
   */
  async getInstallationRepositories(installationId: number): Promise<RepositoryRecord[]> {
    const { data, error } = await this.supabase
      .from('github_repositories')
      .select('*')
      .eq('installation_id', installationId)
      .order('name');

    if (error) {
      console.error('Error getting installation repositories:', error);
      throw new Error(`Failed to get installation repositories: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get repositories with MCP files
   */
  async getMCPRepositories(installationId: number): Promise<RepositoryRecord[]> {
    const { data, error } = await this.supabase
      .from('github_repositories')
      .select('*')
      .eq('installation_id', installationId)
      .eq('has_mcp', true)
      .order('name');

    if (error) {
      console.error('Error getting MCP repositories:', error);
      throw new Error(`Failed to get MCP repositories: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Update repository MCP status
   */
  async updateRepositoryMCPStatus(
    installationId: number,
    repoId: number,
    hasMCP: boolean,
    mcpFiles: string[]
  ): Promise<RepositoryRecord> {
    const { data, error } = await this.supabase
      .from('github_repositories')
      .update({
        has_mcp: hasMCP,
        mcp_files: mcpFiles,
        last_checked: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('installation_id', installationId)
      .eq('repo_id', repoId)
      .select()
      .single();

    if (error) {
      console.error('Error updating repository MCP status:', error);
      throw new Error(`Failed to update repository MCP status: ${error.message}`);
    }

    return data;
  }

  /**
   * Delete installation and all associated repositories
   */
  async deleteInstallation(installationId: number): Promise<void> {
    // Delete repositories first
    const { error: repoError } = await this.supabase
      .from('github_repositories')
      .delete()
      .eq('installation_id', installationId);

    if (repoError) {
      console.error('Error deleting installation repositories:', repoError);
      throw new Error(`Failed to delete installation repositories: ${repoError.message}`);
    }

    // Delete installation
    const { error: installError } = await this.supabase
      .from('github_installations')
      .delete()
      .eq('installation_id', installationId);

    if (installError) {
      console.error('Error deleting installation:', installError);
      throw new Error(`Failed to delete installation: ${installError.message}`);
    }
  }
} 