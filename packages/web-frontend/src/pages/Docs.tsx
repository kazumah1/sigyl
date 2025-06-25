import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { InteractiveBackground } from "@/components/InteractiveBackground";
import { OpeningAnimation } from "@/components/OpeningAnimation";
import { UserProfile } from "@/components/UserProfile";
import { ChevronRight, Book, Code, Zap, Settings, FileText, Terminal, Database, Server, Cpu, GitBranch } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';

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
    { id: "cli-tools", title: "CLI Tools", icon: Terminal },
    { id: "api-reference", title: "API Reference", icon: Code },
    { id: "deployment", title: "Deployment", icon: Server },
    { id: "configuration", title: "Configuration", icon: Settings },
  ];

  const content = {
    "getting-started": {
      title: "Getting Started with SIGIL",
      content: `# Welcome to SIGIL

SIGIL is an end-to-end MCP (Model Context Protocol) Registry & Hosting Platform that enables developers to deploy, discover, and manage MCP servers with ease.

## What is SIGIL?

SIGIL provides a complete ecosystem for MCP development:

- **🚀 One-Click Deployment**: Deploy MCP servers directly from GitHub repositories
- **🔍 Package Discovery**: Browse and search MCP packages in a visual marketplace
- **🛠️ CLI Tools**: Automatically generate MCP servers from existing web applications
- **📊 Real-time Monitoring**: Track deployment status and health
- **🔐 GitHub Integration**: OAuth authentication with repository access

## Quick Start

### 1. Sign Up & Authentication
1. Navigate to the [Deploy](/deploy) page
2. Sign in with your GitHub account
3. Grant necessary permissions for repository access

### 2. Choose Your Path

**Option A - Deploy from GitHub:**
- Select a repository with an existing \`mcp.yaml\` file
- Configure deployment settings
- Deploy with one click

**Option B - Generate from Existing App:**
- Use our CLI tools to scan your FastAPI or Express.js app
- Automatically generate MCP server code
- Deploy the generated server

**Option C - Browse Marketplace:**
- Explore the [Marketplace](/marketplace) for existing MCP packages
- Install and deploy pre-built solutions
- Customize to your needs

## Core Concepts

### MCP Servers
Model Context Protocol servers that provide tools and resources for AI assistants like Claude. They act as bridges between AI models and external systems.

### Registry
A centralized repository of MCP packages that enables discovery, installation, and management of MCP servers.

### Deployment Pipeline
Automated process that takes your code, containerizes it, deploys to hosting platforms, and registers it in the registry.

## Next Steps

- [Learn about CLI Tools](/docs#cli-tools) to generate MCP servers from existing applications
- [Read the API Reference](/docs#api-reference) for integration details
- [Explore Deployment options](/docs#deployment) for hosting your MCP servers`
    },
    "cli-tools": {
      title: "CLI Tools - Generate MCP Servers",
      content: `# CLI Tools

SIGIL provides powerful CLI tools that automatically scan your existing web applications and generate MCP servers with tools that map to your endpoints.

## Overview

The CLI tools are the **core innovation** of SIGIL - they automatically convert your existing web APIs into MCP servers that AI assistants can use.

### Available CLI Tools

1. **Python CLI** - For FastAPI applications
2. **TypeScript CLI** - For Express.js applications

Both tools provide the same core functionality:
- 🔍 **Automatic Scanning**: Analyze your application's endpoints
- 🛠️ **MCP Generation**: Create MCP servers with corresponding tools
- 🚀 **Development Mode**: Hot reload workflow for testing
- 🕵️ **MCP Inspector**: Built-in testing interface
- 📝 **Template Creation**: Generate blank MCP server templates

## Python CLI (FastAPI)

### Installation

\`\`\`bash
# Clone the repository
git clone <repository-url>
cd packages/cli/python-cli

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\\Scripts\\activate

# Install dependencies
pip install -r requirements.txt
pip install -e .
\`\`\`

### Usage

\`\`\`bash
# Scan FastAPI app and generate MCP server
mcp-scan scan ./my-fastapi-app

# Create blank MCP server template
mcp-scan init --out ./my-mcp-server

# Development mode with hot reload
mcp-scan dev ./my-fastapi-app

# Launch MCP Inspector for testing
mcp-scan inspect

# Interactive mode
mcp-scan
\`\`\`

### Example: Scanning a FastAPI App

\`\`\`python
# Your FastAPI app (main.py)
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

class User(BaseModel):
    name: str
    email: str

@app.get("/users")
async def get_users():
    return [{"name": "John", "email": "john@example.com"}]

@app.post("/users")
async def create_user(user: User):
    return {"id": 1, **user.dict()}
\`\`\`

\`\`\`bash
# Scan the app
mcp-scan scan ./my-fastapi-app --verbose
\`\`\`

This generates:
- \`mcp.yaml\` - MCP server configuration
- \`server.py\` - Python MCP server with tools for each endpoint
- \`requirements.txt\` - Dependencies
- \`README.md\` - Usage instructions

## TypeScript CLI (Express.js)

### Installation

\`\`\`bash
cd packages/cli/ts-cli
npm install
\`\`\`

### Usage

\`\`\`bash
# Interactive test menu
npm run test

# Quick demo with sample apps
npm run demo

# Scan your Express app
npm run scan

# Development mode
npm run dev-mode

# Launch MCP Inspector
npm run inspect

# Create template
npm run init
\`\`\`

The CLI tools are the foundation of the SIGIL ecosystem, enabling any web application to become an MCP server that AI assistants can use.`
    },
    "api-reference": {
      title: "API Reference",
      content: `# API Reference

## Registry API

The SIGIL Registry API provides endpoints for managing MCP packages and deployments.

### Base URL
\`\`\`
https://api.sigil.dev/api/v1
# Development: http://localhost:3000/api/v1
\`\`\`

### Authentication

All API requests require authentication using JWT tokens from Supabase Auth.

\`\`\`bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  https://api.sigil.dev/api/v1/packages
\`\`\`

### Packages

#### Create Package
\`\`\`http
POST /packages
Content-Type: application/json

{
  "name": "my-mcp-package",
  "version": "1.0.0",
  "description": "My awesome MCP package",
  "author_id": "uuid-here",
  "source_api_url": "http://localhost:8080",
  "tags": ["utility", "ai"],
  "tools": [
    {
      "tool_name": "my_tool",
      "description": "Does something useful",
      "input_schema": {},
      "output_schema": {}
    }
  ]
}
\`\`\`

#### Search Packages
\`\`\`http
GET /packages/search?q=search-term&tags=tag1,tag2&limit=20&offset=0
\`\`\`

#### Get Package Details
\`\`\`http
GET /packages/:name
\`\`\`

### JavaScript/TypeScript SDK

\`\`\`typescript
// Registry API client
const REGISTRY_API_BASE = 'https://api.sigil.dev/api/v1';

const createPackage = async (packageData: any) => {
  const response = await fetch(\`\${REGISTRY_API_BASE}/packages\`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': \`Bearer \${jwt_token}\`
    },
    body: JSON.stringify(packageData)
  });
  
  return response.json();
};
\`\`\`

For complete API documentation, visit our [API Documentation](https://docs.sigil.dev/api).`
    },
    "deployment": {
      title: "Deployment Guide",
      content: `# Deployment Guide

## Overview

SIGIL provides multiple deployment options for your MCP servers, from development to production environments.

## Deployment Methods

### 1. Web Interface Deployment

The easiest way to deploy your MCP servers:

1. **Sign in** to SIGIL with GitHub
2. **Select Repository** containing your MCP server code
3. **Configure Environment** variables and settings
4. **Deploy** with one click

#### Repository Requirements

Your repository should contain:
- \`mcp.yaml\` - MCP server configuration
- \`server.py\` or \`server.ts\` - MCP server implementation
- \`requirements.txt\` or \`package.json\` - Dependencies
- \`Dockerfile\` (optional) - Custom container configuration

#### Example \`mcp.yaml\`

\`\`\`yaml
name: my-mcp-server
description: My awesome MCP server
version: 1.0.0
runtime: python  # or node
entry_point: server.py  # or server.js

tools:
  - name: get_weather
    description: Get weather information
    inputSchema:
      type: object
      properties:
        location:
          type: string
          description: Location to get weather for
      required: [location]
\`\`\`

### 2. CLI Deployment

Deploy directly from the command line:

#### Python CLI
\`\`\`bash
# Generate MCP server from FastAPI app
mcp-scan scan ./my-fastapi-app

# Test locally
mcp-scan dev ./my-fastapi-app

# Deploy to SIGIL (coming soon)
mcp-scan deploy --registry sigil
\`\`\`

#### TypeScript CLI
\`\`\`bash
# Generate MCP server from Express app
npm run scan

# Test locally
npm run dev-mode

# Deploy to SIGIL (coming soon)
npm run deploy
\`\`\`

## Hosting Platforms

SIGIL supports deployment to multiple hosting platforms:

### Railway (Recommended)

Railway provides excellent support for MCP servers with automatic deployments from GitHub.

### Render

Deploy to Render with custom build commands and environment configuration.

### Docker

Build and deploy with Docker for maximum flexibility and control.

## Environment Configuration

### Environment Variables

Common environment variables for MCP servers:

\`\`\`bash
# Server Configuration
MCP_PORT=8080
MCP_HOST=0.0.0.0
MCP_ENV=production

# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# API Keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
\`\`\`

## Security Best Practices

- Never commit secrets to version control
- Use environment variables for configuration
- Implement proper input validation
- Enable HTTPS for production deployments

Your MCP servers are now ready for production deployment on the SIGIL platform!`
    },
    "configuration": {
      title: "Configuration",
      content: `# Configuration

## MCP Server Configuration

### mcp.yaml

The \`mcp.yaml\` file is the main configuration file for your MCP server:

\`\`\`yaml
# Basic server information
name: my-mcp-server
description: A sample MCP server with useful tools
version: 1.0.0
author: Your Name

# Runtime configuration
runtime: python  # or node
entry_point: server.py  # or server.js/server.ts
port: 8080

# Tool definitions
tools:
  - name: get_weather
    description: Get current weather for a location
    inputSchema:
      type: object
      properties:
        location:
          type: string
          description: City name or coordinates
        units:
          type: string
          enum: [celsius, fahrenheit]
          default: celsius
      required: [location]
    
  - name: search_web
    description: Search the web for information
    inputSchema:
      type: object
      properties:
        query:
          type: string
          description: Search query
        limit:
          type: integer
          minimum: 1
          maximum: 10
          default: 5
      required: [query]

# Deployment configuration
deployment:
  healthCheck:
    path: /health
    interval: 30s
    timeout: 10s
  
  environment:
    MCP_LOG_LEVEL: info
    MCP_TIMEOUT: 30000
\`\`\`

## CLI Configuration

### Python CLI (.mcp-inspector-config.json)

\`\`\`json
{
  "server_name": "my-fastapi-server",
  "description": "Generated from FastAPI application",
  "base_url": "http://localhost:8000",
  "output_dir": ".mcp-generated",
  "timeout": 30000,
  "max_retries": 3,
  "fastapi": {
    "scan_decorators": ["@app.get", "@app.post", "@app.put", "@app.delete"],
    "extract_models": true,
    "include_dependencies": true
  }
}
\`\`\`

### TypeScript CLI (.mcp-inspector-config.json)

\`\`\`json
{
  "server_name": "my-express-server",
  "description": "Generated from Express.js application",
  "base_url": "http://localhost:3000",
  "output_dir": ".mcp-generated",
  "timeout": 30000,
  "max_retries": 3,
  "express": {
    "scan_methods": ["get", "post", "put", "delete", "patch"],
    "extract_middleware": true,
    "include_route_params": true
  }
}
\`\`\`

## Environment Variables

### Server Configuration

\`\`\`bash
# Server Settings
MCP_PORT=8080
MCP_HOST=0.0.0.0
MCP_ENV=production
MCP_LOG_LEVEL=info

# Database Configuration
DATABASE_URL=postgresql://user:password@host:5432/database

# API Keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Authentication
JWT_SECRET=your-jwt-secret
GITHUB_CLIENT_ID=your-github-client-id
\`\`\`

## Security Configuration

### Input Validation

\`\`\`python
from pydantic import BaseModel, validator

class ToolInput(BaseModel):
    query: str
    
    @validator('query')
    def sanitize_query(cls, v):
        if len(v) > 1000:
            raise ValueError('Query too long')
        return v.strip()
\`\`\`

This configuration system provides flexibility and control over all aspects of your MCP server deployment and operation.`
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
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeHighlight]}
                    components={{
                      h1: ({children}) => <h1 className="text-3xl font-bold text-white mb-6">{children}</h1>,
                      h2: ({children}) => <h2 className="text-2xl font-bold text-white mb-4 mt-8">{children}</h2>,
                      h3: ({children}) => <h3 className="text-xl font-bold text-indigo-400 mb-3 mt-6">{children}</h3>,
                      p: ({children}) => <p className="text-gray-300 mb-4 leading-relaxed">{children}</p>,
                      code: ({children, className}) => {
                        const isBlock = className?.includes('language-');
                        return isBlock ? (
                          <code className={`${className} block bg-gray-900 p-4 rounded-lg text-sm overflow-x-auto`}>{children}</code>
                        ) : (
                          <code className="bg-gray-800 px-2 py-1 rounded text-indigo-300">{children}</code>
                        );
                      },
                      pre: ({children}) => <div className="bg-gray-900 rounded-lg mb-4 overflow-hidden">{children}</div>,
                      ul: ({children}) => <ul className="list-disc list-inside text-gray-300 mb-4 space-y-2">{children}</ul>,
                      ol: ({children}) => <ol className="list-decimal list-inside text-gray-300 mb-4 space-y-2">{children}</ol>,
                      li: ({children}) => <li className="text-gray-300">{children}</li>,
                      a: ({children, href}) => (
                        <a href={href} className="text-indigo-400 hover:text-indigo-300 underline">
                          {children}
                        </a>
                      ),
                      strong: ({children}) => <strong className="text-white font-bold">{children}</strong>,
                      blockquote: ({children}) => (
                        <blockquote className="border-l-4 border-indigo-500 pl-4 italic text-gray-400 my-4">
                          {children}
                        </blockquote>
                      ),
                    }}
                  >
                    {content[activeSection as keyof typeof content].content}
                  </ReactMarkdown>
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
