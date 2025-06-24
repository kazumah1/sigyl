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
	private language: "typescript" | "python"

	constructor(outDir: string, language: "typescript" | "python") {
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
			tools: endpoints.map(endpoint => ({
				name: this.generateToolName(endpoint),
				description: endpoint.description || `${endpoint.method} ${endpoint.path}`,
				inputSchema: {
					type: "object",
					properties: this.generateToolSchema(endpoint),
					required: endpoint.parameters?.filter(p => p.required).map(p => p.name) || []
				}
			}))
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
	return `import { ${toolName} } from "./tools/${toolName}.js"`
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
)

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
	return {
		tools: [
${endpoints.map(endpoint => {
	const toolName = this.generateToolName(endpoint)
	return `			{
				name: "${toolName}",
				description: "${endpoint.description || `${endpoint.method} ${endpoint.path}`}",
				inputSchema: {
					type: "object",
					properties: ${JSON.stringify(this.generateToolSchema(endpoint), null, 6)},
					required: ${JSON.stringify(endpoint.parameters?.filter(p => p.required).map(p => p.name) || [])}
				}
			}`
}).join(',\n')}
		]
	}
})

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
	const { name, arguments: args } = request.params

	switch (name) {
${endpoints.map(endpoint => {
	const toolName = this.generateToolName(endpoint)
	return `		case "${toolName}":
			return await ${toolName}(args)`
}).join('\n')}
		default:
			throw new Error(\`Unknown tool: \${name}\`)
	}
})

async function main() {
	const transport = new StdioServerTransport()
	await server.connect(transport)
}

main().catch((error) => {
	console.error("Server error:", error)
	process.exit(1)
})
`

		writeFileSync(join(this.outDir, "server.ts"), serverCode)
		verboseLog("Generated TypeScript server")

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
		}

		writeFileSync(join(this.outDir, "package.json"), JSON.stringify(packageJson, null, 2))
		verboseLog("Generated package.json")
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
			const handlerCode = this.generateToolHandler(endpoint, options)
			
			if (this.language === "typescript") {
				writeFileSync(join(toolsDir, `${toolName}.ts`), handlerCode)
			} else {
				writeFileSync(join(toolsDir, `${toolName}.py`), handlerCode)
			}
		}

		verboseLog(`Generated ${endpoints.length} tool handlers`)
	}

	private generateToolName(endpoint: ExpressEndpoint): string {
		// Convert path and method to camelCase tool name
		// e.g., GET /api/users/:id -> getApiUsersById
		const method = endpoint.method.toLowerCase()
		const pathParts = endpoint.path
			.split('/')
			.filter(part => part && part !== '')
			.map(part => {
				// Remove colons from path parameters
				if (part.startsWith(':')) {
					return 'By' + part.slice(1).charAt(0).toUpperCase() + part.slice(2)
				}
				return part.charAt(0).toUpperCase() + part.slice(1)
			})

		return method + pathParts.join('')
	}

	private generateToolSchema(endpoint: ExpressEndpoint): Record<string, any> {
		const schema: Record<string, any> = {}

		if (endpoint.parameters) {
			for (const param of endpoint.parameters) {
				schema[param.name] = {
					type: param.type,
					description: `${param.location} parameter`
				}
			}
		}

		// Add common parameters for POST/PUT requests
		if (['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
			schema.body = {
				type: "object",
				description: "Request body data"
			}
		}

		return schema
	}

	private generateToolHandler(endpoint: ExpressEndpoint, options: MCPGenerationOptions): string {
		const toolName = this.generateToolName(endpoint)
		const appPort = options.appPort || "3000"

		if (this.language === "typescript") {
			return `// Tool handler for ${endpoint.method} ${endpoint.path}
export async function ${toolName}(args: any): Promise<{ content: Array<{ type: string; text: string }> }> {
	try {
		// Construct URL for the Express endpoint
		const baseUrl = "http://localhost:${appPort}"
		let url = "${endpoint.path}"
		
		// Replace path parameters
		${endpoint.parameters?.filter(p => p.location === "path").map(param => 
			`url = url.replace(":${param.name}", args.${param.name} || "")`
		).join('\n\t\t') || ''}
		
		// Add query parameters
		const queryParams = new URLSearchParams()
		${endpoint.parameters?.filter(p => p.location === "query").map(param => 
			`if (args.${param.name}) queryParams.append("${param.name}", args.${param.name})`
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
		
		// Add body for POST/PUT requests
		if (["POST", "PUT", "PATCH"].includes("${endpoint.method}") && args.body) {
			options.body = JSON.stringify(args.body)
		}
		
		const response = await fetch(fullUrl, options)
		const result = await response.text()
		
		return {
			content: [
				{
					type: "text",
					text: \`Request: \${options.method} \${fullUrl}\\nResponse: \${result}\`
				}
			]
		}
	} catch (error) {
		return {
			content: [
				{
					type: "text",
					text: \`Error calling ${endpoint.method} ${endpoint.path}: \${error}\`
				}
			]
		}
	}
}
`
		} else {
			// Python version
			return `# Tool handler for ${endpoint.method} ${endpoint.path}
async def ${toolName}(args):
	# TODO: Implement Python handler
	pass
`
		}
	}
} 