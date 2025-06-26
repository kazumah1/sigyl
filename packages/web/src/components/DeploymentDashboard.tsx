
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Play, Pause, Square, RefreshCw, Server, Zap, Users, BarChart3 } from 'lucide-react';

interface DeploymentStats {
  totalDeployments: number;
  activeDeployments: number;
  totalRequests: number;
  avgResponseTime: number;
}

interface Deployment {
  id: string;
  name: string;
  status: 'running' | 'stopped' | 'error' | 'deploying';
  url: string;
  lastDeployed: string;
  requests: number;
  responseTime: number;
}

export const DeploymentDashboard = () => {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [stats, setStats] = useState<DeploymentStats>({
    totalDeployments: 0,
    activeDeployments: 0,
    totalRequests: 0,
    avgResponseTime: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Mock data - replace with actual API calls
        const mockDeployments: Deployment[] = [
          {
            id: '1',
            name: 'Agent-001',
            status: 'running',
            url: 'http://agent-001.sigyl.ai',
            lastDeployed: '2024-07-15T12:00:00Z',
            requests: 12345,
            responseTime: 0.05,
          },
          {
            id: '2',
            name: 'Agent-002',
            status: 'stopped',
            url: 'http://agent-002.sigyl.ai',
            lastDeployed: '2024-07-10T18:30:00Z',
            requests: 6789,
            responseTime: 0.08,
          },
          {
            id: '3',
            name: 'Agent-003',
            status: 'error',
            url: 'http://agent-003.sigyl.ai',
            lastDeployed: '2024-07-20T09:15:00Z',
            requests: 500,
            responseTime: 1.2,
          },
          {
            id: '4',
            name: 'Agent-004',
            status: 'deploying',
            url: 'http://agent-004.sigyl.ai',
            lastDeployed: '2024-07-22T14:45:00Z',
            requests: 0,
            responseTime: 0,
          },
        ];

        const mockStats: DeploymentStats = {
          totalDeployments: 4,
          activeDeployments: 2,
          totalRequests: 19634,
          avgResponseTime: 0.34,
        };

        setDeployments(mockDeployments);
        setStats(mockStats);
      } catch (error) {
        console.error("Failed to fetch deployments:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleAction = async (id: string, action: 'start' | 'stop' | 'restart') => {
    try {
      // Mock API call - replace with actual API call
      console.log(`Performing action ${action} on deployment ${id}`);
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));

      // Update deployment status based on action
      setDeployments(prevDeployments =>
        prevDeployments.map(deployment => {
          if (deployment.id === id) {
            switch (action) {
              case 'start':
                return { ...deployment, status: 'running' };
              case 'stop':
                return { ...deployment, status: 'stopped' };
              case 'restart':
                return { ...deployment, status: 'deploying' };
              default:
                return deployment;
            }
          }
          return deployment;
        })
      );
    } catch (error) {
      console.error(`Failed to perform action ${action} on deployment ${id}:`, error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-green-500';
      case 'stopped': return 'bg-gray-500';
      case 'error': return 'bg-red-500';
      case 'deploying': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getActionIcon = (status: string) => {
    switch (status) {
      case 'running': return Pause;
      case 'stopped': return Play;
      default: return RefreshCw;
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
            <div className="text-2xl font-bold">{stats.totalRequests}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4" />
              <span>Avg. Response Time</span>
            </CardTitle>
            <CardDescription>Average response time across all deployments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgResponseTime.toFixed(2)}s</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Deployments</CardTitle>
          <CardDescription>List of all deployments and their status</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  URL
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Deployed
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Requests
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Response Time
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {deployments.map((deployment) => {
                const ActionIcon = getActionIcon(deployment.status);
                return (
                  <tr key={deployment.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{deployment.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className={getStatusColor(deployment.status)}>
                        {deployment.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <a
                        href={deployment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-500 hover:text-blue-700"
                      >
                        {deployment.url}
                      </a>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(deployment.lastDeployed).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {deployment.requests}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {deployment.responseTime.toFixed(2)}s
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleAction(deployment.id, deployment.status === 'running' ? 'stop' : 'start')}
                        disabled={deployment.status === 'deploying'}
                      >
                        <ActionIcon className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="ml-2"
                        onClick={() => handleAction(deployment.id, 'restart')}
                        disabled={deployment.status === 'deploying'}
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
};
