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
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface SecretsManagerProps {
  workspaceId: string;
  mcpServerId?: string;
}

const SecretsManager: React.FC<SecretsManagerProps> = ({ workspaceId, mcpServerId }) => {
  const { toast } = useToast();
  const { user, session } = useAuth();
  
  // Token caching to prevent multiple simultaneous calls
  const [cachedToken, setCachedToken] = useState<string | null>(null);
  const [tokenCacheTime, setTokenCacheTime] = useState<number>(0);
  const [isGettingToken, setIsGettingToken] = useState<boolean>(false);
  
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
    const loadData = async () => {
      const token = await getFreshToken();
      if (token) {
        // Prevent multiple simultaneous calls by running them sequentially with a small delay
        await fetchSecrets();
        // Small delay to prevent rate limiting
        setTimeout(async () => {
          await fetchAPIKeys();
        }, 100);
      } else {
        console.error('❌ No valid token available for API calls');
        toast({ 
          title: 'Authentication Error', 
          description: 'Please sign in again to access secrets and API keys.', 
          variant: 'destructive' 
        });
        setIsLoadingSecrets(false);
        setIsLoadingApiKeys(false);
      }
    };
    loadData();
  }, [session]);

  // Get the correct token for API authentication
  // Priority: GitHub App token > Supabase JWT token
  const getFreshToken = async () => {
    const { data: { session: freshSession } } = await supabase.auth.getSession();
    return freshSession?.access_token || null;
  };
  
  // Secrets functions
  const fetchSecrets = async () => {
    const token = await getFreshToken();
    if (!token) {
      toast({ title: 'Error', description: 'You must be logged in to view secrets.', variant: 'destructive' });
      setIsLoadingSecrets(false);
      return;
    }
    try {
      setIsLoadingSecrets(true);
      const fetchedSecrets = await SecretsService.getSecrets(token, mcpServerId);
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
    const token = await getFreshToken();
    if (!token) {
      toast({ title: 'Error', description: 'You must be logged in to create secrets.', variant: 'destructive' });
      return;
    }
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
      
      const newSecret = await SecretsService.createSecret(token, request);
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
    const token = await getFreshToken();
    if (!token) {
      toast({ title: 'Error', description: 'You must be logged in to update secrets.', variant: 'destructive' });
      return;
    }
    if (!editingSecret) return;

    try {
      setIsCreatingSecret(true);
      const updatedSecret = await SecretsService.updateSecret(token, editingSecret.id, {
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
    const token = await getFreshToken();
    if (!token) {
      toast({ title: 'Error', description: 'You must be logged in to delete secrets.', variant: 'destructive' });
      return;
    }
    try {
      await SecretsService.deleteSecret(token, id);
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
    const token = await getFreshToken();
    if (!token) {
      toast({ title: 'Error', description: 'You must be logged in to view API keys.', variant: 'destructive' });
      setIsLoadingApiKeys(false);
      return;
    }
    try {
      setIsLoadingApiKeys(true);
      const keys = await APIKeyService.getAPIKeys(token);
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
    const token = await getFreshToken();
    if (!token) {
      toast({ title: 'Error', description: 'You must be logged in to create API keys.', variant: 'destructive' });
      return;
    }
    if (!newKeyName.trim()) return;
    
    try {
      setIsCreatingApiKey(true);
      const request: CreateAPIKeyRequest = {
        name: newKeyName,
        permissions: ['read', 'write'],
      };
      
      const result = await APIKeyService.createAPIKey(token, request);
      
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
    const token = await getFreshToken();
    if (!token) {
      toast({ title: 'Error', description: 'You must be logged in to delete API keys.', variant: 'destructive' });
      return;
    }
    setDeleteConfirmId(null);
    try {
      await APIKeyService.deleteAPIKey(token, id);
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
    const token = await getFreshToken();
    if (!token) {
      toast({ title: 'Error', description: 'You must be logged in to deactivate API keys.', variant: 'destructive' });
      return;
    }
    try {
      await APIKeyService.deactivateAPIKey(token, id);
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
    <Card className="bg-[#18181b] border border-[#23232a] rounded-2xl p-6 w-full max-w-5xl mx-auto">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2" style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}>
          <Lock className="w-5 h-5 text-white" />
          Secrets & API Keys
        </CardTitle>
        <CardDescription className="text-gray-300" style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}>
          Manage environment variables and API keys for your MCP servers
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="secrets" className="w-full">
          <TabsList className="flex w-full bg-black/60 border border-white/10 rounded-xl mb-6 h-12 items-stretch justify-around">
            <TabsTrigger value="secrets" className="flex-1 h-full flex items-center justify-center px-6 data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:font-bold text-white font-semibold rounded-xl transition-all">
              <Lock className="w-4 h-4 mr-2" />
              Environment Variables
            </TabsTrigger>
            <TabsTrigger value="api-keys" className="flex-1 h-full flex items-center justify-center px-6 data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:font-bold text-white font-semibold rounded-xl transition-all">
              <Key className="w-4 h-4 mr-2" />
              API Keys
            </TabsTrigger>
          </TabsList>

          {/* Secrets Tab */}
          <TabsContent value="secrets" className="space-y-6 mt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white text-left">Environment Variables</h3>
              <Button onClick={openCreateDialog} className="btn-modern hover:bg-neutral-900 hover:text-white h-10 px-5 text-base font-semibold"> 
                <Plus className="w-5 h-5 mr-2" />
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
              <div className="space-y-5">
                {secrets.map((secret) => (
                  <div key={secret.id} className="p-5 bg-[#18181b] border border-[#23232a] rounded-2xl flex flex-col gap-2">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <h3 className="text-white font-medium text-left">{secret.key}</h3>
                        {secret.mcp_server_id && (
                          <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs font-semibold bg-white/10 text-white border-white/20">Server-specific</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(secret)}
                          className="text-gray-400 hover:text-white h-8 w-8"
                        >
                          <Settings className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteSecret(secret.id, secret.key)}
                          className="text-red-400 hover:text-red-300 h-8 w-8"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    {secret.description && (
                      <p className="text-gray-400 text-sm mb-2 text-left">{secret.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* API Keys Tab */}
          <TabsContent value="api-keys" className="space-y-6 mt-6">
            <h3 className="text-lg font-semibold text-white text-left mb-4">API Keys</h3>
            <div className="flex gap-3 items-center mb-4">
              <Input
                placeholder="Enter API key name"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                className="bg-white/10 border-white/10 text-white h-10 text-base font-semibold"
                disabled={isCreatingApiKey}
              />
              <Button 
                onClick={handleCreateApiKey}
                disabled={isCreatingApiKey || !newKeyName.trim()}
                className="btn-modern hover:bg-neutral-900 hover:text-white h-10 px-5 text-base font-semibold"
              >
                {isCreatingApiKey ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin text-white" />
                ) : (
                  <Plus className="w-4 h-4 mr-2 text-white" />
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
                <p className="text-white text-lg font-semibold mb-1">No API keys found</p>
                <p className="text-gray-400 text-sm">Create your first API key to get started</p>
              </div>
            ) : (
              <div className="space-y-5">
                {apiKeys.map((apiKey) => {
                  const fullKey = getFullKeyForDisplay(apiKey);
                  return (
                    <div key={apiKey.id} className="bg-[#18181b] border border-[#23232a] rounded-2xl p-5 flex flex-col gap-2">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <h3 className="text-white font-medium text-left">{apiKey.name}</h3>
                          <Badge variant={apiKey.is_active ? "secondary" : "outline"} className="rounded-full px-3 py-1 text-xs font-semibold bg-white/10 text-white border-white/20">
                            {apiKey.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          {apiKey.last_used ? (
                            <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs font-semibold bg-white/10 text-white border-white/20">
                              Last used {new Date(apiKey.last_used).toLocaleDateString()}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="rounded-full px-3 py-1 text-xs font-semibold border-white/20 text-white">
                              Never used
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        {fullKey ? (
                          <>
                            <code className="text-sm font-mono text-white bg-[#23232a] px-3 py-2 rounded flex-1 text-left">
                              {fullKey}
                            </code>
                          </>
                        ) : (
                          <code className="text-sm font-mono text-gray-300 bg-[#23232a] px-3 py-2 rounded flex-1 text-left">
                            {`${apiKey.key_prefix}...`}
                          </code>
                        )}
                        <div className="flex items-center gap-1 ml-2">
                          {apiKey.is_active ? (
                            <Button
                              size="sm"
                              onClick={() => handleDeactivateApiKey(apiKey.id)}
                              className="bg-transparent border border-white/20 text-gray-400 hover:bg-[#23232a] hover:text-white font-semibold h-8 px-4"
                            >
                              Deactivate
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled
                              className="border-white/20 text-gray-400 bg-black h-8 px-4 font-semibold cursor-not-allowed"
                            >
                              Deactivated
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteConfirmId(apiKey.id)}
                            className="bg-transparent text-red-400 hover:text-red-300 hover:bg-[#23232a] h-8 w-8 flex items-center"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-400 mt-1">
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
          <DialogContent className="bg-black/60 text-white border-[#23232a] rounded-2xl p-8">
            <DialogHeader>
              <DialogTitle className="text-white text-2xl font-bold mb-1">
                {editingSecret ? 'Edit Environment Variable' : 'Add Environment Variable'}
              </DialogTitle>
              <DialogDescription className="text-gray-400 mb-6">
                {editingSecret ? 'Update the environment variable configuration.' : 'Add a new environment variable for your MCP server.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              {/* Quick Templates */}
              <div>
                <Label className="text-sm font-semibold text-white mb-2 block">Quick Templates</Label>
                <div className="flex flex-wrap gap-3">
                  {secretTemplates.map((template) => (
                    <Button
                      key={template.key}
                      size="sm"
                      onClick={() => handleTemplateSelect(template)}
                      className="text-xs bg-white/10 border-white/20 text-white/80 hover:bg-[#23232a] hover:text-white rounded-lg font-semibold px-4 py-2"
                    >
                      {template.key}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <Label htmlFor="key" className="text-sm font-semibold text-white mb-1">Key</Label>
                <Input
                  id="key"
                  placeholder="OPENAI_API_KEY"
                  value={formData.key}
                  onChange={(e) => setFormData(prev => ({ ...prev, key: e.target.value }))}
                  className="bg-black/60 border-white/10 text-white rounded-lg h-11"
                />
              </div>
              <div>
                <Label htmlFor="value" className="text-sm font-semibold text-white mb-1">Value</Label>
                <Textarea
                  id="value"
                  placeholder="Enter the secret value"
                  value={formData.value}
                  onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
                  className="bg-black/60 border-white/10 text-white rounded-lg min-h-[80px]"
                />
              </div>
              <div>
                <Label htmlFor="description" className="text-sm font-semibold text-white mb-1">Description (Optional)</Label>
                <Input
                  id="description"
                  placeholder="Brief description of this secret"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="bg-black/60 border-white/10 text-white rounded-lg h-11"
                />
              </div>
            </div>
            <DialogFooter className="mt-8 flex gap-3">
              <Button
                onClick={() => setIsSecretDialogOpen(false)}
                className="btn-modern hover:bg-neutral-900 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={editingSecret ? handleUpdateSecret : handleCreateSecret}
                disabled={isCreatingSecret || !formData.key.trim() || !formData.value.trim()}
                className="btn-modern-inverted hover:bg-neutral-900 hover:text-white"
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
          <DialogContent className="flex flex-col items-center justify-center gap-6 max-w-lg mx-auto py-8 bg-[#18181b] border-[#23232a] rounded-2xl p-8">
            <DialogHeader className="w-full text-center">
              <DialogTitle className="text-white text-2xl font-bold mb-2">Your new API key</DialogTitle>
            </DialogHeader>
            <div className="w-full flex flex-col items-center gap-4">
              <code
                className="text-lg font-mono bg-[#23232a] px-6 py-4 rounded-lg text-white border border-white/10 break-all select-all shadow-md w-full text-center"
                style={{ wordBreak: 'break-all' }}
              >
                {newlyCreatedKey}
              </code>
              <span className="text-base text-white text-center font-medium px-2">
                Copy this key now. <span className="font-bold">You will not be able to see it again!</span>
              </span>
            </div>
            <div className="w-full flex flex-row items-center justify-center gap-4">
              <Button
                onClick={() => {
                  if (newlyCreatedKey) navigator.clipboard.writeText(newlyCreatedKey);
                  toast({ title: "Copied to clipboard", description: "API key has been copied to your clipboard." });
                }}
                className="bg-black border border-white text-white hover:bg-white hover:text-black px-6 py-2"
              >
                Copy
              </Button>
              <Button
                variant="outline"
                onClick={() => { setShowKeyModal(false); setNewlyCreatedKey(null); }}
                className="border-white/20 text-black bg-white hover:bg-gray-100 px-6 py-2"
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete confirmation dialog */}
        {deleteConfirmId && (
          <Dialog open={true} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null); }}>
            <DialogContent className="max-w-md mx-auto bg-[#18181b] border border-[#23232a] shadow-2xl rounded-xl p-8 flex flex-col items-center gap-6">
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
                <Button variant="destructive" onClick={() => handleDeleteApiKey(deleteConfirmId)} className="btn-modern-inverted hover:bg-transparent hover:text-white">Delete</Button>
                <Button variant="outline" onClick={() => setDeleteConfirmId(null)} className="btn-modern-inverted hover:bg-transparent hover:text-white">Cancel</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
}

export default SecretsManager; 