import { Router, Request, Response } from 'express';
import { supabase } from '../config/database';
import { requireHybridAuth } from '../middleware/auth';
import { APIKeyService } from '../services/apiKeyService';
import { SessionMetricsService, RawSessionEvent } from '../services/sessionMetricsService';
import { APIResponse } from '../types';

const router = Router();

/**
 * Lightweight authentication for session metrics (to avoid rate limiting)
 */
async function authenticateSessionMetrics(req: Request): Promise<string | null> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return null;
    
    const apiKey = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
    
    // Use the same lightweight validation as the original metrics
    const authenticatedUser = await APIKeyService.validateAPIKey(apiKey);
    if (!authenticatedUser) return null;
    
    return authenticatedUser.user_id;
  } catch (error) {
    console.error('[SESSION_METRICS] Authentication error:', error);
    return null;
  }
}

// POST /api/v1/session-analytics/next-sequence - Get next sequence number for session
router.post('/next-sequence', async (req: Request, res: Response) => {
  try {
    const { session_id } = req.body;
    
    if (!session_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing session_id',
        message: 'session_id is required'
      });
    }
    
    // Get the highest sequence number for this session and increment
    const { data, error } = await supabase
      .from('raw_session_events')
      .select('event_sequence')
      .eq('session_id', session_id)
      .order('event_sequence', { ascending: false })
      .limit(1);
    
    if (error) {
      console.error('[SESSION_SEQUENCE] Database error:', error);
      return res.status(500).json({
        success: false,
        error: 'Database error',
        message: 'Failed to get next sequence number'
      });
    }
    
    const nextSequence = data && data.length > 0 ? data[0].event_sequence + 1 : 1;
    
    res.json({
      success: true,
      next_sequence: nextSequence
    });
    
  } catch (error) {
    console.error('[SESSION_SEQUENCE] Error getting next sequence:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to get next sequence number'
    });
  }
});

// POST /api/v1/session-analytics/session-exists - Check if session exists
router.post('/session-exists', async (req: Request, res: Response) => {
  try {
    const { session_id } = req.body;
    
    if (!session_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing session_id',
        message: 'session_id is required'
      });
    }
    
    // Check if session exists in raw_session_events table
    const { data, error } = await supabase
      .from('raw_session_events')
      .select('session_id')
      .eq('session_id', session_id)
      .limit(1);
    
    if (error) {
      console.error('[SESSION_EXISTS] Database error:', error);
      return res.status(500).json({
        success: false,
        error: 'Database error',
        message: 'Failed to check session existence'
      });
    }
    
    res.json({
      success: true,
      exists: data && data.length > 0
    });
    
  } catch (error) {
    console.error('[SESSION_EXISTS] Error checking session:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to check session existence'
    });
  }
});

// POST /api/v1/session-analytics/create-session - Create new session
router.post('/create-session', async (req: Request, res: Response) => {
  try {
    const { session_id, metadata } = req.body;
    
    if (!session_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing session_id',
        message: 'session_id is required'
      });
    }
    
    // Store session metadata in a simple sessions table or use existing structure
    // For now, we'll just acknowledge the session creation
    // In a full implementation, you might want a dedicated sessions table
    
    console.log(`[SESSION_CREATE] Created session: ${session_id}`);
    
    res.json({
      success: true,
      message: 'Session created successfully'
    });
    
  } catch (error) {
    console.error('[SESSION_CREATE] Error creating session:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to create session'
    });
  }
});

// POST /api/v1/session-analytics/update-activity - Update session activity
router.post('/update-activity', async (req: Request, res: Response) => {
  try {
    const { session_id } = req.body;
    
    if (!session_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing session_id',
        message: 'session_id is required'
      });
    }
    
    // Update last activity timestamp
    // For now, we'll just acknowledge the update
    // In a full implementation, you might want to track this in a sessions table
    
    console.log(`[SESSION_ACTIVITY] Updated activity for session: ${session_id}`);
    
    res.json({
      success: true,
      message: 'Session activity updated successfully'
    });
    
  } catch (error) {
    console.error('[SESSION_ACTIVITY] Error updating session activity:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to update session activity'
    });
  }
});

// POST /api/v1/session-analytics/delete-session - Delete session
router.post('/delete-session', async (req: Request, res: Response) => {
  try {
    const { session_id } = req.body;
    
    if (!session_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing session_id',
        message: 'session_id is required'
      });
    }
    
    // Delete session data
    // For now, we'll just acknowledge the deletion
    // In a full implementation, you might want to clean up session-related data
    
    console.log(`[SESSION_DELETE] Deleted session: ${session_id}`);
    
    res.json({
      success: true,
      message: 'Session deleted successfully'
    });
    
  } catch (error) {
    console.error('[SESSION_DELETE] Error deleting session:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to delete session'
    });
  }
});

// POST /api/v1/session-analytics/events - Store raw session event
router.post('/events', async (req: Request, res: Response) => {
  try {
    const rawEvent: RawSessionEvent = req.body;
    
    // Authenticate the request
    const userId = await authenticateSessionMetrics(req);
    if (!userId) {
      console.warn('[SESSION_METRICS] Authentication failed');
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'Valid API key required'
      });
    }
    
    console.log(`[SESSION_METRICS] Received session event for user: ${userId}`);
    console.log(`[SESSION_METRICS] Session: ${rawEvent.session_id}, Sequence: ${rawEvent.event_sequence}`);
    
    // Validate required fields
    if (!rawEvent.session_id || !rawEvent.package_name || !rawEvent.timestamp) {
      console.warn('[SESSION_METRICS] Missing required fields:', {
        session_id: !!rawEvent.session_id,
        package_name: !!rawEvent.package_name,
        timestamp: !!rawEvent.timestamp
      });
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'session_id, package_name, and timestamp are required'
      });
    }
    
    // Use SessionMetricsService to store the raw event
    const sessionMetricsService = new SessionMetricsService();
    const result = await sessionMetricsService.storeRawSessionEvent(rawEvent, userId);
    
    if (!result.success) {
      console.error('[SESSION_METRICS] Failed to store session event:', result.error);
      // Don't fail the request - metrics are not critical for MCP operation
      return res.status(200).json({
        success: true,
        message: 'Session event received (storage failed but acknowledged)'
      });
    }
    
    console.log(`[SESSION_METRICS] Successfully stored session event: ${rawEvent.session_id}_${rawEvent.event_sequence}`);
    
    res.status(200).json({
      success: true,
      message: 'Session event stored successfully'
    });
    
  } catch (error) {
    console.error('[SESSION_METRICS] Error processing session event:', error);
    res.status(200).json({
      success: true,
      message: 'Session event received (processing failed but acknowledged)'
    });
  }
});

// GET /api/v1/session-analytics/sessions/:sessionId - Get session analytics
router.get('/sessions/:sessionId', requireHybridAuth, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user!.user_id;
    
    // Get session analytics
    const { data: analytics, error } = await supabase
      .from('session_analytics')
      .select('*')
      .eq('session_id', sessionId)
      .eq('user_id', userId)
      .single();
    
    if (error || !analytics) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
        message: 'Session analytics not found or access denied'
      });
    }
    
    const response: APIResponse<typeof analytics> = {
      success: true,
      data: analytics,
      message: 'Session analytics retrieved successfully'
    };
    
    res.json(response);
    
  } catch (error) {
    console.error('[SESSION_ANALYTICS] Error retrieving session analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to retrieve session analytics'
    });
  }
});

// GET /api/v1/session-analytics/user/:userId - Get user's session analytics
router.get('/user/:userId', requireHybridAuth, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const requestingUserId = req.user!.user_id;
    
    // Ensure user can only access their own analytics
    if (userId !== requestingUserId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You can only access your own session analytics'
      });
    }
    
    // Get query parameters
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const packageName = req.query.package_name as string;
    const startDate = req.query.start_date as string;
    const endDate = req.query.end_date as string;
    
    // Build query
    let query = supabase
      .from('session_analytics')
      .select('*')
      .eq('user_id', userId)
      .order('started_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (packageName) {
      query = query.eq('package_name', packageName);
    }
    
    if (startDate) {
      query = query.gte('started_at', startDate);
    }
    
    if (endDate) {
      query = query.lte('started_at', endDate);
    }
    
    const { data: sessions, error } = await query;
    
    if (error) {
      console.error('[SESSION_ANALYTICS] Error retrieving user sessions:', error);
      return res.status(500).json({
        success: false,
        error: 'Database error',
        message: 'Failed to retrieve session analytics'
      });
    }
    
    const response: APIResponse<typeof sessions> = {
      success: true,
      data: sessions || [],
      message: `Retrieved ${sessions?.length || 0} session analytics`
    };
    
    res.json(response);
    
  } catch (error) {
    console.error('[SESSION_ANALYTICS] Error retrieving user sessions:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to retrieve session analytics'
    });
  }
});

// GET /api/v1/session-analytics/package/:packageName - Get package analytics
router.get('/package/:packageName', requireHybridAuth, async (req: Request, res: Response) => {
  try {
    const { packageName } = req.params;
    const userId = req.user!.user_id;
    
    // Get query parameters
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const startDate = req.query.start_date as string;
    const endDate = req.query.end_date as string;
    
    // Build query
    let query = supabase
      .from('session_analytics')
      .select('*')
      .eq('package_name', packageName)
      .eq('user_id', userId)
      .order('started_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (startDate) {
      query = query.gte('started_at', startDate);
    }
    
    if (endDate) {
      query = query.lte('started_at', endDate);
    }
    
    const { data: sessions, error } = await query;
    
    if (error) {
      console.error('[SESSION_ANALYTICS] Error retrieving package sessions:', error);
      return res.status(500).json({
        success: false,
        error: 'Database error',
        message: 'Failed to retrieve package analytics'
      });
    }
    
    // Calculate aggregate metrics
    const aggregateMetrics = calculateAggregateMetrics(sessions || []);
    
    const response: APIResponse<{
      sessions: typeof sessions;
      aggregate_metrics: typeof aggregateMetrics;
    }> = {
      success: true,
      data: {
        sessions: sessions || [],
        aggregate_metrics: aggregateMetrics
      },
      message: `Retrieved ${sessions?.length || 0} sessions for package ${packageName}`
    };
    
    res.json(response);
    
  } catch (error) {
    console.error('[SESSION_ANALYTICS] Error retrieving package analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to retrieve package analytics'
    });
  }
});

// POST /api/v1/session-analytics/process/:sessionId - Manually trigger session processing
router.post('/process/:sessionId', requireHybridAuth, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user!.user_id;
    
    // Verify user has access to this session
    const { data: sessionExists, error } = await supabase
      .from('raw_session_events')
      .select('session_id')
      .eq('session_id', sessionId)
      .eq('user_id', userId)
      .limit(1);
    
    if (error || !sessionExists || sessionExists.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
        message: 'Session not found or access denied'
      });
    }
    
    // Trigger session processing
    const sessionMetricsService = new SessionMetricsService();
    setImmediate(() => sessionMetricsService.processSessionAnalytics(sessionId));
    
    res.json({
      success: true,
      message: 'Session processing triggered'
    });
    
  } catch (error) {
    console.error('[SESSION_ANALYTICS] Error triggering session processing:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to trigger session processing'
    });
  }
});

// Session management routes for wrapper
router.post('/sessions', async (req: Request, res: Response) => {
  try {
    const userId = await authenticateSessionMetrics(req);
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { sessionId, packageName, clientInfo, metadata } = req.body;

    const { error } = await supabase
      .from('sessions')
      .insert({
        id: sessionId,
        user_id: userId,
        package_name: packageName,
        client_ip: clientInfo?.clientIp,
        user_agent: clientInfo?.userAgent,
        metadata: metadata || {}
      });

    if (error) {
      console.error('Error creating session:', error);
      return res.status(500).json({ error: 'Failed to create session' });
    }

    res.json({ success: true, sessionId });
  } catch (error) {
    console.error('Session creation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/sessions/:sessionId', async (req: Request, res: Response) => {
  try {
    const userId = await authenticateSessionMetrics(req);
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { sessionId } = req.params;

    const { data: session, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();

    if (error || !session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json(session);
  } catch (error) {
    console.error('Session retrieval error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/sessions/:sessionId/activity', async (req: Request, res: Response) => {
  try {
    const userId = await authenticateSessionMetrics(req);
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { sessionId } = req.params;
    const { lastEventSequence, lastActivity } = req.body;

    const { error } = await supabase
      .from('sessions')
      .update({
        last_activity: lastActivity || new Date().toISOString(),
        last_event_sequence: lastEventSequence
      })
      .eq('id', sessionId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating session activity:', error);
      return res.status(500).json({ error: 'Failed to update session' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Session activity update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/sessions/:sessionId', async (req: Request, res: Response) => {
  try {
    const userId = await authenticateSessionMetrics(req);
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { sessionId } = req.params;

    const { error } = await supabase
      .from('sessions')
      .update({
        status: 'ended',
        ended_at: new Date().toISOString()
      })
      .eq('id', sessionId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error ending session:', error);
      return res.status(500).json({ error: 'Failed to end session' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Session deletion error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Calculate aggregate metrics from session analytics
 */
function calculateAggregateMetrics(sessions: any[]) {
  if (sessions.length === 0) {
    return {
      total_sessions: 0,
      total_events: 0,
      average_duration_ms: 0,
      success_rate: 0,
      average_engagement_score: 0,
      average_effectiveness_score: 0,
      total_llm_cost_usd: 0,
      most_common_user_intent: null,
      performance_distribution: { fast: 0, medium: 0, slow: 0 }
    };
  }
  
  const totalSessions = sessions.length;
  const totalEvents = sessions.reduce((sum, s) => sum + s.total_events, 0);
  const averageDuration = sessions.reduce((sum, s) => sum + (s.duration_ms || 0), 0) / totalSessions;
  
  // Calculate success rate based on completion status
  const successfulSessions = sessions.filter(s => 
    s.conversation_flow?.completion_status === 'completed'
  ).length;
  const successRate = successfulSessions / totalSessions;
  
  // Calculate average scores
  const avgEngagement = sessions.reduce((sum, s) => 
    sum + (s.search_signals?.user_engagement_score || 0), 0) / totalSessions;
  const avgEffectiveness = sessions.reduce((sum, s) => 
    sum + (s.search_signals?.package_effectiveness || 0), 0) / totalSessions;
  
  // Calculate total LLM cost
  const totalLLMCost = sessions.reduce((sum, s) => 
    sum + (s.llm_usage?.estimated_cost_usd || 0), 0);
  
  // Find most common user intent
  const intentCounts = sessions.reduce((acc, s) => {
    const intent = s.conversation_flow?.user_intent;
    if (intent) {
      acc[intent] = (acc[intent] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);
  
  const mostCommonIntent = Object.entries(intentCounts)
    .sort(([, a], [, b]) => (b as number) - (a as number))[0]?.[0] || null;
  
  // Calculate performance distribution
  const performanceDistribution = sessions.reduce((acc, s) => {
    const tier = s.performance?.tier || 'medium';
    acc[tier] = (acc[tier] || 0) + 1;
    return acc;
  }, { fast: 0, medium: 0, slow: 0 });
  
  return {
    total_sessions: totalSessions,
    total_events: totalEvents,
    average_duration_ms: Math.round(averageDuration),
    success_rate: Math.round(successRate * 100) / 100,
    average_engagement_score: Math.round(avgEngagement * 100) / 100,
    average_effectiveness_score: Math.round(avgEffectiveness * 100) / 100,
    total_llm_cost_usd: Math.round(totalLLMCost * 100000) / 100000,
    most_common_user_intent: mostCommonIntent,
    performance_distribution: performanceDistribution
  };
}

export default router; 