import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Eye, EyeOff, Trash2, Edit, Save, X } from 'lucide-react';
import { toast } from 'sonner';

interface Secret {
  id: string;
  key: string;
  created_at: string;
}

interface SecretFormData {
  key: string;
  value: string;
}

const Secrets = () => {
  const { user } = useAuth();
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<SecretFormData>({ key: '', value: '' });
  const [showValues, setShowValues] = useState<Record<string, boolean>>({});

  const themes = {
    light: {
      bg: 'bg-white',
      text: 'text-gray-900',
      textSecondary: 'text-gray-600',
      card: 'bg-gray-50 border-gray-200',
      cardHover: 'hover:bg-gray-100',
      input: 'bg-white border-gray-300 text-gray-900',
      button: 'bg-blue-500 hover:bg-blue-600 text-white',
      buttonSecondary: 'bg-gray-200 hover:bg-gray-300 text-gray-900 border border-gray-300'
    },
    dark: {
      bg: 'bg-black',
      text: 'text-white',
      textSecondary: 'text-gray-300',
      card: 'bg-gray-900/50 border-gray-800',
      cardHover: 'hover:bg-gray-800/50',
      input: 'bg-gray-800 border-gray-700 text-white',
      button: 'bg-blue-500 hover:bg-blue-600 text-white',
      buttonSecondary: 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-700',
      accent: 'text-blue-400'
    }
  };

  const currentTheme = themes.dark;

  const fetchSecrets = async () => {
    if (!user?.access_token) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_REGISTRY_API_URL || 'http://localhost:3000'}/api/v1/secrets`, {
        headers: {
          'Authorization': `Bearer ${user.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      
      if (result.success) {
        setSecrets(result.data);
      } else {
        toast.error('Failed to fetch secrets');
      }
    } catch (error) {
      console.error('Error fetching secrets:', error);
      toast.error('Failed to fetch secrets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecrets();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.access_token) {
      toast.error('Authentication required');
      return;
    }

    if (!formData.key || !formData.value) {
      toast.error('Key and value are required');
      return;
    }

    // Validate key format (environment variable name)
    if (!/^[A-Z_][A-Z0-9_]*$/.test(formData.key)) {
      toast.error('Key must be a valid environment variable name (uppercase letters, numbers, and underscores only)');
      return;
    }

    try {
      const url = editingId 
        ? `${import.meta.env.VITE_REGISTRY_API_URL || 'http://localhost:3000'}/api/v1/secrets/${editingId}`
        : `${import.meta.env.VITE_REGISTRY_API_URL || 'http://localhost:3000'}/api/v1/secrets`;
      
      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${user.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (result.success) {
        toast.success(editingId ? 'Secret updated successfully' : 'Secret created successfully');
        setFormData({ key: '', value: '' });
        setShowForm(false);
        setEditingId(null);
        fetchSecrets();
      } else {
        toast.error(result.message || 'Failed to save secret');
      }
    } catch (error) {
      console.error('Error saving secret:', error);
      toast.error('Failed to save secret');
    }
  };

  const handleDelete = async (id: string) => {
    if (!user?.access_token) {
      toast.error('Authentication required');
      return;
    }

    if (!confirm('Are you sure you want to delete this secret?')) {
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_REGISTRY_API_URL || 'http://localhost:3000'}/api/v1/secrets/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Secret deleted successfully');
        fetchSecrets();
      } else {
        toast.error(result.message || 'Failed to delete secret');
      }
    } catch (error) {
      console.error('Error deleting secret:', error);
      toast.error('Failed to delete secret');
    }
  };

  const handleEdit = (secret: Secret) => {
    setEditingId(secret.id);
    setFormData({ key: secret.key, value: '' }); // Don't populate value for security
    setShowForm(true);
  };

  const handleCancel = () => {
    setFormData({ key: '', value: '' });
    setShowForm(false);
    setEditingId(null);
  };

  const toggleValueVisibility = (id: string) => {
    setShowValues(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${themes.dark.bg} ${themes.dark.text}`}>
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-800 rounded w-1/4 mb-8"></div>
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 bg-gray-800 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Secrets Manager
          </h1>
          <p className="text-gray-400 text-lg">
            Manage your API keys and sensitive configuration for MCP server deployments
          </p>
        </div>

        {/* Add Secret Button */}
        {!showForm && (
          <div className="mb-6">
            <Button 
              onClick={() => setShowForm(true)}
              className="btn-modern font-bold tracking-tight"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New Secret
            </Button>
          </div>
        )}

        {/* Add/Edit Secret Form */}
        {showForm && (
          <Card className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
            <CardHeader>
              <CardTitle className="text-white">
                {editingId ? 'Edit Secret' : 'Add New Secret'}
              </CardTitle>
              <CardDescription className="text-gray-400">
                {editingId 
                  ? 'Update your secret key and value' 
                  : 'Add a new secret that will be available during MCP server deployment'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="key" className="text-white font-bold tracking-tight">
                    Environment Variable Name
                  </Label>
                  <Input
                    id="key"
                    type="text"
                    placeholder="OPENAI_API_KEY"
                    value={formData.key}
                    onChange={(e) => setFormData(prev => ({ ...prev, key: e.target.value.toUpperCase() }))}
                    className="bg-black border-white/10 text-white border-2 focus:border-white mt-1"
                    pattern="^[A-Z_][A-Z0-9_]*$"
                    title="Must be uppercase letters, numbers, and underscores only, starting with a letter or underscore"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Use uppercase letters, numbers, and underscores only
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="value" className="text-white font-bold tracking-tight">
                    Secret Value
                  </Label>
                  <Input
                    id="value"
                    type="password"
                    placeholder="sk-..."
                    value={formData.value}
                    onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
                    className="bg-black border-white/10 text-white border-2 focus:border-white mt-1"
                    required
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    This value will be encrypted and securely stored
                  </p>
                </div>

                <div className="flex space-x-3">
                  <Button 
                    type="submit"
                    className="btn-modern font-bold tracking-tight"
                  >
                    {editingId ? (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Update Secret
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Secret
                      </>
                    )}
                  </Button>
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    className="border-white/20 text-white hover:bg-white/10 font-bold tracking-tight"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Secrets List */}
        <div className="space-y-4">
          {secrets.length === 0 ? (
            <Card className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <div className="text-gray-500 mb-4">
                    <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-300 mb-2">No secrets yet</h3>
                  <p className="text-gray-500 mb-4">
                    Add your first secret to get started with secure MCP server deployments
                  </p>
                  <Button 
                    onClick={() => setShowForm(true)}
                    className="btn-modern font-bold tracking-tight"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Secret
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            secrets.map((secret) => (
              <Card key={secret.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <Badge variant="secondary" className="bg-white/10 text-white border-white/20">
                          {secret.key}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          Created {new Date(secret.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 mt-1">
                        This secret will be available as an environment variable during deployment
                      </p>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleValueVisibility(secret.id)}
                        className="text-gray-400 hover:text-white"
                      >
                        {showValues[secret.id] ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(secret)}
                        className="text-gray-400 hover:text-white"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(secret.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Security Notice */}
        <Card className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mt-8">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <div className="text-yellow-400 mt-0.5">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h4 className="font-medium text-yellow-400 mb-1">Security Notice</h4>
                <p className="text-sm text-gray-400">
                  Your secrets are encrypted at rest and only accessible during deployment. 
                  Never share your secret values or commit them to version control.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Secrets; 