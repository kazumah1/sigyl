
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Star, 
  Download, 
  Calendar, 
  User, 
  Package, 
  ExternalLink, 
  ArrowLeft,
  Github,
  Globe,
  Settings,
  Code,
  BookOpen,
  Shield,
  Tag,
  Users
} from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { MCPPackage, useMarketplace } from '@/hooks/useMarketplace';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const PackageDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [pkg, setPackage] = useState<MCPPackage | null>(null);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [loading, setLoading] = useState(true);
  const { packages, ratePackage, downloadPackage, getUserRating, loading: packagesLoading } = useMarketplace();
  const { user } = useAuth();

  useEffect(() => {
    console.log('Package ID from URL:', id);
    console.log('Available packages:', packages);
    
    if (id && !packagesLoading) {
      const foundPackage = packages.find(p => p.id === id);
      console.log('Found package:', foundPackage);
      
      if (foundPackage) {
        setPackage(foundPackage);
        
        if (user) {
          getUserRating(foundPackage.id).then(setUserRating);
        }
      } else {
        console.log('Package not found with ID:', id);
      }
      setLoading(false);
    }
  }, [id, packages, user, getUserRating, packagesLoading]);

  const handleRate = async (rating: number) => {
    if (!pkg || !user) {
      toast.error('Please log in to rate packages');
      return;
    }

    try {
      await ratePackage(pkg.id, rating);
      setUserRating(rating);
      toast.success(`Rated ${pkg.name} ${rating} stars`);
    } catch (error) {
      toast.error('Failed to rate package');
    }
  };

  const handleDownload = async () => {
    if (!pkg) return;

    setIsDownloading(true);
    try {
      await downloadPackage(pkg.id);
      toast.success(`${pkg.name} downloaded successfully!`);
    } catch (error) {
      toast.error('Failed to download package');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleGitHubClick = () => {
    if (pkg?.source_api_url) {
      window.open(pkg.source_api_url, '_blank');
    } else {
      toast.error('GitHub repository not available');
    }
  };

  if (loading || packagesLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white">
        <PageHeader />
        <div className="container mx-auto px-6 py-8 mt-16">
          <div className="flex items-center justify-center h-64">
            <div className="text-xl">Loading package details...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!pkg) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white">
        <PageHeader />
        <div className="container mx-auto px-6 py-8 mt-16">
          <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <div className="text-xl">Package not found</div>
            <Button
              variant="outline"
              onClick={() => navigate('/marketplace')}
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Marketplace
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <PageHeader />
      
      <div className="container mx-auto px-6 py-8 mt-16">
        {/* Back Navigation */}
        <Button
          variant="outline"
          onClick={() => navigate('/marketplace')}
          className="mb-6 border-gray-600 text-gray-300 hover:bg-gray-800"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Marketplace
        </Button>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-6 mb-6">
            <div className="p-5 bg-white/10 rounded-xl">
              <Package className="w-12 h-12 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-4xl font-bold text-white">{pkg.name}</h1>
                {pkg.verified && (
                  <Badge className="bg-green-500/20 text-green-400 flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    Verified
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-4 text-gray-400 mb-4">
                <span className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  by {pkg.author?.username || 'Unknown'}
                </span>
                <span className="flex items-center gap-1">
                  <Package className="w-4 h-4" />
                  v{pkg.version}
                </span>
                <span className="flex items-center gap-1">
                  <Download className="w-4 h-4" />
                  {pkg.downloads_count.toLocaleString()} downloads
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Updated {new Date(pkg.last_updated).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Rating */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => handleRate(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(null)}
                  className="transition-colors"
                  disabled={!user}
                >
                  <Star
                    className={`w-6 h-6 ${
                      star <= (hoveredRating || userRating || 0)
                        ? 'fill-yellow-400 text-yellow-400'
                        : star <= pkg.rating
                        ? 'fill-yellow-400/50 text-yellow-400/50'
                        : 'text-gray-600'
                    }`}
                  />
                </button>
              ))}
            </div>
            <span className="text-gray-400">
              {pkg.rating.toFixed(1)} average rating
              {userRating && <span className="ml-2 text-blue-400">Your rating: {userRating}</span>}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button
              onClick={handleDownload}
              disabled={isDownloading}
              className="bg-white hover:bg-gray-100 text-black font-semibold px-8"
            >
              {isDownloading ? 'Installing...' : 'Install & Deploy'}
            </Button>
            <Button
              onClick={handleGitHubClick}
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              <Github className="w-4 h-4 mr-2" />
              View on GitHub
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4 bg-gray-900/50">
                <TabsTrigger value="overview" className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="tools" className="flex items-center gap-2">
                  <Code className="w-4 h-4" />
                  Tools
                </TabsTrigger>
                <TabsTrigger value="deployment" className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Deployment
                </TabsTrigger>
                <TabsTrigger value="api" className="flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  API
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-6">
                <div className="space-y-6">
                  <Card className="bg-gray-900/50 border-gray-800">
                    <CardHeader>
                      <CardTitle className="text-white">Description</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-300 leading-relaxed">{pkg.description}</p>
                    </CardContent>
                  </Card>

                  {pkg.screenshots && pkg.screenshots.length > 0 && (
                    <Card className="bg-gray-900/50 border-gray-800">
                      <CardHeader>
                        <CardTitle className="text-white">Screenshots</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {pkg.screenshots.map((screenshot, index) => (
                            <img
                              key={index}
                              src={screenshot}
                              alt={`Screenshot ${index + 1}`}
                              className="w-full h-48 object-cover rounded-lg border border-gray-700"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="tools" className="mt-6">
                <Card className="bg-gray-900/50 border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-white">Available Tools</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {pkg.tools && pkg.tools.length > 0 ? (
                      <div className="space-y-4">
                        {pkg.tools.map((tool, index) => {
                          const toolName = typeof tool === 'string' ? tool : (tool as any)?.name || `Tool ${index + 1}`;
                          const toolDescription = typeof tool === 'string' 
                            ? 'This tool provides additional functionality for the MCP server.'
                            : (tool as any)?.description || 'Tool functionality and usage details would be displayed here.';

                          return (
                            <div key={index} className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                              <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                                <Code className="w-4 h-4" />
                                {toolName}
                              </h4>
                              <p className="text-gray-400 text-sm">
                                {toolDescription}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-400">
                        <Code className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No tools documented yet.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="deployment" className="mt-6">
                <Card className="bg-gray-900/50 border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-white">Deployment Guide</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div>
                        <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                          <Download className="w-4 h-4" />
                          Quick Install
                        </h4>
                        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                          <code className="text-green-400">npm install {pkg.name.toLowerCase().replace(/\s+/g, '-')}</code>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                          <Settings className="w-4 h-4" />
                          Configuration
                        </h4>
                        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                          <pre className="text-gray-300 text-sm overflow-x-auto">
{`{
  "mcpServers": {
    "${pkg.name.toLowerCase().replace(/\s+/g, '-')}": {
      "command": "node",
      "args": ["./node_modules/${pkg.name.toLowerCase().replace(/\s+/g, '-')}/dist/index.js"],
      "env": {
        // Add your environment variables here
      }
    }
  }
}`}
                          </pre>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold text-white mb-2">Environment Variables</h4>
                        <p className="text-gray-400 text-sm">
                          Configure the necessary environment variables for this MCP server to function properly. 
                          Check the documentation for specific requirements.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="api" className="mt-6">
                <Card className="bg-gray-900/50 border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-white">API Reference</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-white mb-2">MCP Protocol</h4>
                        <p className="text-gray-400 text-sm mb-4">
                          This server implements the Model Context Protocol (MCP) specification.
                        </p>
                      </div>
                      {pkg.source_api_url && (
                        <div>
                          <h4 className="font-semibold text-white mb-2">Source Code</h4>
                          <Button
                            onClick={handleGitHubClick}
                            variant="outline"
                            className="border-gray-600 text-gray-300 hover:bg-gray-800"
                          >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            View API Documentation
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">Package Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Category</span>
                  <Badge variant="outline" className="text-gray-300 border-gray-600 capitalize">
                    {pkg.category}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Version</span>
                  <span className="text-white font-mono">{pkg.version}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Downloads</span>
                  <span className="text-white font-semibold">{pkg.downloads_count.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Rating</span>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-white">{pkg.rating.toFixed(1)}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Status</span>
                  {pkg.verified ? (
                    <Badge className="bg-green-500/20 text-green-400">
                      <Shield className="w-3 h-3 mr-1" />
                      Verified
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-gray-400 border-gray-600">
                      Community
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  Tags
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {pkg.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-gray-400 border-gray-600">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Author
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-gray-400" />
                  </div>
                  <div>
                    <div className="font-medium text-white">
                      {pkg.author?.full_name || pkg.author?.username || 'Unknown'}
                    </div>
                    <div className="text-sm text-gray-400">
                      @{pkg.author?.username || 'unknown'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PackageDetails;
