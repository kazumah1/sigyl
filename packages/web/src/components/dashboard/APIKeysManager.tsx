import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Key, Plus, Copy, Trash2, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { APIKeyService, APIKey, CreateAPIKeyRequest } from '@/services/apiKeyService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

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
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

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
    setDeleteConfirmId(null);
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
                    {`${apiKey.key_prefix}...`}
                  </code>
                  <div className="flex items-center gap-2">
                    {apiKey.is_active ? (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleDeactivateKey(apiKey.id)}
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
                {/* Delete confirmation dialog */}
                {deleteConfirmId === apiKey.id && (
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
                        <Button variant="destructive" onClick={() => handleDeleteKey(apiKey.id)} className="px-8 py-2 text-base font-semibold rounded shadow">Delete</Button>
                        <Button variant="secondary" onClick={() => setDeleteConfirmId(null)} className="px-8 py-2 text-base font-semibold rounded shadow">Cancel</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default APIKeysManager;
