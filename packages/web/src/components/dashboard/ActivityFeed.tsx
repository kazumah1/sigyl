import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, GitBranch, Key, Users, Server, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/contexts/UserContext';

interface ActivityItem {
  id: string;
  type: 'deployment' | 'api_key' | 'member' | 'server' | 'error';
  message: string;
  timestamp: string;
  details?: string;
}

const ActivityFeed: React.FC = () => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const user = useUser();

  const loadProfile = async () => {
    if (!user?.id) return;
    try {
      let query = supabase.from('profiles').select('*');
      if (/^github_/.test(user.id)) {
        query = query.eq('github_id', user.id.replace('github_', ''));
      } else {
        query = query.eq('id', user.id);
      }
      const { data: profile, error } = await query.single();
      if (error) {
        console.error('Error loading profile:', error);
      } else {
        setProfile(profile);
      }
    } catch (err) {
      console.error('Error loading profile:', err);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [user]);

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
