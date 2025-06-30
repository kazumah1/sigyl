import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { X, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface PublishPackageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const PublishPackageModal: React.FC<PublishPackageModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    version: '1.0.0',
    category: 'general',
    logo_url: '',
    source_api_url: ''
  });
  const [tags, setTags] = useState<string[]>([]);
  const [tools, setTools] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [newTool, setNewTool] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please log in to publish packages');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('mcp_packages')
        .insert({
          ...formData,
          author_id: user.id,
          tags,
          tools: tools.length > 0 ? tools : null,
          downloads_count: 0,
          rating: 0.0,
          verified: false,
          screenshots: []
        });

      if (error) throw error;

      toast.success('Package published successfully!');
      onSuccess();
      onClose();
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        version: '1.0.0',
        category: 'general',
        logo_url: '',
        source_api_url: ''
      });
      setTags([]);
      setTools([]);
    } catch (error) {
      console.error('Error publishing package:', error);
      toast.error('Failed to publish package');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const addTool = () => {
    if (newTool.trim() && !tools.includes(newTool.trim())) {
      setTools([...tools, newTool.trim()]);
      setNewTool('');
    }
  };

  const removeTool = (toolToRemove: string) => {
    setTools(tools.filter(tool => tool !== toolToRemove));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gray-900/95 border-gray-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Publish New MCP Package</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Package Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-gray-800 border-gray-700 text-white"
                required
              />
            </div>
            <div>
              <Label htmlFor="version">Version *</Label>
              <Input
                id="version"
                value={formData.version}
                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                className="bg-gray-800 border-gray-700 text-white"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="bg-gray-800 border-gray-700 text-white min-h-[100px]"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-2"
              >
                <option value="general">General</option>
                <option value="database">Database</option>
                <option value="api">API Integration</option>
                <option value="ecommerce">E-commerce</option>
                <option value="analytics">Analytics</option>
                <option value="communication">Communication</option>
                <option value="storage">Storage</option>
              </select>
            </div>
            <div>
              <Label htmlFor="logo_url">Logo URL</Label>
              <Input
                id="logo_url"
                value={formData.logo_url}
                onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                className="bg-gray-800 border-gray-700 text-white"
                placeholder="https://..."
              />
            </div>
          </div>

          <div>
            <Label htmlFor="source_api_url">Source/API URL</Label>
            <Input
              id="source_api_url"
              value={formData.source_api_url}
              onChange={(e) => setFormData({ ...formData, source_api_url: e.target.value })}
              className="bg-gray-800 border-gray-700 text-white"
              placeholder="https://github.com/..."
            />
          </div>

          {/* Tags */}
          <div>
            <Label>Tags</Label>
            <div className="flex gap-2 mb-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                className="bg-gray-800 border-gray-700 text-white"
                placeholder="Add a tag..."
              />
              <Button type="button" onClick={addTag} size="sm">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-gray-400 border-gray-600">
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="ml-1 hover:text-red-400"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          {/* Tools */}
          <div>
            <Label>Available Tools</Label>
            <div className="flex gap-2 mb-2">
              <Input
                value={newTool}
                onChange={(e) => setNewTool(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTool())}
                className="bg-gray-800 border-gray-700 text-white"
                placeholder="Add a tool name..."
              />
              <Button type="button" onClick={addTool} size="sm">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {tools.map((tool) => (
                <span key={tool} className="bg-gray-800 text-gray-300 px-3 py-1 rounded text-sm">
                  {tool}
                  <button
                    type="button"
                    onClick={() => removeTool(tool)}
                    className="ml-2 hover:text-red-400"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-800">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-white hover:bg-gray-100 text-black font-semibold"
            >
              {isSubmitting ? 'Publishing...' : 'Publish Package'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
