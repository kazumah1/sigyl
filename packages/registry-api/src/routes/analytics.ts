import { Router, Request, Response } from 'express';
import { supabase } from '../config/database';
import { requireHybridAuth } from '../middleware/auth';
import { APIResponse } from '../types';

const router = Router();

interface MetricData {
  date: string;
  visits: number;
  tool_calls: number;
  integration_calls: number;
}

interface ServerMetrics {
  server_id: string;
  server_name: string;
  visits: number;
  tool_calls: number;
  status: 'active' | 'inactive' | 'error';
}

interface AnalyticsMetrics {
  totalVisits: number;
  totalToolCalls: number;
  activeServers: number;
  totalIntegrations: number;
}

// GET /api/v1/analytics/metrics/:workspaceId - Get metrics over time
router.get('/metrics/:workspaceId', requireHybridAuth, async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const { days = '30' } = req.query;
    const daysNumber = parseInt(days as string);

    const { data, error } = await supabase
      .from('metrics')
      .select('*')
      .eq('workspace_id', workspaceId)
      .gte('created_at', new Date(Date.now() - daysNumber * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching metrics:', error);
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
        groupedData[date] = { date, visits: 0, tool_calls: 0, integration_calls: 0 };
      }
      
      if (metric.type === 'visit') groupedData[date].visits++;
      if (metric.type === 'tool_call') groupedData[date].tool_calls++;
      if (metric.type === 'integration_call') groupedData[date].integration_calls++;
    });

    const response: APIResponse<MetricData[]> = {
      success: true,
      data: Object.values(groupedData),
      message: 'Metrics retrieved successfully'
    };

    return res.json(response);
  } catch (error) {
    console.error('Error fetching metrics:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch metrics'
    });
  }
});

// GET /api/v1/analytics/servers/:workspaceId - Get server metrics
router.get('/servers/:workspaceId', requireHybridAuth, async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;

    const { data: servers, error: serversError } = await supabase
      .from('mcp_servers')
      .select('id, name, status')
      .eq('workspace_id', workspaceId);

    if (serversError) {
      console.error('Error fetching servers:', serversError);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch servers',
        message: serversError.message
      });
    }

    const serverMetrics: ServerMetrics[] = [];

    for (const server of servers || []) {
      const { data: metrics, error: metricsError } = await supabase
        .from('metrics')
        .select('type')
        .eq('server_id', server.id)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (metricsError) {
        console.error(`Error fetching metrics for server ${server.id}:`, metricsError);
        continue;
      }

      const visits = (metrics || []).filter(m => m.type === 'visit').length;
      const toolCalls = (metrics || []).filter(m => m.type === 'tool_call').length;

      serverMetrics.push({
        server_id: server.id,
        server_name: server.name,
        visits,
        tool_calls: toolCalls,
        status: server.status as 'active' | 'inactive' | 'error'
      });
    }

    const response: APIResponse<ServerMetrics[]> = {
      success: true,
      data: serverMetrics,
      message: 'Server metrics retrieved successfully'
    };

    return res.json(response);
  } catch (error) {
    console.error('Error fetching server metrics:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch server metrics'
    });
  }
});

// GET /api/v1/analytics/overview/:workspaceId - Get analytics overview
router.get('/overview/:workspaceId', requireHybridAuth, async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const { days = '30' } = req.query;
    const daysNumber = parseInt(days as string);

    // Get metrics data
    const { data: metricsData, error: metricsError } = await supabase
      .from('metrics')
      .select('type')
      .eq('workspace_id', workspaceId)
      .gte('created_at', new Date(Date.now() - daysNumber * 24 * 60 * 60 * 1000).toISOString());

    if (metricsError) {
      console.error('Error fetching metrics:', metricsError);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch metrics',
        message: metricsError.message
      });
    }

    // Get server data
    const { data: servers, error: serversError } = await supabase
      .from('mcp_servers')
      .select('status')
      .eq('workspace_id', workspaceId);

    if (serversError) {
      console.error('Error fetching servers:', serversError);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch servers',
        message: serversError.message
      });
    }

    const totalVisits = (metricsData || []).filter(m => m.type === 'visit').length;
    const totalToolCalls = (metricsData || []).filter(m => m.type === 'tool_call').length;
    const activeServers = (servers || []).filter(s => s.status === 'active').length;
    const totalIntegrations = (servers || []).length;

    const overview: AnalyticsMetrics = {
      totalVisits,
      totalToolCalls,
      activeServers,
      totalIntegrations
    };

    const response: APIResponse<AnalyticsMetrics> = {
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

export default router; 