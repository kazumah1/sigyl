import { supabase } from '@/lib/supabase';

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

export const analyticsService = {
  async getMetricsOverTime(workspaceId: string, days: number = 30): Promise<MetricData[]> {
    try {
      const { data, error } = await supabase
        .from('metrics')
        .select('*')
        .eq('workspace_id', workspaceId)
        .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching metrics:', error);
        return this.generateDemoMetrics(days);
      }

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

      return Object.values(groupedData);
    } catch (error) {
      console.error('Error fetching metrics over time:', error);
      return this.generateDemoMetrics(days);
    }
  },

  async getServerMetrics(workspaceId: string): Promise<ServerMetrics[]> {
    try {
      const { data: servers, error: serversError } = await supabase
        .from('mcp_servers')
        .select('id, name, status')
        .eq('workspace_id', workspaceId);

      if (serversError) {
        console.error('Error fetching servers:', serversError);
        return this.generateDemoServerMetrics();
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

      return serverMetrics;
    } catch (error) {
      console.error('Error fetching server metrics:', error);
      return this.generateDemoServerMetrics();
    }
  },

  async getMetrics(workspaceId: string): Promise<AnalyticsMetrics> {
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
        server_name: 'Shopify Integration',
        visits: 645,
        tool_calls: 423,
        status: 'active'
      },
      {
        server_id: 'demo-server-3',
        server_name: 'Email Service',
        visits: 234,
        tool_calls: 156,
        status: 'inactive'
      }
    ];
  }
};
