import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Play, Pause, Square, RefreshCw, Server, Zap, Users, BarChart3, ExternalLink, Trash2 } from 'lucide-react';
import deploymentService, { DeploymentStatus } from "@/services/deploymentService";

interface DeploymentStats {
  totalDeployments: number;
  activeDeployments: number;
  totalRequests: number;
  avgResponseTime: number;
}

export const DeploymentDashboard = () => {
  const [deployments, setDeployments] = useState<DeploymentStatus[]>([]);
  const [stats, setStats] = useState<DeploymentStats>({
    totalDeployments: 0,
    activeDeployments: 0,
    totalRequests: 0,
    avgResponseTime: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchDeployments();
  }, []);

  const fetchDeployments = async () => {
    setIsLoading(true);
    try {
      const deploymentData = await deploymentService.getDeployments();
      setDeployments(deploymentData);
      
      // Calculate stats from real data
      const totalDeployments = deploymentData.length;
      const activeDeployments = deploymentData.filter(d => d.status === 'running').length;
      const totalRequests = deploymentData.reduce((sum, d) => sum + d.metrics.requests, 0);
      const avgResponseTime = deploymentData.length > 0 
        ? deploymentData.reduce((sum, d) => sum + (d.metrics.cpu / 100), 0) / deploymentData.length 
        : 0;

      setStats({
        totalDeployments,
        activeDeployments,
        totalRequests,
        avgResponseTime
      });
    } catch (error) {
      console.error("Failed to fetch deployments:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (id: string, action: 'start' | 'stop' | 'restart' | 'delete') => {
    setActionLoading(id);
    try {
      let success = false;
      
      switch (action) {
        case 'restart':
          success = await deploymentService.restartDeployment(id);
          break;
        case 'delete':
          success = await deploymentService.deleteDeployment(id);
          break;
        case 'start':
        case 'stop':
          // These would need additional backend endpoints
          console.warn(`Action ${action} not yet implemented`);
          success = false;
          break;
      }

      if (success) {
        // Refresh deployments after successful action
        await fetchDeployments();
      } else {
        console.error(`Failed to perform action ${action} on deployment ${id}`);
      }
    } catch (error) {
      console.error(`Failed to perform action ${action} on deployment ${id}:`, error);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
      case 'active': 
        return 'bg-green-500';
      case 'stopped': 
        return 'bg-gray-500';
      case 'failed': 
        return 'bg-red-500';
      case 'deploying':
      case 'pending': 
        return 'bg-yellow-500';
      default: 
        return 'bg-gray-500';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'running':
      case 'active': 
        return 'default';
      case 'stopped': 
        return 'secondary';
      case 'failed': 
        return 'destructive';
      case 'deploying':
      case 'pending': 
        return 'secondary';
      default: 
        return 'secondary';
    }
  };

  const getActionIcon = (status: string) => {
    switch (status) {
      case 'running':
      case 'active': 
        return Pause;
      case 'stopped': 
        return Play;
      default: 
        return RefreshCw;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Server className="w-4 h-4" />
              <span>Total Deployments</span>
            </CardTitle>
            <CardDescription>Total number of deployments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDeployments}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Zap className="w-4 h-4" />
              <span>Active Deployments</span>
            </CardTitle>
            <CardDescription>Number of currently running deployments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeDeployments}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-4 h-4" />
              <span>Total Requests</span>
            </CardTitle>
            <CardDescription>Total requests served across all deployments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRequests.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4" />
              <span>Avg Response Time</span>
            </CardTitle>
            <CardDescription>Average response time across all deployments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgResponseTime.toFixed(2)}s</div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Deployments</h2>
          <Button onClick={fetchDeployments} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {deployments.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Server className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No deployments yet</h3>
              <p className="text-gray-600 mb-4">Deploy your first MCP server to get started</p>
              <Button onClick={() => window.location.href = '/deploy'}>
                Deploy MCP Server
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {deployments.map((deployment) => (
              <Card key={deployment.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(deployment.status)}`} />
                      <span>{deployment.name}</span>
                    </CardTitle>
                    <Badge variant={getStatusBadgeVariant(deployment.status)}>
                      {deployment.status}
                    </Badge>
                  </div>
                  <CardDescription>
                    Last updated: {new Date(deployment.updatedAt).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {deployment.url && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">URL:</span>
                        <a 
                          href={deployment.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 flex items-center text-sm"
                        >
                          <ExternalLink className="w-3 h-3 mr-1" />
                          View
                        </a>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Requests:</span>
                        <div>{deployment.metrics.requests.toLocaleString()}</div>
                      </div>
                      <div>
                        <span className="font-medium">Errors:</span>
                        <div>{deployment.metrics.errors}</div>
                      </div>
                      <div>
                        <span className="font-medium">CPU:</span>
                        <div>{deployment.metrics.cpu.toFixed(1)}%</div>
                      </div>
                      <div>
                        <span className="font-medium">Memory:</span>
                        <div>{deployment.metrics.memory.toFixed(1)}%</div>
                      </div>
                    </div>

                    <div className="flex space-x-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAction(deployment.id, 'restart')}
                        disabled={actionLoading === deployment.id}
                      >
                        {actionLoading === deployment.id ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4" />
                        )}
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleAction(deployment.id, 'delete')}
                        disabled={actionLoading === deployment.id}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
