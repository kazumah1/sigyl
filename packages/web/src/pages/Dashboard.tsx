import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams } from 'react-router-dom';
import { useDashboardData } from '@/hooks/useDashboardData';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import DashboardSidebar from '@/components/dashboard/DashboardSidebar';
import MCPServersList from '@/components/dashboard/MCPServersList';
import SecretsManager from '@/components/dashboard/SecretsManager';
import PageHeader from '@/components/PageHeader';

const Dashboard = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [adminSession] = useState(() => {
    const adminData = localStorage.getItem('admin_session');
    return adminData ? JSON.parse(adminData) : null;
  });

  const { 
    workspace, 
    mcpServers, 
    loading, 
    error,
    refetch 
  } = useDashboardData();

  const activeTab = searchParams.get('tab') || 'servers';

  const handleTabChange = (tab: string) => {
    if (tab === 'servers') {
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

  return (
    <div className="min-h-screen flex">
      <DashboardSidebar 
        collapsed={sidebarCollapsed} 
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
      />
      
      <div className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
        <PageHeader />
        
        <div className="container mx-auto px-6 py-8 mt-16">

          {/* Main Dashboard Content - Render based on activeTab */}
          {activeTab === 'servers' && (
            loading ? (
              <div className="rounded-lg p-6 animate-pulse">
                <div className="h-6 bg-gray-700 rounded w-1/3 mb-4"></div>
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-24 bg-gray-700 rounded"></div>
                  ))}
                </div>
              </div>
            ) : (
              <MCPServersList servers={mcpServers} detailed />
            )
          )}

          {activeTab === 'secrets' && (
            <SecretsManager workspaceId={workspace?.id || ''} />
          )}

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
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-300">Workspace Name</label>
                    <p className="text-white mt-1">{workspace?.name || 'Loading...'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-300">Workspace Slug</label>
                    <p className="text-white mt-1">{workspace?.slug || 'Loading...'}</p>
                  </div>
                  <Button className="bg-gray-700 hover:bg-gray-600 text-white">
                    Update Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
