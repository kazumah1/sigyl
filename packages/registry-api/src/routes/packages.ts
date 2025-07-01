import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { PackageService } from '../services/packageService';
import { requirePermissions, optionalAuth } from '../middleware/auth';
import { APIResponse, CreatePackageRequest, PackageSearchQuery } from '../types';

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

// GET /api/v1/packages/:name - Get package by name (optional auth for analytics)
router.get('/:name', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    
    if (!name || name.trim().length === 0) {
      const response: APIResponse<null> = {
        success: false,
        error: 'Invalid package name',
        message: 'Package name is required'
      };
      return res.status(400).json(response);
    }

    const packageData = await packageService.getPackageByName(name);
    
    if (!packageData) {
      const response: APIResponse<null> = {
        success: false,
        error: 'Package not found',
        message: `Package '${name}' does not exist`
      };
      return res.status(404).json(response);
    }

    const response: APIResponse<typeof packageData> = {
      success: true,
      data: packageData,
      message: 'Package retrieved successfully'
    };
    
    return res.json(response);
  } catch (error) {
    const response: APIResponse<null> = {
      success: false,
      error: 'Failed to retrieve package',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
    
    return res.status(500).json(response);
  }
});

// GET /api/v1/packages/id/:id - Get package by ID (optional auth for analytics)
router.get('/id/:id', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!id || id.trim().length === 0) {
      const response: APIResponse<null> = {
        success: false,
        error: 'Invalid package ID',
        message: 'Package ID is required'
      };
      return res.status(400).json(response);
    }

    const packageData = await packageService.getPackageById(id);
    
    if (!packageData) {
      const response: APIResponse<null> = {
        success: false,
        error: 'Package not found',
        message: `Package with ID '${id}' does not exist`
      };
      return res.status(404).json(response);
    }

    const response: APIResponse<typeof packageData> = {
      success: true,
      data: packageData,
      message: 'Package retrieved successfully'
    };
    
    return res.json(response);
  } catch (error) {
    const response: APIResponse<null> = {
      success: false,
      error: 'Failed to retrieve package',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
    
    return res.status(500).json(response);
  }
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

// DELETE /api/v1/packages/:id - Delete package and Cloud Run service (requires authentication)
router.delete('/:id', requirePermissions(['write']), async (req: Request, res: Response) => {
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

    console.log(`🗑️ Starting deletion of package ${packageData.name} (${id})`);

    // First delete from Google Cloud Run if there are active deployments
    const activeDeployments = packageData.deployments?.filter(d => d.status === 'active') || [];
    
    if (activeDeployments.length > 0) {
      try {
        const { CloudRunService } = await import('@sigil/container-builder');
        
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
            console.log(`🗑️ Deleting Cloud Run service: ${serviceName}`);
            
            const deleted = await cloudRunService.deleteService(serviceName);
            if (deleted) {
              console.log(`✅ Deleted Cloud Run service: ${serviceName}`);
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

    console.log(`✅ Successfully deleted package ${packageData.name} and all related data`);

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

export default router;