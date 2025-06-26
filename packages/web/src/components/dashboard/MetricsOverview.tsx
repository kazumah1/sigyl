
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Users, Server, TrendingUp } from 'lucide-react';

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
  const cards = [
    {
      title: 'Total Visits',
      value: metrics.totalVisits.toLocaleString(),
      icon: Activity,
      color: 'text-green-400',
      change: '+12%'
    },
    {
      title: 'Tool Calls',
      value: metrics.totalToolCalls.toLocaleString(),
      icon: TrendingUp,
      color: 'text-blue-400',
      change: '+8%'
    },
    {
      title: 'Active Servers',
      value: metrics.activeServers.toString(),
      icon: Server,
      color: 'text-purple-400',
      change: '+2'
    },
    {
      title: 'Integrations',
      value: metrics.totalIntegrations.toString(),
      icon: Users,
      color: 'text-yellow-400',
      change: '+5'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {cards.map((card, index) => {
        const IconComponent = card.icon;
        return (
          <Card key={index} className="bg-gray-900/50 border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">
                {card.title}
              </CardTitle>
              <IconComponent className={`w-4 h-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{card.value}</div>
              <p className="text-xs text-gray-400 mt-1">
                <span className={card.color}>{card.change}</span> from last month
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default MetricsOverview;
