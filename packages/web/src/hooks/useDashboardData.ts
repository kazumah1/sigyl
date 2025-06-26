import { useState, useEffect } from 'react';
import { mcpServerService, MCPServer } from '@/services/mcpServerService';
import { workspaceService, Workspace } from '@/services/workspaceService';
import { analyticsService, AnalyticsMetrics, VisitData, ToolUsageData, ServerStatusData } from '@/services/analyticsService';
import { useAuth } from '@/contexts/AuthContext';

export interface DashboardData {
  workspace: Workspace | null;
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

export const useDashboardData = () => {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData>({
    workspace: null,
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
  });

  const loadDashboardData = async () => {
    try {
      setData(prev => ({ ...prev, loading: true, error: null }));

      // Check for admin session
      const adminSession = localStorage.getItem('admin_session');
      
      if (adminSession || !user) {
        // Load demo data for admin or non-authenticated users
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

        // Use mock analytics data instead of trying to query the database
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

        // Calculate metrics from demo data
        const totalVisits = mockAnalytics.reduce((sum, day) => sum + day.visits, 0);
        const totalToolCalls = mockAnalytics.reduce((sum, day) => sum + day.toolCalls, 0);
        const activeServers = demoServers.filter(s => s.status === 'active').length;

        setData({
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
          },
          loading: false,
          error: null
        });
      } else if (user) {
        // Load real data for authenticated users
        let workspaces = await workspaceService.getUserWorkspaces();
        let workspace = workspaces[0] || null;

        // If no workspaces exist, create a demo workspace
        if (!workspace) {
          workspace = await workspaceService.getOrCreateDemoWorkspace();
        }

        if (workspace) {
          const [mcpServers, metrics, visitData, toolUsageData, serverStatusData] = await Promise.all([
            mcpServerService.getMCPServers(workspace.id),
            analyticsService.getMetrics(workspace.id),
            analyticsService.getVisitData(workspace.id),
            analyticsService.getToolUsageData(workspace.id),
            analyticsService.getServerStatusData(workspace.id)
          ]);

          setData({
            workspace,
            mcpServers,
            metrics,
            analyticsData: {
              visitData,
              toolUsageData,
              serverStatusData
            },
            loading: false,
            error: null
          });
        } else {
          setData(prev => ({
            ...prev,
            loading: false,
            error: 'No workspace found and could not create demo workspace'
          }));
        }
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setData(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load dashboard data'
      }));
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const refetch = () => {
    loadDashboardData();
  };

  return { ...data, refetch };
};
