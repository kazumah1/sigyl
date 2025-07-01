import { useState, useEffect } from 'react';
import { mcpServerService, MCPServer } from '@/services/mcpServerService';
import { workspaceService, Workspace } from '@/services/workspaceService';
import { analyticsService, AnalyticsMetrics, VisitData, ToolUsageData, ServerStatusData } from '@/services/analyticsService';
import { useAuth } from '@/contexts/AuthContext';

export interface DashboardData {
  mcpServers: MCPServer[];
  metrics: AnalyticsMetrics;
  analyticsData: {
    visitData: VisitData[];
    toolUsageData: ToolUsageData[];
    serverStatusData: ServerStatusData[];
  };
  loading: boolean;
  error: string | null;
}

// Demo data for immediate loading
const getDemoData = () => {
  const demoWorkspace: Workspace = {
    id: 'demo-workspace-id',
    name: 'DZ\'s Enterprise Workspace',
    slug: 'dz-enterprise',
    description: 'Main development workspace for MCP integrations',
    owner_id: 'admin',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const demoServers: MCPServer[] = [
    {
      id: '1',
      name: 'E-commerce API Server',
      description: 'MCP server for e-commerce integrations with Shopify, WooCommerce',
      status: 'active',
      deployment_status: 'deployed',
      endpoint_url: 'https://api.sigyl.com/mcp/ecommerce',
      github_repo: 'dz/mcp-ecommerce-server',
      created_at: '2024-01-15T10:30:00Z',
      updated_at: '2024-01-20T15:30:00Z',
      workspace_id: 'demo-workspace-id'
    },
    {
      id: '2',
      name: 'CRM Integration Hub',
      description: 'Connects with Salesforce, HubSpot, and Pipedrive',
      status: 'active',
      deployment_status: 'deployed',
      endpoint_url: 'https://api.sigyl.com/mcp/crm',
      github_repo: 'dz/mcp-crm-hub',
      created_at: '2024-01-10T14:20:00Z',
      updated_at: '2024-01-19T14:20:00Z',
      workspace_id: 'demo-workspace-id'
    },
    {
      id: '3',
      name: 'Analytics Connector',
      description: 'Real-time analytics from Google Analytics, Mixpanel',
      status: 'active',
      deployment_status: 'deploying',
      endpoint_url: 'https://api.sigyl.com/mcp/analytics',
      github_repo: 'dz/mcp-analytics-connector',
      created_at: '2024-01-20T09:15:00Z',
      updated_at: '2024-01-20T16:45:00Z',
      workspace_id: 'demo-workspace-id'
    }
  ];

  const mockAnalytics: VisitData[] = [
    { date: '2025-01-27', visits: 1250, toolCalls: 3400 },
    { date: '2025-01-28', visits: 1380, toolCalls: 3800 },
    { date: '2025-01-29', visits: 1420, toolCalls: 4100 },
    { date: '2025-01-30', visits: 1560, toolCalls: 4500 },
    { date: '2025-01-31', visits: 1680, toolCalls: 4800 }
  ];

  const mockToolUsage: ToolUsageData[] = [
    { toolName: 'E-commerce API', calls: 1200, successRate: 98.5 },
    { toolName: 'CRM Integration', calls: 800, successRate: 97.2 },
    { toolName: 'Analytics Connector', calls: 600, successRate: 99.1 }
  ];

  const mockServerStatus: ServerStatusData[] = [
    { serverName: 'E-commerce API Server', status: 'healthy', responseTime: 45, uptime: 99.9 },
    { serverName: 'CRM Integration Hub', status: 'healthy', responseTime: 52, uptime: 99.8 },
    { serverName: 'Analytics Connector', status: 'deploying', responseTime: 0, uptime: 0 }
  ];

  const totalVisits = mockAnalytics.reduce((sum, day) => sum + day.visits, 0);
  const totalToolCalls = mockAnalytics.reduce((sum, day) => sum + day.toolCalls, 0);
  const activeServers = demoServers.filter(s => s.status === 'active').length;

  return {
    workspace: demoWorkspace,
    mcpServers: demoServers,
    metrics: {
      totalVisits,
      totalToolCalls,
      activeServers,
      totalIntegrations: demoServers.length
    },
    analyticsData: {
      visitData: mockAnalytics,
      toolUsageData: mockToolUsage,
      serverStatusData: mockServerStatus
    }
  };
};

export const useDashboardData = () => {
  const { user } = useAuth();
  const [data, setData] = useState<Omit<DashboardData, 'workspace'>>(() => {
    // Check for admin session immediately
    const adminSession = localStorage.getItem('admin_session');
    
    if (adminSession) {
      // Start with demo data for admin sessions (immediate loading)
      const demoData = getDemoData();
      return {
        mcpServers: demoData.mcpServers,
        metrics: demoData.metrics,
        analyticsData: demoData.analyticsData,
        loading: false,
        error: null
      };
    }
    
    // For regular users, start with loading state
    return {
      mcpServers: [],
      metrics: {
        totalVisits: 0,
        totalToolCalls: 0,
        activeServers: 0,
        totalIntegrations: 0
      },
      analyticsData: {
        visitData: [],
        toolUsageData: [],
        serverStatusData: []
      },
      loading: true,
      error: null
    };
  });

  const loadDashboardData = async () => {
    try {
      // Check for admin session
      const adminSession = localStorage.getItem('admin_session');
      
      if (adminSession) {
        // Admin sessions use demo data, no need to load
        return;
      }
      
      if (!user) {
        // No user, use demo data
        const demoData = getDemoData();
        setData({
          mcpServers: demoData.mcpServers,
          metrics: demoData.metrics,
          analyticsData: demoData.analyticsData,
          loading: false,
          error: null
        });
        return;
      }

      // Load real data for authenticated users
      setData(prev => ({ ...prev, loading: true, error: null }));

      // Only fetch mcpServers and analytics, do not fetch or create workspaces
      // Get github_id from user metadata (fallback to sub if not present)
      const githubId = user.user_metadata?.github_id || user.user_metadata?.sub;
      let mcpServers: MCPServer[] = [];
      if (githubId) {
        mcpServers = await mcpServerService.getUserMCPServers(githubId);
      }

      // Use demo metrics/analytics if you can't fetch without workspace
      const demoData = getDemoData();
      setData({
        mcpServers,
        metrics: demoData.metrics,
        analyticsData: demoData.analyticsData,
        loading: false,
        error: null
      });
    } catch (err: any) {
      setData(prev => ({ ...prev, loading: false, error: err?.message || 'Failed to load dashboard data' }));
    }
  };

  useEffect(() => {
    loadDashboardData();
    // eslint-disable-next-line
  }, [user]);

  const refetch = () => {
    loadDashboardData();
  };

  return {
    ...data,
    refetch
  };
};
