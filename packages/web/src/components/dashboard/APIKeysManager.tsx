import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Key, Plus, Copy, Trash2, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { APIKeyService, APIKey, CreateAPIKeyRequest } from '@/services/apiKeyService';

interface APIKeysManagerProps {
  workspaceId: string;
}

const APIKeysManager: React.FC<APIKeysManagerProps> = ({ workspaceId }) => {
  const { toast } = useToast();
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [showKeys, setShowKeys] = useState<{ [key: string]: boolean }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);

  // Fetch API keys on component mount
  useEffect(() => {
    fetchAPIKeys();
  }, []);

  const fetchAPIKeys = async () => {
    try {
      setIsLoading(true);
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
      setIsLoading(false);
    }
  };

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) return;
    
    try {
      setIsCreating(true);
      const request: CreateAPIKeyRequest = {
        name: newKeyName,
        permissions: ['read', 'write'], // Default permissions
      };
      
      const result = await APIKeyService.createAPIKey(request);
      
      // Store the full API key temporarily for display
      setNewlyCreatedKey(result.api_key);
      
      // Add the new key to the list
      setApiKeys(prev => [{
        ...result.key,
        is_active: true, // New keys are always active
        last_used: undefined
      }, ...prev]);
      setNewKeyName('');
      
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
      setIsCreating(false);
    }
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast({
      title: "Copied to clipboard",
      description: "API key has been copied to your clipboard.",
    });
  };

  const handleDeleteKey = async (id: string) => {
    try {
      await APIKeyService.deleteAPIKey(id);
      setApiKeys(prev => prev.filter(key => key.id !== id));
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

  const handleDeactivateKey = async (id: string) => {
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

  const toggleKeyVisibility = (id: string) => {
    setShowKeys(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const maskKey = (key: string) => {
    return key.substring(0, 12) + '•'.repeat(20) + key.substring(key.length - 4);
  };

  const formatPermissions = (permissions: string[]) => {
    return permissions.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(', ');
  };

  if (isLoading) {
    return (
      <Card className="bg-gray-900/50 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Key className="w-5 h-5" />
            API Keys
          </CardTitle>
          <CardDescription className="text-gray-400">
            Manage API keys for your MCP servers and integrations
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-900/50 border-gray-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Key className="w-5 h-5" />
          API Keys
        </CardTitle>
        <CardDescription className="text-gray-400">
          Manage API keys for your MCP servers and integrations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Create New Key */}
        <div className="flex gap-4">
          <Input
            placeholder="Enter API key name"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            className="bg-gray-800 border-gray-700 text-white"
            disabled={isCreating}
          />
          <Button 
            onClick={handleCreateKey}
            disabled={isCreating || !newKeyName.trim()}
            className="bg-gradient-to-r from-green-500 to-yellow-500 hover:from-green-600 hover:to-yellow-600 text-white"
          >
            {isCreating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Plus className="w-4 h-4 mr-2" />
            )}
            Create Key
          </Button>
        </div>

        {/* API Keys List */}
        <div className="space-y-4">
          {apiKeys.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Key className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No API keys found</p>
              <p className="text-sm">Create your first API key to get started</p>
            </div>
          ) : (
            apiKeys.map((apiKey) => (
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
                  <code className="text-sm font-mono text-gray-300 bg-gray-800 px-3 py-1 rounded">
                    {showKeys[apiKey.id] ? 
                      (newlyCreatedKey && apiKey.id === apiKeys[0]?.id ? newlyCreatedKey : `sk_${apiKey.key_prefix}...`) : 
                      maskKey(`sk_${apiKey.key_prefix}...`)
                    }
                  </code>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleKeyVisibility(apiKey.id)}
                      className="text-gray-400 hover:text-white"
                    >
                      {showKeys[apiKey.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    {newlyCreatedKey && apiKey.id === apiKeys[0]?.id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyKey(newlyCreatedKey)}
                        className="text-gray-400 hover:text-white"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    )}
                    {apiKey.is_active ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeactivateKey(apiKey.id)}
                        className="text-gray-400 hover:text-yellow-400"
                      >
                        Deactivate
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteKey(apiKey.id)}
                        className="text-gray-400 hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Permissions: {formatPermissions(apiKey.permissions)}</span>
                  <span>Created {new Date(apiKey.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default APIKeysManager;
