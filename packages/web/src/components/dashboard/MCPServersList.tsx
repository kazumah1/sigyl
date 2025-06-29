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
  AlertCircle,
  Play,
  Square,
  RefreshCw,
  Trash2,
  Copy
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();

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

  const handleServerAction = (action: string, serverId: string) => {
    // TODO: Implement server actions
    console.log(`${action} server ${serverId}`);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // TODO: Show toast notification
  };

  return (
    <Card className="bg-gray-900/50 border-gray-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white flex items-center gap-2">
              <Server className="w-5 h-5" />
              MCP Servers
            </CardTitle>
            <CardDescription className="text-gray-400">
              Manage your Model Context Protocol server deployments
            </CardDescription>
          </div>
          <Button 
            onClick={() => navigate('/deploy')}
            className="bg-blue-600 hover:bg-blue-700 text-white border-0"
          >
            Deploy New Server
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {servers.map((server) => (
            <div key={server.id} className="bg-gray-800/30 border border-gray-700 rounded-lg p-6 hover:border-gray-600 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1 min-w-0">
                  <div className="mt-1">
                    {getStatusIcon(server.status, server.deployment_status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-white font-semibold text-lg truncate">{server.name}</h3>
                      {getStatusBadge(server.status, server.deployment_status)}
                    </div>
                    <p className="text-gray-400 text-sm mb-3 line-clamp-2">{server.description}</p>
                    
                    {detailed && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <GitBranch className="w-3 h-3" />
                            <span className="truncate max-w-[200px] font-mono">{server.github_repo}</span>
                          </span>
                          <span>Created {new Date(server.created_at).toLocaleDateString()}</span>
                        </div>
                        
                        {server.endpoint_url && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">Endpoint:</span>
                            <code className="text-xs bg-gray-900 px-2 py-1 rounded text-blue-400 font-mono">
                              {server.endpoint_url}
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(server.endpoint_url)}
                              className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
                  {detailed && server.endpoint_url && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(server.endpoint_url, '_blank')}
                      className="text-gray-400 hover:text-white hover:bg-gray-700"
                      title="Open endpoint"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  )}
                  
                  {detailed && server.status === 'active' && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleServerAction('restart', server.id)}
                        className="text-gray-400 hover:text-white hover:bg-gray-700"
                        title="Restart server"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleServerAction('stop', server.id)}
                        className="text-gray-400 hover:text-white hover:bg-gray-700"
                        title="Stop server"
                      >
                        <Square className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                  
                  {detailed && server.status === 'inactive' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleServerAction('start', server.id)}
                      className="text-gray-400 hover:text-white hover:bg-gray-700"
                      title="Start server"
                    >
                      <Play className="w-4 h-4" />
                    </Button>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleServerAction('delete', server.id)}
                    className="text-gray-400 hover:text-red-400 hover:bg-red-400/10"
                    title="Delete server"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
          
          {servers.length === 0 && (
            <div className="text-center py-12">
              <Server className="w-16 h-16 mx-auto mb-4 text-gray-600" />
              <h3 className="text-xl font-semibold text-white mb-2">No MCP servers deployed yet</h3>
              <p className="text-gray-400 mb-6 max-w-md mx-auto">
                Get started by deploying your first MCP server. Connect to external APIs, databases, and services with ease.
              </p>
              <Button 
                onClick={() => navigate('/deploy')}
                className="bg-blue-600 hover:bg-blue-700 text-white border-0"
              >
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
