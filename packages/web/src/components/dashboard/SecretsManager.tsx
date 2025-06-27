import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showValues, setShowValues] = useState<{ [key: string]: boolean }>({});
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSecret, setEditingSecret] = useState<Secret | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    key: '',
    value: '',
    description: '',
    mcp_server_id: mcpServerId || ''
  });

  // Fetch secrets on component mount
  useEffect(() => {
    fetchSecrets();
  }, [mcpServerId]);

  const fetchSecrets = async () => {
    try {
      setIsLoading(true);
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
      setIsLoading(false);
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
      setIsCreating(true);
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
      setIsDialogOpen(false);
      
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
      setIsCreating(false);
    }
  };

  const handleUpdateSecret = async () => {
    if (!editingSecret) return;

    try {
      setIsCreating(true);
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
      setIsDialogOpen(false);
      
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
      setIsCreating(false);
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

  const handleCopyValue = (value: string) => {
    navigator.clipboard.writeText(value);
    toast({
      title: "Copied to clipboard",
      description: "Secret value has been copied to your clipboard.",
    });
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
    setIsDialogOpen(true);
  };

  const openEditDialog = (secret: Secret) => {
    setEditingSecret(secret);
    setFormData({
      key: secret.key,
      value: secret.value,
      description: secret.description || '',
      mcp_server_id: secret.mcp_server_id || mcpServerId || ''
    });
    setIsDialogOpen(true);
  };

  const handleTemplateSelect = (template: { key: string; description: string; placeholder: string }) => {
    setFormData(prev => ({
      ...prev,
      key: template.key,
      description: template.description
    }));
  };

  const templates = SecretsService.getCommonSecretTemplates();

  if (isLoading) {
    return (
      <Card className="bg-gray-900/50 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Environment Variables
          </CardTitle>
          <CardDescription className="text-gray-400">
            Manage environment variables for your MCP servers
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
          <Lock className="w-5 h-5" />
          Environment Variables
        </CardTitle>
        <CardDescription className="text-gray-400">
          Manage environment variables for your MCP servers
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Create New Secret */}
        <div className="flex gap-4">
          <Button 
            onClick={openCreateDialog}
            className="bg-gradient-to-r from-green-500 to-yellow-500 hover:from-green-600 hover:to-yellow-600 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Environment Variable
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowValues({})}
            className="text-gray-400 hover:text-white"
          >
            <Eye className="w-4 h-4 mr-2" />
            Show All Values
          </Button>
        </div>

        {/* Secrets List */}
        <div className="space-y-4">
          {secrets.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Lock className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No environment variables found</p>
              <p className="text-sm">Add your first environment variable to get started</p>
            </div>
          ) : (
            secrets.map((secret) => (
              <div key={secret.id} className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <h3 className="text-white font-medium font-mono">{secret.key}</h3>
                    {secret.is_encrypted && (
                      <Badge variant="secondary" className="text-xs">
                        Encrypted
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {secret.mcp_server_id ? 'Server-specific' : 'Global'}
                    </Badge>
                  </div>
                </div>
                
                <div className="flex items-center justify-between mb-2">
                  <code className="text-sm font-mono text-gray-300 bg-gray-800 px-3 py-1 rounded flex-1 mr-4">
                    {showValues[secret.id] ? secret.value : '•'.repeat(Math.min(secret.value.length, 20))}
                  </code>
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
                      onClick={() => handleCopyValue(secret.value)}
                      className="text-gray-400 hover:text-white"
                    >
                      <Copy className="w-4 h-4" />
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
                      className="text-gray-400 hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                {secret.description && (
                  <p className="text-xs text-gray-500 mb-2">{secret.description}</p>
                )}
                
                <p className="text-xs text-gray-500">
                  Updated {new Date(secret.updated_at).toLocaleDateString()}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="bg-gray-900 border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-white">
                {editingSecret ? 'Edit Environment Variable' : 'Add Environment Variable'}
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                {editingSecret 
                  ? 'Update the environment variable details below.'
                  : 'Add a new environment variable for your MCP server.'
                }
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Quick Templates */}
              {!editingSecret && (
                <div className="space-y-2">
                  <Label className="text-white">Quick Templates</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {templates.slice(0, 6).map((template) => (
                      <Button
                        key={template.key}
                        variant="outline"
                        size="sm"
                        onClick={() => handleTemplateSelect(template)}
                        className="text-xs text-gray-400 hover:text-white border-gray-600"
                      >
                        {template.key}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="key" className="text-white">Variable Name</Label>
                <Input
                  id="key"
                  placeholder="e.g., OPENAI_API_KEY"
                  value={formData.key}
                  onChange={(e) => setFormData(prev => ({ ...prev, key: e.target.value }))}
                  className="bg-gray-800 border-gray-700 text-white"
                />
                <p className="text-xs text-gray-500">
                  Use uppercase letters, numbers, and underscores only
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="value" className="text-white">Value</Label>
                <Textarea
                  id="value"
                  placeholder="Enter the secret value"
                  value={formData.value}
                  onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
                  className="bg-gray-800 border-gray-700 text-white min-h-[80px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-white">Description (Optional)</Label>
                <Input
                  id="description"
                  placeholder="What is this variable used for?"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={editingSecret ? handleUpdateSecret : handleCreateSecret}
                disabled={isCreating || !formData.key.trim() || !formData.value.trim()}
                className="bg-gradient-to-r from-green-500 to-yellow-500 hover:from-green-600 hover:to-yellow-600 text-white"
              >
                {isCreating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                {editingSecret ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default SecretsManager; 