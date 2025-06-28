import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Star, 
  Download, 
  Calendar, 
  User, 
  Package, 
  ExternalLink, 
  ArrowLeft,
  Github,
  Globe,
  Settings,
  Code,
  BookOpen,
  Shield,
  Tag,
  Users,
  Activity,
  Terminal,
  Copy,
  Play,
  Pause,
  Trash2,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  Zap,
  Database,
  Network,
  Cpu,
  HardDrive
} from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface MCPPackage {
  id: string;
  name: string;
  description: string;
  version: string;
  author: {
    username: string;
    id: string;
  };
  rating: number;
  downloads_count: number;
  last_updated: string;
  verified: boolean;
  source_api_url?: string;
  tools?: any[];
  screenshots?: string[];
  deployment_status?: 'deploying' | 'running' | 'stopped' | 'error';
  service_url?: string;
  logs?: string[];
  metrics?: {
    cpu_usage: number;
    memory_usage: number;
    requests_per_minute: number;
    uptime: string;
  };
}

const MCPPackagePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  
  const [pkg, setPackage] = useState<MCPPackage | null>(null);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [deploymentLogs, setDeploymentLogs] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Check if this is a new deployment (from deploy flow)
  const isNewDeployment = searchParams.get('new') === 'true';

  useEffect(() => {
    if (id) {
      // Simulate loading package data
      // In real implementation, this would fetch from your API
      setTimeout(() => {
        const mockPackage: MCPPackage = {
          id,
          name: 'Example MCP Server',
          description: 'A powerful MCP server that provides advanced functionality for AI assistants.',
          version: '1.0.0',
          author: {
            username: user?.email?.split('@')[0] || 'Unknown',
            id: user?.id || 'unknown'
          },
          rating: 4.5,
          downloads_count: 1234,
          last_updated: new Date().toISOString(),
          verified: true,
          source_api_url: 'https://github.com/example/mcp-server',
          tools: [
            { name: 'file_operations', description: 'Read, write, and manage files on the system' },
            { name: 'web_search', description: 'Search the web for current information' },
            { name: 'database_query', description: 'Query databases and retrieve data' }
          ],
          deployment_status: isNewDeployment ? 'deploying' : 'running',
          service_url: isNewDeployment ? undefined : 'https://example-mcp-server-abc123.run.app',
          logs: isNewDeployment ? [
            '🚀 Starting deployment...',
            '📦 Building container image...',
            '🔒 Security validation passed',
            '☁️ Deploying to Google Cloud Run...',
            '✅ Service deployed successfully!',
            '🌐 Service URL: https://example-mcp-server-abc123.run.app'
          ] : [
            '✅ Service is running normally',
            '📊 15 requests processed in the last minute',
            '💾 Memory usage: 45%',
            '⚡ CPU usage: 12%'
          ],
          metrics: {
            cpu_usage: 12,
            memory_usage: 45,
            requests_per_minute: 15,
            uptime: '2 days, 14 hours'
          }
        };
        
        setPackage(mockPackage);
        setIsOwner(mockPackage.author.id === user?.id);
        setDeploymentLogs(mockPackage.logs || []);
        setLoading(false);
      }, 1000);
    }
  }, [id, user, isNewDeployment]);

  const handleRate = async (rating: number) => {
    if (!pkg || !user) {
      toast.error('Please log in to rate packages');
      return;
    }

    try {
      // In real implementation, this would call your API
      setUserRating(rating);
      toast.success(`Rated ${pkg.name} ${rating} stars`);
    } catch (error) {
      toast.error('Failed to rate package');
    }
  };

  const handleDownload = async () => {
    if (!pkg) return;

    setIsDownloading(true);
    try {
      // In real implementation, this would call your API
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success(`${pkg.name} downloaded successfully!`);
    } catch (error) {
      toast.error('Failed to download package');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopyServiceUrl = () => {
    if (pkg?.service_url) {
      navigator.clipboard.writeText(pkg.service_url);
      toast.success('Service URL copied to clipboard!');
    }
  };

  const handleRefreshLogs = () => {
    setIsRefreshing(true);
    // Simulate refreshing logs
    setTimeout(() => {
      setDeploymentLogs(prev => [...prev, `🔄 Logs refreshed at ${new Date().toLocaleTimeString()}`]);
      setIsRefreshing(false);
    }, 1000);
  };

  const handleRestartService = () => {
    toast.info('Restarting service...');
    // In real implementation, this would call your API
  };

  const handleStopService = () => {
    toast.info('Stopping service...');
    // In real implementation, this would call your API
  };

  const handleDeleteService = () => {
    if (confirm('Are you sure you want to delete this MCP server? This action cannot be undone.')) {
      toast.info('Deleting service...');
      // In real implementation, this would call your API
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white">
        <PageHeader />
        <div className="container mx-auto px-6 py-8 mt-16">
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center gap-3">
              <RefreshCw className="w-6 h-6 animate-spin" />
              <span className="text-xl">Loading MCP package...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!pkg) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white">
        <PageHeader />
        <div className="container mx-auto px-6 py-8 mt-16">
          <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <div className="text-xl">MCP Package not found</div>
            <Button
              variant="outline"
              onClick={() => navigate('/marketplace')}
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Marketplace
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <PageHeader />
      
      <div className="container mx-auto px-6 py-8 mt-16">
        {/* Back Navigation */}
        <Button
          variant="outline"
          onClick={() => navigate(isOwner ? '/dashboard' : '/marketplace')}
          className="mb-6 border-gray-600 text-gray-300 hover:bg-gray-800"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to {isOwner ? 'Dashboard' : 'Marketplace'}
        </Button>

        {/* New Deployment Success Alert */}
        {isNewDeployment && pkg.deployment_status === 'running' && (
          <Alert className="mb-6 border-green-500 bg-green-500/10">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <AlertDescription className="text-green-400">
              🎉 Your MCP server has been deployed successfully! It's now running and ready to use.
            </AlertDescription>
          </Alert>
        )}

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-6 mb-6">
            <div className="p-5 bg-white/10 rounded-xl">
              <Package className="w-12 h-12 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-4xl font-bold text-white">{pkg.name}</h1>
                {pkg.verified && (
                  <Badge className="bg-green-500/20 text-green-400 flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    Verified
                  </Badge>
                )}
                {isOwner && (
                  <Badge className="bg-blue-500/20 text-blue-400 flex items-center gap-1">
                    <User className="w-3 h-3" />
                    Owner
                  </Badge>
                )}
                {pkg.deployment_status && (
                  <Badge className={`flex items-center gap-1 ${
                    pkg.deployment_status === 'running' ? 'bg-green-500/20 text-green-400' :
                    pkg.deployment_status === 'deploying' ? 'bg-yellow-500/20 text-yellow-400' :
                    pkg.deployment_status === 'error' ? 'bg-red-500/20 text-red-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {pkg.deployment_status === 'running' ? <CheckCircle className="w-3 h-3" /> :
                     pkg.deployment_status === 'deploying' ? <Clock className="w-3 h-3" /> :
                     pkg.deployment_status === 'error' ? <AlertCircle className="w-3 h-3" /> :
                     <Pause className="w-3 h-3" />}
                    {pkg.deployment_status.charAt(0).toUpperCase() + pkg.deployment_status.slice(1)}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-4 text-gray-400 mb-4">
                <span className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  by {pkg.author?.username || 'Unknown'}
                </span>
                <span className="flex items-center gap-1">
                  <Package className="w-4 h-4" />
                  v{pkg.version}
                </span>
                {!isOwner && (
                  <span className="flex items-center gap-1">
                    <Download className="w-4 h-4" />
                    {pkg.downloads_count.toLocaleString()} downloads
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Updated {new Date(pkg.last_updated).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Rating (only for non-owners) */}
          {!isOwner && (
            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => handleRate(star)}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(null)}
                    className="transition-colors"
                    disabled={!user}
                  >
                    <Star
                      className={`w-6 h-6 ${
                        star <= (hoveredRating || userRating || 0)
                          ? 'fill-yellow-400 text-yellow-400'
                          : star <= pkg.rating
                          ? 'fill-yellow-400/50 text-yellow-400/50'
                          : 'text-gray-600'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <span className="text-gray-400">
                {pkg.rating.toFixed(1)} average rating
                {userRating && <span className="ml-2 text-blue-400">Your rating: {userRating}</span>}
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 flex-wrap">
            {isOwner ? (
              <>
                {pkg.service_url && (
                  <Button
                    onClick={handleCopyServiceUrl}
                    variant="outline"
                    className="border-green-600 text-green-400 hover:bg-green-600/10"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Service URL
                  </Button>
                )}
                <Button
                  onClick={handleRestartService}
                  variant="outline"
                  className="border-blue-600 text-blue-400 hover:bg-blue-600/10"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Restart Service
                </Button>
                <Button
                  onClick={handleStopService}
                  variant="outline"
                  className="border-yellow-600 text-yellow-400 hover:bg-yellow-600/10"
                >
                  <Pause className="w-4 h-4 mr-2" />
                  Stop Service
                </Button>
                <Button
                  onClick={handleDeleteService}
                  variant="outline"
                  className="border-red-600 text-red-400 hover:bg-red-600/10"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Service
                </Button>
              </>
            ) : (
              <>
                <Button 
                  size="lg" 
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-8"
                >
                  {isDownloading ? 'Installing...' : 'Install & Deploy'}
                </Button>
                {pkg.source_api_url && (
                  <Button
                    onClick={() => window.open(pkg.source_api_url, '_blank')}
                    variant="outline"
                    className="border-gray-600 text-gray-300 hover:bg-gray-800"
                  >
                    <Github className="w-4 h-4 mr-2" />
                    View on GitHub
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Tabs defaultValue={isOwner ? "overview" : "overview"} className="w-full">
              <TabsList className="grid w-full grid-cols-4 bg-gray-900/50">
                <TabsTrigger value="overview" className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="tools" className="flex items-center gap-2">
                  <Code className="w-4 h-4" />
                  Tools
                </TabsTrigger>
                {isOwner ? (
                  <TabsTrigger value="logs" className="flex items-center gap-2">
                    <Terminal className="w-4 h-4" />
                    Logs
                  </TabsTrigger>
                ) : (
                  <TabsTrigger value="deployment" className="flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Deployment
                  </TabsTrigger>
                )}
                <TabsTrigger value="api" className="flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  API
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-6">
                <div className="space-y-6">
                  <Card className="bg-gray-900/50 border-gray-800">
                    <CardHeader>
                      <CardTitle className="text-white">Description</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-300 leading-relaxed">{pkg.description}</p>
                    </CardContent>
                  </Card>

                  {pkg.screenshots && pkg.screenshots.length > 0 && (
                    <Card className="bg-gray-900/50 border-gray-800">
                      <CardHeader>
                        <CardTitle className="text-white">Screenshots</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {pkg.screenshots.map((screenshot, index) => (
                            <img
                              key={index}
                              src={screenshot}
                              alt={`Screenshot ${index + 1}`}
                              className="w-full h-48 object-cover rounded-lg border border-gray-700"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="tools" className="mt-6">
                <Card className="bg-gray-900/50 border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-white">Available Tools</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {pkg.tools && pkg.tools.length > 0 ? (
                      <div className="space-y-4">
                        {pkg.tools.map((tool, index) => {
                          const toolName = typeof tool === 'string' ? tool : (tool as any)?.name || `Tool ${index + 1}`;
                          const toolDescription = typeof tool === 'string' 
                            ? 'This tool provides additional functionality for the MCP server.'
                            : (tool as any)?.description || 'Tool functionality and usage details would be displayed here.';

                          return (
                            <div key={index} className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                              <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                                <Code className="w-4 h-4" />
                                {toolName}
                              </h4>
                              <p className="text-gray-400 text-sm">
                                {toolDescription}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-400">
                        <Code className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No tools documented yet.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {isOwner ? (
                <TabsContent value="logs" className="mt-6">
                  <Card className="bg-gray-900/50 border-gray-800">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-white">Deployment Logs</CardTitle>
                        <Button
                          onClick={handleRefreshLogs}
                          disabled={isRefreshing}
                          variant="outline"
                          size="sm"
                          className="border-gray-600 text-gray-300 hover:bg-gray-800"
                        >
                          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                          Refresh
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-black rounded-lg p-4 border border-gray-700 max-h-96 overflow-y-auto">
                        {deploymentLogs.map((log, index) => (
                          <div key={index} className="text-sm font-mono text-gray-300 mb-1">
                            {log}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              ) : (
                <TabsContent value="deployment" className="mt-6">
                  <Card className="bg-gray-900/50 border-gray-800">
                    <CardHeader>
                      <CardTitle className="text-white">Deployment Guide</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        <div>
                          <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                            <Download className="w-4 h-4" />
                            Quick Install
                          </h4>
                          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                            <code className="text-green-400">npm install {pkg.name.toLowerCase().replace(/\s+/g, '-')}</code>
                          </div>
                        </div>
                        <div>
                          <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                            <Settings className="w-4 h-4" />
                            Configuration
                          </h4>
                          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                            <pre className="text-gray-300 text-sm overflow-x-auto">
{`{
  "mcpServers": {
    "${pkg.name.toLowerCase().replace(/\s+/g, '-')}": {
      "command": "node",
      "args": ["./node_modules/${pkg.name.toLowerCase().replace(/\s+/g, '-')}/dist/index.js"],
      "env": {
        // Add your environment variables here
      }
    }
  }
}`}
                            </pre>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              <TabsContent value="api" className="mt-6">
                <Card className="bg-gray-900/50 border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-white">API Reference</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-white mb-2">MCP Protocol</h4>
                        <p className="text-gray-400 text-sm mb-4">
                          This server implements the Model Context Protocol (MCP) specification.
                        </p>
                      </div>
                      {pkg.source_api_url && (
                        <div>
                          <h4 className="font-semibold text-white mb-2">Source Code</h4>
                          <Button
                            onClick={() => window.open(pkg.source_api_url, '_blank')}
                            variant="outline"
                            className="border-gray-600 text-gray-300 hover:bg-gray-800"
                          >
                            <Github className="w-4 h-4 mr-2" />
                            View on GitHub
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Service Status (Owner Only) */}
            {isOwner && pkg.metrics && (
              <Card className="bg-gray-900/50 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Service Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Status</span>
                    <Badge className={
                      pkg.deployment_status === 'running' ? 'bg-green-500/20 text-green-400' :
                      pkg.deployment_status === 'deploying' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }>
                      {pkg.deployment_status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Uptime</span>
                    <span className="text-white">{pkg.metrics.uptime}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Requests/min</span>
                    <span className="text-white">{pkg.metrics.requests_per_minute}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Performance Metrics (Owner Only) */}
            {isOwner && pkg.metrics && (
              <Card className="bg-gray-900/50 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Performance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-400 text-sm">CPU Usage</span>
                      <span className="text-white text-sm">{pkg.metrics.cpu_usage}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${pkg.metrics.cpu_usage}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-400 text-sm">Memory Usage</span>
                      <span className="text-white text-sm">{pkg.metrics.memory_usage}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${pkg.metrics.memory_usage}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Service URL (Owner Only) */}
            {isOwner && pkg.service_url && (
              <Card className="bg-gray-900/50 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    Service URL
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-800 p-3 rounded border border-gray-700">
                    <code className="text-green-400 text-sm break-all">{pkg.service_url}</code>
                  </div>
                  <Button
                    onClick={handleCopyServiceUrl}
                    variant="outline"
                    size="sm"
                    className="w-full mt-3 border-gray-600 text-gray-300 hover:bg-gray-800"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy URL
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Package Info */}
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Package Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Version</span>
                  <span className="text-white">{pkg.version}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Author</span>
                  <span className="text-white">{pkg.author?.username}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Last Updated</span>
                  <span className="text-white">{new Date(pkg.last_updated).toLocaleDateString()}</span>
                </div>
                {!isOwner && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Downloads</span>
                    <span className="text-white">{pkg.downloads_count.toLocaleString()}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MCPPackagePage; 