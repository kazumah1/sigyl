
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
          id: 'demo-workspace',
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
            workspace_id: 'demo-workspace'
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
            workspace_id: 'demo-workspace'
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
            workspace_id: 'demo-workspace'
          }
        ];

        const analytics = await analyticsService.getVisitData('demo-workspace');
        const toolUsage = await analyticsService.getToolUsageData('demo-workspace');
        const serverStatus = await analyticsService.getServerStatusData('demo-workspace');

        // Calculate metrics from demo data
        const totalVisits = analytics.reduce((sum, day) => sum + day.visits, 0);
        const totalToolCalls = analytics.reduce((sum, day) => sum + day.toolCalls, 0);
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
            visitData: analytics,
            toolUsageData: toolUsage,
            serverStatusData: serverStatus
          },
          loading: false,
          error: null
        });
      } else if (user) {
        // Load real data for authenticated users
        const workspaces = await workspaceService.getUserWorkspaces(user.id);
        const workspace = workspaces[0] || null;

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
            error: 'No workspace found'
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
