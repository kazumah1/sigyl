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
} 