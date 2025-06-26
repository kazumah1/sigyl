import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDashboardData } from '@/hooks/useDashboardData';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import DashboardSidebar from '@/components/dashboard/DashboardSidebar';
import MetricsOverview from '@/components/dashboard/MetricsOverview';
import MCPServersList from '@/components/dashboard/MCPServersList';
import APIKeysManager from '@/components/dashboard/APIKeysManager';
import WorkspaceMembers from '@/components/dashboard/WorkspaceMembers';
import ActivityFeed from '@/components/dashboard/ActivityFeed';
import AnalyticsCharts from '@/components/dashboard/AnalyticsCharts';

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

  // Redirect to login if no user and no admin session
  React.useEffect(() => {
    if (!user && !adminSession) {
      navigate('/login');
    }
  }, [user, adminSession, navigate]);

  const handleTabChange = (tab: string) => {
    if (tab === 'overview') {
      setSearchParams({});
    } else {
      setSearchParams({ tab });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 animate-spin border-2 border-green-400 border-t-transparent rounded-full mx-auto"></div>
          <p className="text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-red-400">Error: {error}</p>
          <Button onClick={refetch} className="bg-green-600 hover:bg-green-700">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const currentUser = adminSession || user;
  const displayName = adminSession?.display_name || user?.user_metadata?.full_name || 'User';

  return (
    <div className="min-h-screen bg-gray-950 flex">
      <DashboardSidebar 
        collapsed={sidebarCollapsed} 
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
      />
      
      <div className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
        <DashboardHeader 
          workspaceName={workspace?.name || 'Your Workspace'} 
          userName={displayName}
        />
        
        <div className="container mx-auto px-6 py-8 mt-16">
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              Welcome back, {displayName}
            </h1>
            <p className="text-gray-400">
              Here's what's happening with your MCP integrations today.
            </p>
          </div>

          {/* Metrics Overview */}
          <MetricsOverview metrics={metrics} />

          {/* Main Dashboard Tabs */}
          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
            <TabsList className="bg-gray-900/80 border border-gray-700 p-1 backdrop-blur-sm">
              <TabsTrigger 
                value="overview" 
                className="data-[state=active]:bg-green-600 data-[state=active]:text-white text-gray-300 transition-colors"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger 
                value="servers" 
                className="data-[state=active]:bg-green-600 data-[state=active]:text-white text-gray-300 transition-colors"
              >
                MCP Servers
              </TabsTrigger>
              <TabsTrigger 
                value="analytics" 
                className="data-[state=active]:bg-green-600 data-[state=active]:text-white text-gray-300 transition-colors"
              >
                Analytics
              </TabsTrigger>
              <TabsTrigger 
                value="api-keys" 
                className="data-[state=active]:bg-green-600 data-[state=active]:text-white text-gray-300 transition-colors"
              >
                API Keys
              </TabsTrigger>
              <TabsTrigger 
                value="team" 
                className="data-[state=active]:bg-green-600 data-[state=active]:text-white text-gray-300 transition-colors"
              >
                Team
              </TabsTrigger>
              <TabsTrigger 
                value="settings" 
                className="data-[state=active]:bg-green-600 data-[state=active]:text-white text-gray-300 transition-colors"
              >
                Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <MCPServersList servers={mcpServers} />
                <ActivityFeed />
              </div>
            </TabsContent>

            <TabsContent value="servers" className="space-y-6">
              <MCPServersList servers={mcpServers} detailed />
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              <AnalyticsCharts 
                visitData={analyticsData.visitData}
                toolUsageData={analyticsData.toolUsageData}
                serverStatusData={analyticsData.serverStatusData}
              />
            </TabsContent>

            <TabsContent value="api-keys" className="space-y-6">
              <APIKeysManager workspaceId={workspace?.id || ''} />
            </TabsContent>

            <TabsContent value="team" className="space-y-6">
              <WorkspaceMembers workspaceId={workspace?.id || ''} />
            </TabsContent>

            <TabsContent value="settings" className="space-y-6">
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
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-300">Workspace Name</label>
                      <p className="text-white mt-1">{workspace?.name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-300">Workspace Slug</label>
                      <p className="text-white mt-1">{workspace?.slug}</p>
                    </div>
                    <Button className="bg-gray-700 hover:bg-gray-600 text-white">
                      Update Settings
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
