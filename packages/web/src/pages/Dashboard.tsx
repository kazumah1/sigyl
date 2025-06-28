import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings, Plus, TrendingUp, Activity, Server, Users, Globe, Zap } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useDashboardData } from '@/hooks/useDashboardData';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import DashboardSidebar from '@/components/dashboard/DashboardSidebar';
import MCPServersList from '@/components/dashboard/MCPServersList';
import SecretsManager from '@/components/dashboard/SecretsManager';
import AnalyticsCharts from '@/components/dashboard/AnalyticsCharts';
import MetricsOverview from '@/components/dashboard/MetricsOverview';
import PageHeader from '@/components/PageHeader';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [adminSession] = useState(() => {
    const adminData = localStorage.getItem('admin_session');
    return adminData ? JSON.parse(adminData) : null;
  });

  const { 
    workspace, 
    mcpServers, 
    metrics,
    analyticsData,
    loading, 
    error,
    refetch 
  } = useDashboardData();

  const activeTab = searchParams.get('tab') || 'overview';

  const handleTabChange = (tab: string) => {
    if (tab === 'overview') {
      setSearchParams({});
    } else {
      setSearchParams({ tab });
    }
  };

  const currentUser = adminSession || user;
  const displayName = adminSession?.display_name || user?.user_metadata?.full_name || 'User';

  // Show error state if there's an error
  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-red-400 text-lg font-medium">Failed to load dashboard data</div>
          <p className="text-gray-400 max-w-md">{error}</p>
          <Button 
            onClick={refetch} 
            className="bg-blue-600 hover:bg-blue-700 text-white border-0"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex">
      <DashboardSidebar 
        collapsed={sidebarCollapsed} 
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
      />
      
      <div className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
        <PageHeader />
        
        <div className="container mx-auto px-6 py-8 mt-16">
          {/* Dashboard Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  Welcome back, {displayName.split(' ')[0]}!
                </h1>
                <p className="text-gray-400">
                  {workspace?.name || 'Your Workspace'} • {activeTab === 'overview' ? 'Dashboard Overview' : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                </p>
              </div>
              <div className="flex gap-3">
                <Button 
                  onClick={() => navigate('/deploy')}
                  className="bg-blue-600 hover:bg-blue-700 text-white border-0 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Deploy New Server
                </Button>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="mb-8">
            <div className="flex space-x-1 bg-gray-900/50 p-1 rounded-lg border border-gray-800">
              {[
                { id: 'overview', label: 'Overview', icon: TrendingUp },
                { id: 'servers', label: 'Servers', icon: Server },
                { id: 'analytics', label: 'Analytics', icon: Activity },
                { id: 'secrets', label: 'Secrets', icon: Settings },
                { id: 'settings', label: 'Settings', icon: Settings }
              ].map((tab) => {
                const IconComponent = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
                    }`}
                  >
                    <IconComponent className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main Dashboard Content */}
          {loading ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-32 bg-gray-800/50 rounded-lg animate-pulse"></div>
                ))}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {[1, 2].map((i) => (
                  <div key={i} className="h-80 bg-gray-800/50 rounded-lg animate-pulse"></div>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-8">
                  {/* Metrics Overview */}
                  <MetricsOverview metrics={metrics} />
                  
                  {/* Quick Actions */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Card className="bg-gray-900/50 border-gray-800 hover:border-gray-700 transition-colors cursor-pointer group" onClick={() => navigate('/deploy')}>
                      <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-blue-600/20 rounded-lg group-hover:bg-blue-600/30 transition-colors">
                            <Plus className="w-6 h-6 text-blue-400" />
                          </div>
                          <div>
                            <h3 className="text-white font-semibold">Deploy New Server</h3>
                            <p className="text-gray-400 text-sm">Create and deploy a new MCP server</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-gray-900/50 border-gray-800 hover:border-gray-700 transition-colors cursor-pointer group" onClick={() => handleTabChange('secrets')}>
                      <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-green-600/20 rounded-lg group-hover:bg-green-600/30 transition-colors">
                            <Settings className="w-6 h-6 text-green-400" />
                          </div>
                          <div>
                            <h3 className="text-white font-semibold">Manage Secrets</h3>
                            <p className="text-gray-400 text-sm">Configure environment variables</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-gray-900/50 border-gray-800 hover:border-gray-700 transition-colors cursor-pointer group" onClick={() => handleTabChange('analytics')}>
                      <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-purple-600/20 rounded-lg group-hover:bg-purple-600/30 transition-colors">
                            <Activity className="w-6 h-6 text-purple-400" />
                          </div>
                          <div>
                            <h3 className="text-white font-semibold">View Analytics</h3>
                            <p className="text-gray-400 text-sm">Monitor usage and performance</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Recent Activity */}
                  <Card className="bg-gray-900/50 border-gray-800">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <Activity className="w-5 h-5 text-blue-400" />
                        Recent Activity
                      </CardTitle>
                      <CardDescription className="text-gray-400">
                        Latest deployments and server updates
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {mcpServers.slice(0, 3).map((server) => (
                          <div key={server.id} className="flex items-center justify-between p-4 bg-gray-800/30 rounded-lg">
                            <div className="flex items-center gap-4">
                              <div className={`w-3 h-3 rounded-full ${
                                server.status === 'active' ? 'bg-green-400' : 
                                server.deployment_status === 'deploying' ? 'bg-yellow-400' : 'bg-red-400'
                              }`} />
                              <div>
                                <h4 className="text-white font-medium">{server.name}</h4>
                                <p className="text-gray-400 text-sm">{server.description}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-gray-400 text-sm">
                                {new Date(server.created_at).toLocaleDateString()}
                              </p>
                              <p className="text-xs text-gray-500">
                                {server.deployment_status === 'deploying' ? 'Deploying...' : 
                                 server.status === 'active' ? 'Active' : 'Inactive'}
                              </p>
                            </div>
                          </div>
                        ))}
                        {mcpServers.length === 0 && (
                          <div className="text-center py-8 text-gray-400">
                            <Server className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>No servers deployed yet</p>
                            <Button 
                              onClick={() => navigate('/deploy')}
                              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white border-0"
                            >
                              Deploy Your First Server
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Servers Tab */}
              {activeTab === 'servers' && (
                <MCPServersList servers={mcpServers} detailed />
              )}

              {/* Analytics Tab */}
              {activeTab === 'analytics' && (
                <AnalyticsCharts 
                  visitData={analyticsData.visitData}
                  toolUsageData={analyticsData.toolUsageData}
                  serverStatusData={analyticsData.serverStatusData}
                />
              )}

              {/* Secrets Tab */}
              {activeTab === 'secrets' && (
                <SecretsManager workspaceId={workspace?.id || ''} />
              )}

              {/* Settings Tab */}
              {activeTab === 'settings' && (
                <Card className="bg-gray-900/50 border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Settings className="w-5 h-5" />
                      Workspace Settings
                    </CardTitle>
                    <CardDescription className="text-gray-400">
                      Manage your workspace configuration and preferences
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="text-sm font-medium text-gray-300">Workspace Name</label>
                          <p className="text-white mt-1 text-lg">{workspace?.name || 'Loading...'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-300">Workspace Slug</label>
                          <p className="text-white mt-1 text-lg font-mono">{workspace?.slug || 'Loading...'}</p>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-300">Description</label>
                        <p className="text-gray-400 mt-1">{workspace?.description || 'No description provided'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-300">Created</label>
                        <p className="text-gray-400 mt-1">
                          {workspace?.created_at ? new Date(workspace.created_at).toLocaleDateString() : 'Unknown'}
                        </p>
                      </div>
                      <Button className="bg-blue-600 hover:bg-blue-700 text-white border-0">
                        Update Settings
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
