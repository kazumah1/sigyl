import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { PackageService } from '../services/packageService';
import { requireAuth, requirePermissions, optionalAuth } from '../middleware/auth';
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
router.post('/', requirePermissions(['write']), async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedData = createPackageSchema.parse(req.body);
    
    // Check if package name already exists
    const existingPackage = await packageService.getPackageByName(validatedData.name);
    if (existingPackage) {
      const response: APIResponse<null> = {
        success: false,
        error: 'Package name already exists',
        message: `Package '${validatedData.name}' is already registered`
      };
      res.status(409).json(response);
      return;
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
    
    res.status(201).json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const response: APIResponse<null> = {
        success: false,
        error: 'Validation error',
        message: error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ')
      };
      res.status(400).json(response);
      return;
    }

    const response: APIResponse<null> = {
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
    
    res.status(500).json(response);
  }
});

// GET /api/v1/packages/search - Search packages (optional auth for analytics)
router.get('/search', optionalAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedQuery = searchQuerySchema.parse(req.query);
    
    const searchResults = await packageService.searchPackages(validatedQuery as PackageSearchQuery);
    
    const response: APIResponse<typeof searchResults> = {
      success: true,
      data: searchResults,
      message: `Found ${searchResults.total} packages`
    };
    
    res.json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const response: APIResponse<null> = {
        success: false,
        error: 'Invalid query parameters',
        message: error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ')
      };
      res.status(400).json(response);
      return;
    }

    const response: APIResponse<null> = {
      success: false,
      error: 'Search failed',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
    
    res.status(500).json(response);
  }
});

// GET /api/v1/packages/:name - Get package by name (optional auth for analytics)
router.get('/:name', optionalAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { name } = req.params;
    
    if (!name || name.trim().length === 0) {
      const response: APIResponse<null> = {
        success: false,
        error: 'Invalid package name',
        message: 'Package name is required'
      };
      res.status(400).json(response);
      return;
    }

    const packageData = await packageService.getPackageByName(name);
    
    if (!packageData) {
      const response: APIResponse<null> = {
        success: false,
        error: 'Package not found',
        message: `Package '${name}' does not exist`
      };
      res.status(404).json(response);
      return;
    }

    // Increment download count
    await packageService.updatePackageDownloads(packageData.id);
    
    const response: APIResponse<typeof packageData> = {
      success: true,
      data: packageData,
      message: 'Package retrieved successfully'
    };
    
    res.json(response);
  } catch (error) {
    const response: APIResponse<null> = {
      success: false,
      error: 'Failed to retrieve package',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
    
    res.status(500).json(response);
  }
});

// GET /api/v1/packages - Get all packages (publicly accessible for marketplace)
router.get('/', optionalAuth, async (_req: Request, res: Response): Promise<void> => {
  try {
    const packages = await packageService.getAllPackages();
    
    const response: APIResponse<typeof packages> = {
      success: true,
      data: packages,
      message: `Retrieved ${packages.length} packages`
    };
    
    res.json(response);
  } catch (error) {
    const response: APIResponse<null> = {
      success: false,
      error: 'Failed to retrieve packages',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
    
    res.status(500).json(response);
  }
});

// GET /api/v1/packages/admin/all - Admin endpoint for getting all packages (requires admin permission)
router.get('/admin/all', requirePermissions(['admin']), async (_req: Request, res: Response): Promise<void> => {
  try {
    const packages = await packageService.getAllPackages();
    
    const response: APIResponse<typeof packages> = {
      success: true,
      data: packages,
      message: `Admin: Retrieved ${packages.length} packages`
    };
    
    res.json(response);
  } catch (error) {
    const response: APIResponse<null> = {
      success: false,
      error: 'Failed to retrieve packages',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
    
    res.status(500).json(response);
  }
});

export default router; 