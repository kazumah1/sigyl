import { writeFileSync, mkdirSync, existsSync } from "node:fs"
import { join } from "node:path"
import * as yaml from "yaml"
import { verboseLog } from "../logger"
import type { ExpressEndpoint } from "./express-scanner"
import express from "express"
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js"
import cors from "cors"

export interface MCPGenerationOptions {
	appPort?: string
	[key: string]: unknown
}

export class MCPGenerator {
	private outDir: string
	private language: "typescript" | "javascript" | "python"

	constructor(outDir: string, language: "typescript" | "javascript" | "python") {
		this.outDir = outDir
		this.language = language
	}

	async generateFromEndpoints(
		endpoints: ExpressEndpoint[],
		options: MCPGenerationOptions = {}
	): Promise<void> {
		// Ensure output directory exists
		if (!existsSync(this.outDir)) {
			mkdirSync(this.outDir, { recursive: true })
		}

		// Generate MCP configuration
		await this.generateMCPConfig(endpoints, options)

		// Generate server code
		if (this.language === "typescript") {
			await this.generateTypeScriptServer(endpoints, options)
		} else if (this.language === "javascript") {
			await this.generateJavaScriptServer(endpoints, options)
		} else {
			await this.generatePythonServer(endpoints, options)
		}
	}

	private async generateMCPConfig(
		endpoints: ExpressEndpoint[],
		options: MCPGenerationOptions
	): Promise<void> {
		// Generate minimal SigylConfig format (no env, build, or entryPoint)
		const config = {
			runtime: "node",
			language: this.language,
			startCommand: {
				type: "http"
			}
		};

		const yamlHeader = `# MCP-compatible server configuration\n# This template demonstrates all major JSON Schema features for configSchema.\n# - apiKey: Secret string field\n# - serviceName: Arbitrary string field\n# - logLevel: Enum string field\n# - timeout: Number field with min/max\n# - enableMetrics: Boolean field\n# - allowedClients: Array of strings\n# - customSettings: Object field\n# - environment: Enum for environment\n# Add/remove fields as needed for your server.\n`;
		const yamlContent = yamlHeader + yaml.stringify(config, { indent: 2 });
		writeFileSync(join(this.outDir, "sigyl.yaml"), yamlContent);
		verboseLog("Generated sigyl.yaml configuration");
	}

	private async generateTypeScriptServer(
		endpoints: ExpressEndpoint[],
		options: MCPGenerationOptions
	): Promise<void> {
		const serverCode = `
/**
 * Auto-generated MCP Server from Express endpoints
 * 
 * This server provides tools that call your Express API endpoints.
 * Environment variables are injected via the Sigyl gateway.
 */

import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js"
import { z } from "zod"
import cors from "cors"

// ============================================================================
// ENVIRONMENT VARIABLE HANDLING
// ============================================================================
// This middleware extracts environment variables from Sigyl gateway headers
// and makes them available to the MCP tools

declare global {
  namespace Express {
    interface Request {
      environment?: Record<string, string>;
    }
  }
}

function extractEnvironmentVariables(req: express.Request): Record<string, string> {
  const environment: Record<string, string> = {};
  
  // Method 1: Extract from Sigyl gateway headers
  Object.keys(req.headers).forEach(key => {
    if (key.startsWith('x-secret-')) {
      const envKey = key.replace('x-secret-', '');
      environment[envKey] = req.headers[key] as string;
    } else if (key.startsWith('x-env-')) {
      const envKey = key.replace('x-env-', '');
      environment[envKey] = req.headers[key] as string;
    }
  });
  
  // Method 2: Extract from request context (for MCP protocol requests)
  if (req.body && req.body.context && req.body.context.environment) {
    Object.assign(environment, req.body.context.environment);
  }
  
  // Method 3: Fallback to process.env (for traditional deployment)
  if (Object.keys(environment).length === 0) {
    return process.env as Record<string, string>;
  }
  
  return environment;
}

// ============================================================================
// SERVER CONFIGURATION
// ============================================================================

export default function createStatelessServer({
	config,
}: {
	config: any;
}) {
	const server = new McpServer({
		name: "generated-mcp-server",
		version: "1.0.0",
	});

	// ============================================================================
	// GENERATED TOOLS
	// ============================================================================
${endpoints.map(endpoint => {
	const toolName = this.generateToolName(endpoint)
	const shape = this.generateZodShapeObject(endpoint)
	const description = endpoint.description || `${endpoint.method} ${endpoint.path}`
	const methodLiteral = endpoint.method.toUpperCase();
	const pathLiteral = endpoint.path;
	return `	// ===== ${endpoint.method.toUpperCase()} ${endpoint.path} =====
	server.tool(
		"${toolName}",
		"${description}",
		${shape},
		async (args, context) => {
			// ===== REQUEST CONFIGURATION =====
			/**
			 * IMPORTANT: This MCP tool calls your Express API at the address below.
			 * To change the API base URL (host/port), set the APP_BASE_URL environment variable when starting this server,
			 * or edit the code below. Default is http://localhost:3000
			 * Example: APP_BASE_URL=http://myhost:4000 node server.js
			 */
			const baseUrl = process.env.APP_BASE_URL || \`http://localhost:${'${config.appPort || 3000}'}\`;
			const url = \`${'${baseUrl}'}${'${endpoint.path}'}\`;
			const method = "${'${endpoint.method.toUpperCase()}'}";
			
			// Build request options
			const requestOptions: any = {
				method,
				headers: {
					"Content-Type": "application/json",
				},
			};

			// ===== PARAMETER HANDLING =====
			const queryParams = new URLSearchParams();
			const bodyParams: any = {};
			
${this.generateParameterHandling(endpoint)}

			// ===== ENVIRONMENT VARIABLE INJECTION =====
			// Get environment variables from context or fallback to process.env
			let environment: Record<string, string> = {};
			
			// Try to get environment from context if available
			if (context && typeof context === 'object' && 'environment' in context) {
				environment = (context as any).environment || {};
			}
			
			// Fallback to process.env if no gateway environment
			if (Object.keys(environment).length === 0) {
				environment = process.env as Record<string, string>;
			}
			
			// Add API key to headers if available
			const apiKey = environment.API_KEY || environment.apiKey;
			if (apiKey) {
				requestOptions.headers.Authorization = \`Bearer \${apiKey}\`;
			}
			
			// Add any other environment variables as headers
			Object.entries(environment).forEach(([key, value]) => {
				if (key !== 'API_KEY' && key !== 'apiKey') {
					requestOptions.headers[\`X-\${key}\`] = value;
				}
			});

			// ===== REQUEST EXECUTION =====
			try {
				const response = await fetch(url, requestOptions);
				
				if (!response.ok) {
					throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
				}
				
				const responseData = await response.json();
				
				return {
					content: [
						{ type: "text", text: JSON.stringify(responseData, null, 2) }
					]
				};
			} catch (error) {
				throw new Error(\`API call failed: \${error instanceof Error ? error.message : String(error)}\`);
			}
		}
	);`
}).join('\n\n')}

	// ============================================================================
	// MANUAL TOOL TEMPLATE
	// ============================================================================
	// To add a new tool manually, use the following simple template:
	/*
	server.tool(
	  "reverseString",
	  "Reverse a string value",
	  {
	    value: z.string().describe("String to reverse"),
	  },
	  async ({ value }) => {
	    return {
	      content: [
	        { type: "text", text: value.split("").reverse().join("") }
	      ]
	    };
	  }
	);
	*/

	return server.server;
}

// ============================================================================
// SERVER STARTUP
// ============================================================================

const app = express()
app.use(express.json())
app.use(cors({ origin: "http://localhost:3001" }))

// Add environment variable extraction middleware
app.use((req, res, next) => {
  req.environment = extractEnvironmentVariables(req);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  const environment = req.environment || {};
  const hasApiKey = !!(environment.API_KEY || environment.apiKey);
  
  res.json({
    status: 'healthy',
    environment: {
      hasApiKey,
      keys: Object.keys(environment).filter(key => !key.includes('SECRET') && !key.includes('PASSWORD')),
      gatewaySession: req.body?.context?.gatewaySession || null
    },
    message: hasApiKey ? 'Environment variables loaded successfully' : 'No API key found'
  });
});

app.post('/mcp', async (req, res) => {
	const server = createStatelessServer({ config: {} })
	const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
	res.on('close', () => {
		transport.close()
		server.close()
	})
	await server.connect(transport)
	
	// Pass the request environment to the MCP context
	const mcpRequest = {
		...req.body,
		context: {
			...req.body.context,
			environment: req.environment
		}
	};
	
	await transport.handleRequest(req, res, mcpRequest)
})

const port = process.env.PORT || 8080
app.listen(port, () => {
	console.log("MCP Server listening on port " + port)
	console.log("Environment variables will be injected via Sigyl gateway")
	console.log("Check /health endpoint to see injected environment variables")
})
`;

		writeFileSync(join(this.outDir, "server.ts"), serverCode);
		verboseLog("Generated TypeScript server");

		// Generate package.json for the server
		const packageJson = {
			name: "generated-mcp-server",
			version: "1.0.0",
			type: "module",
			main: "server.js",
			description: "Auto-generated MCP server from Express endpoints",
			scripts: {
				build: "tsc",
				start: "node server.js"
			},
			dependencies: {
				"@modelcontextprotocol/sdk": "^1.10.1",
				"zod": "^3.22.0",
				"express": "^4.18.2",
				"@types/express": "^4.17.33",
				"cors": "^2.8.5"
			},
			devDependencies: {
				"typescript": "^5.0.0",
				"@types/node": "^20.0.0",
				"@types/cors": "^2.8.17"
			}
		};
		writeFileSync(join(this.outDir, "package.json"), JSON.stringify(packageJson, null, 2));
		verboseLog("Generated package.json");

		// Always generate a valid tsconfig.json for TypeScript/ESM compatibility
		const tsConfig = {
			compilerOptions: {
				target: "ES2020",
				module: "ESNext",
				moduleResolution: "node",
				outDir: "./",
				rootDir: "./",
				strict: true,
				esModuleInterop: true,
				skipLibCheck: true
			},
			include: ["*.ts"],
			exclude: ["node_modules", "*.js"]
		};
		writeFileSync(join(this.outDir, "tsconfig.json"), JSON.stringify(tsConfig, null, 2));
		verboseLog("Generated tsconfig.json");
	}

	private async generateJavaScriptServer(
		endpoints: ExpressEndpoint[],
		options: MCPGenerationOptions
	): Promise<void> {
		const serverCode = `
/**
 * Auto-generated MCP Server from Express endpoints (JavaScript)
 *
 * This server provides tools that call your Express API endpoints.
 * Environment variables are injected via the Sigyl gateway.
 */

const express = require("express");
const cors = require("cors");
const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { StreamableHTTPServerTransport } = require("@modelcontextprotocol/sdk/server/streamableHttp.js");
const { z } = require("zod");

// ============================================================================
// ENVIRONMENT VARIABLE HANDLING
// ============================================================================
// This middleware extracts environment variables from Sigyl gateway headers
// and makes them available to the MCP tools

function extractEnvironmentVariables(req) {
  const environment = {};
  
  // Method 1: Extract from Sigyl gateway headers
  Object.keys(req.headers).forEach(key => {
    if (key.startsWith('x-secret-')) {
      const envKey = key.replace('x-secret-', '');
      environment[envKey] = req.headers[key];
    } else if (key.startsWith('x-env-')) {
      const envKey = key.replace('x-env-', '');
      environment[envKey] = req.headers[key];
    }
  });
  
  // Method 2: Extract from request context (for MCP protocol requests)
  if (req.body && req.body.context && req.body.context.environment) {
    Object.assign(environment, req.body.context.environment);
  }
  
  // Method 3: Fallback to process.env (for traditional deployment)
  if (Object.keys(environment).length === 0) {
    return process.env;
  }
  
  return environment;
}

// ============================================================================
// SERVER CONFIGURATION
// ============================================================================

function createStatelessServer({ config }) {
	const server = new McpServer({
		name: "generated-mcp-server",
		version: "1.0.0",
	});

	// ============================================================================
	// GENERATED TOOLS
	// ============================================================================
${endpoints.map(endpoint => {
	const toolName = this.generateToolName(endpoint)
	const shape = this.generateZodShapeObject(endpoint)
	const description = endpoint.description || `${endpoint.method} ${endpoint.path}`
	const methodLiteral = endpoint.method.toUpperCase();
	const pathLiteral = endpoint.path;
	return `	// ===== ${endpoint.method.toUpperCase()} ${endpoint.path} =====
	server.tool(
		"${toolName}",
		"${description}",
		${shape},
		async (args, context) => {
			// ===== REQUEST CONFIGURATION =====
			/**
			 * IMPORTANT: This MCP tool calls your Express API at the address below.
			 * To change the API base URL (host/port), set the APP_BASE_URL environment variable when starting this server,
			 * or edit the code below. Default is http://localhost:3000
			 * Example: APP_BASE_URL=http://myhost:4000 node server.js
			 */
			const baseUrl = process.env.APP_BASE_URL || \`http://localhost:${'${config.appPort || 3000}'}\`;
			const url = \`${'${baseUrl}'}${'${endpoint.path}'}\`;
			const method = "${'${endpoint.method.toUpperCase()}'}";
			
			// Build request options
			const requestOptions = {
				method,
				headers: {
					"Content-Type": "application/json",
				},
			};

			// ===== PARAMETER HANDLING =====
			const queryParams = new URLSearchParams();
			const bodyParams = {};
			
${this.generateParameterHandling(endpoint)}

			// ===== ENVIRONMENT VARIABLE INJECTION =====
			// Get environment variables from context or fallback to process.env
			let environment = {};
			
			// Try to get environment from context if available
			if (context && typeof context === 'object' && 'environment' in context) {
				environment = context.environment || {};
			}
			
			// Fallback to process.env if no gateway environment
			if (Object.keys(environment).length === 0) {
				environment = process.env;
			}
			
			// Add API key to headers if available
			const apiKey = environment.API_KEY || environment.apiKey;
			if (apiKey) {
				requestOptions.headers.Authorization = \`Bearer \${apiKey}\`;
			}
			
			// Add any other environment variables as headers
			Object.entries(environment).forEach(([key, value]) => {
				if (key !== 'API_KEY' && key !== 'apiKey') {
					requestOptions.headers[\`X-\${key}\`] = value;
				}
			});

			// ===== REQUEST EXECUTION =====
			try {
				const response = await fetch(url, requestOptions);
				
				if (!response.ok) {
					throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
				}
				
				const responseData = await response.json();
				
				return {
					content: [
						{ type: "text", text: JSON.stringify(responseData, null, 2) }
					]
				};
			} catch (error) {
				throw new Error(\`API call failed: \${error instanceof Error ? error.message : String(error)}\`);
			}
		}
	);`
}).join('\n\n')}

	// ============================================================================
	// MANUAL TOOL TEMPLATE
	// ============================================================================
	// To add a new tool manually, use the following simple template:
	/*
	server.tool(
	  "reverseString",
	  "Reverse a string value",
	  {
	    value: z.string().describe("String to reverse"),
	  },
	  async ({ value }) => {
	    return {
	      content: [
	        { type: "text", text: value.split("").reverse().join("") }
	      ]
	    };
	  }
	);
	*/

	return server.server;
}

// ============================================================================
// SERVER STARTUP
// ============================================================================

const app = express();
app.use(express.json());
app.use(cors({ origin: "http://localhost:3001" }));

// Add environment variable extraction middleware
app.use((req, res, next) => {
  req.environment = extractEnvironmentVariables(req);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  const environment = req.environment || {};
  const hasApiKey = !!(environment.API_KEY || environment.apiKey);
  
  res.json({
    status: 'healthy',
    environment: {
      hasApiKey,
      keys: Object.keys(environment).filter(key => !key.includes('SECRET') && !key.includes('PASSWORD')),
      gatewaySession: req.body?.context?.gatewaySession || null
    },
    message: hasApiKey ? 'Environment variables loaded successfully' : 'No API key found'
  });
});

app.post('/mcp', async (req, res) => {
	const server = createStatelessServer({ config: {} });
	const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
	res.on('close', () => {
		transport.close();
		server.close();
	});
	await server.connect(transport);
	
	// Pass the request environment to the MCP context
	const mcpRequest = {
		...req.body,
		context: {
			...req.body.context,
			environment: req.environment
		}
	};
	
	await transport.handleRequest(req, res, mcpRequest);
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
	console.log("MCP Server listening on port " + port);
	console.log("Environment variables will be injected via Sigyl gateway");
	console.log("Check /health endpoint to see injected environment variables");
});
`;

		writeFileSync(join(this.outDir, "server.js"), serverCode);
		verboseLog("Generated JavaScript server");

		// Generate package.json for the server
		const packageJson = {
			name: "generated-mcp-server",
			version: "1.0.0",
			type: "module",
			main: "server.js",
			description: "Auto-generated MCP server from Express endpoints",
			scripts: {
				start: "node server.js"
			},
			dependencies: {
				"@modelcontextprotocol/sdk": "^1.10.1",
				"zod": "^3.22.0",
				"express": "^4.18.2",
				"cors": "^2.8.5"
			}
		};

		writeFileSync(join(this.outDir, "package.json"), JSON.stringify(packageJson, null, 2));
		verboseLog("Generated package.json");

		// --- PATCH: Generate tool handler files ---
		const toolsDir = join(this.outDir, "tools");
		if (!existsSync(toolsDir)) {
			mkdirSync(toolsDir, { recursive: true });
		}
		for (const endpoint of endpoints) {
			const toolName = this.generateToolName(endpoint);
			const handlerCode = `export async function ${toolName}(args) {
				// TODO: Implement actual logic for ${endpoint.method} ${endpoint.path}
				return { content: [ { type: "text", text: "Dummy response from ${toolName}" } ] };
			}
			`;
			writeFileSync(join(toolsDir, `${toolName}.js`), handlerCode);
		}
	}

	private async generatePythonServer(
		endpoints: ExpressEndpoint[],
		options: MCPGenerationOptions
	): Promise<void> {
		// TODO: Implement Python server generation
		verboseLog("Python server generation not yet implemented")
	}

	private generateToolName(endpoint: ExpressEndpoint): string {
		// Convert path and method to camelCase tool name
		// e.g., GET /api/users/:id -> getApiUsersById
		// e.g., GET /api/users/advanced-search -> getApiUsersAdvancedSearch
		const method = endpoint.method.toLowerCase()
		const pathParts = endpoint.path
			.split('/')
			.filter(part => part && part !== '')
			.map(part => {
				// Remove colons from path parameters
				if (part.startsWith(':')) {
					return 'By' + part.slice(1).charAt(0).toUpperCase() + part.slice(2)
				}
				// Handle hyphens and other special characters
				return part
					.replace(/[-_]/g, ' ') // Replace hyphens and underscores with spaces
					.split(' ')
					.map(word => word.charAt(0).toUpperCase() + word.slice(1))
					.join('')
			})

		return method + pathParts.join('')
	}

	private generateToolSchema(endpoint: ExpressEndpoint): Record<string, any> {
		const schema: Record<string, any> = {}

		// Add path and query parameters
		if (endpoint.parameters) {
			for (const param of endpoint.parameters) {
				schema[param.name] = {
					type: this.mapTypeToJSONSchema(param.type),
					description: param.description || `${param.location} parameter`,
					...(param.location === "path" && { required: true })
				}
			}
		}

		// Add request body for POST/PUT/PATCH requests
		if (['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
			if (endpoint.requestBody) {
				if (endpoint.requestBody.properties) {
					// If we have detailed properties, create a proper object schema
					schema.body = {
						type: "object",
						description: "Request body data",
						properties: this.mapPropertiesToJSONSchema(endpoint.requestBody.properties),
						...(endpoint.requestBody.required && endpoint.requestBody.required.length > 0 && {
							required: endpoint.requestBody.required
						})
					}
				} else {
					// Fallback to generic object
					schema.body = {
						type: this.mapTypeToJSONSchema(endpoint.requestBody.type),
						description: "Request body data"
					}
				}
			} else {
				schema.body = {
					type: "object",
					description: "Request body data"
				}
			}
		}

		return schema
	}

	private mapTypeToJSONSchema(type: string): string {
		// Map TypeScript types to JSON Schema types
		switch (type.toLowerCase()) {
			case "string": return "string"
			case "number": return "number"
			case "boolean": return "boolean"
			case "array": return "array"
			case "object": return "object"
			case "date": return "string"
			case "any": return "object"
			case "unknown": return "object"
			default: return "object" // Default for custom types
		}
	}

	private mapPropertiesToJSONSchema(properties: Record<string, any>): Record<string, any> {
		const mapped: Record<string, any> = {}
		for (const [key, value] of Object.entries(properties)) {
			const propertySchema: any = {
				type: this.mapTypeToJSONSchema(value.type),
				description: value.description || `Property: ${key}`
			}
			// Add additional schema properties based on type
			if (value.type === "string") {
				// Could add format, pattern, minLength, maxLength, etc.
			} else if (value.type === "number") {
				// Could add minimum, maximum, etc.
			} else if (value.type === "array") {
				// Could add items schema
			}
			mapped[key] = propertySchema
		}
		return mapped
	}

	private generateToolHandler(endpoint: ExpressEndpoint, options: MCPGenerationOptions): string {
		const toolName = this.generateToolName(endpoint)
		const appPort = options.appPort || "3000"

		if (this.language === "typescript") {
			// Generate TypeScript interface for the tool arguments
			const argInterface = this.generateToolArgInterface(endpoint)
			
			// Check if we have required parameters (path params are always required)
			const hasRequiredParams = endpoint.parameters?.some(p => p.required || p.location === "path") || false
			const defaultValue = hasRequiredParams ? "" : " = {}"
			
			return `// Tool handler for ${endpoint.method} ${endpoint.path}
${argInterface}

export async function ${toolName}(args: ${toolName}Args${defaultValue}): Promise<{ content: Array<{ type: string; text: string }> }> {
	try {
		// Construct URL for the Express endpoint
		const baseUrl = "http://localhost:${appPort}"
		let url = "${endpoint.path}"
		
		// Replace path parameters
		${endpoint.parameters?.filter(p => p.location === "path").map(param => 
			`url = url.replace(":${param.name}", String(args.${param.name}) || "");`
		).join('\n\t\t') || ''}
		
		// Add query parameters
		const queryParams = new URLSearchParams()
		${endpoint.parameters?.filter(p => p.location === "query").map(param => 
			`if (args.${param.name} !== undefined) queryParams.append("${param.name}", String(args.${param.name}));`
		).join('\n\t\t') || ''}
		
		if (queryParams.toString()) {
			url += "?" + queryParams.toString()
		}
		
		const fullUrl = baseUrl + url
		
		// Make HTTP request to Express app
		const options: RequestInit = {
			method: "${endpoint.method}",
			headers: {
				"Content-Type": "application/json",
			},
		}
		
		// Add body for POST/PUT/PATCH requests
		${['POST', 'PUT', 'PATCH'].includes(endpoint.method) ? 
			`if (args.body) {\n\t\t\toptions.body = JSON.stringify(args.body)\n\t\t}` : 
			'// No body for GET requests'
		}
		
		const response = await fetch(fullUrl, options)
		const result = await response.text()
		
		return {
			content: [
				{
					type: "text",
					text: "Request: " + options.method + " " + fullUrl + "\\nResponse: " + result
				}
			]
		}
	} catch (error) {
		return {
			content: [
				{
					type: "text",
					text: \`Error calling ${endpoint.method.toUpperCase()} ${endpoint.path}: \${error instanceof Error ? error.message : String(error)}\`
				}
			]
		}
	}
}
`
		} else if (this.language === "javascript") {
			// Generate plain JS handler (no types)
			return `// Tool handler for ${endpoint.method} ${endpoint.path}
export async function ${toolName}(args = {}) {
	try {
		// Construct URL for the Express endpoint
		const baseUrl = "http://localhost:${appPort}"
		let url = "${endpoint.path}"
		
		// Replace path parameters
		${endpoint.parameters?.filter(p => p.location === "path").map(param => 
			`url = url.replace(":${param.name}", String(args.${param.name}) || "");`
		).join('\n\t\t') || ''}
		
		// Add query parameters
		const queryParams = new URLSearchParams()
		${endpoint.parameters?.filter(p => p.location === "query").map(param => 
			`if (args.${param.name} !== undefined) queryParams.append("${param.name}", String(args.${param.name}));`
		).join('\n\t\t') || ''}
		
		if (queryParams.toString()) {
			url += "?" + queryParams.toString()
		}
		
		const fullUrl = baseUrl + url
		
		// Make HTTP request to Express app
		const options = {
			method: "${endpoint.method}",
			headers: {
				"Content-Type": "application/json",
			},
		}
		
		// Add body for POST/PUT/PATCH requests
		${['POST', 'PUT', 'PATCH'].includes(endpoint.method) ? 
			`if (args.body) {\n\t\t\toptions.body = JSON.stringify(args.body)\n\t\t}` : 
			'// No body for GET requests'
		}
		
		const response = await fetch(fullUrl, options)
		const result = await response.text()
		
		return {
			content: [
				{
					type: "text",
					text: "Request: " + options.method + " " + fullUrl + "\\nResponse: " + result
				}
			]
		}
	} catch (error) {
		return {
			content: [
				{
					type: "text",
					text: \`Error calling ${endpoint.method.toUpperCase()} ${endpoint.path}: \${error instanceof Error ? error.message : String(error)}\`
				}
			]
		}
	}
}
`
		}
		
		return ""
	}

	private generateToolArgInterface(endpoint: ExpressEndpoint): string {
		const toolName = this.generateToolName(endpoint)
		const interfaceName = `${toolName}Args`
		
		let properties: string[] = []
		
		// Add path and query parameters
		if (endpoint.parameters) {
			for (const param of endpoint.parameters) {
				const optional = param.required ? "" : "?"
				properties.push(`\t${param.name}${optional}: ${this.mapTypeToTypeScript(param.type)}`)
			}
		}
		
		// Add body parameter for POST/PUT/PATCH requests
		if (['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
			properties.push(`\tbody?: any`)
		}
		
		if (properties.length === 0) {
			return `interface ${interfaceName} {}`
		}
		
		return `interface ${interfaceName} {
${properties.join('\n')}
}`
	}
	
	private mapTypeToTypeScript(type: string): string {
		switch (type.toLowerCase()) {
			case "string": return "string"
			case "number": return "number"
			case "boolean": return "boolean"
			case "array": return "any[]"
			case "object": return "any"
			case "date": return "string"
			default: return "any"
		}
	}

	private generateZodShapeObject(endpoint: ExpressEndpoint): string {
		const properties: string[] = []
		
		// Add path and query parameters
		if (endpoint.parameters) {
			for (const param of endpoint.parameters) {
				const zodType = this.mapTypeToZod(param.type)
				const description = param.description || `${param.location} parameter: ${param.name}`
				const optional = param.required ? "" : ".optional()"
				properties.push(`\t\t${param.name}: z.${zodType}()${optional}.describe("${description}")`)
			}
		}
		
		// Add body parameter for POST/PUT/PATCH requests
		if (['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
			properties.push(`\t\tbody: z.any().optional().describe("Request body data")`)
		}
		
		if (properties.length === 0) {
			return "{}"
		}
		
		return `{
${properties.join(',\n')}
\t}`
	}
	
	private mapTypeToZod(type: string): string {
		switch (type.toLowerCase()) {
			case "string": return "string"
			case "number": return "number"
			case "boolean": return "boolean"
			case "array": return "array"
			case "object": return "object"
			default: return "any"
		}
	}

	private generateParameterHandling(endpoint: ExpressEndpoint): string {
		let code = ""
		
		if (endpoint.parameters) {
			for (const param of endpoint.parameters) {
				if (param.location === "path") {
					code += `\t\t\trequestOptions.url = requestOptions.url.replace(":${param.name}", String(args.${param.name}) || "");\n`
				} else if (param.location === "query") {
					code += `\t\t\tif (args.${param.name} !== undefined) {\n`
					code += `\t\t\t\tqueryParams.set("${param.name}", String(args.${param.name}));\n`
					code += `\t\t\t}\n`
				} else if (param.location === "body") {
					code += `\t\t\tif (args.${param.name} !== undefined) {\n`
					code += `\t\t\t\tbodyParams.${param.name} = args.${param.name};\n`
					code += `\t\t\t}\n`
				}
			}
		}
		
		// Handle body parameters for POST/PUT/PATCH
		if (['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
			code += `\t\t\tif (args.body !== undefined) {\n`
			code += `\t\t\t\tObject.assign(bodyParams, args.body);\n`
			code += `\t\t\t}\n`
		}
		
		return code
	}
}