// Remove direct supabase import and replace with API calls
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface MetricData {
  date: string;
  visits: number;
  tool_calls: number;
  integration_calls: number;
}

export interface ServerMetrics {
  server_id: string;
  server_name: string;
  visits: number;
  tool_calls: number;
  status: 'active' | 'inactive' | 'error';
}

export interface AnalyticsMetrics {
  totalVisits: number;
  totalToolCalls: number;
  activeServers: number;
  totalIntegrations: number;
}

export interface VisitData {
  date: string;
  visits: number;
  toolCalls: number;
}

export interface ToolUsageData {
  name: string;
  calls: number;
  color: string;
}

export interface ServerStatusData {
  status: string;
  count: number;
}

// Helper function to get auth token
const getAuthToken = (): string | null => {
  // Try to get Supabase session token first
  const supabaseSession = JSON.parse(localStorage.getItem('sb-zcudhsyvfrlfgqqhjrqv-auth-token') || '{}');
  if (supabaseSession?.access_token) {
    return supabaseSession.access_token;
  }

  // Fallback to GitHub token
  const githubToken = localStorage.getItem('github_app_token');
  if (githubToken && githubToken !== 'db_restored_token') {
    return githubToken;
  }

  return null;
};

// Helper function to make API calls
const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const token = getAuthToken();
  
  const response = await fetch(`${API_BASE_URL}/api/v1${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API call failed: ${response.statusText}`);
  }

  return response.json();
};

export const analyticsService = {
  async getMetricsOverTime(workspaceId: string, days: number = 30): Promise<MetricData[]> {
    try {
      const result = await apiCall(`/analytics/metrics/${workspaceId}?days=${days}`);
      return result.data || this.generateDemoMetrics(days);
    } catch (error) {
      console.error('Error fetching metrics:', error);
      return this.generateDemoMetrics(days);
    }
  },

  async getServerMetrics(workspaceId: string): Promise<ServerMetrics[]> {
    try {
      const result = await apiCall(`/analytics/servers/${workspaceId}`);
      return result.data || this.generateDemoServerMetrics();
    } catch (error) {
      console.error('Error fetching server metrics:', error);
      return this.generateDemoServerMetrics();
    }
  },

  async getMetrics(workspaceId: string): Promise<AnalyticsMetrics> {
    try {
      const result = await apiCall(`/analytics/overview/${workspaceId}`);
      return result.data || {
        totalVisits: 0,
        totalToolCalls: 0,
        activeServers: 0,
        totalIntegrations: 0
      };
    } catch (error) {
      console.error('Error fetching analytics overview:', error);
      // Fallback to calculating from other endpoints
      const metricsData = await this.getMetricsOverTime(workspaceId, 30);
      const serverMetrics = await this.getServerMetrics(workspaceId);
      
      const totalVisits = metricsData.reduce((sum, day) => sum + day.visits, 0);
      const totalToolCalls = metricsData.reduce((sum, day) => sum + day.tool_calls, 0);
      const activeServers = serverMetrics.filter(s => s.status === 'active').length;
      
      return {
        totalVisits,
        totalToolCalls,
        activeServers,
        totalIntegrations: serverMetrics.length
      };
    }
  },

  async getVisitData(workspaceId: string): Promise<VisitData[]> {
    const metricsData = await this.getMetricsOverTime(workspaceId, 30);
    return metricsData.map(item => ({
      date: item.date,
      visits: item.visits,
      toolCalls: item.tool_calls
    }));
  },

  async getToolUsageData(workspaceId: string): Promise<ToolUsageData[]> {
    // This could be enhanced to call a real API endpoint in the future
    return [
      { name: 'Database Query', calls: 1247, color: '#3b82f6' },
      { name: 'API Call', calls: 892, color: '#10b981' },
      { name: 'File Upload', calls: 645, color: '#f59e0b' },
      { name: 'Data Transform', calls: 423, color: '#ef4444' },
      { name: 'Email Send', calls: 234, color: '#8b5cf6' }
    ];
  },

  async getServerStatusData(workspaceId: string): Promise<ServerStatusData[]> {
    const serverMetrics = await this.getServerMetrics(workspaceId);
    const statusCounts = serverMetrics.reduce((acc, server) => {
      acc[server.status] = (acc[server.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count: count as number
    }));
  },

  // Helper methods for demo data
  generateDemoMetrics(days: number): MetricData[] {
    const metrics: MetricData[] = [];
    const now = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      
      // Generate realistic demo data with some variation
      const baseVisits = 50 + Math.floor(Math.random() * 100);
      const baseToolCalls = 20 + Math.floor(Math.random() * 50);
      const baseIntegrationCalls = 5 + Math.floor(Math.random() * 15);
      
      metrics.push({
        date: dateStr,
        visits: baseVisits,
        tool_calls: baseToolCalls,
        integration_calls: baseIntegrationCalls
      });
    }
    
    return metrics;
  },

  generateDemoServerMetrics(): ServerMetrics[] {
    return [
      {
        server_id: 'demo-server-1',
        server_name: 'PostgreSQL Connector',
        visits: 1247,
        tool_calls: 892,
        status: 'active'
      },
      {
        server_id: 'demo-server-2',
        server_name: 'Slack Integration',
        visits: 834,
        tool_calls: 645,
        status: 'active'
      },
      {
        server_id: 'demo-server-3',
        server_name: 'Email Service',
        visits: 423,
        tool_calls: 234,
        status: 'inactive'
      }
    ];
  }
};
