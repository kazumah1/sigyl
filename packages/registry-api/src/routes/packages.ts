import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { PackageService } from '../services/packageService';
import { requirePermissions, optionalAuth, authenticateHybrid, requireSupabaseAuth } from '../middleware/auth';
import { APIResponse, CreatePackageRequest, PackageSearchQuery, Permission } from '../types';
import { supabase } from '../config/database';

const router = Router();
const packageService = new PackageService();

// Validation schemas
const createPackageSchema = z.object({
  name: z.string().min(1).max(100),
  version: z.string().optional(),
  description: z.string().optional(),
  author_id: z.string().uuid().optional(),
  source_api_url: z.string().url().optional(),
  tags: z.array(z.string()).optional(),
  tools: z.array(z.object({
    tool_name: z.string().optional(),
    description: z.string().optional(),
    input_schema: z.record(z.any()).optional(),
    output_schema: z.record(z.any()).optional()
  })).optional()
});

const searchQuerySchema = z.object({
  q: z.string().optional(),
  tags: z.string().optional().transform((val: string | undefined) => val ? val.split(',') : undefined),
  limit: z.string().optional().transform((val: string | undefined) => val ? parseInt(val, 10) : 20),
  offset: z.string().optional().transform((val: string | undefined) => val ? parseInt(val, 10) : 0)
});

// GET /api/v1/packages - Get all packages (publicly accessible for marketplace)
router.get('/', optionalAuth, async (_req: Request, res: Response) => {
  try {
    const packages = await packageService.getAllPackages();
    
    const response: APIResponse<typeof packages> = {
      success: true,
      data: packages,
      message: `Retrieved ${packages.length} packages`
    };
    
    return res.json(response);
  } catch (error) {
    const response: APIResponse<null> = {
      success: false,
      error: 'Failed to retrieve packages',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
    
    return res.status(500).json(response);
  }
});

// GET /api/v1/packages/id/:id - Get package by ID (optional auth for analytics)
router.get('/id/:id', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.log(`[packages.ts] /id/:id route called with id=`, id);
    
    if (!id || id.trim().length === 0) {
      const response: APIResponse<null> = {
        success: false,
        error: 'Invalid package ID',
        message: 'Package ID is required'
      };
      return res.status(400).json(response);
    }

    // Only use getPackageById, never fallback to name
    console.log(`[packages.ts] Calling getPackageById with id=`, id);
    const packageData = await packageService.getPackageById(id);
    
    if (!packageData) {
      const response: APIResponse<null> = {
        success: false,
        error: 'Package not found',
        message: 'No package found with the given ID'
      };
      return res.status(404).json(response);
    }

    const response: APIResponse<typeof packageData> = {
      success: true,
      data: packageData,
      message: 'Package retrieved by ID'
    };
    return res.json(response);
  } catch (error) {
    const response: APIResponse<null> = {
      success: false,
      error: 'Failed to retrieve package by ID',
      message: error instanceof Error ? error.message : 'Unknown error'
    };
    return res.status(500).json(response);
  }
});

// POST /api/v1/packages/id/:id/increment-downloads - Increment downloads count for a package by ID
router.post('/id/:id/increment-downloads', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || id.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Invalid package ID', message: 'Package ID is required' });
    }
    await packageService.updatePackageDownloads(id);
    return res.json({ success: true, message: 'Download count incremented (by ID)' });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to increment download count', message: error instanceof Error ? error.message : 'Unknown error occurred' });
  }
});

// GET /api/v1/packages/:slug - Get package by slug (was by name)
router.get('/:slug(*)', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    console.log(`[packages.ts] /:slug route called with slug=`, slug);
    
    if (!slug || slug.trim().length === 0) {
      const response: APIResponse<null> = {
        success: false,
        error: 'Invalid package slug',
        message: 'Package slug is required'
      };
      return res.status(400).json(response);
    }

    // Try by slug first
    console.log(`[packages.ts] Calling getPackageBySlug with slug=`, slug);
    let packageData = await packageService.getPackageBySlug(slug);
    // Fallback: try by name if not found by slug
    if (!packageData) {
      console.log(`[packages.ts] getPackageBySlug returned null, calling getPackageByName with name=`, slug);
      packageData = await packageService.getPackageByName(slug);
    }
    
    if (!packageData) {
      const response: APIResponse<null> = {
        success: false,
        error: 'Package not found',
        message: 'No package found with the given slug or name'
      };
      return res.status(404).json(response);
    }

    const response: APIResponse<typeof packageData> = {
      success: true,
      data: packageData,
      message: 'Package retrieved by slug or name'
    };
    return res.json(response);
  } catch (error) {
    const response: APIResponse<null> = {
      success: false,
      error: 'Failed to retrieve package by slug or name',
      message: error instanceof Error ? error.message : 'Unknown error'
    };
    return res.status(500).json(response);
  }
});

// POST /api/v1/packages - Create a new package (requires write permission)
router.post('/', requirePermissions(['write']), async (req: Request, res: Response) => {
  try {
    const validatedData = createPackageSchema.parse(req.body);
    
    // Check if package name already exists
    const existingPackage = await packageService.getPackageByName(validatedData.name);
    if (existingPackage) {
      const response: APIResponse<null> = {
        success: false,
        error: 'Package already exists',
        message: `A package with the name '${validatedData.name}' already exists`
      };
      return res.status(409).json(response);
    }

    // Set author_id from authenticated user if not provided
    const packageData = {
      ...validatedData,
      author_id: validatedData.author_id || req.user?.user_id
    } as CreatePackageRequest;

    const newPackage = await packageService.createPackage(packageData);
    
    const response: APIResponse<typeof newPackage> = {
      success: true,
      data: newPackage,
      message: 'Package created successfully'
    };
    return res.status(201).json(response);
  } catch (error) {
    console.error('Error creating package:', error);
    const response: APIResponse<null> = {
      success: false,
      error: 'Failed to create package',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
    return res.status(400).json(response);
  }
});

// GET /api/v1/packages/search - Search packages (optional auth for analytics)
router.get('/search', optionalAuth, async (req: Request, res: Response) => {
  try {
    const validatedQuery = searchQuerySchema.parse(req.query);
    
    const searchResults = await packageService.searchPackages(validatedQuery as PackageSearchQuery);
    
    const response: APIResponse<typeof searchResults> = {
      success: true,
      data: searchResults,
      message: `Found ${searchResults.total} packages`
    };
    
    return res.json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const response: APIResponse<null> = {
        success: false,
        error: 'Invalid query parameters',
        message: error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ')
      };
      return res.status(400).json(response);
    }

    const response: APIResponse<null> = {
      success: false,
      error: 'Search failed',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
    
    return res.status(500).json(response);
  }
});

// GET /api/v1/packages/admin/all - Admin endpoint for getting all packages (requires admin permission)
router.get('/admin/all', requirePermissions(['admin']), async (_req: Request, res: Response) => {
  try {
    const packages = await packageService.getAllPackages();
    
    const response: APIResponse<typeof packages> = {
      success: true,
      data: packages,
      message: `Admin: Retrieved ${packages.length} packages`
    };
    return res.json(response);
  } catch (error) {
    const response: APIResponse<null> = {
      success: false,
      error: 'Failed to retrieve packages',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
    return res.status(500).json(response);
  }
});

// DELETE /api/v1/packages/:id - Delete package and Cloud Run service (session auth only)
router.delete('/:id', requireSupabaseAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { confirmName } = req.body;
    
    if (!id || id.trim().length === 0) {
      const response: APIResponse<null> = {
        success: false,
        error: 'Invalid package ID',
        message: 'Package ID is required'
      };
      return res.status(400).json(response);
    }

    // Get package details first to verify ownership and get service name
    const packageData = await packageService.getPackageById(id);
    
    if (!packageData) {
      const response: APIResponse<null> = {
        success: false,
        error: 'Package not found',
        message: `Package with ID '${id}' does not exist`
      };
      return res.status(404).json(response);
    }

    // Verify confirmation name matches package name
    if (confirmName !== packageData.name) {
      const response: APIResponse<null> = {
        success: false,
        error: 'Confirmation failed',
        message: 'Package name confirmation does not match'
      };
      return res.status(400).json(response);
    }

    // console.log(`🗑️ Starting deletion of package ${packageData.name} (${id})`);

    // First delete from Google Cloud Run if there are active deployments
    const activeDeployments = packageData.deployments?.filter(d => d.status === 'active') || [];
    
    if (activeDeployments.length > 0) {
      try {
        const { CloudRunService } = await import('container-builder/index');
        
        const CLOUD_RUN_CONFIG = {
          projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || '',
          region: process.env.GOOGLE_CLOUD_REGION || 'us-central1',
          serviceAccountKey: process.env.GOOGLE_CLOUD_SERVICE_ACCOUNT_KEY || '',
          keyFilePath: process.env.GOOGLE_CLOUD_KEY_FILE_PATH || ''
        };

        if (CLOUD_RUN_CONFIG.projectId) {
          const cloudRunService = new CloudRunService(CLOUD_RUN_CONFIG);
          
          for (const deployment of activeDeployments) {
            const serviceName = deployment.id; // Use deployment ID as service name
            // console.log(`🗑️ Deleting Cloud Run service: ${serviceName}`);
            
            const deleted = await cloudRunService.deleteService(serviceName);
            if (deleted) {
              // console.log(`✅ Deleted Cloud Run service: ${serviceName}`);
            } else {
              console.warn(`⚠️ Failed to delete Cloud Run service: ${serviceName}`);
            }
          }
        } else {
          console.warn('⚠️ Google Cloud Run not configured, skipping service deletion');
        }
      } catch (cloudError) {
        console.error('❌ Error deleting Cloud Run services:', cloudError);
        // Continue with database deletion even if Cloud Run deletion fails
      }
    }

    // Delete from database (this will cascade delete deployments, tools, etc.)
    const deleted = await packageService.deletePackage(id, req.user?.user_id);
    
    if (!deleted) {
      const response: APIResponse<null> = {
        success: false,
        error: 'Failed to delete package',
        message: 'Package deletion failed'
      };
      return res.status(500).json(response);
    }

    //  console.log(`✅ Successfully deleted package ${packageData.name} and all related data`);

    const response: APIResponse<null> = {
      success: true,
      message: `Package '${packageData.name}' has been completely deleted`
    };
    
    return res.json(response);
  } catch (error) {
    console.error('❌ Package deletion error:', error);
    
    const response: APIResponse<null> = {
      success: false,
      error: 'Failed to delete package',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
    
    return res.status(500).json(response);
  }
});

// POST /api/v1/packages/:id/increment-downloads - Increment downloads count for a package
router.post('/:id/increment-downloads', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || id.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Invalid package ID', message: 'Package ID is required' });
    }
    await packageService.updatePackageDownloads(id);
    return res.json({ success: true, message: 'Download count incremented' });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to increment download count', message: error instanceof Error ? error.message : 'Unknown error occurred' });
  }
});

// POST /api/v1/packages/:id/rate - Rate a package
router.post('/:id/rate', requirePermissions(['write']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { rating } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      const response: APIResponse<null> = {
        success: false,
        error: 'Invalid rating',
        message: 'Rating must be between 1 and 5'
      };
      return res.status(400).json(response);
    }

    // Check if package exists
    const packageData = await packageService.getPackageById(id);
    if (!packageData) {
      const response: APIResponse<null> = {
        success: false,
        error: 'Package not found',
        message: 'The specified package does not exist'
      };
      return res.status(404).json(response);
    }

    // Upsert rating
    const { error } = await supabase
      .from('mcp_package_ratings')
      .upsert({
        package_id: id,
        user_id: req.user!.user_id,
        rating
      });

    if (error) {
      console.error('Error rating package:', error);
      const response: APIResponse<null> = {
        success: false,
        error: 'Failed to rate package',
        message: error.message
      };
      return res.status(500).json(response);
    }

    const response: APIResponse<null> = {
      success: true,
      data: null,
      message: 'Package rated successfully'
    };

    return res.json(response);
  } catch (error) {
    console.error('Error rating package:', error);
    const response: APIResponse<null> = {
      success: false,
      error: 'Internal server error',
      message: 'Failed to rate package'
    };
    return res.status(500).json(response);
  }
});

// GET /api/v1/packages/:id/rating - Get user's rating for a package
router.get('/:id/rating', requirePermissions(['read']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('mcp_package_ratings')
      .select('rating')
      .eq('package_id', id)
      .eq('user_id', req.user!.user_id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching user rating:', error);
      const response: APIResponse<null> = {
        success: false,
        error: 'Failed to fetch rating',
        message: error.message
      };
      return res.status(500).json(response);
    }

    const response: APIResponse<{ rating: number | null }> = {
      success: true,
      data: { rating: data?.rating || null },
      message: 'Rating retrieved successfully'
    };

    return res.json(response);
  } catch (error) {
    console.error('Error fetching user rating:', error);
    const response: APIResponse<null> = {
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch rating'
    };
    return res.status(500).json(response);
  }
});

// POST /api/v1/packages/:id/download - Log a package download
router.post('/:id/download', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if package exists
    const packageData = await packageService.getPackageById(id);
    if (!packageData) {
      const response: APIResponse<null> = {
        success: false,
        error: 'Package not found',
        message: 'The specified package does not exist'
      };
      return res.status(404).json(response);
    }

    // Log the download
    const { error } = await supabase
      .from('mcp_package_downloads')
      .insert({
        package_id: id,
        user_id: req.user?.user_id || null,
        ip_address: req.ip,
        user_agent: req.get('User-Agent') || null
      });

    if (error) {
      console.error('Error logging download:', error);
    }

    // Increment downloads count
    await supabase.rpc('increment_downloads', { package_uuid: id });

    const response: APIResponse<null> = {
      success: true,
      data: null,
      message: 'Download logged successfully'
    };

    return res.json(response);
  } catch (error) {
    console.error('Error logging download:', error);
    const response: APIResponse<null> = {
      success: false,
      error: 'Internal server error',
      message: 'Failed to log download'
    };
    return res.status(500).json(response);
  }
});

// GET /api/v1/packages/marketplace/all - Get all packages with author info for marketplace
router.get('/marketplace/all', async (_req: Request, res: Response) => {
  try {
    // First fetch packages
    const { data: packagesData, error: packagesError } = await supabase
      .from('mcp_packages')
      .select('*')
      .order('downloads_count', { ascending: false });

    if (packagesError) {
      console.error('Error fetching packages:', packagesError);
      const response: APIResponse<null> = {
        success: false,
        error: 'Failed to fetch packages',
        message: packagesError.message
      };
      return res.status(500).json(response);
    }

    // Then fetch author profiles separately
    const authorIds = [...new Set((packagesData || []).map((pkg: any) => pkg.author_id).filter(Boolean))];
    
    let profilesData: any[] = [];
    if (authorIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, full_name')
        .in('id', authorIds);
      
      if (!profilesError) {
        profilesData = profiles || [];
      }
    }

    // Transform the data to include author info
    const transformedPackages = (packagesData || []).map((pkg: any) => {
      const authorProfile = profilesData.find(profile => profile.id === pkg.author_id);
      
      return {
        ...pkg,
        author: authorProfile ? {
          username: authorProfile.username || 'Unknown',
          full_name: authorProfile.full_name || 'Unknown'
        } : undefined
      };
    });

    const response: APIResponse<typeof transformedPackages> = {
      success: true,
      data: transformedPackages,
      message: 'Marketplace packages retrieved successfully'
    };

    return res.json(response);
  } catch (error) {
    console.error('Error fetching marketplace packages:', error);
    const response: APIResponse<null> = {
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch marketplace packages'
    };
    return res.status(500).json(response);
  }
});

export default router;