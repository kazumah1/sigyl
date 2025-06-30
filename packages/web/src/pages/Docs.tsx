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
  Users,
  Terminal,
  FileText,
  Rocket,
  Play
} from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { useNavigate } from 'react-router-dom';

const Docs = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('getting-started');

  const categories = [
    { id: 'getting-started', name: 'Getting Started', icon: Zap },
    { id: 'quickstart', name: 'Quickstart', icon: Rocket },
    { id: 'installation', name: 'Installation', icon: Terminal },
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
      icon: Zap,
      href: '#'
    },
    {
      title: 'Authentication & Security',
      description: 'Set up secure authentication for your MCP integrations',
      duration: '10 min read',
      level: 'Intermediate',
      icon: Shield,
      href: '#'
    },
    {
      title: 'Building Custom Integrations',
      description: 'Create custom MCP servers for your specific needs',
      duration: '15 min read',
      level: 'Advanced',
      icon: Code,
      href: '#'
    },
    {
      title: 'Monitoring & Analytics',
      description: 'Track performance and usage of your MCP deployments',
      duration: '8 min read',
      level: 'Intermediate',
      icon: Settings,
      href: '#'
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

  const quickActions = [
    {
      title: 'Deploy Now',
      description: 'Start with deployment wizard',
      action: () => navigate('/deploy'),
      icon: Rocket
    },
    {
      title: 'View Examples',
      description: 'Browse marketplace',
      action: () => navigate('/marketplace'),
      icon: Code
    }
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      <PageHeader />
      
      <div className="flex">
        {/* Sidebar - Mintlify style */}
        <div className="w-64 min-h-screen bg-black border-r border-white/10 fixed left-0 top-16 overflow-y-auto">
          <div className="p-6">
            {/* Search */}
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-transparent border-white/20 text-white placeholder-gray-400 h-9 text-sm focus:border-white/40"
              />
            </div>

            {/* Navigation */}
            <nav className="space-y-1">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Documentation
              </div>
              {categories.map((category) => {
                const IconComponent = category.icon;
                return (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors text-sm ${
                      selectedCategory === category.id
                        ? 'bg-white text-black font-medium'
                        : 'text-gray-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <IconComponent className="w-4 h-4" />
                    {category.name}
                  </button>
                );
              })}
            </nav>

            {/* Quick Actions */}
            <div className="mt-8 pt-6 border-t border-white/10">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Quick Actions
              </div>
              <div className="space-y-2">
                {quickActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={action.action}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors text-sm text-gray-300 hover:text-white hover:bg-white/5"
                  >
                    <action.icon className="w-4 h-4" />
                    <div>
                      <div className="font-medium">{action.title}</div>
                      <div className="text-xs text-gray-500">{action.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 ml-64">
          <div className="p-8 mt-16">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-4xl font-bold mb-4" style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}>
                Documentation
              </h1>
              <p className="text-gray-400 text-lg">
                Everything you need to build, deploy, and manage MCP servers with SIGYL.
              </p>
            </div>

            {/* Content based on selected category */}
            {selectedCategory === 'getting-started' && (
              <div className="space-y-12">
                {/* Introduction */}
                <section>
                  <h2 className="text-2xl font-bold mb-4" style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}>
                    Introduction
                  </h2>
                  <div className="prose prose-invert max-w-none">
                    <p className="text-gray-300 text-lg leading-relaxed mb-6">
                      SIGYL is a platform for building, deploying, and managing Model Context Protocol (MCP) servers. 
                      Get started with our comprehensive guides and examples.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                      <div className="p-4 border border-white/10 rounded-lg">
                        <h3 className="font-semibold text-white mb-2">Quick deployment</h3>
                        <p className="text-gray-400 text-sm">Deploy MCP servers in minutes with our automated pipeline</p>
                      </div>
                      <div className="p-4 border border-white/10 rounded-lg">
                        <h3 className="font-semibold text-white mb-2">Auto-scaling</h3>
                        <p className="text-gray-400 text-sm">Automatically scale based on demand with Google Cloud Run</p>
                      </div>
                      <div className="p-4 border border-white/10 rounded-lg">
                        <h3 className="font-semibold text-white mb-2">Secure by default</h3>
                        <p className="text-gray-400 text-sm">Built-in security features and best practices</p>
                      </div>
                      <div className="p-4 border border-white/10 rounded-lg">
                        <h3 className="font-semibold text-white mb-2">No setup required</h3>
                        <p className="text-gray-400 text-sm">Start building immediately from your dashboard</p>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Quick Start Guides */}
                <section>
                  <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}>
                    Quick Start Guides
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {quickStartGuides.map((guide, index) => {
                      const IconComponent = guide.icon;
                      return (
                        <div key={index} className="border border-white/10 rounded-lg p-6 hover:border-white/20 transition-colors cursor-pointer">
                          <div className="flex items-start gap-4">
                            <div className="p-2 border border-white/20 rounded-lg">
                              <IconComponent className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-semibold text-white">{guide.title}</h3>
                                <Badge variant="outline" className={`text-xs border-white/20 ${
                                  guide.level === 'Beginner' ? 'text-green-400' :
                                  guide.level === 'Intermediate' ? 'text-yellow-400' :
                                  'text-red-400'
                                }`}>
                                  {guide.level}
                                </Badge>
                              </div>
                              <p className="text-gray-400 text-sm mb-3">{guide.description}</p>
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <Clock className="w-3 h-3" />
                                {guide.duration}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </div>
            )}

            {selectedCategory === 'quickstart' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-bold mb-4" style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}>
                    Quickstart
                  </h2>
                  <p className="text-gray-400 text-lg mb-6">
                    Get up and running with SIGYL in under 5 minutes.
                  </p>
                  <div className="space-y-6">
                    <div className="border border-white/10 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-white mb-3">1. Connect your GitHub account</h3>
                      <p className="text-gray-400 mb-4">Link your GitHub account to access your repositories.</p>
                      <Button 
                        onClick={() => navigate('/deploy')}
                        className="bg-white text-black hover:bg-gray-200"
                      >
                        Connect GitHub
                      </Button>
                    </div>
                    <div className="border border-white/10 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-white mb-3">2. Choose a repository</h3>
                      <p className="text-gray-400">Select a repository containing your MCP server code.</p>
                    </div>
                    <div className="border border-white/10 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-white mb-3">3. Deploy</h3>
                      <p className="text-gray-400">Click deploy and watch your MCP server go live.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {selectedCategory === 'installation' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-bold mb-4" style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}>
                    Installation
                  </h2>
                  <p className="text-gray-400 text-lg mb-6">
                    Install the SIGYL CLI and SDK to get started.
                  </p>
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3">CLI Installation</h3>
                      <div className="bg-gray-900 p-4 rounded-lg">
                        <code className="text-green-400">npm install -g @sigyl/cli</code>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3">SDK Installation</h3>
                      <div className="bg-gray-900 p-4 rounded-lg">
                        <code className="text-green-400">npm install @sigyl/sdk</code>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {selectedCategory === 'api-reference' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-bold mb-4" style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}>
                    API Reference
                  </h2>
                  <p className="text-gray-400 text-lg mb-6">
                    Complete API documentation for integrating with SIGYL's platform.
                  </p>
                  <div className="space-y-4">
                    {apiEndpoints.map((endpoint, index) => (
                      <div key={index} className="border border-white/10 rounded-lg p-4">
                        <div className="flex items-center gap-3 mb-2">
                          <Badge variant="outline" className={`text-xs border-white/20 ${
                            endpoint.method === 'GET' ? 'text-green-400' :
                            endpoint.method === 'POST' ? 'text-blue-400' :
                            'text-gray-400'
                          }`}>
                            {endpoint.method}
                          </Badge>
                          <code className="text-sm font-mono text-white bg-gray-900 px-2 py-1 rounded">
                            {endpoint.endpoint}
                          </code>
                        </div>
                        <p className="text-gray-400 text-sm">{endpoint.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {selectedCategory === 'deployment' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-bold mb-4" style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}>
                    Deployment Guide
                  </h2>
                  <p className="text-gray-400 text-lg mb-6">
                    Learn how to deploy your MCP servers to production environments.
                  </p>
                  <div className="space-y-6">
                    <div className="border border-white/10 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-white mb-3">Automated Deployment</h3>
                      <p className="text-gray-400 mb-4">SIGYL automatically deploys your MCP servers to Google Cloud Run.</p>
                      <ul className="space-y-2 text-gray-400">
                        <li>• Automatic scaling based on demand</li>
                        <li>• Zero-downtime deployments</li>
                        <li>• Built-in monitoring and logging</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {selectedCategory === 'security' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-bold mb-4" style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}>
                    Security
                  </h2>
                  <p className="text-gray-400 text-lg mb-6">
                    Best practices for securing your MCP integrations and deployments.
                  </p>
                  <div className="space-y-6">
                    <div className="border border-white/10 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-white mb-3">API Keys</h3>
                      <p className="text-gray-400">Manage your API keys securely through the dashboard.</p>
                    </div>
                    <div className="border border-white/10 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-white mb-3">Environment Variables</h3>
                      <p className="text-gray-400">Store sensitive configuration in encrypted environment variables.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {selectedCategory === 'integrations' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-bold mb-4" style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}>
                    Integrations
                  </h2>
                  <p className="text-gray-400 text-lg mb-6">
                    Connect with popular services and APIs through our integration library.
                  </p>
                  <div className="space-y-6">
                    <div className="border border-white/10 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-white mb-3">GitHub Integration</h3>
                      <p className="text-gray-400">Connect your GitHub repositories for automatic deployments.</p>
                    </div>
                    <div className="border border-white/10 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-white mb-3">Claude Desktop</h3>
                      <p className="text-gray-400">Install MCP servers directly into Claude Desktop.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {selectedCategory === 'advanced' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-bold mb-4" style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}>
                    Advanced Topics
                  </h2>
                  <p className="text-gray-400 text-lg mb-6">
                    Advanced techniques and patterns for building sophisticated MCP applications.
                  </p>
                  <div className="space-y-6">
                    <div className="border border-white/10 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-white mb-3">Custom Tooling</h3>
                      <p className="text-gray-400">Build custom tools and integrations for your specific use case.</p>
                    </div>
                    <div className="border border-white/10 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-white mb-3">Performance Optimization</h3>
                      <p className="text-gray-400">Optimize your MCP servers for maximum performance and efficiency.</p>
                    </div>
                  </div>
                </div>

                {/* SDK Examples */}
                <section>
                  <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}>
                    SDK Examples
                  </h2>
                  <div className="space-y-6">
                    {sdkExamples.map((example, index) => (
                      <div key={index} className="border border-white/10 rounded-lg">
                        <div className="p-4 border-b border-white/10">
                          <h3 className="text-lg font-semibold text-white">{example.language}</h3>
                          <p className="text-gray-400 text-sm">{example.description}</p>
                        </div>
                        <div className="p-4">
                          <pre className="bg-gray-900 p-4 rounded-lg overflow-x-auto">
                            <code className="text-sm text-gray-300">{example.code}</code>
                          </pre>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Docs;
