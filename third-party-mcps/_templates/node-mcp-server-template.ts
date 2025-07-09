#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"

// Configuration schema - define what secrets/env vars your MCP needs
export const configSchema = z.object({
  // Example: API key for third-party service
  API_KEY: z.string().min(1, "API key is required"),
  // Add other required configuration here
  // DATABASE_URL: z.string().url("Valid database URL required").optional(),
  // MAX_REQUESTS_PER_MINUTE: z.number().min(1).max(1000).default(60),
})

// Type for the configuration
export type Config = z.infer<typeof configSchema>

// Type for HTTP request in Sigyl deployment
export interface SigylRequest {
  headers: Record<string, string | string[] | undefined>
  body?: {
    context?: {
      environment?: Record<string, string>
    }
  }
}

/**
 * Hybrid environment variable reader that supports Sigyl's multi-source approach
 * Reads from:
 * 1. HTTP Headers: X-Secret-<KEY> and X-Env-<KEY> (injected by Sigyl Gateway)  
 * 2. Request Body Context: req.body.context.environment (for POST requests)
 * 3. process.env: Fallback for traditional deployments
 */
function getEnv(req: SigylRequest, key: string): string | undefined {
  // 1. Check headers first (Sigyl Gateway injection)
  const secretHeader = req.headers[`x-secret-${key.toLowerCase()}`] as string
  if (secretHeader) return secretHeader
  
  const envHeader = req.headers[`x-env-${key.toLowerCase()}`] as string  
  if (envHeader) return envHeader
  
  // 2. Check request body context (POST requests via gateway)
  if (req.body && req.body.context && req.body.context.environment) {
    const contextValue = req.body.context.environment[key]
    if (contextValue) return contextValue
  }
  
  // 3. Fallback to process.env (traditional deployment)
  return process.env[key]
}

/**
 * Validate configuration from request context
 * This extracts and validates all required config per-request (multi-tenancy)
 */
function validateConfig(req: SigylRequest): Config {
  const rawConfig: Record<string, any> = {}
  
  // Extract all required config keys
  const configKeys = Object.keys(configSchema.shape)
  for (const key of configKeys) {
    const value = getEnv(req, key)
    if (value !== undefined) {
      rawConfig[key] = value
    }
  }
  
  // Validate with Zod schema
  try {
    return configSchema.parse(rawConfig)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingFields = error.errors.map(e => e.path.join('.')).join(', ')
      throw new Error(`Missing or invalid configuration: ${missingFields}`)
    }
    throw error
  }
}

/**
 * Create MCP server instance with the given configuration
 */
export default function createStatelessServer({
  config,
}: {
  config: Config
}) {
  const server = new McpServer({
    name: "Example MCP Server",
    version: "1.0.0",
  })

  // Register your MCP tools here
  server.tool(
    "example_tool",
    "An example tool that demonstrates the template",
    {
      message: z.string().describe("Message to process")
    },
    async ({ message }) => {
      return {
        content: [
          {
            type: "text",
            text: `Example tool called with message: ${message}. API Key available: ${config.API_KEY.substring(0, 4)}...`
          }
        ]
      }
    }
  )

  return server.server
}

// ============================================================================
// HELPER FUNCTIONS FOR SIGYL DEPLOYMENT
// ============================================================================

/**
 * Helper function for HTTP mode - extracts config from request context
 * This enables multi-tenant deployment where each request has its own config
 */
export function createServerFromRequest(req: any): any {
  try {
    // Validate configuration from request context
    const config = validateConfig(req)
    
    // Create server instance with validated config
    return createStatelessServer({ config })
  } catch (error) {
    throw new Error(`Configuration error: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Helper to validate if required environment variables are available
 * Useful for development and debugging
 */
export function validateEnvironment(): { valid: boolean, missing: string[] } {
  const required = Object.keys(configSchema.shape)
  const missing: string[] = []
  
  for (const key of required) {
    if (!process.env[key]) {
      missing.push(key)
    }
  }
  
  return {
    valid: missing.length === 0,
    missing
  }
} 