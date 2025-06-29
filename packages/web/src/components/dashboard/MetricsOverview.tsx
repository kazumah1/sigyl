import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Users, Server, TrendingUp, Globe, Zap, Clock, CheckCircle } from 'lucide-react';

interface Metrics {
  totalVisits: number;
  totalToolCalls: number;
  activeServers: number;
  totalIntegrations: number;
}

interface MetricsOverviewProps {
  metrics: Metrics;
}

const MetricsOverview: React.FC<MetricsOverviewProps> = ({ metrics }) => {
  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const metricCards = [
    {
      title: 'Total Visits',
      value: formatNumber(metrics.totalVisits),
      icon: Users,
      color: 'text-white',
      bgColor: 'bg-white/20',
      description: 'Total page visits this month'
    },
    {
      title: 'Tool Calls',
      value: formatNumber(metrics.totalToolCalls),
      icon: Zap,
      color: 'text-green-400',
      bgColor: 'bg-green-400/20',
      description: 'API calls made to MCP servers'
    },
    {
      title: 'Active Servers',
      value: metrics.activeServers.toString(),
      icon: Server,
      color: 'text-purple-400',
      bgColor: 'bg-purple-400/20',
      description: 'Currently running MCP servers'
    },
    {
      title: 'Integrations',
      value: metrics.totalIntegrations.toString(),
      icon: Globe,
      color: 'text-orange-400',
      bgColor: 'bg-orange-400/20',
      description: 'Total deployed integrations'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {metricCards.map((metric, index) => {
        return (
          <Card key={index} className="card-modern hover:border-gray-700 transition-colors relative">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400 mb-1">{metric.title}</p>
                  <p className="text-3xl font-bold text-white mb-1" style={{fontFamily:'Space Grotesk, Inter, system-ui, sans-serif'}}>{metric.value}</p>
                  <p className="text-xs text-gray-500">{metric.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default MetricsOverview;
