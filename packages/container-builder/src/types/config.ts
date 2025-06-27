/**
 * Sigyl MCP Server Configuration Types
 * Based on Smithery's schema but with our naming and runtime options
 */

export interface SigylConfig {
  /** Runtime type for deployment */
  runtime: 'node' | 'container';
  
  /** Environment variables to inject when running the server */
  env?: Record<string, string>;
}

export interface ConfigSchema {
  type: 'object';
  required?: string[];
  properties?: Record<string, ConfigProperty>;
}

export interface ConfigProperty {
  type: 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array';
  title?: string;
  description?: string;
  default?: any;
  minimum?: number;
  maximum?: number;
  properties?: Record<string, ConfigProperty>;
}

/**
 * Node runtime specific configuration
 */
export interface NodeRuntimeConfig extends SigylConfig {
  runtime: 'node';
  /** Language variant (for build tooling) */
  language?: 'typescript' | 'javascript';
  /** Entry point for the server */
  entryPoint?: string;
  /** Build configuration for Node projects */
  build?: {
    /** Build command to run */
    command?: string;
    /** Output directory after build */
    outputDir?: string;
  };
}

/**
 * Container runtime specific configuration
 */
export interface ContainerRuntimeConfig extends SigylConfig {
  runtime: 'container';
  /** Build configuration for container projects */
  build?: {
    /** Path to Dockerfile, relative to sigyl.yaml */
    dockerfile?: string;
    /** Docker build context path, relative to sigyl.yaml */
    dockerBuildPath?: string;
  };
  /** Start command configuration */
  startCommand: {
    /** Must be 'http' for HTTP-based MCP servers */
    type: 'http';
    /** JSON Schema defining configuration options for the server */
    configSchema?: ConfigSchema;
    /** Example configuration values for testing */
    exampleConfig?: Record<string, any>;
  };
}

/**
 * Union type for all possible configuration types
 */
export type SigylConfigUnion = NodeRuntimeConfig | ContainerRuntimeConfig;

/**
 * Legacy MCP config interface - for migration purposes
 * @deprecated Use SigylConfig instead
 */
export interface MCPConfig {
  name: string;
  description: string;
  version: string;
  runtime: 'python' | 'node' | 'go' | 'rust';
  entry_point: string;
  port: number;
  tools: Array<{
    name: string;
    description: string;
    inputSchema: any;
    outputSchema?: any;
  }>;
  deployment?: {
    healthCheck?: {
      path: string;
      interval: string;
      timeout: string;
    };
    environment?: Record<string, string>;
    build?: {
      commands?: string[];
      context?: string;
    };
  };
} 