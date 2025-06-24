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

		// Generate tool handlers
		await this.generateToolHandlers(endpoints, options)
	}

	private async generateMCPConfig(
		endpoints: ExpressEndpoint[],
		options: MCPGenerationOptions
	): Promise<void> {
		const config = {
			name: "generated-mcp-server",
			description: "Auto-generated MCP server from Express endpoints",
			version: "1.0.0",
			tools: endpoints.map(endpoint => {
				const toolConfig: any = {
					name: this.generateToolName(endpoint),
					description: endpoint.description || `${endpoint.method} ${endpoint.path}`,
					inputSchema: {
						type: "object",
						properties: this.generateToolSchema(endpoint),
						required: endpoint.parameters?.filter(p => p.required).map(p => p.name) || []
					}
				}
				
				// Add output schema if we have response type information
				if (endpoint.responseSchema) {
					toolConfig.outputSchema = endpoint.responseSchema
				} else if (endpoint.responseType) {
					toolConfig.outputSchema = {
						type: this.mapTypeToJSONSchema(endpoint.responseType),
						description: `Response from ${endpoint.method} ${endpoint.path}`
					}
				}
				
				return toolConfig
			})
		}

		const yamlContent = yaml.stringify(config, { indent: 2 })
		writeFileSync(join(this.outDir, "mcp.yaml"), yamlContent)
		verboseLog("Generated mcp.yaml configuration")
	}

	private async generateTypeScriptServer(
		endpoints: ExpressEndpoint[],
		options: MCPGenerationOptions
	): Promise<void> {
		const serverCode = `import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import {
	CallToolRequestSchema,
	ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js"

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
	const hasRequiredParams = endpoint.parameters?.some(p => p.required || p.location === "path") || false
	const argsParam = hasRequiredParams ? "(args || {}) as any" : "args"
	return `		case "${toolName}":
			return await ${toolName}(${argsParam});`
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

		writeFileSync(join(this.outDir, "server.ts"), serverCode);
		verboseLog("Generated TypeScript server");

		// Generate package.json for the server
		const packageJson = {
			name: "generated-mcp-server",
			version: "1.0.0",
			type: "module",
			main: "server.js",
			scripts: {
				build: "tsc",
				start: "node server.js"
			},
			dependencies: {
				"@modelcontextprotocol/sdk": "^1.10.1",
			},
			devDependencies: {
				"typescript": "^5.0.0",
				"@types/node": "^20.0.0"
			}
		};

		writeFileSync(join(this.outDir, "package.json"), JSON.stringify(packageJson, null, 2));
		verboseLog("Generated package.json");

		// Generate tsconfig.json for TypeScript compilation
		const tsConfig = {
			compilerOptions: {
				target: "ES2020",
				module: "ESNext",
				moduleResolution: "node",
				allowSyntheticDefaultImports: true,
				esModuleInterop: true,
				allowJs: true,
				outDir: "./",
				rootDir: "./",
				strict: true,
				skipLibCheck: true,
				forceConsistentCasingInFileNames: true
			},
			include: ["*.ts", "tools/*.ts"],
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
	}

	private async generatePythonServer(
		endpoints: ExpressEndpoint[],
		options: MCPGenerationOptions
	): Promise<void> {
		// TODO: Implement Python server generation
		verboseLog("Python server generation not yet implemented")
	}

	private async generateToolHandlers(
		endpoints: ExpressEndpoint[],
		options: MCPGenerationOptions
	): Promise<void> {
		const toolsDir = join(this.outDir, "tools")
		if (!existsSync(toolsDir)) {
			mkdirSync(toolsDir, { recursive: true })
		}

		for (const endpoint of endpoints) {
			const toolName = this.generateToolName(endpoint)
			let handlerCode = this.generateToolHandler(endpoint, options)
			if (this.language === "typescript") {
				writeFileSync(join(toolsDir, `${toolName}.ts`), handlerCode)
			} else if (this.language === "javascript") {
				// Strip types for JS output
				handlerCode = handlerCode.replace(/interface [^{]+{[^}]+}/g, "")
				// Only remove type annotations in function parameters and return types, not object properties
				handlerCode = handlerCode.replace(/\(args: [^)]+\)/g, "(args = {})")
				handlerCode = handlerCode.replace(/: Promise<[^>]+>/g, "")
				handlerCode = handlerCode.replace(/: RequestInit/g, "")
				writeFileSync(join(toolsDir, `${toolName}.js`), handlerCode)
			} else {
				writeFileSync(join(toolsDir, `${toolName}.py`), handlerCode)
			}
		}

		verboseLog(`Generated ${endpoints.length} tool handlers`)
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
			`url = url.replace(":${param.name}", String(args.${param.name} || ""))`
		).join('\n\t\t') || ''}
		
		// Add query parameters
		const queryParams = new URLSearchParams()
		${endpoint.parameters?.filter(p => p.location === "query").map(param => 
			`if (args.${param.name} !== undefined) queryParams.append("${param.name}", String(args.${param.name}))`
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
					text: "Error calling ${endpoint.method} ${endpoint.path}: " + error
				}
			]
		}
	}
}
`
		} else if (this.language === "javascript") {
			// Generate plain JS handler (no types)
			const pathReplacements = endpoint.parameters?.filter(p => p.location === "path").map(param => 
				`\t\turl = url.replace(":${param.name}", String(args.${param.name} || ""))`
			).join('\n') || ''
			
			const queryParams = endpoint.parameters?.filter(p => p.location === "query").map(param => 
				`\t\tif (args.${param.name} !== undefined) queryParams.append("${param.name}", String(args.${param.name}))`
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
					text: "Error calling ${endpoint.method} ${endpoint.path}: " + error
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
} 