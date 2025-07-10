import { Router, Request, Response } from 'express';
import { supabase } from '../config/database';
import { requireHybridAuth } from '../middleware/auth';
import { APIResponse } from '../types';

const router = Router();

interface MetricData {
  date: string;
  requests: number;
  successful_requests: number;
  failed_requests: number;
  avg_response_time: number;
  tool_calls: number;
  unique_users: number;
}

interface DetailedMetrics {
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  avg_response_time: number;
  total_tool_calls: number;
  unique_packages: number;
  performance_breakdown: {
    fast: number;
    medium: number;
    slow: number;
  };
  top_tools: Array<{
    tool_name: string;
    usage_count: number;
    avg_response_time: number;
  }>;
  error_breakdown: Record<string, number>;
}

interface LLMCostMetrics {
  total_requests: number;
  total_tokens_in: number;
  total_tokens_out: number;
  estimated_cost_usd: number;
  cost_by_model: Array<{
    model: string;
    requests: number;
    tokens_in: number;
    tokens_out: number;
    cost_usd: number;
  }>;
}

// GET /api/v1/analytics/metrics/:userId - Get detailed MCP metrics for a user
router.get('/metrics/:userId', requireHybridAuth, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { days = '30', package_name } = req.query;
    const daysNumber = parseInt(days as string);

    // Verify user has access to these metrics
    if (req.user!.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You can only view your own metrics'
      });
    }

    let query = supabase
      .from('mcp_metrics')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - daysNumber * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: true });

    if (package_name) {
      query = query.eq('package_name', package_name);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching MCP metrics:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch metrics',
        message: error.message
      });
    }

    // Group data by date
    const groupedData: { [key: string]: MetricData } = {};
    
    (data || []).forEach(metric => {
      const date = new Date(metric.created_at).toISOString().split('T')[0];
      if (!groupedData[date]) {
        groupedData[date] = { 
          date, 
          requests: 0, 
          successful_requests: 0, 
          failed_requests: 0, 
          avg_response_time: 0, 
          tool_calls: 0,
          unique_users: 0
        };
      }
      
      groupedData[date].requests++;
      if (metric.success) {
        groupedData[date].successful_requests++;
      } else {
        groupedData[date].failed_requests++;
      }
      
      if (metric.response_time_ms) {
        groupedData[date].avg_response_time = 
          (groupedData[date].avg_response_time * (groupedData[date].requests - 1) + metric.response_time_ms) / 
          groupedData[date].requests;
      }
      
      if (metric.tool_name) {
        groupedData[date].tool_calls++;
      }
    });

    const response: APIResponse<MetricData[]> = {
      success: true,
      data: Object.values(groupedData),
      message: 'MCP metrics retrieved successfully'
    };

    return res.json(response);
  } catch (error) {
    console.error('Error fetching MCP metrics:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch metrics'
    });
  }
});

// GET /api/v1/analytics/overview/:userId - Get comprehensive analytics overview
router.get('/overview/:userId', requireHybridAuth, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { days = '30' } = req.query;
    const daysNumber = parseInt(days as string);

    // Verify user has access
    if (req.user!.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You can only view your own metrics'
      });
    }

    const { data: metricsData, error: metricsError } = await supabase
      .from('mcp_metrics')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - daysNumber * 24 * 60 * 60 * 1000).toISOString());

    if (metricsError) {
      console.error('Error fetching metrics:', metricsError);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch metrics',
        message: metricsError.message
      });
    }

    const metrics = metricsData || [];
    
    // Calculate overview stats
    const totalRequests = metrics.length;
    const successfulRequests = metrics.filter(m => m.success).length;
    const failedRequests = totalRequests - successfulRequests;
    const avgResponseTime = metrics.reduce((sum, m) => sum + (m.response_time_ms || 0), 0) / Math.max(totalRequests, 1);
    const totalToolCalls = metrics.filter(m => m.tool_name).length;
    const uniquePackages = new Set(metrics.map(m => m.package_name)).size;
    
    // Performance breakdown
    const performanceBreakdown = {
      fast: metrics.filter(m => m.performance_tier === 'fast').length,
      medium: metrics.filter(m => m.performance_tier === 'medium').length,
      slow: metrics.filter(m => m.performance_tier === 'slow').length,
    };
    
    // Top tools
    const toolUsage: Record<string, { count: number; totalResponseTime: number }> = {};
    metrics.forEach(m => {
      if (m.tool_name) {
        if (!toolUsage[m.tool_name]) {
          toolUsage[m.tool_name] = { count: 0, totalResponseTime: 0 };
        }
        toolUsage[m.tool_name].count++;
        toolUsage[m.tool_name].totalResponseTime += m.response_time_ms || 0;
      }
    });
    
    const topTools = Object.entries(toolUsage)
      .map(([tool_name, data]) => ({
        tool_name,
        usage_count: data.count,
        avg_response_time: data.totalResponseTime / data.count
      }))
      .sort((a, b) => b.usage_count - a.usage_count)
      .slice(0, 10);
    
    // Error breakdown
    const errorBreakdown: Record<string, number> = {};
    metrics.filter(m => !m.success && m.error_type).forEach(m => {
      errorBreakdown[m.error_type!] = (errorBreakdown[m.error_type!] || 0) + 1;
    });

    const overview: DetailedMetrics = {
      total_requests: totalRequests,
      successful_requests: successfulRequests,
      failed_requests: failedRequests,
      avg_response_time: Math.round(avgResponseTime),
      total_tool_calls: totalToolCalls,
      unique_packages: uniquePackages,
      performance_breakdown: performanceBreakdown,
      top_tools: topTools,
      error_breakdown: errorBreakdown
    };

    const response: APIResponse<DetailedMetrics> = {
      success: true,
      data: overview,
      message: 'Analytics overview retrieved successfully'
    };

    return res.json(response);
  } catch (error) {
    console.error('Error fetching analytics overview:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch analytics overview'
    });
  }
});

// GET /api/v1/analytics/llm-costs/:userId - Get LLM token and cost metrics (when available)
router.get('/llm-costs/:userId', requireHybridAuth, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { days = '30' } = req.query;
    const daysNumber = parseInt(days as string);

    // Verify user has access
    if (req.user!.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You can only view your own metrics'
      });
    }

    // Query for metrics that might contain LLM cost data in metadata
    const { data: metricsData, error: metricsError } = await supabase
      .from('mcp_metrics')
      .select('metadata, package_name, tool_name, created_at')
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - daysNumber * 24 * 60 * 60 * 1000).toISOString())
      .not('metadata->llm_usage', 'is', null); // Only get metrics with LLM usage data

    if (metricsError) {
      console.error('Error fetching LLM cost metrics:', metricsError);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch LLM cost metrics',
        message: metricsError.message
      });
    }

    const metrics = metricsData || [];
    
    if (metrics.length === 0) {
      const response: APIResponse<LLMCostMetrics> = {
        success: true,
        data: {
          total_requests: 0,
          total_tokens_in: 0,
          total_tokens_out: 0,
          estimated_cost_usd: 0,
          cost_by_model: []
        },
        message: 'No LLM usage data available. This data is populated when MCP servers include LLM usage information in their responses.'
      };
      return res.json(response);
    }

    // Process LLM usage data from metadata
    let totalRequests = 0;
    let totalTokensIn = 0;
    let totalTokensOut = 0;
    let totalCost = 0;
    const modelUsage: Record<string, { requests: number; tokensIn: number; tokensOut: number; cost: number }> = {};

    metrics.forEach(metric => {
      const llmUsage = metric.metadata?.llm_usage;
      if (llmUsage) {
        totalRequests++;
        totalTokensIn += llmUsage.tokens_in || 0;
        totalTokensOut += llmUsage.tokens_out || 0;
        totalCost += llmUsage.cost_usd || 0;

        const model = llmUsage.model || 'unknown';
        if (!modelUsage[model]) {
          modelUsage[model] = { requests: 0, tokensIn: 0, tokensOut: 0, cost: 0 };
        }
        modelUsage[model].requests++;
        modelUsage[model].tokensIn += llmUsage.tokens_in || 0;
        modelUsage[model].tokensOut += llmUsage.tokens_out || 0;
        modelUsage[model].cost += llmUsage.cost_usd || 0;
      }
    });

    const costByModel = Object.entries(modelUsage).map(([model, data]) => ({
      model,
      requests: data.requests,
      tokens_in: data.tokensIn,
      tokens_out: data.tokensOut,
      cost_usd: Math.round(data.cost * 100) / 100 // Round to 2 decimal places
    }));

    const llmMetrics: LLMCostMetrics = {
      total_requests: totalRequests,
      total_tokens_in: totalTokensIn,
      total_tokens_out: totalTokensOut,
      estimated_cost_usd: Math.round(totalCost * 100) / 100,
      cost_by_model: costByModel
    };

    const response: APIResponse<LLMCostMetrics> = {
      success: true,
      data: llmMetrics,
      message: 'LLM cost metrics retrieved successfully'
    };

    return res.json(response);
  } catch (error) {
    console.error('Error fetching LLM cost metrics:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch LLM cost metrics'
    });
  }
});

// POST /api/v1/analytics/mcp-metrics - Receive metrics from deployed MCP wrappers
router.post('/mcp-metrics', requireHybridAuth, async (req: Request, res: Response) => {
  try {
    const metricsData = req.body;
    
    // Validate required fields
    if (!metricsData.event_type || !metricsData.package_name || !metricsData.timestamp) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'event_type, package_name, and timestamp are required'
      });
    }

    // Store metrics in the database
    const { data, error } = await supabase
      .from('mcp_metrics')
      .insert({
        user_id: req.user!.user_id,
        package_name: metricsData.package_name,
        event_type: metricsData.event_type,
        mcp_method: metricsData.mcp_method,
        tool_name: metricsData.tool_name,
        success: metricsData.success,
        error_type: metricsData.error_type,
        response_time_ms: metricsData.response_time_ms,
        client_ip: metricsData.client_ip,
        user_agent: metricsData.user_agent,
        has_secrets: metricsData.has_secrets,
        secret_count: metricsData.secret_count,
        performance_tier: metricsData.performance_tier,
        hour_of_day: metricsData.hour_of_day,
        day_of_week: metricsData.day_of_week,
        request_size_bytes: metricsData.request_size_bytes,
        user_satisfaction_signal: metricsData.user_satisfaction_signal,
        complexity_score: metricsData.complexity_score,
        experiment_variant: metricsData.experiment_variant,
        memory_usage_mb: metricsData.memory_usage_mb,
        cpu_time_ms: metricsData.cpu_time_ms,
        metadata: {
          // Store any additional fields in metadata JSON column
          original_timestamp: metricsData.timestamp,
          wrapper_version: metricsData.wrapper_version,
          // Store LLM usage data if provided
          ...(metricsData.llm_usage && { llm_usage: metricsData.llm_usage }),
          additional_data: metricsData
        },
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error storing MCP metrics:', error);
      // Don't fail the request - metrics are not critical for MCP operation
      return res.status(200).json({
        success: true,
        message: 'Metrics received (storage failed but acknowledged)'
      });
    }

    const response: APIResponse<{ metric_id: string }> = {
      success: true,
      data: { metric_id: data.id },
      message: 'MCP metrics stored successfully'
    };

    return res.json(response);
  } catch (error) {
    console.error('Error processing MCP metrics:', error);
    // Don't fail the request - metrics are not critical for MCP operation
    return res.status(200).json({
      success: true,
      message: 'Metrics received (processing failed but acknowledged)'
    });
  }
});

// GET /api/v1/analytics/packages/:userId - Get metrics by package
router.get('/packages/:userId', requireHybridAuth, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { days = '30' } = req.query;
    const daysNumber = parseInt(days as string);

    // Verify user has access
    if (req.user!.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You can only view your own metrics'
      });
    }

    const { data: metricsData, error: metricsError } = await supabase
      .from('mcp_metrics')
      .select('package_name, success, response_time_ms, tool_name, created_at')
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - daysNumber * 24 * 60 * 60 * 1000).toISOString());

    if (metricsError) {
      console.error('Error fetching package metrics:', metricsError);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch package metrics',
        message: metricsError.message
      });
    }

    // Group by package
    const packageStats: Record<string, {
      package_name: string;
      total_requests: number;
      successful_requests: number;
      failed_requests: number;
      avg_response_time: number;
      tool_calls: number;
    }> = {};

    (metricsData || []).forEach(metric => {
      const pkg = metric.package_name;
      if (!packageStats[pkg]) {
        packageStats[pkg] = {
          package_name: pkg,
          total_requests: 0,
          successful_requests: 0,
          failed_requests: 0,
          avg_response_time: 0,
          tool_calls: 0
        };
      }

      packageStats[pkg].total_requests++;
      if (metric.success) {
        packageStats[pkg].successful_requests++;
      } else {
        packageStats[pkg].failed_requests++;
      }

      if (metric.response_time_ms) {
        packageStats[pkg].avg_response_time = 
          (packageStats[pkg].avg_response_time * (packageStats[pkg].total_requests - 1) + metric.response_time_ms) / 
          packageStats[pkg].total_requests;
      }

      if (metric.tool_name) {
        packageStats[pkg].tool_calls++;
      }
    });

    const response: APIResponse<Array<typeof packageStats[string]>> = {
      success: true,
      data: Object.values(packageStats).map(stats => ({
        ...stats,
        avg_response_time: Math.round(stats.avg_response_time)
      })),
      message: 'Package metrics retrieved successfully'
    };

    return res.json(response);
  } catch (error) {
    console.error('Error fetching package metrics:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch package metrics'
    });
  }
});

export default router; 