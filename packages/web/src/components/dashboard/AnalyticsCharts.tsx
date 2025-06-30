import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Activity, Server, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface AnalyticsChartsProps {
  visitData: Array<{ date: string; visits: number; toolCalls: number }>;
  toolUsageData: Array<{ name: string; calls: number; color: string }>;
  serverStatusData: Array<{ status: string; count: number }>;
}

const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({
  visitData,
  toolUsageData,
  serverStatusData
}) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);

  const chartConfig = {
    visits: {
      label: "Visits",
      color: "#22c55e",
    },
    toolCalls: {
      label: "Tool Calls",
      color: "#ffffff",
    },
  };

  useEffect(() => {
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
    loadProfile();
  }, [user]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Visits and Tool Calls Over Time */}
      <Card className="card-modern col-span-1 lg:col-span-2 overflow-hidden relative">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2" style={{fontFamily:'Space Grotesk, Inter, system-ui, sans-serif'}}>
            <TrendingUp className="w-5 h-5 text-green-400" />
            Usage Analytics
          </CardTitle>
          <CardDescription className="text-gray-400">
            Visits and tool calls over the last 30 days
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-72 md:h-80 overflow-hidden relative p-2 md:p-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={visitData} margin={{ top: 16, right: 24, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="date" 
                  stroke="#9ca3af"
                  fontSize={12}
                />
                <YAxis stroke="#9ca3af" fontSize={12} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line 
                  type="monotone" 
                  dataKey="visits" 
                  stroke="#22c55e" 
                  strokeWidth={2}
                  dot={{ fill: '#22c55e', strokeWidth: 2, r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="toolCalls" 
                  stroke="#ffffff" 
                  strokeWidth={2}
                  dot={{ fill: '#ffffff', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Tool Usage Distribution */}
      <Card className="card-modern overflow-hidden relative">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2" style={{fontFamily:'Space Grotesk, Inter, system-ui, sans-serif'}}>
            <Activity className="w-5 h-5 text-white" />
            Top Tools
          </CardTitle>
          <CardDescription className="text-gray-400">
            Most frequently called tools
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-56 md:h-64 overflow-hidden relative p-2 md:p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={toolUsageData} margin={{ top: 16, right: 24, left: 0, bottom: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="name" 
                  stroke="#9ca3af"
                  fontSize={11}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis stroke="#9ca3af" fontSize={12} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="calls" fill="#ffffff" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Server Status Distribution */}
      <Card className="card-modern overflow-hidden relative">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2" style={{fontFamily:'Space Grotesk, Inter, system-ui, sans-serif'}}>
            <Server className="w-5 h-5 text-purple-400" />
            Server Status
          </CardTitle>
          <CardDescription className="text-gray-400">
            Distribution of server statuses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-56 md:h-64 overflow-hidden relative p-2 md:p-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                <Pie
                  data={serverStatusData}
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  dataKey="count"
                  nameKey="status"
                >
                  {serverStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={
                      entry.status === 'active' ? '#22c55e' :
                      entry.status === 'inactive' ? '#6b7280' : '#ef4444'
                    } />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
          <div className="mt-4 space-y-2">
            {serverStatusData.map((item) => (
              <div key={item.status} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ 
                      backgroundColor: item.status === 'active' ? '#22c55e' :
                        item.status === 'inactive' ? '#6b7280' : '#ef4444'
                    }}
                  />
                  <span className="text-gray-300 capitalize">{item.status}</span>
                </div>
                <span className="text-white font-medium">{item.count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalyticsCharts;

export default AnalyticsCharts;

          </ChartContainer>
          <div className="mt-4 space-y-2">
            {serverStatusData.map((item) => (
              <div key={item.status} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ 
                      backgroundColor: item.status === 'active' ? '#22c55e' :
                        item.status === 'inactive' ? '#6b7280' : '#ef4444'
                    }}
                  />
                  <span className="text-gray-300 capitalize">{item.status}</span>
                </div>
                <span className="text-white font-medium">{item.count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalyticsCharts;
