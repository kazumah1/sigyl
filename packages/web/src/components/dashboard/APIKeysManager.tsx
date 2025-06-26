
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Key, Plus, Copy, Trash2, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface APIKey {
  id: string;
  name: string;
  key: string;
  lastUsed: string | null;
  createdAt: string;
}

interface APIKeysManagerProps {
  workspaceId: string;
}

const APIKeysManager: React.FC<APIKeysManagerProps> = ({ workspaceId }) => {
  const { toast } = useToast();
  const [apiKeys, setApiKeys] = useState<APIKey[]>([
    {
      id: '1',
      name: 'Production API Key',
      key: 'sk_live_4f7c8d9e2a1b3c5f6e8d9a2b3c4e5f6g',
      lastUsed: '2024-01-20T10:30:00Z',
      createdAt: '2024-01-15T14:20:00Z'
    },
    {
      id: '2',
      name: 'Development Key',
      key: 'sk_test_1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p',
      lastUsed: null,
      createdAt: '2024-01-18T09:15:00Z'
    }
  ]);
  
  const [newKeyName, setNewKeyName] = useState('');
  const [showKeys, setShowKeys] = useState<{ [key: string]: boolean }>({});

  const handleCreateKey = () => {
    if (!newKeyName.trim()) return;
    
    const newKey: APIKey = {
      id: Date.now().toString(),
      name: newKeyName,
      key: `sk_live_${Math.random().toString(36).substring(2, 34)}`,
      lastUsed: null,
      createdAt: new Date().toISOString()
    };
    
    setApiKeys(prev => [...prev, newKey]);
    setNewKeyName('');
    
    toast({
      title: "API Key Created",
      description: `New API key "${newKeyName}" has been created successfully.`,
    });
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast({
      title: "Copied to clipboard",
      description: "API key has been copied to your clipboard.",
    });
  };

  const handleDeleteKey = (id: string) => {
    setApiKeys(prev => prev.filter(key => key.id !== id));
    toast({
      title: "API Key Deleted",
      description: "API key has been permanently deleted.",
    });
  };

  const toggleKeyVisibility = (id: string) => {
    setShowKeys(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const maskKey = (key: string) => {
    return key.substring(0, 12) + '•'.repeat(20) + key.substring(key.length - 4);
  };

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
          />
          <Button 
            onClick={handleCreateKey}
            className="bg-gradient-to-r from-green-500 to-yellow-500 hover:from-green-600 hover:to-yellow-600 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Key
          </Button>
        </div>

        {/* API Keys List */}
        <div className="space-y-4">
          {apiKeys.map((apiKey) => (
            <div key={apiKey.id} className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-medium">{apiKey.name}</h3>
                <div className="flex items-center gap-2">
                  {apiKey.lastUsed ? (
                    <Badge variant="secondary" className="text-xs">
                      Last used {new Date(apiKey.lastUsed).toLocaleDateString()}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">
                      Never used
                    </Badge>
                  )}
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <code className="text-sm font-mono text-gray-300 bg-gray-800 px-3 py-1 rounded">
                  {showKeys[apiKey.id] ? apiKey.key : maskKey(apiKey.key)}
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
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopyKey(apiKey.key)}
                    className="text-gray-400 hover:text-white"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteKey(apiKey.id)}
                    className="text-gray-400 hover:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <p className="text-xs text-gray-500 mt-2">
                Created {new Date(apiKey.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default APIKeysManager;
