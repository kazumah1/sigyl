import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings, Plus, TrendingUp, Activity, Server, Users, Globe, Zap, Lock, Github, AlertTriangle, Phone, MessageSquare, Video, Plug, Wrench, Cloud, Bug, Lightbulb, Shield, Database, Network, Cpu, HardDrive, Monitor, BarChart3, GitBranch, Key, Eye, EyeOff, RefreshCw, Play, Pause, StopCircle, Settings2, Download, Upload, Code, Terminal, GitPullRequest, GitCommit, GitMerge, GitBranch as GitBranchIcon, GitPullRequest as GitPullRequestIcon, GitCommit as GitCommitIcon, GitMerge as GitMergeIcon } from 'lucide-react';
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
import { toast } from 'sonner';
import { getGitHubAppInstallUrl } from '@/lib/githubApp';

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
    mcpServers, 
    metrics,
    loading, 
    error,
    refetch,
    analyticsData
  } = useDashboardData();

  // Get active tab from URL params
  const activeTab = searchParams.get('tab') || 'overview';

  const handleTabChange = (tab: string) => {
    if (tab === 'overview') {
      setSearchParams({});
    } else {
      setSearchParams({ tab });
    }
  };

  const currentUser = adminSession || user;
  const displayName = adminSession?.display_name || 
                     user?.user_metadata?.full_name || 
                     user?.user_metadata?.user_name || 
                     user?.user_metadata?.preferred_username ||
                     user?.email?.split('@')[0] ||
                     'User';
  const currentUserName = displayName;

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-red-400 text-lg font-medium">Failed to load dashboard data</div>
          <p className="text-gray-400 max-w-md">{error}</p>
          <Button 
            onClick={refetch} 
            className="btn-modern"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const handleDeleteAccount = () => {
    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      // TODO: Call delete account API
      alert('Account deletion not implemented.');
    }
  };

  return (
    <div className="min-h-screen bg-black flex">
      <DashboardSidebar 
        collapsed={sidebarCollapsed} 
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
      />
      
      <div className="flex-1 transition-all duration-300 ml-0 pl-16">
        <PageHeader />
        
        <div className="container mx-auto px-6 py-8 mt-16">
          {/* Dashboard Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="hero-heading text-3xl font-bold text-white mb-2" style={{fontFamily:'Space Grotesk, Inter, system-ui, sans-serif'}}>
                  Welcome back, {displayName.split(' ')[0]}!
                </h1>
                <p className="text-gray-400">
                  {activeTab === 'overview' ? 'Dashboard Overview' : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                </p>
              </div>
              <div className="flex gap-3">
                <Button 
                  onClick={() => navigate('/deploy')}
                  className="btn-modern hover:bg-neutral-900 hover:text-white flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Deploy New Server
                </Button>
              </div>
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
                  {/* <MetricsOverview metrics={metrics} /> */}
                  
                  {/* Quick Actions */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Card className="card-modern cursor-pointer group" onClick={() => navigate('/deploy')}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-white/20 rounded-lg group-hover:bg-white/30 transition-colors">
                            <Plus className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="text-white font-semibold">Deploy New Server</h3>
                            <p className="text-gray-400 text-sm">Create and deploy a new MCP server</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="card-modern cursor-pointer group" onClick={() => handleTabChange('secrets')}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-green-600/20 rounded-lg group-hover:bg-green-600/30 transition-colors">
                            <Lock className="w-6 h-6 text-green-400" />
                          </div>
                          <div>
                            <h3 className="text-white font-semibold">Manage Secrets</h3>
                            <p className="text-gray-400 text-sm">Configure environment variables</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Recent Activity */}
                  <Card className="card-modern">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <Activity className="w-5 h-5 text-white" />
                        Recent Activity
                      </CardTitle>
                      <CardDescription className="text-gray-400">
                        Latest deployments and server updates
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {mcpServers.slice(0, 3).map((server) => (
                          <div key={server.id} className="flex items-center justify-between gap-5 p-4 bg-white/10 rounded-lg">
                            <div className="flex items-center gap-4">
                              <div className={`w-3 h-3 rounded-full ${
                                server.deployment_status === 'deploying' ? 'bg-yellow-400' :
                                server.ready === false ? 'bg-red-400' :
                                server.status === 'active' && server.ready !== false ? 'bg-green-400' : 'bg-gray-400'
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
                                 server.ready === false ? 'Error' :
                                 server.status === 'active' && server.ready !== false ? 'Active' : 'Inactive'}
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
                              className="mt-4 btn-modern hover:bg-neutral-900 hover:text-white"
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
                <MCPServersList servers={mcpServers} loading={loading} refetch={refetch} />
              )}

              {/* Secrets Tab */}
          {activeTab === 'secrets' && (
                <SecretsManager workspaceId={'default'} />
          )}

              {/* Settings Tab */}
          {activeTab === 'settings' && (
                <Card className="card-modern max-w-xl mx-auto bg-black/80 border border-white/10 shadow-xl backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2" style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}>
                      <Settings className="w-5 h-5 text-white" />
                  Workspace Settings
                </CardTitle>
                <CardDescription className="text-gray-300" style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}>
                      Manage your workspace settings and preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <div className="text-white font-semibold mb-1" style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}>Workspace Name</div>
                    <div className="flex gap-3 items-center">
                      <input
                        type="text"
                        value={'Default Workspace'}
                        disabled
                        className="text-white bg-black/70 rounded-xl px-4 py-3 font-semibold text-lg shadow-inner border border-white/10 focus:outline-none focus:ring-2 focus:ring-white/30 transition-all w-full opacity-60 cursor-not-allowed"
                        style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif', letterSpacing: '-0.01em' }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="text-white font-semibold mb-1" style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}>Owner</div>
                    <div className="flex flex-col gap-1">
                      <input
                        type="text"
                        value={currentUserName}
                        disabled
                        className="text-white bg-black/70 rounded-xl px-4 py-3 font-semibold text-lg shadow-inner border border-white/10 w-full opacity-60 cursor-not-allowed"
                        style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif', letterSpacing: '-0.01em' }}
                      />
                      <span className="text-gray-400 text-sm" style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}>Signed in as <span className="text-white font-semibold">{currentUserName}</span></span>
                    </div>
                  </div>
                  <Button variant="destructive" onClick={handleDeleteAccount} className="mt-6 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl px-6 py-3 shadow-lg transition-all" style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}>Delete Account</Button>
                </div>
              </CardContent>
                </Card>
              )}

              {/* Analytics Tab */}
              {activeTab === 'analytics' && (
                <div className="space-y-8 relative">
                  {/* Blurred Analytics Content */}
                  <div className="blur-sm pointer-events-none opacity-50">
                    <Card className="card-modern">
                      <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                          <Activity className="w-5 h-5 text-white" />
                          Usage Analytics
                        </CardTitle>
                        <CardDescription className="text-gray-400">
                          Deep dive into your workspace's usage, performance, and trends
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <AnalyticsCharts 
                          visitData={analyticsData?.visitData || []}
                          toolUsageData={analyticsData?.toolUsageData || []}
                          serverStatusData={analyticsData?.serverStatusData || []}
                        />
                      </CardContent>
                    </Card>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                      <Card className="card-modern">
                        <CardHeader>
                          <CardTitle className="text-white">API Usage</CardTitle>
                          <CardDescription className="text-gray-400">Track API call volume and limits</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold text-white mb-2">{metrics?.totalToolCalls?.toLocaleString() || '0'}</div>
                          <div className="text-gray-400">API calls this month</div>
                        </CardContent>
                      </Card>
                      <Card className="card-modern">
                        <CardHeader>
                          <CardTitle className="text-white">Active Users</CardTitle>
                          <CardDescription className="text-gray-400">Monitor user engagement</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold text-green-400 mb-2">{metrics?.activeUsers?.toLocaleString() || '0'}</div>
                          <div className="text-gray-400">Active users this month</div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  {/* Overlay with Unlock Button */}
                  <div className="absolute inset-0 flex items-center justify-center z-10">
                    <div className="text-center bg-black/90 backdrop-blur-sm rounded-2xl p-12 border border-gray-800 shadow-2xl">
                      <div className="mb-6">
                        <Activity className="w-16 h-16 text-white mx-auto mb-4" />
                        <h3 className="text-2xl font-bold text-white mb-2" style={{fontFamily:'Space Grotesk, Inter, system-ui, sans-serif'}}>Advanced Analytics</h3>
                        <p className="text-gray-400 text-lg max-w-md">
                          Unlock detailed analytics, custom reports, and advanced insights with Enterprise
                        </p>
                      </div>
                      <Button 
                        className="btn-modern font-semibold px-8 py-4 rounded-lg text-lg transition-colors shadow-lg"
  g                        onClick={() => navigate('/contact')}
                      >
                        Coming Soon
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Private MCPs Tab */}
              {activeTab === 'private-mcps' && (
                <div className="space-y-8 relative">
                  {/* Blurred Private MCPs Content */}
                  <div className="blur-sm pointer-events-none opacity-50">
                    {/* Header Section */}
                    <div className="text-center mb-8">
                      <h2 className="hero-heading text-3xl font-bold text-white mb-4" style={{fontFamily:'Space Grotesk, Inter, system-ui, sans-serif'}}>Private MCPs</h2>
                      <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                        Deploy and manage private MCP servers within your organization's infrastructure
                      </p>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <Card className="card-modern">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-gray-400 text-sm">Active Private MCPs</p>
                              <p className="text-2xl font-bold text-white">12</p>
                            </div>
                            <div className="p-3 bg-green-600/20 rounded-lg">
                              <Server className="w-6 h-6 text-green-400" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="card-modern">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-gray-400 text-sm">Total Deployments</p>
                              <p className="text-2xl font-bold text-white">47</p>
                            </div>
                            <div className="p-3 bg-white/20 rounded-lg">
                              <Cloud className="w-6 h-6 text-white" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="card-modern">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-gray-400 text-sm">API Calls Today</p>
                              <p className="text-2xl font-bold text-white">2.4K</p>
                            </div>
                            <div className="p-3 bg-purple-600/20 rounded-lg">
                              <BarChart3 className="w-6 h-6 text-purple-400" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="card-modern">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-gray-400 text-sm">Uptime</p>
                              <p className="text-2xl font-bold text-white">99.9%</p>
                            </div>
                            <div className="p-3 bg-yellow-600/20 rounded-lg">
                              <Monitor className="w-6 h-6 text-yellow-400" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <Button className="btn-modern flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        Deploy New Private MCP
                      </Button>
                      <Button variant="outline" className="border-gray-600 text-white hover:bg-gray-800 flex items-center gap-2">
                        <GitBranch className="w-4 h-4" />
                        Import from Git
                      </Button>
                      <Button variant="outline" className="border-gray-600 text-white hover:bg-gray-800 flex items-center gap-2">
                        <Upload className="w-4 h-4" />
                        Upload Package
                      </Button>
                      <Button variant="outline" className="border-gray-600 text-white hover:bg-gray-800 flex items-center gap-2">
                        <Settings2 className="w-4 h-4" />
                        Configure Network
                      </Button>
                    </div>

                    {/* Feature Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <Card className="card-modern hover:border-white/30 transition-all duration-300 hover:shadow-lg hover:shadow-white/10 group">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            <div className="p-3 bg-white/20 rounded-lg group-hover:bg-white/30 transition-colors">
                              <Shield className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1">
                              <h3 className="text-white font-semibold text-lg mb-2">Private Network Isolation</h3>
                              <p className="text-gray-400 text-sm leading-relaxed">Deploy MCPs in isolated private networks with custom security policies</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="card-modern hover:border-white/30 transition-all duration-300 hover:shadow-lg hover:shadow-white/10 group">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            <div className="p-3 bg-white/20 rounded-lg group-hover:bg-white/30 transition-colors">
                              <Database className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1">
                              <h3 className="text-white font-semibold text-lg mb-2">Internal Data Sources</h3>
                              <p className="text-gray-400 text-sm leading-relaxed">Connect to internal databases, APIs, and enterprise systems</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="card-modern hover:border-white/30 transition-all duration-300 hover:shadow-lg hover:shadow-white/10 group">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            <div className="p-3 bg-white/20 rounded-lg group-hover:bg-white/30 transition-colors">
                              <Network className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1">
                              <h3 className="text-white font-semibold text-lg mb-2">VPC Integration</h3>
                              <p className="text-gray-400 text-sm leading-relaxed">Deploy within your existing VPC with custom routing and security groups</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="card-modern hover:border-white/30 transition-all duration-300 hover:shadow-lg hover:shadow-white/10 group">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            <div className="p-3 bg-yellow-600/20 rounded-lg group-hover:bg-yellow-600/30 transition-colors">
                              <Cpu className="w-6 h-6 text-yellow-400" />
                            </div>
                            <div className="flex-1">
                              <h3 className="text-white font-semibold text-lg mb-2">Resource Management</h3>
                              <p className="text-gray-400 text-sm leading-relaxed">Monitor and optimize CPU, memory, and storage usage</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="card-modern hover:border-white/30 transition-all duration-300 hover:shadow-lg hover:shadow-white/10 group">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            <div className="p-3 bg-red-600/20 rounded-lg group-hover:bg-red-600/30 transition-colors">
                              <Key className="w-6 h-6 text-red-400" />
                            </div>
                            <div className="flex-1">
                              <h3 className="text-white font-semibold text-lg mb-2">IAM Integration</h3>
                              <p className="text-gray-400 text-sm leading-relaxed">Role-based access control with your existing identity providers</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="card-modern hover:border-white/30 transition-all duration-300 hover:shadow-lg hover:shadow-white/10 group">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            <div className="p-3 bg-white/20 rounded-lg group-hover:bg-white/30 transition-colors">
                              <HardDrive className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1">
                              <h3 className="text-white font-semibold text-lg mb-2">Persistent Storage</h3>
                              <p className="text-gray-400 text-sm leading-relaxed">Attach persistent volumes for data storage and caching</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Analytics Section */}
                    <Card className="card-modern">
                      <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                          <BarChart3 className="w-5 h-5 text-white" />
                          Private MCP Analytics
                        </CardTitle>
                        <CardDescription className="text-gray-400">
                          Performance metrics and usage analytics for your private MCPs
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="text-center">
                            <div className="text-3xl font-bold text-white mb-2">1.2ms</div>
                            <div className="text-gray-400 text-sm">Avg Response Time</div>
                          </div>
                          <div className="text-center">
                            <div className="text-3xl font-bold text-green-400 mb-2">99.9%</div>
                            <div className="text-gray-400 text-sm">Success Rate</div>
                          </div>
                          <div className="text-center">
                            <div className="text-3xl font-bold text-white mb-2">847</div>
                            <div className="text-gray-400 text-sm">Requests/min</div>
                          </div>
                          <div className="text-center">
                            <div className="text-3xl font-bold text-yellow-400 mb-2">2.1GB</div>
                            <div className="text-gray-400 text-sm">Memory Usage</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Recent Deployments */}
                    <Card className="card-modern">
                      <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                          <GitCommit className="w-5 h-5 text-green-400" />
                          Recent Deployments
                        </CardTitle>
                        <CardDescription className="text-gray-400">
                          Latest private MCP deployments and their status
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {[
                            { name: 'internal-database-mcp', status: 'active', time: '2 hours ago', commit: 'a1b2c3d' },
                            { name: 'enterprise-api-mcp', status: 'deploying', time: '4 hours ago', commit: 'e4f5g6h' },
                            { name: 'analytics-engine-mcp', status: 'active', time: '1 day ago', commit: 'i7j8k9l' },
                          ].map((deployment, index) => (
                            <div key={index} className="flex items-center justify-between p-4 bg-gray-800/30 rounded-lg">
                              <div className="flex items-center gap-4">
                                <div className={`w-3 h-3 rounded-full ${
                                  deployment.status === 'active' ? 'bg-green-400' : 'bg-yellow-400'
                                }`} />
                                <div>
                                  <h4 className="text-white font-medium">{deployment.name}</h4>
                                  <p className="text-gray-400 text-sm">Commit: {deployment.commit}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-gray-400 text-sm">{deployment.time}</p>
                                <p className="text-xs text-gray-500 capitalize">{deployment.status}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Overlay with Unlock Button */}
                  <div className="absolute inset-0 flex items-center justify-center z-10">
                    <div className="text-center bg-black/90 backdrop-blur-sm rounded-2xl p-12 border border-gray-800 shadow-2xl">
                      <div className="mb-6">
                        <Shield className="w-16 h-16 text-white mx-auto mb-4" />
                        <h3 className="text-2xl font-bold text-white mb-2" style={{fontFamily:'Space Grotesk, Inter, system-ui, sans-serif'}}>Private MCPs</h3>
                        <p className="text-gray-400 text-lg max-w-md">
                          Deploy and manage private MCP servers within your organization's infrastructure with Enterprise
                        </p>
                      </div>
                      <Button 
                        className="btn-modern font-semibold px-8 py-4 rounded-lg text-lg transition-colors shadow-lg"
                        onClick={() => navigate('/contact')}
                      >
                        Coming Soon
                  </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Enterprise Support Tab */}
              {activeTab === 'enterprise-support' && (
                <div className="space-y-8">
                  <div className="text-center mb-8">
                    <h2 className="hero-heading text-3xl font-bold text-white mb-4" style={{fontFamily:'Space Grotesk, Inter, system-ui, sans-serif'}}>Enterprise Support</h2>
                    <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                      Unlock premium support and productivity features designed for enterprise teams
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Card className="card-modern hover:border-white/30 transition-all duration-300 hover:shadow-lg hover:shadow-white/10 group">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className="p-3 bg-white/20 rounded-lg group-hover:bg-white/30 transition-colors">
                            <Phone className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-white font-semibold text-lg mb-2">24/7 Call Support</h3>
                            <p className="text-gray-400 text-sm leading-relaxed">Get help anytime, anywhere with our round-the-clock support team</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="card-modern hover:border-white/30 transition-all duration-300 hover:shadow-lg hover:shadow-white/10 group">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className="p-3 bg-white/20 rounded-lg group-hover:bg-white/30 transition-colors">
                            <MessageSquare className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-white font-semibold text-lg mb-2">Dedicated Slack Channel</h3>
                            <p className="text-gray-400 text-sm leading-relaxed">Instant access to our support engineers through your preferred platform</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="card-modern hover:border-white/30 transition-all duration-300 hover:shadow-lg hover:shadow-white/10 group">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className="p-3 bg-white/20 rounded-lg group-hover:bg-white/30 transition-colors">
                            <MessageSquare className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-white font-semibold text-lg mb-2">Dedicated Discord Channel</h3>
                            <p className="text-gray-400 text-sm leading-relaxed">Real-time chat with our team for quick questions and updates</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="card-modern hover:border-white/30 transition-all duration-300 hover:shadow-lg hover:shadow-white/10 group">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className="p-3 bg-white/20 rounded-lg group-hover:bg-white/30 transition-colors">
                            <Video className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-white font-semibold text-lg mb-2">Zoom Meeting in 15 Minutes</h3>
                            <p className="text-gray-400 text-sm leading-relaxed">Book a call with an expert and get solutions fast</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="card-modern hover:border-white/30 transition-all duration-300 hover:shadow-lg hover:shadow-white/10 group">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className="p-3 bg-white/20 rounded-lg group-hover:bg-white/30 transition-colors">
                            <Plug className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-white font-semibold text-lg mb-2">Easy Plug & Play Tools</h3>
                            <p className="text-gray-400 text-sm leading-relaxed">Integrate new features and tools in seconds, not hours</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="card-modern hover:border-white/30 transition-all duration-300 hover:shadow-lg hover:shadow-white/10 group">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className="p-3 bg-white/20 rounded-lg group-hover:bg-white/30 transition-colors">
                            <Wrench className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-white font-semibold text-lg mb-2">Custom Tooling</h3>
                            <p className="text-gray-400 text-sm leading-relaxed">Request custom features and integrations tailored to your needs</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="card-modern hover:border-white/30 transition-all duration-300 hover:shadow-lg hover:shadow-white/10 group">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className="p-3 bg-white/20 rounded-lg group-hover:bg-white/30 transition-colors">
                            <Cloud className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-white font-semibold text-lg mb-2">Cloud Support</h3>
                            <p className="text-gray-400 text-sm leading-relaxed">Managed deployments and scaling with expert oversight</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="card-modern hover:border-white/30 transition-all duration-300 hover:shadow-lg hover:shadow-white/10 group">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className="p-3 bg-white/20 rounded-lg group-hover:bg-white/30 transition-colors">
                            <Bug className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-white font-semibold text-lg mb-2">Debug & Troubleshoot</h3>
                            <p className="text-gray-400 text-sm leading-relaxed">Rapid issue resolution with our debugging expertise</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="card-modern hover:border-white/30 transition-all duration-300 hover:shadow-lg hover:shadow-white/10 group">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className="p-3 bg-white/20 rounded-lg group-hover:bg-white/30 transition-colors">
                            <Lightbulb className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-white font-semibold text-lg mb-2">Suggest MCP Improvements</h3>
                            <p className="text-gray-400 text-sm leading-relaxed">Influence our roadmap and shape the future of MCP</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="text-center mt-12">
                    <Button 
                      className="btn-modern font-semibold px-8 py-3 rounded-lg text-lg transition-colors"
                      onClick={() => navigate('/contact')}
                    >
                      Contact Enterprise Support
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
