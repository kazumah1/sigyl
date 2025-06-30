import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, GitBranch, Key, Users, Server, AlertCircle } from 'lucide-react';

interface ActivityItem {
  id: string;
  type: 'deployment' | 'api_key' | 'member' | 'server' | 'error';
  message: string;
  timestamp: string;
  details?: string;
}

const ActivityFeed: React.FC = () => {
  const activities: ActivityItem[] = [
    {
      id: '1',
      type: 'deployment',
      message: 'E-commerce API Server deployed successfully',
      timestamp: '2024-01-20T15:30:00Z',
      details: 'Version 1.2.3 deployed to production'
    },
    {
      id: '2',
      type: 'api_key',
      message: 'New API key created',
      timestamp: '2024-01-20T14:15:00Z',
      details: 'Production API Key'
    },
    {
      id: '3',
      type: 'member',
      message: 'Sarah Connor joined the workspace',
      timestamp: '2024-01-20T10:00:00Z'
    },
    {
      id: '4',
      type: 'server',
      message: 'Analytics Connector started deployment',
      timestamp: '2024-01-20T09:15:00Z'
    },
    {
      id: '5',
      type: 'error',
      message: 'CRM Integration Hub experienced an error',
      timestamp: '2024-01-19T16:45:00Z',
      details: 'Connection timeout - automatically retrying'
    }
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'deployment':
        return <GitBranch className="w-4 h-4 text-green-400" />;
      case 'api_key':
        return <Key className="w-4 h-4 text-white" />;
      case 'member':
        return <Users className="w-4 h-4 text-purple-400" />;
      case 'server':
        return <Server className="w-4 h-4 text-yellow-400" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Activity className="w-4 h-4 text-gray-400" />;
    }
  };

  const getActivityBadge = (type: string) => {
    const colors = {
      deployment: 'bg-green-400/20 text-green-400',
      api_key: 'bg-white/20 text-white',
      member: 'bg-purple-400/20 text-purple-400',
      server: 'bg-yellow-400/20 text-yellow-400',
      error: 'bg-red-400/20 text-red-400'
    };
    
    return (
      <Badge className={colors[type as keyof typeof colors] || 'bg-gray-400/20 text-gray-400'}>
        {type.replace('_', ' ')}
      </Badge>
    );
  };

  return (
    <Card className="card-modern">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2" style={{fontFamily:'Space Grotesk, Inter, system-ui, sans-serif'}}>
          <Activity className="w-5 h-5" />
          Recent Activity
        </CardTitle>
        <CardDescription className="text-gray-400">
          Latest events and updates in your workspace
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start space-x-4 p-3 bg-gray-800/30 rounded-lg">
              <div className="flex-shrink-0 mt-1">
                {getActivityIcon(activity.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-white text-sm font-medium">{activity.message}</p>
                  {getActivityBadge(activity.type)}
                </div>
                {activity.details && (
                  <p className="text-gray-400 text-xs mb-2">{activity.details}</p>
                )}
                <p className="text-gray-500 text-xs">
                  {new Date(activity.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ActivityFeed;
