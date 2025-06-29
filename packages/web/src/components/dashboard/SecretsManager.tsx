import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Lock, 
  Plus, 
  Copy, 
  Trash2, 
  Eye, 
  EyeOff, 
  Loader2, 
  Settings,
  Key,
  Database,
  Globe
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SecretsService, Secret, CreateSecretRequest } from '@/services/secretsService';
import { APIKeyService, APIKey, CreateAPIKeyRequest } from '@/services/apiKeyService';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface SecretsManagerProps {
  workspaceId: string;
  mcpServerId?: string;
}

const SecretsManager: React.FC<SecretsManagerProps> = ({ workspaceId, mcpServerId }) => {
  const { toast } = useToast();
  
  // Secrets state
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [isLoadingSecrets, setIsLoadingSecrets] = useState(true);
  const [isCreatingSecret, setIsCreatingSecret] = useState(false);
  const [showValues, setShowValues] = useState<{ [key: string]: boolean }>({});
  const [isSecretDialogOpen, setIsSecretDialogOpen] = useState(false);
  const [editingSecret, setEditingSecret] = useState<Secret | null>(null);
  
  // API Keys state
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [isLoadingApiKeys, setIsLoadingApiKeys] = useState(true);
  const [isCreatingApiKey, setIsCreatingApiKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [fullApiKeys, setFullApiKeys] = useState<{ [id: string]: string }>(() => {
    const stored = localStorage.getItem('sigyl_full_api_keys');
    return stored ? JSON.parse(stored) : {};
  });
  
  // Form state for secrets
  const [formData, setFormData] = useState({
    key: '',
    value: '',
    description: '',
    mcp_server_id: mcpServerId || ''
  });

  // Fetch data on component mount
  useEffect(() => {
    fetchSecrets();
    fetchAPIKeys();
  }, [mcpServerId]);

  // Secrets functions
  const fetchSecrets = async () => {
    try {
      setIsLoadingSecrets(true);
      const fetchedSecrets = await SecretsService.getSecrets(mcpServerId);
      setSecrets(fetchedSecrets);
    } catch (error) {
      console.error('Failed to fetch secrets:', error);
      toast({
        title: "Error",
        description: "Failed to fetch secrets. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingSecrets(false);
    }
  };

  const handleCreateSecret = async () => {
    if (!formData.key.trim() || !formData.value.trim()) {
      toast({
        title: "Error",
        description: "Key and value are required.",
        variant: "destructive",
      });
      return;
    }

    // Validate key format
    if (!SecretsService.validateSecretKey(formData.key)) {
      toast({
        title: "Error",
        description: "Key must be a valid environment variable name (uppercase letters, numbers, and underscores only).",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsCreatingSecret(true);
      const request: CreateSecretRequest = {
        key: formData.key.toUpperCase(),
        value: formData.value,
        description: formData.description,
        mcp_server_id: formData.mcp_server_id || undefined
      };
      
      const newSecret = await SecretsService.createSecret(request);
      setSecrets(prev => [newSecret, ...prev]);
      
      // Reset form
      setFormData({
        key: '',
        value: '',
        description: '',
        mcp_server_id: mcpServerId || ''
      });
      setIsSecretDialogOpen(false);
      
      toast({
        title: "Secret Created",
        description: `Environment variable "${formData.key}" has been created successfully.`,
      });
    } catch (error) {
      console.error('Failed to create secret:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create secret",
        variant: "destructive",
      });
    } finally {
      setIsCreatingSecret(false);
    }
  };

  const handleUpdateSecret = async () => {
    if (!editingSecret) return;

    try {
      setIsCreatingSecret(true);
      const updatedSecret = await SecretsService.updateSecret(editingSecret.id, {
        key: formData.key.toUpperCase(),
        value: formData.value,
        description: formData.description,
        mcp_server_id: formData.mcp_server_id || undefined
      });
      
      setSecrets(prev => prev.map(secret => 
        secret.id === editingSecret.id ? updatedSecret : secret
      ));
      
      // Reset form
      setFormData({
        key: '',
        value: '',
        description: '',
        mcp_server_id: mcpServerId || ''
      });
      setEditingSecret(null);
      setIsSecretDialogOpen(false);
      
      toast({
        title: "Secret Updated",
        description: `Environment variable "${formData.key}" has been updated successfully.`,
      });
    } catch (error) {
      console.error('Failed to update secret:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update secret",
        variant: "destructive",
      });
    } finally {
      setIsCreatingSecret(false);
    }
  };

  const handleDeleteSecret = async (id: string, key: string) => {
    try {
      await SecretsService.deleteSecret(id);
      setSecrets(prev => prev.filter(secret => secret.id !== id));
      toast({
        title: "Secret Deleted",
        description: `Environment variable "${key}" has been deleted.`,
      });
    } catch (error) {
      console.error('Failed to delete secret:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete secret",
        variant: "destructive",
      });
    }
  };

  const toggleValueVisibility = (id: string) => {
    setShowValues(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const openCreateDialog = () => {
    setEditingSecret(null);
    setFormData({
      key: '',
      value: '',
      description: '',
      mcp_server_id: mcpServerId || ''
    });
    setIsSecretDialogOpen(true);
  };

  const openEditDialog = (secret: Secret) => {
    setEditingSecret(secret);
    setFormData({
      key: secret.key,
      value: secret.value || '',
      description: secret.description || '',
      mcp_server_id: secret.mcp_server_id || mcpServerId || ''
    });
    setIsSecretDialogOpen(true);
  };

  const handleTemplateSelect = (template: { key: string; description: string; placeholder: string }) => {
    setFormData(prev => ({
      ...prev,
      key: template.key,
      description: template.description
    }));
  };

  // API Keys functions
  const fetchAPIKeys = async () => {
    try {
      setIsLoadingApiKeys(true);
      const keys = await APIKeyService.getAPIKeys();
      setApiKeys(keys);
    } catch (error) {
      console.error('Failed to fetch API keys:', error);
      toast({
        title: "Error",
        description: "Failed to fetch API keys. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingApiKeys(false);
    }
  };

  const handleCreateApiKey = async () => {
    if (!newKeyName.trim()) return;
    
    try {
      setIsCreatingApiKey(true);
      const request: CreateAPIKeyRequest = {
        name: newKeyName,
        permissions: ['read', 'write'],
      };
      
      const result = await APIKeyService.createAPIKey(request);
      
      setNewlyCreatedKey(result.api_key);
      setShowKeyModal(true);
      setApiKeys(prev => [{
        ...result.key,
        is_active: true,
        last_used: undefined
      }, ...prev]);
      setNewKeyName('');
      setFullApiKeys(prev => {
        const updated = { ...prev, [result.key.id]: result.api_key };
        localStorage.setItem('sigyl_full_api_keys', JSON.stringify(updated));
        return updated;
      });
      
      toast({
        title: "API Key Created",
        description: `New API key "${newKeyName}" has been created successfully. Make sure to copy it now - you won't be able to see it again!`,
      });
    } catch (error) {
      console.error('Failed to create API key:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create API key",
        variant: "destructive",
      });
    } finally {
      setIsCreatingApiKey(false);
    }
  };

  const handleDeleteApiKey = async (id: string) => {
    setDeleteConfirmId(null);
    try {
      await APIKeyService.deleteAPIKey(id);
      setApiKeys(prev => prev.filter(key => key.id !== id));
      setFullApiKeys(prev => {
        const updated = { ...prev };
        delete updated[id];
        localStorage.setItem('sigyl_full_api_keys', JSON.stringify(updated));
        return updated;
      });
      toast({
        title: "API Key Deleted",
        description: "API key has been permanently deleted.",
      });
    } catch (error) {
      console.error('Failed to delete API key:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete API key",
        variant: "destructive",
      });
    }
  };

  const handleDeactivateApiKey = async (id: string) => {
    try {
      await APIKeyService.deactivateAPIKey(id);
      setApiKeys(prev => prev.map(key => 
        key.id === id ? { ...key, is_active: false } : key
      ));
      toast({
        title: "API Key Deactivated",
        description: "API key has been deactivated.",
      });
    } catch (error) {
      console.error('Failed to deactivate API key:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to deactivate API key",
        variant: "destructive",
      });
    }
  };

  const formatPermissions = (permissions: string[]) => {
    return permissions.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(', ');
  };

  const secretTemplates = [
    { key: 'OPENAI_API_KEY', description: 'OpenAI API key for AI integrations', placeholder: 'sk-...' },
    { key: 'ANTHROPIC_API_KEY', description: 'Anthropic API key for Claude integrations', placeholder: 'sk-ant-...' },
    { key: 'DATABASE_URL', description: 'Database connection string', placeholder: 'postgresql://...' },
    { key: 'JWT_SECRET', description: 'JWT signing secret', placeholder: 'your-secret-key' },
    { key: 'REDIS_URL', description: 'Redis connection string', placeholder: 'redis://...' },
  ];

  // Helper to get the full key for display if just created
  const getFullKeyForDisplay = (apiKey: APIKey) => {
    if (newlyCreatedKey && apiKeys.length > 0 && apiKeys[0].id === apiKey.id) {
      return newlyCreatedKey;
    }
    return null;
  };

  return (
    <Card className="bg-gray-900/50 border-gray-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Lock className="w-5 h-5" />
          Secrets & API Keys
        </CardTitle>
        <CardDescription className="text-gray-400">
          Manage environment variables and API keys for your MCP servers
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="secrets" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-gray-800">
            <TabsTrigger value="secrets" className="data-[state=active]:bg-gray-700">
              <Lock className="w-4 h-4 mr-2" />
              Environment Variables
            </TabsTrigger>
            <TabsTrigger value="api-keys" className="data-[state=active]:bg-gray-700">
              <Key className="w-4 h-4 mr-2" />
              API Keys
            </TabsTrigger>
          </TabsList>

          {/* Secrets Tab */}
          <TabsContent value="secrets" className="space-y-6 mt-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-white">Environment Variables</h3>
              <Button onClick={openCreateDialog} className="bg-green-600 hover:bg-green-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Secret
              </Button>
            </div>

            {isLoadingSecrets ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : secrets.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Lock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No environment variables found</p>
                <p className="text-sm">Add your first secret to get started</p>
              </div>
            ) : (
              <div className="space-y-4">
                {secrets.map((secret) => (
                  <div key={secret.id} className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <h3 className="text-white font-medium">{secret.key}</h3>
                        {secret.mcp_server_id && (
                          <Badge variant="secondary" className="text-xs">
                            Server-specific
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleValueVisibility(secret.id)}
                          className="text-gray-400 hover:text-white"
                        >
                          {showValues[secret.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(secret)}
                          className="text-gray-400 hover:text-white"
                        >
                          <Settings className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteSecret(secret.id, secret.key)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {secret.description && (
                      <p className="text-gray-400 text-sm mb-2">{secret.description}</p>
                    )}
                    
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-mono text-gray-300 bg-gray-800 px-3 py-1 rounded flex-1">
                        {showValues[secret.id] ? secret.value : '••••••••••••••••'}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(secret.value || '');
                          toast({
                            title: "Copied to clipboard",
                            description: "Secret value has been copied to your clipboard.",
                          });
                        }}
                        className="text-gray-400 hover:text-white"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* API Keys Tab */}
          <TabsContent value="api-keys" className="space-y-6 mt-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-white">API Keys</h3>
            </div>

            {/* Create New API Key */}
            <div className="flex gap-4">
              <Input
                placeholder="Enter API key name"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white"
                disabled={isCreatingApiKey}
              />
              <Button 
                onClick={handleCreateApiKey}
                disabled={isCreatingApiKey || !newKeyName.trim()}
                className="bg-gradient-to-r from-green-500 to-yellow-500 hover:from-green-600 hover:to-yellow-600 text-white"
              >
                {isCreatingApiKey ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Create Key
              </Button>
            </div>

            {isLoadingApiKeys ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : apiKeys.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Key className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No API keys found</p>
                <p className="text-sm">Create your first API key to get started</p>
              </div>
            ) : (
              <div className="space-y-4">
                {apiKeys.map((apiKey) => {
                  const fullKey = getFullKeyForDisplay(apiKey);
                  return (
                    <div key={apiKey.id} className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <h3 className="text-white font-medium">{apiKey.name}</h3>
                          <Badge 
                            variant={apiKey.is_active ? "secondary" : "outline"} 
                            className="text-xs"
                          >
                            {apiKey.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          {apiKey.last_used ? (
                            <Badge variant="secondary" className="text-xs">
                              Last used {new Date(apiKey.last_used).toLocaleDateString()}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              Never used
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        {fullKey ? (
                          <>
                            <code className="text-sm font-mono text-green-400 bg-gray-900 px-3 py-1 rounded select-all">
                              {fullKey}
                            </code>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => {
                                navigator.clipboard.writeText(fullKey);
                                toast({ title: "Copied to clipboard", description: "API key has been copied to your clipboard." });
                              }}
                              className="ml-2 bg-gradient-to-r from-green-500 to-yellow-500 text-white px-3 py-1 font-semibold rounded shadow hover:from-green-600 hover:to-yellow-600"
                            >
                              Copy
                            </Button>
                          </>
                        ) : (
                          <code className="text-sm font-mono text-gray-300 bg-gray-800 px-3 py-1 rounded">
                            {`${apiKey.key_prefix}...`}
                          </code>
                        )}
                        <div className="flex items-center gap-2">
                          {apiKey.is_active ? (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleDeactivateApiKey(apiKey.id)}
                              className="px-4 py-2 font-semibold rounded bg-yellow-600 text-white hover:bg-yellow-500 focus:ring-2 focus:ring-yellow-400 border border-yellow-700 shadow"
                            >
                              Deactivate
                            </Button>
                          ) : (
                            <Button
                              variant="default"
                              size="sm"
                              disabled
                              className="px-4 py-2 font-semibold rounded bg-gray-700 text-gray-300 border border-gray-600 shadow cursor-not-allowed"
                            >
                              Deactivated
                            </Button>
                          )}
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => setDeleteConfirmId(apiKey.id)}
                            className="px-4 py-2 font-semibold rounded bg-red-600 text-white hover:bg-red-500 focus:ring-2 focus:ring-red-400 border border-red-700 shadow"
                          >
                            <Trash2 className="w-4 h-4 mr-1" /> Delete
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Permissions: {formatPermissions(apiKey.permissions)}</span>
                        <span>Created {new Date(apiKey.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Secret Creation/Edit Dialog */}
        <Dialog open={isSecretDialogOpen} onOpenChange={setIsSecretDialogOpen}>
          <DialogContent className="bg-gray-900 border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-white">
                {editingSecret ? 'Edit Environment Variable' : 'Add Environment Variable'}
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                {editingSecret ? 'Update the environment variable configuration.' : 'Add a new environment variable for your MCP server.'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Quick Templates */}
              <div>
                <Label className="text-sm font-medium text-gray-300 mb-2 block">Quick Templates</Label>
                <div className="flex flex-wrap gap-2">
                  {secretTemplates.map((template) => (
                    <Button
                      key={template.key}
                      variant="outline"
                      size="sm"
                      onClick={() => handleTemplateSelect(template)}
                      className="text-xs border-gray-600 text-gray-300 hover:bg-gray-700"
                    >
                      {template.key}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="key" className="text-sm font-medium text-gray-300">Key</Label>
                <Input
                  id="key"
                  placeholder="e.g., OPENAI_API_KEY"
                  value={formData.key}
                  onChange={(e) => setFormData(prev => ({ ...prev, key: e.target.value }))}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>

              <div>
                <Label htmlFor="value" className="text-sm font-medium text-gray-300">Value</Label>
                <Textarea
                  id="value"
                  placeholder="Enter the secret value"
                  value={formData.value}
                  onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
                  className="bg-gray-800 border-gray-700 text-white min-h-[80px]"
                />
              </div>

              <div>
                <Label htmlFor="description" className="text-sm font-medium text-gray-300">Description (Optional)</Label>
                <Input
                  id="description"
                  placeholder="Brief description of this secret"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsSecretDialogOpen(false)}
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                Cancel
              </Button>
              <Button
                onClick={editingSecret ? handleUpdateSecret : handleCreateSecret}
                disabled={isCreatingSecret || !formData.key.trim() || !formData.value.trim()}
                className="bg-green-600 hover:bg-green-700"
              >
                {isCreatingSecret ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                {editingSecret ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* API Key Modal - show only once after creation */}
        <Dialog open={showKeyModal} onOpenChange={(open) => {
          if (!open) {
            setShowKeyModal(false);
            setNewlyCreatedKey(null);
          }
        }}>
          <DialogContent className="flex flex-col items-center justify-center gap-6 max-w-lg mx-auto py-8">
            <DialogHeader className="w-full text-center">
              <DialogTitle className="text-2xl font-bold mb-2">Your new API key</DialogTitle>
            </DialogHeader>
            <div className="w-full flex flex-col items-center gap-4">
              <code
                className="text-lg font-mono bg-gray-900 px-6 py-4 rounded-lg text-green-400 border border-green-700 break-all select-all shadow-md w-full text-center"
                style={{ wordBreak: 'break-all' }}
              >
                {newlyCreatedKey}
              </code>
              <span className="text-base text-yellow-400 text-center font-medium px-2">
                Copy this key now. <span className="font-bold">You will not be able to see it again!</span>
              </span>
            </div>
            <div className="w-full flex flex-row items-center justify-center gap-4 mt-2">
              <Button
                onClick={() => {
                  if (newlyCreatedKey) navigator.clipboard.writeText(newlyCreatedKey);
                  toast({ title: "Copied to clipboard", description: "API key has been copied to your clipboard." });
                }}
                className="bg-gradient-to-r from-green-500 to-yellow-500 text-white px-6 py-2 font-semibold rounded shadow hover:from-green-600 hover:to-yellow-600"
              >
                Copy
              </Button>
              <Button
                variant="secondary"
                onClick={() => { setShowKeyModal(false); setNewlyCreatedKey(null); }}
                className="px-6 py-2 font-semibold rounded shadow"
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete confirmation dialog */}
        {deleteConfirmId && (
          <Dialog open={true} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null); }}>
            <DialogContent className="max-w-md mx-auto bg-gray-900 border border-gray-700 shadow-2xl rounded-xl p-8 flex flex-col items-center gap-6">
              <DialogHeader className="w-full text-center mb-2">
                <DialogTitle className="text-2xl font-bold text-white mb-2">Delete API Key</DialogTitle>
              </DialogHeader>
              <div className="w-full flex flex-col items-center gap-2">
                <p className="text-lg text-red-400 font-semibold text-center mb-1">
                  Are you sure you want to <span className="font-bold">permanently delete</span> this API key?
                </p>
                <p className="text-base text-gray-400 text-center mb-2">This action cannot be undone.</p>
              </div>
              <div className="w-full flex flex-row items-center justify-center gap-6 mt-2">
                <Button variant="destructive" onClick={() => handleDeleteApiKey(deleteConfirmId)} className="px-8 py-2 text-base font-semibold rounded shadow">Delete</Button>
                <Button variant="secondary" onClick={() => setDeleteConfirmId(null)} className="px-8 py-2 text-base font-semibold rounded shadow">Cancel</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
};

export default SecretsManager; 