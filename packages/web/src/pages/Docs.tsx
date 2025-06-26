import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  BookOpen, 
  Code, 
  Zap, 
  Shield, 
  Settings, 
  Database, 
  Globe, 
  GitBranch,
  ExternalLink,
  ChevronRight,
  Clock,
  Users
} from 'lucide-react';
import PageHeader from '@/components/PageHeader';

const Docs = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('getting-started');

  const categories = [
    { id: 'getting-started', name: 'Getting Started', icon: Zap },
    { id: 'api-reference', name: 'API Reference', icon: Code },
    { id: 'deployment', name: 'Deployment', icon: Globe },
    { id: 'security', name: 'Security', icon: Shield },
    { id: 'integrations', name: 'Integrations', icon: Database },
    { id: 'advanced', name: 'Advanced', icon: Settings }
  ];

  const quickStartGuides = [
    {
      title: 'Deploy Your First MCP Server',
      description: 'Learn how to deploy a basic MCP server in under 5 minutes',
      duration: '5 min read',
      level: 'Beginner',
      icon: Zap
    },
    {
      title: 'Authentication & Security',
      description: 'Set up secure authentication for your MCP integrations',
      duration: '10 min read',
      level: 'Intermediate',
      icon: Shield
    },
    {
      title: 'Building Custom Integrations',
      description: 'Create custom MCP servers for your specific needs',
      duration: '15 min read',
      level: 'Advanced',
      icon: Code
    },
    {
      title: 'Monitoring & Analytics',
      description: 'Track performance and usage of your MCP deployments',
      duration: '8 min read',
      level: 'Intermediate',
      icon: Settings
    }
  ];

  const apiEndpoints = [
    {
      method: 'POST',
      endpoint: '/api/v1/servers',
      description: 'Create a new MCP server deployment',
      category: 'Servers'
    },
    {
      method: 'GET',
      endpoint: '/api/v1/servers/{id}',
      description: 'Retrieve server details and status',
      category: 'Servers'
    },
    {
      method: 'POST',
      endpoint: '/api/v1/integrations',
      description: 'Configure new integration connection',
      category: 'Integrations'
    },
    {
      method: 'GET',
      endpoint: '/api/v1/metrics',
      description: 'Fetch usage metrics and analytics',
      category: 'Analytics'
    }
  ];

  const sdkExamples = [
    {
      language: 'JavaScript',
      code: `import { SigylClient } from '@sigyl/sdk';

const client = new SigylClient({
  apiKey: 'your-api-key'
});

const server = await client.servers.create({
  name: 'My MCP Server',
  template: 'nodejs-express'
});`,
      description: 'Create and deploy a new MCP server'
    },
    {
      language: 'Python',
      code: `from sigyl import SigylClient

client = SigylClient(api_key='your-api-key')

server = client.servers.create(
    name='My MCP Server',
    template='python-fastapi'
)`,
      description: 'Python SDK usage example'
    }
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <PageHeader />
      
      <div className="container mx-auto px-6 py-8 mt-16">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-5xl font-bold mb-4 gradient-text">Documentation</h1>
          <p className="text-xl text-gray-400 max-w-3xl">
            Everything you need to know about building, deploying, and managing MCP servers with SIGYL.
          </p>
        </div>

        {/* Search */}
        <div className="mb-8">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search documentation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-gray-900/50 border-gray-700 text-white h-12"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="card-modern p-6 sticky top-8">
              <h3 className="text-lg font-semibold mb-4">Categories</h3>
              <nav className="space-y-2">
                {categories.map((category) => {
                  const IconComponent = category.icon;
                  return (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                        selectedCategory === category.id
                          ? 'bg-white text-black'
                          : 'text-gray-300 hover:bg-gray-800/50 hover:text-white'
                      }`}
                    >
                      <IconComponent className="w-4 h-4" />
                      {category.name}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {selectedCategory === 'getting-started' && (
              <div className="space-y-8">
                {/* Quick Start */}
                <section>
                  <h2 className="text-3xl font-bold mb-6">Quick Start Guides</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {quickStartGuides.map((guide, index) => {
                      const IconComponent = guide.icon;
                      return (
                        <Card key={index} className="bg-gray-900/50 border-gray-800 hover:bg-gray-800/50 transition-all duration-300 hover-lift cursor-pointer">
                          <CardHeader>
                            <div className="flex items-center gap-3 mb-2">
                              <div className="p-2 bg-white/10 rounded-lg">
                                <IconComponent className="w-5 h-5 text-white" />
                              </div>
                              <div>
                                <Badge className={`text-xs ${
                                  guide.level === 'Beginner' ? 'bg-green-500/20 text-green-400' :
                                  guide.level === 'Intermediate' ? 'bg-yellow-500/20 text-yellow-400' :
                                  'bg-red-500/20 text-red-400'
                                }`}>
                                  {guide.level}
                                </Badge>
                              </div>
                            </div>
                            <CardTitle className="text-white">{guide.title}</CardTitle>
                            <CardDescription className="text-gray-400">
                              {guide.description}
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-center justify-between">
                              <span className="flex items-center gap-1 text-sm text-gray-400">
                                <Clock className="w-3 h-3" />
                                {guide.duration}
                              </span>
                              <ChevronRight className="w-4 h-4 text-gray-400" />
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </section>

                {/* Installation */}
                <section>
                  <h2 className="text-3xl font-bold mb-6">Installation</h2>
                  <div className="card-modern p-6">
                    <h3 className="text-xl font-semibold mb-4">Install the SIGYL CLI</h3>
                    <div className="bg-gray-950 rounded-lg p-4 mb-4">
                      <code className="text-green-400">npm install -g @sigyl/cli</code>
                    </div>
                    <p className="text-gray-400 mb-4">
                      The SIGYL CLI provides everything you need to create, deploy, and manage your MCP servers.
                    </p>
                    <Button className="btn-primary">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View CLI Documentation
                    </Button>
                  </div>
                </section>
              </div>
            )}

            {selectedCategory === 'api-reference' && (
              <div className="space-y-8">
                <section>
                  <h2 className="text-3xl font-bold mb-6">API Reference</h2>
                  <p className="text-gray-400 mb-8">
                    Complete reference for the SIGYL REST API. All endpoints require authentication via API key.
                  </p>

                  <div className="space-y-4">
                    {apiEndpoints.map((endpoint, index) => (
                      <Card key={index} className="bg-gray-900/50 border-gray-800">
                        <CardContent className="p-6">
                          <div className="flex items-center gap-4 mb-3">
                            <Badge className={`text-xs font-mono ${
                              endpoint.method === 'GET' ? 'bg-blue-500/20 text-blue-400' :
                              endpoint.method === 'POST' ? 'bg-green-500/20 text-green-400' :
                              endpoint.method === 'PUT' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-red-500/20 text-red-400'
                            }`}>
                              {endpoint.method}
                            </Badge>
                            <code className="text-white font-mono">{endpoint.endpoint}</code>
                            <Badge variant="outline" className="text-xs text-gray-400 border-gray-600">
                              {endpoint.category}
                            </Badge>
                          </div>
                          <p className="text-gray-400">{endpoint.description}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </section>

                <section>
                  <h2 className="text-3xl font-bold mb-6">SDKs & Examples</h2>
                  <div className="space-y-6">
                    {sdkExamples.map((example, index) => (
                      <Card key={index} className="bg-gray-900/50 border-gray-800">
                        <CardHeader>
                          <CardTitle className="text-white flex items-center gap-2">
                            <Code className="w-5 h-5" />
                            {example.language}
                          </CardTitle>
                          <CardDescription className="text-gray-400">
                            {example.description}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="bg-gray-950 rounded-lg p-4 overflow-x-auto">
                            <pre className="text-sm">
                              <code className="text-gray-300">{example.code}</code>
                            </pre>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {/* Other category content would be similar */}
            {selectedCategory !== 'getting-started' && selectedCategory !== 'api-reference' && (
              <div className="text-center py-16">
                <BookOpen className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Documentation Coming Soon</h3>
                <p className="text-gray-400">
                  We're working on comprehensive documentation for this section.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Community Section */}
        <div className="mt-16">
          <div className="card-modern p-8 text-center">
            <Users className="w-12 h-12 text-white mx-auto mb-4" />
            <h3 className="text-2xl font-bold mb-4">Need Help?</h3>
            <p className="text-gray-400 mb-6 max-w-2xl mx-auto">
              Join our community of developers building with SIGYL. Get help, share your projects, and contribute to the ecosystem.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button className="btn-secondary">
                <GitBranch className="w-4 h-4 mr-2" />
                GitHub Discussions
              </Button>
              <Button className="btn-primary">
                Join Discord
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Docs;
