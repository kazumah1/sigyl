import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { InteractiveBackground } from "@/components/InteractiveBackground";
import { OpeningAnimation } from "@/components/OpeningAnimation";
import { UserProfile } from "@/components/UserProfile";
import { ChevronRight, Book, Code, Zap, Settings, FileText, Terminal, Database, Server } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Docs = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [activeSection, setActiveSection] = useState("getting-started");
  const navigate = useNavigate();

  // Dark theme matching the landing page
  const currentTheme = {
    bg: 'bg-black',
    text: 'text-white',
    accent: 'text-indigo-400',
    card: 'bg-gray-900/50 border-gray-800',
    solid: 'text-indigo-400',
    gradient: 'from-indigo-500 to-pink-500',
    button: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    buttonSecondary: 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-700'
  };

  const sections = [
    { id: "getting-started", title: "Getting Started", icon: Zap },
    { id: "api-reference", title: "API Reference", icon: Code },
    { id: "guides", title: "Guides", icon: Book },
    { id: "configuration", title: "Configuration", icon: Settings },
  ];

  const content = {
    "getting-started": {
      title: "Getting Started with SIGYL",
      content: `
# Welcome to SIGYL

SIGYL is a strategic MCP deployment platform that empowers developers to deploy, command, and expand their agentic systems with precision.

## Quick Start

1. **Sign up** for a SIGYL account
2. **Explore** the marketplace for MCP tools
3. **Deploy** your first agent with our templates
4. **Scale** your agentic infrastructure

## Core Concepts

- **MCP Servers**: Model Context Protocol servers that power your agents
- **Strategic Deployment**: Precision-focused deployment with monitoring
- **Marketplace**: Curated tools, templates, and integrations
      `
    },
    "api-reference": {
      title: "API Reference",
      content: `
# API Reference

## Authentication

All API requests require authentication using API keys.

\`\`\`bash
curl -H "Authorization: Bearer YOUR_API_KEY" \\
  https://api.sigyl.com/v1/deployments
\`\`\`

## Endpoints

### Deployments

- \`GET /v1/deployments\` - List all deployments
- \`POST /v1/deployments\` - Create new deployment
- \`GET /v1/deployments/{id}\` - Get deployment details
- \`DELETE /v1/deployments/{id}\` - Remove deployment

### Marketplace

- \`GET /v1/marketplace\` - Browse available tools
- \`POST /v1/marketplace/install\` - Install marketplace item
      `
    },
    "guides": {
      title: "Deployment Guides",
      content: `
# Deployment Guides

## Deploying Your First MCP Server

Follow this step-by-step guide to deploy your first MCP server on SIGYL.

### Prerequisites

- SIGYL account
- Basic understanding of MCP
- Your server configuration

### Step 1: Choose a Template

Navigate to the Deploy section and select from our curated templates.

### Step 2: Configure

Customize your deployment settings and environment variables.

### Step 3: Deploy

Click deploy and monitor your server's status in real-time.
      `
    },
    "configuration": {
      title: "Configuration",
      content: `
# Configuration

## Environment Variables

Configure your MCP servers with these environment variables:

\`\`\`yaml
# sigyl.yml
name: my-mcp-server
runtime: node
env:
  MCP_PORT: 8080
  MCP_HOST: 0.0.0.0
  DATABASE_URL: your-db-url
\`\`\`

## Advanced Configuration

For advanced users, SIGYL supports custom Docker configurations and scaling policies.
      `
    }
  };

  return (
    <div className={`min-h-screen ${currentTheme.bg} relative overflow-hidden transition-all duration-700 ease-out`}>
      <InteractiveBackground theme={theme} onThemeChange={setTheme} />
      
      {!isLoaded && <OpeningAnimation variant="page" onComplete={() => setIsLoaded(true)} />}
      
      {/* Header - Matching landing page exactly */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-black/80 backdrop-blur-md border-b border-white/10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div 
              className="text-2xl font-bold tracking-tight text-white cursor-pointer hover:text-indigo-400 transition-colors"
              onClick={() => navigate('/')}
            >
              SIGYL
            </div>
            <nav className="flex items-center space-x-6">
              <button 
                onClick={() => navigate('/marketplace')}
                className="text-white font-bold tracking-tight hover:text-indigo-400 transition-colors"
              >
                Marketplace
              </button>
              <button 
                onClick={() => navigate('/docs')}
                className="text-white font-bold tracking-tight hover:text-indigo-400 transition-colors"
              >
                Docs
              </button>
              <button 
                onClick={() => navigate('/blog')}
                className="text-white font-bold tracking-tight hover:text-indigo-400 transition-colors"
              >
                Blog
              </button>
              <Button 
                onClick={() => navigate('/deploy')}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold tracking-tight"
              >
                Deploy
              </Button>
              <UserProfile />
            </nav>
          </div>
        </div>
      </header>

      <div className={`flex transition-all duration-1000 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
        {/* Sidebar */}
        <div className={`w-64 fixed left-0 top-28 bottom-0 ${currentTheme.card} backdrop-blur-sm border-r border-gray-800 z-40 animate-fade-in delay-200`}>
          <ScrollArea className="h-full">
            <div className="p-6">
              <h2 className={`text-lg font-bold tracking-tight mb-4 ${currentTheme.text}`}>Documentation</h2>
              <nav className="space-y-2">
                {sections.map((section, index) => {
                  const Icon = section.icon;
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-all duration-300 hover:scale-105 animate-fade-in font-bold tracking-tight ${
                        activeSection === section.id
                          ? `${currentTheme.button}`
                          : `${currentTheme.text} opacity-70 hover:opacity-100 hover:${currentTheme.buttonSecondary}`
                      }`}
                      style={{ animationDelay: `${400 + index * 100}ms` }}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{section.title}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </ScrollArea>
        </div>

        {/* Main Content */}
        <div className="flex-1 ml-64 pt-28">
          <div className="max-w-4xl mx-auto px-6 py-8">
            <div className="animate-fade-in delay-400">
              <h1 className={`text-4xl font-bold ${currentTheme.text} mb-6 tracking-tight`}>
                {content[activeSection as keyof typeof content].title}
              </h1>
              
              <div className={`${currentTheme.card} backdrop-blur-sm rounded-2xl p-8 border`}>
                <div className={`prose prose-invert max-w-none ${currentTheme.text}`}>
                  <pre className={`whitespace-pre-wrap font-mono text-sm leading-relaxed ${currentTheme.text}`}>
                    {content[activeSection as keyof typeof content].content}
                  </pre>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button className={`${currentTheme.button} font-bold tracking-tight transition-all duration-300 hover:scale-105`}>
                  <Terminal className="w-4 h-4 mr-2" />
                  Try API
                </Button>
                <Button className={`${currentTheme.buttonSecondary} font-bold tracking-tight transition-all duration-300 hover:scale-105`}>
                  <FileText className="w-4 h-4 mr-2" />
                  View Examples
                </Button>
                <Button className={`${currentTheme.buttonSecondary} font-bold tracking-tight transition-all duration-300 hover:scale-105`}>
                  <Server className="w-4 h-4 mr-2" />
                  Deploy Now
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Docs;
