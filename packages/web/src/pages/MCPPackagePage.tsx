import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  HardDrive,
  Rocket,
  Loader2
} from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { useAuth } from '@/contexts/AuthContext';
import { MarketplaceService } from '@/services/marketplaceService';
import { PackageWithDetails } from '@/types/marketplace';
import { toast } from 'sonner';

const MCPPackagePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  
  const [pkg, setPackage] = useState<PackageWithDetails | null>(null);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [deploymentLogs, setDeploymentLogs] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deploymentStatus, setDeploymentStatus] = useState<'idle' | 'deploying' | 'success' | 'failed'>('idle');
  const [deploymentProgress, setDeploymentProgress] = useState<{
    step: number;
    stepName: string;
    message: string;
    isComplete: boolean;
  }>({
    step: 0,
    stepName: '',
    message: '',
    isComplete: false
  });
  const [deploymentError, setDeploymentError] = useState<string | null>(null);

  // Check if this is a new deployment (from deploy flow)
  const isNewDeployment = searchParams.get('new') === 'true';
  const isDeploying = searchParams.get('deploying') === 'true';

  const deploymentSteps = [
    { name: 'Security Scan', description: 'Analyzing repository for security issues' },
    { name: 'Build Setup', description: 'Preparing build environment' },
    { name: 'Container Build', description: 'Building and pushing container image' },
    { name: 'Cloud Deploy', description: 'Deploying to Google Cloud Run' },
    { name: 'Service Ready', description: 'Configuring and starting service' }
  ];

  useEffect(() => {
    if (id) {
      loadPackageData();
    }
  }, [id, user]);

  const loadPackageData = async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      const packageData = await MarketplaceService.getPackageById(id);
      
      if (packageData) {
        setPackage(packageData);
        setIsOwner(packageData.author_id === user?.id);
        
        // Set deployment logs if available
        if (packageData.deployments && packageData.deployments.length > 0) {
          const activeDeployment = packageData.deployments.find(d => d.status === 'active');
          if (activeDeployment) {
            setDeploymentLogs([
              '✅ Service is running normally',
              `🌐 Service URL: ${activeDeployment.deployment_url}`,
              '📊 Monitoring deployment health...'
            ]);
          }
        }
      } else {
        // Package not found - this will trigger the "not found" UI
        setPackage(null);
      }
    } catch (error) {
      console.error('Failed to load package data:', error);
      
      // Check if it's a 404 error
      if (error instanceof Error && error.message.includes('404')) {
        // Package not found - this will trigger the "not found" UI
        setPackage(null);
      } else {
        // Other error - show toast and set package to null
        toast.error('Failed to load package data. Please try again.');
        setPackage(null);
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle deployment progress tracking
  useEffect(() => {
    if (isDeploying && isOwner) {
      setDeploymentStatus('deploying');
      
      // Simulate deployment progress
      const simulateDeployment = async () => {
        try {
          // Step 1: Security Scan
          setDeploymentProgress({
            step: 1,
            stepName: deploymentSteps[0].name,
            message: deploymentSteps[0].description,
            isComplete: false
          });
          setDeploymentLogs(prev => [...prev, '🔒 Starting security validation...']);
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Step 2: Build Setup
          setDeploymentProgress({
            step: 2,
            stepName: deploymentSteps[1].name,
            message: deploymentSteps[1].description,
            isComplete: false
          });
          setDeploymentLogs(prev => [...prev, '📦 Preparing build environment...']);
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          // Step 3: Container Build
          setDeploymentProgress({
            step: 3,
            stepName: deploymentSteps[2].name,
            message: deploymentSteps[2].description,
            isComplete: false
          });
          setDeploymentLogs(prev => [...prev, '🔨 Building and pushing container image...']);
          await new Promise(resolve => setTimeout(resolve, 5000));
          
          // Step 4: Cloud Deploy
          setDeploymentProgress({
            step: 4,
            stepName: deploymentSteps[3].name,
            message: deploymentSteps[3].description,
            isComplete: false
          });
          setDeploymentLogs(prev => [...prev, '☁️ Deploying to Google Cloud Run...']);
          await new Promise(resolve => setTimeout(resolve, 4000));
          
          // Step 5: Complete
          setDeploymentProgress({
            step: 5,
            stepName: deploymentSteps[4].name,
            message: 'Deployment completed successfully!',
            isComplete: true
          });
          setDeploymentLogs(prev => [...prev, '✅ Service deployed successfully!']);
          setDeploymentStatus('success');
          
          // Reload package data to get updated deployment info
          await loadPackageData();
          
        } catch (error) {
          setDeploymentError(error instanceof Error ? error.message : 'Deployment failed');
          setDeploymentStatus('failed');
          setDeploymentLogs(prev => [...prev, '❌ Deployment failed. Please check the logs and try again.']);
        }
      };
      
      simulateDeployment();
    }
  }, [isDeploying, isOwner, deploymentSteps, pkg]);

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
    if (pkg?.deployments && pkg.deployments.length > 0) {
      const activeDeployment = pkg.deployments.find(d => d.status === 'active');
      if (activeDeployment) {
        navigator.clipboard.writeText(activeDeployment.deployment_url);
        toast.success('Service URL copied to clipboard!');
      }
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

  const handleRetryDeployment = () => {
    setDeploymentStatus('idle');
    setDeploymentError(null);
    setDeploymentProgress({ step: 0, stepName: '', message: '', isComplete: false });
    setDeploymentLogs([]);
    // Navigate back to deploy page to retry
    navigate('/deploy');
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
          <div className="flex flex-col items-center justify-center h-64 space-y-6">
            <div className="text-center space-y-4">
              <div className="text-2xl font-bold text-white">MCP Package not found</div>
              <p className="text-gray-400 max-w-md">
                The package you're looking for doesn't exist or may have been removed.
              </p>
            </div>
            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => navigate('/marketplace')}
                className="border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Marketplace
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/dashboard')}
                className="border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                Go to Dashboard
              </Button>
            </div>
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
        {isNewDeployment && deploymentStatus === 'success' && (
          <Alert className="mb-6 border-green-500 bg-green-500/10">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <AlertDescription className="text-green-400">
              🎉 Your MCP server has been deployed successfully! It's now running and ready to use.
            </AlertDescription>
          </Alert>
        )}

        {/* Deployment Progress Section */}
        {isDeploying && isOwner && deploymentStatus === 'deploying' && (
          <Card className="mb-6 bg-gray-900/50 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Rocket className="w-5 h-5 text-blue-500" />
                Deploying Your MCP Server
              </CardTitle>
              <CardDescription className="text-gray-400">
                {pkg?.name} → Google Cloud Run
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Progress Steps */}
                <div className="space-y-3">
                  {deploymentSteps.map((step, index) => {
                    const stepNumber = index + 1;
                    const isActive = deploymentProgress.step === stepNumber;
                    const isComplete = deploymentProgress.step > stepNumber;
                    
                    return (
                      <div key={step.name} className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                          isComplete 
                            ? 'bg-green-500 text-white' 
                            : isActive 
                              ? 'bg-blue-500 text-white' 
                              : 'bg-gray-700 text-gray-400'
                        }`}>
                          {isComplete ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : isActive ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <span className="text-sm font-semibold">{stepNumber}</span>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className={`font-medium transition-colors ${
                            isActive ? 'text-white' : isComplete ? 'text-green-400' : 'text-gray-400'
                          }`}>
                            {step.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {isActive ? deploymentProgress.message : step.description}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Progress Bar */}
                <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-500"
                    style={{ 
                      width: `${(deploymentProgress.step / deploymentSteps.length) * 100}%` 
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Deployment Error Alert */}
        {deploymentStatus === 'failed' && deploymentError && (
          <Alert className="mb-6 border-red-500 bg-red-500/10">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <AlertDescription className="text-red-400">
              <div className="space-y-2">
                <div className="font-semibold">Deployment Failed</div>
                <div>{deploymentError}</div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRetryDeployment}
                  className="mt-2 border-red-500 text-red-400 hover:bg-red-500/10"
                >
                  Try Again
                </Button>
              </div>
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
                {isOwner && (
                  <Badge className="bg-blue-500/20 text-blue-400 flex items-center gap-1">
                    <User className="w-3 h-3" />
                    Owner
                  </Badge>
                )}
                {pkg.deployments && pkg.deployments.length > 0 && (
                  <Badge className={`flex items-center gap-1 ${
                    pkg.deployments.some(d => d.status === 'active') ? 'bg-green-500/20 text-green-400' :
                    pkg.deployments.some(d => d.status === 'failed') ? 'bg-red-500/20 text-red-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {pkg.deployments.some(d => d.status === 'active') ? <CheckCircle className="w-3 h-3" /> :
                     pkg.deployments.some(d => d.status === 'failed') ? <AlertCircle className="w-3 h-3" /> :
                     <Pause className="w-3 h-3" />}
                    {pkg.deployments.some(d => d.status === 'active') ? 'Running' :
                     pkg.deployments.some(d => d.status === 'failed') ? 'Failed' : 'Stopped'}
                  </Badge>
                )}
              </div>
              <div>
                @{pkg.slug}
              </div>
            </div>
            {/* Action Buttons */}
          <div className="flex gap-4 flex-wrap">
            {isOwner ? (
              <>
                {pkg.deployments && pkg.deployments.some(d => d.status === 'active') && (
                  <Button
                    onClick={handleCopyServiceUrl}
                    variant="outline"
                    className="border-white text-white bg-transparent hover:bg-white hover:text-black transition-all duration-200"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Service URL
                  </Button>
                )}
                <Button
                  onClick={handleRestartService}
                  variant="outline"
                  className="border-white text-white bg-transparent hover:bg-white hover:text-black transition-all duration-200"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Restart Service
                </Button>
                <Button
                  onClick={handleStopService}
                  variant="outline"
                  className="border-white text-white bg-transparent hover:bg-white hover:text-black transition-all duration-200"
                >
                  <Pause className="w-4 h-4 mr-2" />
                  Stop Service
                </Button>
                <Button
                  onClick={handleDeleteService}
                  variant="outline"
                  className="border-white text-white bg-transparent hover:bg-white hover:text-black transition-all duration-200"
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
                  className="border-white text-white bg-transparent hover:bg-white hover:text-black transition-all duration-200 font-semibold px-8"
                >
                  {isDownloading ? 'Installing...' : 'Install & Deploy'}
                </Button>
                {pkg.source_api_url && (
                  <Button
                    onClick={() => window.open(pkg.source_api_url, '_blank')}
                    variant="outline"
                    className="border-white text-white bg-transparent hover:bg-white hover:text-black transition-all duration-200"
                  >
                    <Github className="w-4 h-4 mr-2" />
                    View on GitHub
                  </Button>
                )}
              </>
            )}
          </div>
          </div>
          <div className="flex items-center gap-4 text-gray-400 mb-4">
            <span className="flex items-center gap-1">
              <User className="w-4 h-4" />
              by {pkg.author_id || 'Unknown'}
            </span>
            <span className="flex items-center gap-1">
              <Package className="w-4 h-4" />
              v{pkg.version || '1.0.0'}
            </span>
            {!isOwner && (
              <span className="flex items-center gap-1">
                <Download className="w-4 h-4" />
                {pkg.downloads_count.toLocaleString()} downloads
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              Updated {new Date(pkg.updated_at).toLocaleDateString()}
            </span>
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
                          : 'text-gray-600'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <span className="text-gray-400">
                Rate this package
                {userRating && <span className="ml-2 text-blue-400">Your rating: {userRating}</span>}
              </span>
            </div>
          )}
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
                  <span className="text-white">{pkg.version || '1.0.0'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Author</span>
                  <span className="text-white">{pkg.author_id || 'Unknown'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Last Updated</span>
                  <span className="text-white">{new Date(pkg.updated_at).toLocaleDateString()}</span>
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