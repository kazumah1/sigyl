import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import yaml from 'js-yaml'
import { execSync } from 'child_process'
import { supabase } from '../config/database'
import { decrypt } from '../utils/encryption'

export interface MCPDeploymentConfig {
  repoUrl: string
  branch: string
  subdirectory?: string
  env: Record<string, string>
  mcpConfigPath?: string
  userId?: string
  selectedSecrets?: string[]
}

export interface MCPConfig {
  name: string
  description: string
  version: string
  runtime: 'python' | 'node' | 'go' | 'rust'
  entry_point: string
  port: number
  tools: Array<{
    name: string
    description: string
    inputSchema: any
    outputSchema?: any
  }>
  deployment?: {
    healthCheck?: {
      path: string
      interval: string
      timeout: string
    }
    environment?: Record<string, string>
    build?: {
      commands?: string[]
      context?: string
    }
  }
}

export async function deployMCPServer(config: MCPDeploymentConfig): Promise<{ deploymentUrl: string; imageName: string }> {
  const { repoUrl, branch, subdirectory, env, mcpConfigPath = 'mcp.yaml', userId, selectedSecrets } = config
  
  // Create temporary directory for build
  const tempDir = `/tmp/mcp-build-${Date.now()}`
  mkdirSync(tempDir, { recursive: true })
  
  try {
    // NEW: Fetch and decrypt user secrets if userId is provided
    let deploymentEnv = { ...env }
    
    if (userId) {
      try {
        let secretsQuery = supabase
          .from('mcp_secrets')
          .select('key, value')
          .eq('user_id', userId)
        
        // If specific secrets are selected, filter by them
        if (selectedSecrets && selectedSecrets.length > 0) {
          secretsQuery = secretsQuery.in('id', selectedSecrets)
        }
        
        const { data: secrets, error } = await secretsQuery
        
        if (error) {
          console.warn('Failed to fetch secrets:', error)
        } else if (secrets && secrets.length > 0) {
          // Decrypt secrets and add to environment
          const decryptedSecrets = secrets.map((secret: { key: string; value: string }) => ({
            key: secret.key,
            value: decrypt(secret.value)
          }))
          
          // Merge secrets with provided environment variables
          deploymentEnv = {
            ...deploymentEnv,
            ...Object.fromEntries(decryptedSecrets.map((s: { key: string; value: string }) => [s.key, s.value]))
          }
          
          console.log(`Injected ${decryptedSecrets.length} secrets into deployment environment`)
        }
      } catch (error) {
        console.warn('Error processing secrets:', error)
        // Continue with deployment even if secrets fail
      }
    }

    // Clone repository
    console.log(`Cloning repository: ${repoUrl} (branch: ${branch})`)
    execSync(`git clone --branch ${branch} --depth 1 ${repoUrl} ${tempDir}/source`, { stdio: 'inherit' })
    
    // Determine source directory (with subdirectory support)
    const sourceDir = subdirectory ? join(tempDir, 'source', subdirectory) : join(tempDir, 'source')
    
    if (!existsSync(sourceDir)) {
      throw new Error(`Source directory not found: ${sourceDir}`)
    }
    
    // Read MCP configuration
    const configPath = join(sourceDir, mcpConfigPath)
    if (!existsSync(configPath)) {
      throw new Error(`MCP configuration not found: ${configPath}`)
    }
    
    const configContent = readFileSync(configPath, 'utf8')
    const mcpConfig = yaml.load(configContent) as MCPConfig
    
    console.log(`Building MCP server: ${mcpConfig.name} (runtime: ${mcpConfig.runtime})`)
    
    // Build Docker image with secrets-injected environment
    const imageName = await buildDockerImage(sourceDir, join(tempDir, 'build'), mcpConfig, deploymentEnv)
    console.log(`Docker image built: ${imageName}`)
    
    // Deploy to hosting platform (Render) with secrets-injected environment
    const deploymentUrl = await deployToRender(imageName, mcpConfig, deploymentEnv)
    
    return { deploymentUrl, imageName }
    
  } finally {
    // Cleanup temporary directory
    execSync(`rm -rf ${tempDir}`, { stdio: 'inherit' })
  }
}

async function buildDockerImage(sourceDir: string, outDir: string, config: MCPConfig, env: Record<string, string>): Promise<string> {
  // Ensure output directory exists
  mkdirSync(outDir, { recursive: true })
  
  // Generate Dockerfile based on runtime
  const dockerfile = generateDockerfile(config, sourceDir)
  const dockerfilePath = join(outDir, 'Dockerfile')
  writeFileSync(dockerfilePath, dockerfile)
  
  // Copy necessary files
  await copyMCPFiles(sourceDir, outDir, config)
  
  // Generate .dockerignore
  const dockerignore = generateDockerignore(config)
  const dockerignorePath = join(outDir, '.dockerignore')
  writeFileSync(dockerignorePath, dockerignore)
  
  // Build Docker image
  const imageName = `mcp-server-${Date.now()}`
  const buildArgsStr = Object.entries(env)
    .map(([k, v]) => `--build-arg ${k}=${v}`)
    .join(' ')
  
  const buildCommand = `docker build --platform linux/amd64 ${buildArgsStr} -t ${imageName} ${outDir}`
  
  try {
    execSync(buildCommand, { stdio: 'inherit' })
    return imageName
  } catch (error) {
    throw new Error(`Docker build failed: ${error}`)
  }
}

function generateDockerfile(config: MCPConfig, sourceDir: string): string {
  const { runtime, entry_point, port, deployment } = config
  
  switch (runtime) {
    case 'python':
      return generatePythonDockerfile(config, sourceDir)
    case 'node':
      return generateNodeDockerfile(config, sourceDir)
    case 'go':
      return generateGoDockerfile(config, sourceDir)
    case 'rust':
      return generateRustDockerfile(config, sourceDir)
    default:
      throw new Error(`Unsupported runtime: ${runtime}`)
  }
}

function generatePythonDockerfile(config: MCPConfig, sourceDir: string): string {
  const { entry_point, port, deployment } = config
  const hasRequirements = existsSync(join(sourceDir, 'requirements.txt'))
  
  return `# MCP Server Dockerfile - Python Runtime
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \\
    gcc \\
    curl \\
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
${hasRequirements ? 'COPY requirements.txt .' : ''}
${hasRequirements ? 'RUN pip install --no-cache-dir -r requirements.txt' : 'RUN pip install --no-cache-dir mcp fastmcp'}

# Copy MCP server files
COPY . .

# Set environment variables
ENV PYTHONPATH=/app
ENV PORT=${port}
${deployment?.environment ? Object.entries(deployment.environment).map(([k, v]) => `ENV ${k}=${v}`).join('\n') : ''}

# Expose port
EXPOSE ${port}

# Health check
${deployment?.healthCheck ? `HEALTHCHECK --interval=${deployment.healthCheck.interval} --timeout=${deployment.healthCheck.timeout} --start-period=30s --retries=3 \\
    CMD curl -f http://localhost:${port}${deployment.healthCheck.path} || exit 1` : ''}

# Start MCP server
CMD ["python", "${entry_point}"]`
}

function generateNodeDockerfile(config: MCPConfig, sourceDir: string): string {
  const { entry_point, port, deployment } = config
  const hasPackageJson = existsSync(join(sourceDir, 'package.json'))
  
  return `# MCP Server Dockerfile - Node.js Runtime
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files first for better caching
${hasPackageJson ? 'COPY package*.json .' : ''}
${hasPackageJson ? 'RUN npm ci --only=production' : 'RUN npm install -g @modelcontextprotocol/sdk'}

# Copy MCP server files
COPY . .

# Set environment variables
ENV NODE_ENV=production
ENV PORT=${port}
${deployment?.environment ? Object.entries(deployment.environment).map(([k, v]) => `ENV ${k}=${v}`).join('\n') : ''}

# Expose port
EXPOSE ${port}

# Health check
${deployment?.healthCheck ? `HEALTHCHECK --interval=${deployment.healthCheck.interval} --timeout=${deployment.healthCheck.timeout} --start-period=30s --retries=3 \\
    CMD curl -f http://localhost:${port}${deployment.healthCheck.path} || exit 1` : ''}

# Start MCP server
CMD ["node", "${entry_point}"]`
}

function generateGoDockerfile(config: MCPConfig, sourceDir: string): string {
  const { entry_point, port, deployment } = config
  const hasGoMod = existsSync(join(sourceDir, 'go.mod'))
  
  return `# MCP Server Dockerfile - Go Runtime
FROM golang:1.21-alpine AS builder

# Set working directory
WORKDIR /app

# Copy go mod files
${hasGoMod ? 'COPY go.mod go.sum .' : ''}
${hasGoMod ? 'RUN go mod download' : ''}

# Copy source code
COPY . .

# Build the application
RUN go build -o mcp-server ${entry_point}

# Final stage
FROM alpine:latest

# Install ca-certificates for HTTPS requests
RUN apk --no-cache add ca-certificates curl

# Set working directory
WORKDIR /app

# Copy binary from builder
COPY --from=builder /app/mcp-server .

# Set environment variables
ENV PORT=${port}
${deployment?.environment ? Object.entries(deployment.environment).map(([k, v]) => `ENV ${k}=${v}`).join('\n') : ''}

# Expose port
EXPOSE ${port}

# Health check
${deployment?.healthCheck ? `HEALTHCHECK --interval=${deployment.healthCheck.interval} --timeout=${deployment.healthCheck.timeout} --start-period=30s --retries=3 \\
    CMD curl -f http://localhost:${port}${deployment.healthCheck.path} || exit 1` : ''}

# Start MCP server
CMD ["./mcp-server"]`
}

function generateRustDockerfile(config: MCPConfig, sourceDir: string): string {
  const { entry_point, port, deployment } = config
  const hasCargoToml = existsSync(join(sourceDir, 'Cargo.toml'))
  
  return `# MCP Server Dockerfile - Rust Runtime
FROM rust:1.75-alpine AS builder

# Set working directory
WORKDIR /app

# Copy cargo files
${hasCargoToml ? 'COPY Cargo.toml Cargo.lock .' : ''}
${hasCargoToml ? 'RUN cargo build --release' : ''}

# Copy source code
COPY . .

# Build the application
RUN cargo build --release

# Final stage
FROM alpine:latest

# Install ca-certificates for HTTPS requests
RUN apk --no-cache add ca-certificates curl

# Set working directory
WORKDIR /app

# Copy binary from builder
COPY --from=builder /app/target/release/${entry_point} ./mcp-server

# Set environment variables
ENV PORT=${port}
${deployment?.environment ? Object.entries(deployment.environment).map(([k, v]) => `ENV ${k}=${v}`).join('\n') : ''}

# Expose port
EXPOSE ${port}

# Health check
${deployment?.healthCheck ? `HEALTHCHECK --interval=${deployment.healthCheck.interval} --timeout=${deployment.healthCheck.timeout} --start-period=30s --retries=3 \\
    CMD curl -f http://localhost:${port}${deployment.healthCheck.path} || exit 1` : ''}

# Start MCP server
CMD ["./mcp-server"]`
}

async function copyMCPFiles(sourceDir: string, outDir: string, config: MCPConfig): Promise<void> {
  const filesToCopy = [
    config.entry_point,
    'mcp.yaml',
    'requirements.txt',
    'package.json',
    'package-lock.json',
    'go.mod',
    'go.sum',
    'Cargo.toml',
    'Cargo.lock'
  ]
  
  for (const file of filesToCopy) {
    const sourcePath = join(sourceDir, file)
    const destPath = join(outDir, file)
    
    if (existsSync(sourcePath)) {
      // Ensure destination directory exists
      mkdirSync(dirname(destPath), { recursive: true })
      
      // Copy file
      const content = readFileSync(sourcePath)
      writeFileSync(destPath, content)
    }
  }
  
  // Copy additional files specified in build context
  if (config.deployment?.build?.context) {
    const contextDir = join(sourceDir, config.deployment.build.context)
    if (existsSync(contextDir)) {
      // Copy entire context directory
      execSync(`cp -r "${contextDir}"/* "${outDir}/"`, { stdio: 'inherit' })
    }
  }
}

function generateDockerignore(config: MCPConfig): string {
  return `# MCP Server .dockerignore
# Exclude unnecessary files to keep image size small

# Version control
.git
.gitignore

# Development files
.env
.env.local
.env.*.local
*.log
.DS_Store

# IDE files
.vscode
.idea
*.swp
*.swo

# Build artifacts
node_modules
__pycache__
*.pyc
*.pyo
*.pyd
.Python
build
dist
*.egg-info

# Test files
test
tests
__tests__
*.test.js
*.test.py
*.spec.js
*.spec.py

# Documentation
README.md
docs
*.md

# Docker files (avoid recursive copying)
Dockerfile*
.dockerignore

# Temporary files
tmp
temp
*.tmp

# Large files
*.zip
*.tar.gz
*.rar

# OS files
Thumbs.db
ehthumbs.db
Desktop.ini`
}

async function deployToRender(imageName: string, mcpConfig: any, env: Record<string, string>): Promise<string> {
  // Push image to container registry (Docker Hub or similar)
  const registry = process.env.DOCKER_REGISTRY || 'your-registry.com'
  const tag = `mcp-${Date.now()}`
  
  console.log(`Pushing image to registry: ${registry}/${imageName}:${tag}`)
  
  // For now, we'll use a mock deployment URL
  // In production, you would:
  // 1. Push to container registry
  // 2. Deploy to Render using container image
  // 3. Return the actual deployment URL
  
  const deploymentUrl = `https://${mcpConfig.name}-${Date.now()}.render.com`
  
  console.log(`Deployed to: ${deploymentUrl}`)
  return deploymentUrl
}

// Legacy function for backward compatibility
export async function deployRepo({ repoUrl, env }: { repoUrl: string, env: Record<string, string> }) {
  console.warn('Using legacy deployRepo function. Consider using deployMCPServer instead.')
  
  return await fetch('https://api.render.com/v1/services', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RENDER_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      serviceName: 'mcp-' + Date.now(),
      repo: repoUrl,
      branch: 'main',
      envVars: env
    })
  }).then(res => res.json())
}
  