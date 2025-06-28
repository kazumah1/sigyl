import { writeFileSync, mkdirSync, existsSync } from "node:fs"
import { join } from "node:path"
import * as yaml from "yaml"
import { verboseLog } from "../logger"
import type { ExpressEndpoint } from "./express-scanner"

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
		// MCP config schema YAML
		const config = {
			runtime: "node",
			language: this.language,
			startCommand: {
				type: "http",
				configSchema: {
					type: "object",
					required: ["apiKey", "environment"],
					properties: {
						apiKey: {
							type: "string",
							title: "MCP API Key",
							description: "Your MCP API key (required)"
						},
						serviceName: {
							type: "string",
							title: "Service Name",
							default: "my-mcp-service",
							description: "Name of the MCP-compatible service"
						},
						logLevel: {
							type: "string",
							title: "Log Level",
							default: "info",
							enum: ["debug", "info", "warn", "error"],
							description: "Logging verbosity level"
						},
						timeout: {
							type: "number",
							title: "Timeout",
							description: "Request timeout in seconds",
							default: 30,
							minimum: 1,
							maximum: 300
						},
						enableMetrics: {
							type: "boolean",
							title: "Enable Metrics",
							description: "Enable metrics collection",
							default: false
						},
						allowedClients: {
							type: "array",
							title: "Allowed Clients",
							description: "List of client IDs allowed to access the server",
							items: { type: "string" },
							default: []
						},
						customSettings: {
							type: "object",
							title: "Custom Settings",
							description: "Advanced custom settings for the server",
							properties: {
								maxConnections: { type: "number", default: 100 },
								useCache: { type: "boolean", default: true }
							},
							default: {}
						},
						environment: {
							type: "string",
							title: "Environment",
							description: "Deployment environment",
							enum: ["development", "staging", "production"],
							default: "development"
						}
					}
				}
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
		const serverCode = `/**
 * Auto-generated MCP Server from Express endpoints
 * 
 * This server provides tools that map to your Express API endpoints.
 * Each tool makes HTTP requests to your Express application and returns the responses.
 * 
 * To add a new tool manually, follow the template at the bottom of this file.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"

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
	// AUTO-GENERATED TOOLS FROM EXPRESS ENDPOINTS
	// ============================================================================
	// These tools were automatically generated from your Express application.
	// Each tool corresponds to an endpoint in your Express app.

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
		async (args) => {
			// ===== REQUEST CONFIGURATION =====
			const url = \`http://localhost:\${config.appPort || 3000}${endpoint.path}\`;
			const method = "${endpoint.method.toUpperCase()}";
			
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
			// ===== URL CONSTRUCTION =====
			if (queryParams.toString()) {
				requestOptions.url = url + (url.includes('?') ? '&' : '?') + queryParams.toString();
			} else {
				requestOptions.url = url;
			}
			// Add body for POST/PUT/PATCH requests
			if (["POST", "PUT", "PATCH"].includes(method) && Object.keys(bodyParams).length > 0) {
				requestOptions.body = JSON.stringify(bodyParams);
			}
			// ===== HTTP REQUEST & RESPONSE =====
			try {
				const response = await fetch(requestOptions.url, requestOptions);
				const data = await response.json();
				return data;
			} catch (error) {
				return {
					content: [
						{
							type: "text",
							text: \`Error calling ${endpoint.method.toUpperCase()} ${endpoint.path}: \${error instanceof Error ? error.message : String(error)}\`
						}
					]
				};
			}
		}
	);
`}).join('\n\n')}

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

import { HttpServerTransport } from "@modelcontextprotocol/sdk/server/http.js";

async function main() {
	const server = createStatelessServer({ config: {} });
	console.log("🚀 MCP Server starting...");
	const port = process.env.PORT || 8080;
	const transport = new HttpServerTransport({ port });
	
	try {
		await server.connect(transport);
		console.log(\`✅ MCP Server connected and ready on port \${port}\`);
		
		// Keep the process alive
		console.log("🔄 Server running... Press Ctrl+C to stop");
		
		// Graceful shutdown handling
		process.on('SIGINT', () => {
			console.log('\\n⏹️ Received SIGINT, shutting down gracefully...');
			process.exit(0);
		});
		
		process.on('SIGTERM', () => {
			console.log('\\n⏹️ Received SIGTERM, shutting down gracefully...');
			process.exit(0);
		});
		
		// Keep alive with periodic logging (optional)
		setInterval(() => {
			console.log(\`💓 Server heartbeat - listening on port \${port}\`);
		}, 60000); // Log every minute
		
		// Prevent the process from exiting
		await new Promise((resolve) => {
			// This promise never resolves, keeping the process alive
			// The only way to exit is through signal handlers above
		});
		
	} catch (error) {
		console.error("❌ Failed to start server:", error);
		process.exit(1);
	}
}

main().catch((error) => {
	console.error("❌ Server error:", error);
	process.exit(1);
});
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
				"zod": "^3.22.0"
			},
			devDependencies: {
				"typescript": "^5.0.0",
				"@types/node": "^20.0.0"
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
		const serverCode = `import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

// Tool handlers
${endpoints.map(endpoint => {
	const toolName = this.generateToolName(endpoint)
	return `import { ${toolName} } from "./tools/${toolName}.js";`
}).join('\n')}

const server = new Server(
	{
		name: "generated-mcp-server",
		version: "1.0.0",
	},
	{
		capabilities: {
			tools: {},
		},
	}
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
	return {
		tools: [
${endpoints.map(endpoint => {
	const toolName = this.generateToolName(endpoint)
	return `{
		name: "${toolName}",
		description: "${endpoint.description || `${endpoint.method} ${endpoint.path}`}",
		inputSchema: {
			type: "object",
			properties: ${JSON.stringify(this.generateToolSchema(endpoint))},
			required: ${JSON.stringify(endpoint.parameters?.filter(p => p.required).map(p => p.name) || [])}
		}
	}`
}).join(',\n')}
		]
	};
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
	const { name, arguments: args } = request.params;

	switch (name) {
${endpoints.map(endpoint => {
	const toolName = this.generateToolName(endpoint)
	return `		case "${toolName}":
			return await ${toolName}(args || {});`
}).join('\n')}
		default:
			throw new Error("Unknown tool: " + name);
	}
});

async function main() {
	const transport = new StdioServerTransport();
	await server.connect(transport);
}

main().catch((error) => {
	console.error("Server error:", error);
	process.exit(1);
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
			scripts: {
				start: "node server.js"
			},
			dependencies: {
				"@modelcontextprotocol/sdk": "^1.10.1",
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
			const pathReplacements = endpoint.parameters?.filter(p => p.location === "path").map(param => 
				`\t\turl = url.replace(":${param.name}", String(args.${param.name}) || "");`
			).join('\n') || ''
			
			const queryParams = endpoint.parameters?.filter(p => p.location === "query").map(param => 
				`\t\tif (args.${param.name} !== undefined) queryParams.append("${param.name}", String(args.${param.name}));`
			).join('\n') || ''
			
			const bodyHandling = ['POST', 'PUT', 'PATCH'].includes(endpoint.method) ? 
				`\t\tif (args.body) {\n\t\t\toptions.body = JSON.stringify(args.body)\n\t\t}` : 
				'\t\t// No body for GET requests'
			
			return `// Tool handler for ${endpoint.method} ${endpoint.path}

export async function ${toolName}(args = {}) {
	try {
		const baseUrl = "http://localhost:${appPort}"
		let url = "${endpoint.path}"
		
${pathReplacements}
		
		const queryParams = new URLSearchParams()
${queryParams}
		
		if (queryParams.toString()) {
			url += "?" + queryParams.toString()
		}
		
		const fullUrl = baseUrl + url
		const options = {
			method: "${endpoint.method}",
			headers: {
				"Content-Type": "application/json",
			},
		}
		
${bodyHandling}
		
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
}`
		} else {
			// Python version
			return `# Tool handler for ${endpoint.method} ${endpoint.path}
async def ${toolName}(args):
	# TODO: Implement Python handler
	pass
`
		}
	}

	private generateToolArgInterface(endpoint: ExpressEndpoint): string {
		const toolName = this.generateToolName(endpoint)
		const properties: string[] = []
		let hasRequiredParams = false
		
		// Add path and query parameters
		if (endpoint.parameters) {
			for (const param of endpoint.parameters) {
				const tsType = this.mapTypeToTypeScript(param.type)
				const isRequired = param.required || param.location === "path" // Path params are always required
				const optional = isRequired ? "" : "?"
				if (isRequired) hasRequiredParams = true
				properties.push(`\t${param.name}${optional}: ${tsType}`)
			}
		}
		
		// Add request body for POST/PUT/PATCH requests
		if (['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
			if (endpoint.requestBody && endpoint.requestBody.properties) {
				const bodyProperties = Object.entries(endpoint.requestBody.properties)
					.map(([key, value]) => {
						const tsType = this.mapTypeToTypeScript(value.type)
						const optional = endpoint.requestBody?.required?.includes(key) ? "" : "?"
						return `\t\t${key}${optional}: ${tsType}`
					})
					.join('\n')
				
				properties.push(`\tbody?: {\n${bodyProperties}\n\t}`)
			} else {
				properties.push(`\tbody?: any`)
			}
		}
		
		if (properties.length === 0) {
			return `interface ${toolName}Args {}`
		}
		
		// Generate the interface
		const interfaceCode = `interface ${toolName}Args {
${properties.join('\n')}
}`
		
		// Also return whether we have required params for function signature
		return interfaceCode
	}

	private mapTypeToTypeScript(type: string): string {
		// Map JSON Schema types to TypeScript types
		switch (type.toLowerCase()) {
			case "string": return "string"
			case "number": return "number"
			case "boolean": return "boolean"
			case "array": return "any[]"
			case "object": return "any"
			case "date": return "string"
			case "any": return "any"
			case "unknown": return "any"
			default: return "any" // Default for custom types
		}
	}

	private generateZodShapeObject(endpoint: ExpressEndpoint): string {
		const properties: string[] = [];
		// Add path and query parameters
		if (endpoint.parameters) {
			for (const param of endpoint.parameters) {
				const zodType = this.mapTypeToZod(param.type);
				const optional = param.required ? "" : ".optional()";
				if (zodType === "object") {
					properties.push(`\t${param.name}: z.${zodType}({})${optional}`);
				} else {
					properties.push(`\t${param.name}: z.${zodType}()${optional}`);
				}
			}
		}
		// Add request body for POST/PUT/PATCH requests
		if (["POST", "PUT", "PATCH"].includes(endpoint.method)) {
			if (endpoint.requestBody && endpoint.requestBody.properties) {
				const bodyProperties = Object.entries(endpoint.requestBody.properties)
					.map(([key, value]) => {
						const zodType = this.mapTypeToZod(value.type);
						const optional = endpoint.requestBody?.required?.includes(key) ? "" : ".optional()";
						if (zodType === "object") {
							return `\t\t${key}: z.${zodType}({})${optional}`;
						} else {
							return `\t\t${key}: z.${zodType}()${optional}`;
						}
					})
					.join(',\n');
				properties.push(`\tbody: z.object({\n${bodyProperties}\n\t}).optional()`);
			} else {
				properties.push(`\tbody: z.object({}).optional()`);
			}
		}
		if (properties.length === 0) {
			return `{}`;
		}
		return `{
${properties.join(',\n')}
\t}`;
	}

	private mapTypeToZod(type: string): string {
		// Map JSON Schema types to Zod types
		switch (type.toLowerCase()) {
			case "string": return "string"
			case "number": return "number"
			case "boolean": return "boolean"
			case "array": return "array"
			case "object": return "object"
			case "date": return "string"
			case "any": return "any"
			case "unknown": return "any"
			default: return "any" // Default for custom types
		}
	}

	private generateParameterHandling(endpoint: ExpressEndpoint): string {
		const lines: string[] = [];
		// Handle path parameters
		if (endpoint.parameters) {
			for (const param of endpoint.parameters) {
				if (param.location === "path") {
					lines.push(`\t\t\t// Replace path parameter :${param.name}`);
					lines.push(`\t\t\trequestOptions.url = requestOptions.url.replace(":${param.name}", String(args.${param.name}) || "");`);
				} else if (param.location === "query") {
					lines.push(`\t\t\t// Add query parameter ${param.name}`);
					lines.push(`\t\t\tif (args.${param.name} !== undefined) queryParams.append("${param.name}", String(args.${param.name}));`);
				} else if (param.location === "body") {
					lines.push(`\t\t\t// Add body parameter ${param.name}`);
					lines.push(`\t\t\tif (args.${param.name} !== undefined) bodyParams.${param.name} = args.${param.name};`);
				}
			}
		}
		// Handle request body for POST/PUT/PATCH requests
		if (["POST", "PUT", "PATCH"].includes(endpoint.method)) {
			lines.push(`\t\t\t// Add request body`);
			lines.push(`\t\t\tif (args.body) Object.assign(bodyParams, args.body);`);
		}
		return lines.join('\n');
	}
} 