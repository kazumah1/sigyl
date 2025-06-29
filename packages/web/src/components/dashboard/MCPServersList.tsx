import React, { useState } from 'react';
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
import { supabase } from '@/lib/supabase';
import deploymentService from '@/services/deploymentService';
import { toast } from 'sonner';

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
  const [editingServer, setEditingServer] = useState<MCPServer | null>(null);
  const [editFields, setEditFields] = useState({
    name: '',
    version: '',
    description: '',
    logo_url: '',
    screenshots: '', // comma-separated URLs
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [localServers, setLocalServers] = useState(servers);
  const [redeployingId, setRedeployingId] = useState<string | null>(null);

  // Keep localServers in sync with prop
  React.useEffect(() => {
    setLocalServers(servers);
  }, [servers]);

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

  const handleServerAction = async (action: string, serverId: string) => {
    if (action === 'delete') {
      if (!window.confirm('Are you sure you want to delete this server? This will also remove the service from Google Cloud.')) return;
      toast.info('Deleting server...');
      const success = await deploymentService.deleteDeployment(serverId);
      if (success) {
        toast.success('Server deleted and removed from Google Cloud!');
        setLocalServers((prev) => prev.filter((s) => s.id !== serverId));
      } else {
        toast.error('Failed to delete server.');
      }
    } else if (action === 'stop') {
      toast.info('Stopping server is not yet implemented.');
    } else if (action === 'redeploy') {
      setRedeployingId(serverId);
      toast.info('Redeploying server...');
      const result = await deploymentService.redeployDeployment(serverId);
      setRedeployingId(null);
      if (result.success) {
        toast.success('Server redeployed successfully!');
        if (result.logs && result.logs.length > 0) {
          console.log('Redeploy logs:', result.logs.join('\n'));
        }
      } else {
        toast.error('Failed to redeploy server.');
        if (result.logs && result.logs.length > 0) {
          console.error('Redeploy logs:', result.logs.join('\n'));
        }
      }
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // TODO: Show toast notification
  };

  const handleEditClick = (server: MCPServer) => {
    setEditingServer(server);
    setEditFields({
      name: server.name,
      version: (server as any).version || '',
      description: server.description,
      logo_url: (server as any).logo_url || '',
      screenshots: Array.isArray((server as any).screenshots)
        ? ((server as any).screenshots as string[]).join(',')
        : ((server as any).screenshots || ''),
    });
    setError(null);
  };

  const handleEditFieldChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditFields((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditSave = async () => {
    if (!editingServer) return;
    setSaving(true);
    setError(null);
    try {
      // Update mcp_packages in Supabase
      const { error: updateError } = await supabase
        .from('mcp_packages')
        .update({
          name: editFields.name,
          version: editFields.version,
          description: editFields.description,
          logo_url: editFields.logo_url,
          screenshots: editFields.screenshots
            ? editFields.screenshots.split(',').map((s) => s.trim())
            : [],
        })
        .eq('id', editingServer.id);
      if (updateError) {
        setError(updateError.message);
      } else {
        setEditingServer(null);
        setRefreshKey((k) => k + 1); // trigger parent refresh if needed
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update server');
    } finally {
      setSaving(false);
    }
  };

  const handleEditCancel = () => {
    setEditingServer(null);
    setError(null);
  };

  return (
    <Card className="bg-black/80 border border-white/10 shadow-2xl rounded-2xl backdrop-blur-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white flex items-center gap-2" style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}>
              <Server className="w-5 h-5 text-white" />
              MCP Servers
            </CardTitle>
            <CardDescription className="text-gray-300" style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}>
              Manage your Model Context Protocol server deployments
            </CardDescription>
          </div>
          <Button 
            onClick={() => navigate('/deploy')}
            className="btn-modern bg-black text-white border-white/20 hover:bg-neutral-900 hover:text-white shadow-lg font-semibold rounded-xl"
            style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}
          >
            Deploy New Server
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {localServers.map((server) => (
            <div
              key={server.id}
              className="card-modern rounded-xl p-6 hover:border-white/20 transition-colors cursor-pointer group"
              onClick={() => navigate(`/mcp/${server.id}`)}
              style={{ position: 'relative' }}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1 min-w-0">
                  <div className="mt-1">
                    {getStatusIcon(server.status, server.deployment_status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-white font-semibold text-lg truncate transition-colors" style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}>{server.name}</h3>
                      {getStatusBadge(server.status, server.deployment_status)}
                    </div>
                    <p className="text-gray-300 text-sm mb-3 line-clamp-2" style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}>{server.description}</p>
                    
                    {detailed && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <GitBranch className="w-3 h-3" />
                            <span className="truncate max-w-[200px] font-mono text-gray-400">{server.github_repo}</span>
                          </span>
                          <span>Created {new Date(server.created_at).toLocaleDateString()}</span>
                        </div>
                        
                        {server.endpoint_url && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">Endpoint:</span>
                            <code className="text-xs bg-black/80 px-2 py-1 rounded text-purple-400 font-mono">
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
                  
                  {detailed && server.status === 'active' && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); handleServerAction('redeploy', server.id); }}
                        className="text-gray-400 hover:text-yellow-400 hover:bg-yellow-400/10"
                        title="Redeploy server"
                        disabled={redeployingId === server.id}
                      >
                        {redeployingId === server.id ? 'Redeploying...' : 'Redeploy'}
                      </Button>
                    </>
                  )}
                  
                  {detailed && server.status === 'inactive' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); handleServerAction('start', server.id); }}
                      className="text-gray-400 hover:text-white hover:bg-neutral-900"
                      title="Start server"
                    >
                      <Play className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); handleEditClick(server); }}
                    className="text-gray-400 hover:text-purple-400 hover:bg-purple-400/10"
                    title="Edit server"
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); handleServerAction('delete', server.id); }}
                    className="text-gray-400 hover:text-red-400 hover:bg-red-400/10"
                    title="Delete server"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
          
          {localServers.length === 0 && (
            <div className="text-center py-12">
              <Server className="w-16 h-16 mx-auto mb-4 text-gray-700" />
              <h3 className="text-xl font-semibold text-white mb-2" style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}>No MCP servers deployed yet</h3>
              <p className="text-gray-300 mb-6 max-w-md mx-auto" style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}>
                Get started by deploying your first MCP server. Connect to external APIs, databases, and services with ease.
              </p>
              <Button 
                onClick={() => navigate('/deploy')}
                className="btn-modern bg-black text-white border-white/20 hover:bg-neutral-900 hover:text-white shadow-lg font-semibold rounded-xl"
                style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}
              >
                Deploy Your First Server
              </Button>
            </div>
          )}
        </div>

        {/* Edit Modal (simple inline modal) */}
        {editingServer && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
            <div className="bg-black/90 border border-white/10 rounded-2xl p-8 w-full max-w-lg relative shadow-2xl backdrop-blur-lg">
              <h2 className="text-xl font-bold text-white mb-4" style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}>Edit MCP Server</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-300 mb-1" style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}>Name</label>
                  <input
                    type="text"
                    name="name"
                    value={editFields.name}
                    onChange={handleEditFieldChange}
                    className="w-full px-3 py-2 rounded bg-black/60 text-white border border-white/10 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-1" style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}>Version</label>
                  <input
                    type="text"
                    name="version"
                    value={editFields.version}
                    onChange={handleEditFieldChange}
                    className="w-full px-3 py-2 rounded bg-black/60 text-white border border-white/10 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-1" style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}>Description</label>
                  <textarea
                    name="description"
                    value={editFields.description}
                    onChange={handleEditFieldChange}
                    className="w-full px-3 py-2 rounded bg-black/60 text-white border border-white/10 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-1" style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}>Logo URL</label>
                  <input
                    type="text"
                    name="logo_url"
                    value={editFields.logo_url}
                    onChange={handleEditFieldChange}
                    className="w-full px-3 py-2 rounded bg-black/60 text-white border border-white/10 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-1" style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}>Screenshots (comma-separated URLs)</label>
                  <input
                    type="text"
                    name="screenshots"
                    value={editFields.screenshots}
                    onChange={handleEditFieldChange}
                    className="w-full px-3 py-2 rounded bg-black/60 text-white border border-white/10 focus:outline-none"
                  />
                </div>
                {error && <div className="text-red-400 text-sm">{error}</div>}
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <Button onClick={handleEditCancel} variant="ghost" className="text-gray-400">Cancel</Button>
                <Button onClick={handleEditSave} className="bg-blue-600 text-white" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MCPServersList;
