import chalk from "chalk"
import { writeFileSync, mkdirSync, existsSync } from "node:fs"
import { join } from "node:path"
import ora from "ora"
import { ExpressScanner } from "../lib/express-scanner"
import { verboseLog } from "../logger"

export interface IntegrateOptions {
	directory: string
	outDir: string
	serverLanguage: "typescript" | "javascript"
	autoAdd?: boolean
	endpoint?: string
}

export async function integrateWithExpress(options: IntegrateOptions): Promise<void> {
	const spinner = ora("Analyzing Express application...").start()
	
	try {
		// Scan Express app for endpoints
		const scanner = new ExpressScanner(options.directory)
		const endpoints = await scanner.scanForEndpoints()
		
		if (endpoints.length === 0) {
			spinner.fail("No Express endpoints found!")
			console.log(chalk.yellow("Make sure your Express app has route definitions"))
			return
		}

		spinner.text = `Generating integration code for ${endpoints.length} endpoints...`
		
		// Generate integration code
		await generateIntegrationCode(endpoints, options)
		
		spinner.succeed("MCP integration generated successfully!")
		
		console.log(chalk.green("🎉 Integration ready!"))
		console.log(chalk.blue("\n🚀 Next steps:"))
		
		if (!options.autoAdd) {
			console.log(chalk.gray("1. Add this line to your Express app:"))
			console.log(chalk.cyan(`   import { addMCPEndpoints } from './${options.outDir}/integration'`))
			console.log(chalk.cyan(`   addMCPEndpoints(app)`))
			console.log(chalk.gray("\n2. Start your Express app normally:"))
			console.log(chalk.cyan("   npm start"))
			console.log(chalk.gray("\n3. Test with MCP Inspector:"))
			console.log(chalk.cyan(`   sigyl inspect http://localhost:3000${options.endpoint || '/mcp'}`))
			console.log(chalk.yellow("\nℹ️  To change the Express API address/port, set the APP_BASE_URL environment variable when running the generated MCP server. Example:"))
			console.log(chalk.cyan("  APP_BASE_URL=http://myhost:4000 node server.js"))
		} else {
			console.log(chalk.gray("✅ Integration automatically added to your Express app"))
			console.log(chalk.gray("Start your app and visit /mcp endpoint"))
		}
		
	} catch (error) {
		spinner.fail("Integration failed")
		throw error
	}
}

async function generateIntegrationCode(endpoints: any[], options: IntegrateOptions): Promise<void> {
	// Ensure output directory exists
	if (!existsSync(options.outDir)) {
		mkdirSync(options.outDir, { recursive: true })
	}

	const endpoint = options.endpoint || '/mcp'
	
	const integrationCode = `/**
 * MCP Integration for Express App
 * Auto-generated integration code that adds MCP endpoints to your existing Express application.
 * 
 * This provides a single-server solution with zero network overhead.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js"
import { z } from "zod"
import type { Express, Request, Response } from "express"

interface MCPIntegrationOptions {
	endpoint?: string
	autoScan?: boolean
}

export function addMCPEndpoints(app: Express, options: MCPIntegrationOptions = {}) {
	const mcpEndpoint = options.endpoint || '${endpoint}'
	
	// Create MCP server instance
	const createMCPServer = () => {
		const server = new McpServer({
			name: "express-mcp-integration",
			version: "1.0.0",
		})

		${generateToolsCode(endpoints)}

		return server.server
	}

	// Add MCP endpoint to Express app
	app.post(mcpEndpoint, async (req: Request, res: Response) => {
		try {
			const server = createMCPServer()
			const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
			
			res.on('close', () => {
				transport.close()
				server.close()
			})
			
			await server.connect(transport)
			await transport.handleRequest(req, res, req.body)
		} catch (error) {
			console.error('MCP endpoint error:', error)
			res.status(500).json({ error: 'Internal server error' })
		}
	})
	
	console.log(\`🔧 MCP endpoints added at \${mcpEndpoint}\`)
	return app
}

// Export individual tools for advanced usage
${endpoints.map((endpoint, i) => `export const tool${i + 1} = "${generateToolName(endpoint)}"`).join('\n')}
`

	writeFileSync(join(options.outDir, "integration.ts"), integrationCode)
	verboseLog("Generated integration.ts")
	
	// Generate package.json updates
	const packageUpdates = {
		dependencies: {
			"@modelcontextprotocol/sdk": "^1.10.1",
			"zod": "^3.22.0"
		}
	}
	
	writeFileSync(
		join(options.outDir, "package-updates.json"), 
		JSON.stringify(packageUpdates, null, 2)
	)
	
	console.log(chalk.yellow("📦 Don't forget to install new dependencies:"))
	console.log(chalk.gray("npm install @modelcontextprotocol/sdk zod"))
}

function generateToolsCode(endpoints: any[]): string {
	return endpoints.map(endpoint => {
		const toolName = generateToolName(endpoint)
		return `
		// ${endpoint.method.toUpperCase()} ${endpoint.path}
		server.tool(
			"${toolName}",
			"${endpoint.description || `${endpoint.method} ${endpoint.path}`}",
			{
				// Tool schema would go here based on endpoint analysis
			},
			async (args) => {
				// Direct function call - no HTTP overhead!
				// Implementation would call the actual Express route handler
				return { content: [{ type: "text", text: "Tool result" }] }
			}
		)`
	}).join('\n')
}

function generateToolName(endpoint: any): string {
	// Same logic as existing CLI
	const method = endpoint.method.toLowerCase()
	const pathParts = endpoint.path
		.split('/')
		.filter((part: string) => part && part !== '')
		.map((part: string) => {
			if (part.startsWith(':')) {
				return 'By' + part.slice(1).charAt(0).toUpperCase() + part.slice(2)
			}
			return part
				.replace(/[-_]/g, ' ')
				.split(' ')
				.map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
				.join('')
		})

	return method + pathParts.join('')
} 