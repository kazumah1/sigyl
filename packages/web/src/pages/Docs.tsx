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
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Liquid Glass Blobs */}
      <div className="liquid-glass-blob blob-1" />
      <div className="liquid-glass-blob blob-2" />
      <div className="liquid-glass-blob blob-3" />
      <PageHeader />
      
      <div className="container mx-auto px-6 py-8 mt-16 relative z-10">
        {/* Header */}
        <div className="mb-12 text-left flex flex-col gap-3 sm:gap-5 max-w-2xl">
          <h1 className="hero-heading text-3xl sm:text-4xl lg:text-5xl xl:text-6xl mb-0" style={{lineHeight:'1.08', letterSpacing:'-0.02em'}}>Documentation</h1>
          <p className="hero-subheading text-lg sm:text-xl text-gray-300 font-normal w-full text-left" style={{fontFamily:'Space Grotesk, Inter, system-ui, sans-serif', lineHeight:'1.5', marginTop:'0.25em'}}>
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
              <h3 className="text-lg font-semibold mb-4" style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}>Categories</h3>
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
                  <h2 className="text-3xl font-bold mb-6" style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}>Quick Start Guides</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {quickStartGuides.map((guide, index) => {
                      const IconComponent = guide.icon;
                      return (
                        <Card key={index} className="card-modern hover-lift cursor-pointer">
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
                            <CardTitle className="text-xl font-bold" style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}>
                              {guide.title}
                            </CardTitle>
                            <CardDescription className="text-gray-300">
                              {guide.description}
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-center gap-2 text-sm text-gray-400">
                              <Clock className="w-4 h-4" />
                              {guide.duration}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </section>

                {/* API Reference */}
                <section>
                  <h2 className="text-3xl font-bold mb-6" style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}>API Reference</h2>
                  <div className="space-y-4">
                    {apiEndpoints.map((endpoint, index) => (
                      <Card key={index} className="card-modern">
                        <CardHeader>
                          <div className="flex items-center gap-3">
                            <Badge className={`text-xs ${
                              endpoint.method === 'GET' ? 'bg-green-500/20 text-green-400' :
                              endpoint.method === 'POST' ? 'bg-blue-500/20 text-blue-400' :
                              'bg-gray-500/20 text-gray-400'
                            }`}>
                              {endpoint.method}
                            </Badge>
                            <code className="text-sm font-mono text-white bg-gray-800 px-2 py-1 rounded">
                              {endpoint.endpoint}
                            </code>
                          </div>
                          <CardTitle className="text-lg" style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}>
                            {endpoint.description}
                          </CardTitle>
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                </section>

                {/* SDK Examples */}
                <section>
                  <h2 className="text-3xl font-bold mb-6" style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}>SDK Examples</h2>
                  <div className="space-y-6">
                    {sdkExamples.map((example, index) => (
                      <Card key={index} className="card-modern">
                        <CardHeader>
                          <CardTitle className="text-xl" style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}>
                            {example.language}
                          </CardTitle>
                          <CardDescription className="text-gray-300">
                            {example.description}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <pre className="bg-gray-900 p-4 rounded-lg overflow-x-auto">
                            <code className="text-sm text-gray-300">{example.code}</code>
                          </pre>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {selectedCategory === 'api-reference' && (
              <div className="space-y-8">
                <h2 className="text-3xl font-bold mb-6" style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}>API Reference</h2>
                <p className="text-gray-300 text-lg">
                  Complete API documentation for integrating with SIGYL's platform.
                </p>
                {/* Add more API reference content here */}
              </div>
            )}

            {selectedCategory === 'deployment' && (
              <div className="space-y-8">
                <h2 className="text-3xl font-bold mb-6" style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}>Deployment Guide</h2>
                <p className="text-gray-300 text-lg">
                  Learn how to deploy your MCP servers to production environments.
                </p>
                {/* Add more deployment content here */}
              </div>
            )}

            {selectedCategory === 'security' && (
              <div className="space-y-8">
                <h2 className="text-3xl font-bold mb-6" style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}>Security</h2>
                <p className="text-gray-300 text-lg">
                  Best practices for securing your MCP integrations and deployments.
                </p>
                {/* Add more security content here */}
              </div>
            )}

            {selectedCategory === 'integrations' && (
              <div className="space-y-8">
                <h2 className="text-3xl font-bold mb-6" style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}>Integrations</h2>
                <p className="text-gray-300 text-lg">
                  Connect with popular services and APIs through our integration library.
                </p>
                {/* Add more integrations content here */}
              </div>
            )}

            {selectedCategory === 'advanced' && (
              <div className="space-y-8">
                <h2 className="text-3xl font-bold mb-6" style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}>Advanced Topics</h2>
                <p className="text-gray-300 text-lg">
                  Advanced techniques and patterns for building sophisticated MCP applications.
                </p>
                {/* Add more advanced content here */}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Docs;
