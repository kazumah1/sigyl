import { Router, Request, Response } from 'express';
import { supabase } from '../config/database';
import { APIKeyService } from '../services/apiKeyService';
import { MetricsService, RawMetricsData } from '../services/metricsService';
import { APIResponse } from '../types';

const router = Router();

// Cache for metrics API key validation to avoid rate limits
const metricsAuthCache = new Map<string, { profile_id: string; timestamp: number }>();
const METRICS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Lightweight authentication specifically for metrics endpoint
async function authenticateMetrics(req: Request): Promise<string | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  
  const apiKey = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
  if (!apiKey.startsWith('sk_')) return null;
  
  // Check cache first
  const cached = metricsAuthCache.get(apiKey);
  if (cached && Date.now() - cached.timestamp < METRICS_CACHE_TTL) {
    return cached.profile_id;
  }
  
  // Validate API key without going through full hybrid auth
  const authenticatedUser = await APIKeyService.validateAPIKey(apiKey);
  if (!authenticatedUser) return null;
  
  // Resolve API user to profile - API keys point to api_users table, but metrics need profiles table
  let profileId: string | null = null;
  
  try {
    // First, get the API user details to check if they have a github_id
    const { data: apiUser, error: apiUserError } = await supabase
      .from('api_users')
      .select('github_id, email, name')
      .eq('id', authenticatedUser.user_id)
      .single();
    
    if (!apiUserError && apiUser) {
      if (apiUser.github_id) {
        // Look up or create profile by github_id
        const { data: existingProfile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('github_id', apiUser.github_id)
          .single();
        
        if (!profileError && existingProfile) {
          profileId = existingProfile.id;
        } else {
          // Create profile for this user
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert({
              email: apiUser.email,
              full_name: apiUser.name,
              github_id: apiUser.github_id,
              auth_user_id: `api_user_${authenticatedUser.user_id}`
            })
            .select('id')
            .single();
          
          if (!createError && newProfile) {
            profileId = newProfile.id;
          }
        }
      } else {
        // Look up or create profile by email
        const { data: existingProfile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', apiUser.email)
          .single();
        
        if (!profileError && existingProfile) {
          profileId = existingProfile.id;
        } else {
          // Create profile for this user
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert({
              email: apiUser.email,
              full_name: apiUser.name,
              auth_user_id: `api_user_${authenticatedUser.user_id}`
            })
            .select('id')
            .single();
          
          if (!createError && newProfile) {
            profileId = newProfile.id;
          }
        }
      }
    }
  } catch (error) {
    console.error('[METRICS] Error resolving user to profile:', error);
    return null;
  }
  
  if (!profileId) {
    console.error('[METRICS] Could not resolve API user to profile for user_id:', authenticatedUser.user_id);
    return null;
  }
  
  // Cache the result
  metricsAuthCache.set(apiKey, {
    profile_id: profileId,
    timestamp: Date.now()
  });
  
  return profileId;
}
// POST /api/v1/analytics/mcp-metrics - Receive metrics from deployed MCP wrappers
router.post('/mcp-metrics', async (req: Request, res: Response) => {
  try {
    const rawMetricsData: RawMetricsData = req.body;
    
    // Lightweight authentication to avoid rate limiting
    const profileId = await authenticateMetrics(req);
    if (!profileId) {
      console.warn('[METRICS] Authentication failed');
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'Valid API key required'
      });
    }
    
    console.log(`[METRICS] Received raw metrics for profile: ${profileId}`);
    console.log(`[METRICS] Package: ${rawMetricsData.package_name}`);
    console.log(`[METRICS] Event: ${rawMetricsData.event_type}`);
    
    // Validate required fields for raw metrics
    if (!rawMetricsData.event_type || !rawMetricsData.package_name || !rawMetricsData.timestamp) {
      console.warn('[METRICS] Missing required fields:', {
        event_type: !!rawMetricsData.event_type,
        package_name: !!rawMetricsData.package_name,
        timestamp: !!rawMetricsData.timestamp
      });
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'event_type, package_name, and timestamp are required'
      });
    }

    // Use MetricsService to process and store the raw metrics
    const metricsService = new MetricsService();
    const result = await metricsService.processAndStoreMetrics(rawMetricsData, profileId);

    if (!result.success) {
      console.error('[METRICS] MetricsService processing failed:', result.error);
      console.error('[METRICS] Failed raw metrics data:', JSON.stringify(rawMetricsData, null, 2));
      // Don't fail the request - metrics are not critical for MCP operation
      return res.status(200).json({
        success: true,
        message: 'Metrics received (processing failed but acknowledged)'
      });
    }

    console.log(`[METRICS] Successfully processed and stored metric with ID: ${result.metric_id}`);

    const response: APIResponse<{ metric_id: string }> = {
      success: true,
      data: { metric_id: result.metric_id! },
      message: 'MCP metrics processed and stored successfully'
    };

    return res.json(response);
  } catch (error) {
    console.error('[METRICS] Error processing MCP metrics:', error);
    // Don't fail the request - metrics are not critical for MCP operation
    return res.status(200).json({
      success: true,
      message: 'Metrics received (processing failed but acknowledged)'
    });
  }
});

export default router; 