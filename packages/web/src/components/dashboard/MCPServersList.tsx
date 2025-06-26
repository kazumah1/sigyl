
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Server, 
  GitBranch, 
  ExternalLink, 
  MoreHorizontal,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';

interface MCPServer {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive' | 'error';
  deployment_status: 'deployed' | 'deploying' | 'failed';
  endpoint_url: string;
  github_repo: string;
  created_at: string;
}

interface MCPServersListProps {
  servers: MCPServer[];
  detailed?: boolean;
}

const MCPServersList: React.FC<MCPServersListProps> = ({ servers, detailed = false }) => {
  const getStatusIcon = (status: string, deploymentStatus: string) => {
    if (deploymentStatus === 'deploying') {
      return <Clock className="w-4 h-4 text-yellow-400" />;
    }
    if (deploymentStatus === 'failed' || status === 'error') {
      return <AlertCircle className="w-4 h-4 text-red-400" />;
    }
    if (status === 'active') {
      return <CheckCircle className="w-4 h-4 text-green-400" />;
    }
    return <AlertCircle className="w-4 h-4 text-gray-400" />;
  };

  const getStatusBadge = (status: string, deploymentStatus: string) => {
    if (deploymentStatus === 'deploying') {
      return <Badge className="bg-yellow-400/20 text-yellow-400 border-yellow-400/20 text-xs px-2 py-1 whitespace-nowrap">Deploying</Badge>;
    }
    if (deploymentStatus === 'failed' || status === 'error') {
      return <Badge className="bg-red-400/20 text-red-400 border-red-400/20 text-xs px-2 py-1 whitespace-nowrap">Error</Badge>;
    }
    if (status === 'active') {
      return <Badge className="bg-green-400/20 text-green-400 border-green-400/20 text-xs px-2 py-1 whitespace-nowrap">Active</Badge>;
    }
    return <Badge className="bg-gray-400/20 text-gray-400 border-gray-400/20 text-xs px-2 py-1 whitespace-nowrap">Inactive</Badge>;
  };

  return (
    <Card className="bg-gray-900/50 border-gray-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Server className="w-5 h-5" />
          MCP Servers
        </CardTitle>
        <CardDescription className="text-gray-400">
          Manage your Model Context Protocol server deployments
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {servers.map((server) => (
            <div key={server.id} className="flex items-center justify-between p-4 bg-gray-800/30 rounded-lg border border-gray-700">
              <div className="flex items-center space-x-4 flex-1 min-w-0">
                {getStatusIcon(server.status, server.deployment_status)}
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-medium truncate">{server.name}</h3>
                  <p className="text-gray-400 text-sm truncate max-w-[300px] md:max-w-[400px] lg:max-w-[500px]">{server.description}</p>
                  {detailed && (
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <GitBranch className="w-3 h-3" />
                        <span className="truncate max-w-[150px]">{server.github_repo}</span>
                      </span>
                      <span>{new Date(server.created_at).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-3 flex-shrink-0 ml-4">
                {getStatusBadge(server.status, server.deployment_status)}
                {detailed && server.endpoint_url && (
                  <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
          
          {servers.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <Server className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No MCP servers deployed yet</p>
              <Button className="mt-4 bg-gradient-to-r from-green-500 to-yellow-500 hover:from-green-600 hover:to-yellow-600 text-white">
                Deploy Your First Server
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MCPServersList;
