import { supabase } from '../config/database';
import { 
  MCPPackage, 
  MCPDeployment, 
  CreatePackageRequest, 
  PackageSearchQuery, 
  PackageSearchResult,
  PackageWithDetails 
} from '../types';
import { v4 as uuidv4 } from 'uuid';
import { redeployRepo } from './deployer';

export class PackageService {
  
  async createPackage(packageData: CreatePackageRequest): Promise<MCPPackage> {
    const packageId = uuidv4();
    
    // Insert the main package
    const { data: packageResult, error: packageError } = await supabase
      .from('mcp_packages')
      .insert({
        id: packageId,
        name: packageData.name,
        version: packageData.version,
        description: packageData.description,
        author_id: packageData.author_id,
        source_api_url: packageData.source_api_url,
        tags: packageData.tags || [],
        required_secrets: packageData.required_secrets || [],
        downloads_count: 0
      })
      .select()
      .single();

    if (packageError) {
      throw new Error(`Failed to create package: ${packageError.message}`);
    }

    // Insert tools if provided
    if (packageData.tools && packageData.tools.length > 0) {
      const toolsData = packageData.tools.map(tool => ({
        id: uuidv4(),
        package_id: packageId,
        tool_name: tool.tool_name,
        description: tool.description,
        input_schema: tool.input_schema,
        output_schema: tool.output_schema
      }));

      const { error: toolsError } = await supabase
        .from('mcp_tools')
        .insert(toolsData);

      if (toolsError) {
        // Rollback package creation if tools insertion fails
        await supabase.from('mcp_packages').delete().eq('id', packageId);
        throw new Error(`Failed to create package tools: ${toolsError.message}`);
      }
    }

    return packageResult;
  }

  async getPackageByName(name: string): Promise<PackageWithDetails | null> {
    const { data: packageData, error: packageError } = await supabase
      .from('mcp_packages')
      .select('*')
      .eq('name', name)
      .single();

    if (packageError || !packageData) {
      return null;
    }

    // Get deployments
    const { data: deployments, error: deploymentsError } = await supabase
      .from('mcp_deployments')
      .select('*')
      .eq('package_id', packageData.id);

    // Get tools
    const { data: tools, error: toolsError } = await supabase
      .from('mcp_tools')
      .select('*')
      .eq('package_id', packageData.id);

    if (deploymentsError || toolsError) {
      throw new Error('Failed to fetch package details');
    }

    return {
      ...packageData,
      deployments: deployments || [],
      tools: tools || []
    };
  }

  async getPackageById(id: string): Promise<PackageWithDetails | null> {
    const { data: packageData, error: packageError } = await supabase
      .from('mcp_packages')
      .select('*')
      .eq('id', id)
      .single();

    if (packageError || !packageData) {
      return null;
    }

    // Get deployments
    const { data: deployments, error: deploymentsError } = await supabase
      .from('mcp_deployments')
      .select('*')
      .eq('package_id', packageData.id);

    // Get tools
    const { data: tools, error: toolsError } = await supabase
      .from('mcp_tools')
      .select('*')
      .eq('package_id', packageData.id);

    if (deploymentsError || toolsError) {
      throw new Error('Failed to fetch package details');
    }

    // Merge required_secrets and optional_secrets into a single secrets array
    const requiredSecrets = Array.isArray(packageData.required_secrets) ? packageData.required_secrets.map((s: any) => ({ ...s, required: true })) : [];
    const optionalSecrets = Array.isArray(packageData.optional_secrets) ? packageData.optional_secrets.map((s: any) => ({ ...s, required: false })) : [];
    const secrets = [...requiredSecrets, ...optionalSecrets];

    return {
      ...packageData,
      deployments: deployments || [],
      tools: tools || [],
      secrets,
    };
  }

  async searchPackages(query: PackageSearchQuery): Promise<PackageSearchResult> {
    const limit = query.limit || 20;
    const offset = query.offset || 0;
    
    let supabaseQuery = supabase
      .from('mcp_packages')
      .select('*', { count: 'exact' });

    // Add text search if query provided
    if (query.q) {
      supabaseQuery = supabaseQuery.or(
        `name.ilike.%${query.q}%,description.ilike.%${query.q}%`
      );
    }

    // Add tag filtering if provided
    if (query.tags && query.tags.length > 0) {
      supabaseQuery = supabaseQuery.overlaps('tags', query.tags);
    }

    // Add pagination
    supabaseQuery = supabaseQuery
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    const { data, error, count } = await supabaseQuery;

    if (error) {
      throw new Error(`Search failed: ${error.message}`);
    }

    return {
      packages: data || [],
      total: count || 0,
      limit,
      offset
    };
  }

  async createDeployment(packageId: string, deploymentUrl: string, healthCheckUrl?: string): Promise<MCPDeployment> {
    const { data, error } = await supabase
      .from('mcp_deployments')
      .insert({
        id: uuidv4(),
        package_id: packageId,
        deployment_url: deploymentUrl,
        health_check_url: healthCheckUrl,
        status: 'active'
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create deployment: ${error.message}`);
    }

    return data;
  }

  async updatePackageDownloads(packageId: string): Promise<void> {
    const { error } = await supabase
      .rpc('increment_downloads', { package_uuid: packageId });

    if (error) {
      throw new Error(`Failed to update downloads: ${error.message}`);
    }
  }

  async getAllPackages(): Promise<MCPPackage[]> {
    const { data, error } = await supabase
      .from('mcp_packages')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch packages: ${error.message}`);
    }

    return data || [];
  }

  // Deployment management methods

  async getDeploymentById(id: string): Promise<MCPDeployment | null> {
    const { data, error } = await supabase
      .from('mcp_deployments')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return null;
    }

    return data;
  }

  async getAllDeployments(options: {
    status?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<MCPDeployment[]> {
    const { status, limit = 50, offset = 0 } = options;

    let query = supabase
      .from('mcp_deployments')
      .select('*');

    if (status) {
      query = query.eq('status', status);
    }

    query = query
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch deployments: ${error.message}`);
    }

    return data || [];
  }

  async updateDeploymentHealth(
    id: string, 
    _healthStatus: 'healthy' | 'unhealthy' | 'unknown', 
    lastChecked: string
  ): Promise<void> {
    const { error } = await supabase
      .from('mcp_deployments')
      .update({
        last_health_check: lastChecked,
        // Note: We don't have a health_status column yet, but we can add it later
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to update deployment health: ${error.message}`);
    }
  }

  async updateDeploymentStatus(
    id: string, 
    status: 'active' | 'inactive' | 'failed'
  ): Promise<void> {
    const { error } = await supabase
      .from('mcp_deployments')
      .update({ status })
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to update deployment status: ${error.message}`);
    }
  }

  /**
   * Delete an MCP package and all its related data
   */
  async deletePackage(packageId: string, userId?: string): Promise<boolean> {
    try {
      // console.log(`🗑️ Deleting package ${packageId} and all related data...`);

      // First verify ownership if userId is provided
      if (userId) {
        const { data: packageData, error: packageError } = await supabase
          .from('mcp_packages')
          .select('author_id')
          .eq('id', packageId)
          .single();

        if (packageError || !packageData) {
          throw new Error('Package not found');
        }

        // DEBUG LOGS
        console.log('DEBUG: author_id in package:', packageData.author_id, 'userId from session:', userId);

        if (packageData.author_id !== userId) {
          throw new Error('Unauthorized: You can only delete your own packages');
        }
      }

      // Delete in order to respect foreign key constraints:
      // 1. Delete tools first
      const { error: toolsError } = await supabase
        .from('mcp_tools')
        .delete()
        .eq('package_id', packageId);

      if (toolsError) {
        console.error('❌ Failed to delete tools:', toolsError);
        throw new Error(`Failed to delete package tools: ${toolsError.message}`);
      }

      // console.log('✅ Deleted package tools');

      // 2. Delete deployments
      const { error: deploymentsError } = await supabase
        .from('mcp_deployments')
        .delete()
        .eq('package_id', packageId);

      if (deploymentsError) {
        console.error('❌ Failed to delete deployments:', deploymentsError);
        throw new Error(`Failed to delete package deployments: ${deploymentsError.message}`);
      }

      // console.log('✅ Deleted package deployments');

      // 3. Delete secrets if they exist
      try {
        const { error: secretsError } = await supabase
          .from('mcp_secrets')
          .delete()
          .eq('mcp_server_id', packageId);

        if (secretsError) {
          console.warn('⚠️ Failed to delete secrets (table may not exist):', secretsError);
        } 
        // else {
        //   console.log('✅ Deleted package secrets');
        // }
      } catch (error) {
        console.warn('⚠️ Secrets table may not exist, skipping...');
      }

      // 4. Delete package ratings if they exist
      try {
        const { error: ratingsError } = await supabase
          .from('mcp_package_ratings')
          .delete()
          .eq('package_id', packageId);

        if (ratingsError) {
          console.warn('⚠️ Failed to delete ratings (table may not exist):', ratingsError);
        } 
        // else {
        //   console.log('✅ Deleted package ratings');
        // }
      } catch (error) {
        console.warn('⚠️ Ratings table may not exist, skipping...');
      }

      // 5. Delete download records if they exist
      try {
        const { error: downloadsError } = await supabase
          .from('mcp_package_downloads')
          .delete()
          .eq('package_id', packageId);

        if (downloadsError) {
          console.warn('⚠️ Failed to delete download records (table may not exist):', downloadsError);
        } 
        // else {
        //   console.log('✅ Deleted package download records');
        // }
      } catch (error) {
        console.warn('⚠️ Download records table may not exist, skipping...');
      }

      // 6. Finally delete the package itself
      const { error: packageError } = await supabase
        .from('mcp_packages')
        .delete()
        .eq('id', packageId);

      if (packageError) {
        console.error('❌ Failed to delete package:', packageError);
        throw new Error(`Failed to delete package: ${packageError.message}`);
      }

      // console.log('✅ Successfully deleted package and all related data');
      return true;

    } catch (error) {
      console.error('❌ Package deletion failed:', error);
      throw error;
    }
  }

  async getPackageBySlug(slug: string): Promise<PackageWithDetails | null> {
    const { data: packageData, error: packageError } = await supabase
      .from('mcp_packages')
      .select('*')
      .eq('slug', slug)
      .single();

    if (packageError || !packageData) {
      return null;
    }

    // Get deployments
    const { data: deployments, error: deploymentsError } = await supabase
      .from('mcp_deployments')
      .select('*')
      .eq('package_id', packageData.id);

    // Get tools
    const { data: tools, error: toolsError } = await supabase
      .from('mcp_tools')
      .select('*')
      .eq('package_id', packageData.id);

    if (deploymentsError || toolsError) {
      throw new Error('Failed to fetch package details');
    }

    return {
      ...packageData,
      deployments: deployments || [],
      tools: tools || []
    };
  }

  // Add a placeholder redeployPackageById method
  async redeployPackageById(pkg: any, userId: string) {
    console.log('[PackageService] Redeploy called for package:', pkg.id, 'by user:', userId);
    // Validate required fields
    if (!pkg || !pkg.name || !pkg.source_api_url || !pkg.service_name) {
      return { success: false, error: 'Missing required package info for redeploy' };
    }
    // Extract repo info from name (assume name is owner/repo)
    const repoName = pkg.name;
    const repoUrl = `https://github.com/${repoName}`;
    const branch = 'main'; // TODO: support custom branch if needed
    const env = {};
    const serviceName = pkg.service_name;
    const packageId = pkg.id;
    try {
      const result = await redeployRepo({
        repoUrl,
        repoName,
        branch,
        env,
        serviceName,
        packageId
      });
      if (result.success) {
        return { success: true, message: 'Redeployment started', ...result };
      } else {
        return { success: false, error: result.error || 'Redeploy failed', logs: result.logs };
      }
    } catch (err) {
      console.error('[PackageService] Redeploy error:', err);
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }
} 