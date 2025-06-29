/**
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
	const mcpEndpoint = options.endpoint || '/mcp'
	
	// Create MCP server instance
	const createMCPServer = () => {
		const server = new McpServer({
			name: "express-mcp-integration",
			version: "1.0.0",
		})

		
		// GET /api/users
		server.tool(
			"getApiUsers",
			"GET /api/users",
			{
				// Tool schema would go here based on endpoint analysis
			},
			async (args) => {
				// Direct function call - no HTTP overhead!
				// Implementation would call the actual Express route handler
				return { content: [{ type: "text", text: "Tool result" }] }
			}
		)

		// GET /api/users/:id
		server.tool(
			"getApiUsersById",
			"GET /api/users/:id",
			{
				// Tool schema would go here based on endpoint analysis
			},
			async (args) => {
				// Direct function call - no HTTP overhead!
				// Implementation would call the actual Express route handler
				return { content: [{ type: "text", text: "Tool result" }] }
			}
		)

		// POST /api/users
		server.tool(
			"postApiUsers",
			"POST /api/users",
			{
				// Tool schema would go here based on endpoint analysis
			},
			async (args) => {
				// Direct function call - no HTTP overhead!
				// Implementation would call the actual Express route handler
				return { content: [{ type: "text", text: "Tool result" }] }
			}
		)

		// PUT /api/users/:id
		server.tool(
			"putApiUsersById",
			"PUT /api/users/:id",
			{
				// Tool schema would go here based on endpoint analysis
			},
			async (args) => {
				// Direct function call - no HTTP overhead!
				// Implementation would call the actual Express route handler
				return { content: [{ type: "text", text: "Tool result" }] }
			}
		)

		// DELETE /api/users/:id
		server.tool(
			"deleteApiUsersById",
			"DELETE /api/users/:id",
			{
				// Tool schema would go here based on endpoint analysis
			},
			async (args) => {
				// Direct function call - no HTTP overhead!
				// Implementation would call the actual Express route handler
				return { content: [{ type: "text", text: "Tool result" }] }
			}
		)

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
	
	console.log(`🔧 MCP endpoints added at ${mcpEndpoint}`)
	return app
}

// Export individual tools for advanced usage
export const tool1 = "getApiUsers"
export const tool2 = "getApiUsersById"
export const tool3 = "postApiUsers"
export const tool4 = "putApiUsersById"
export const tool5 = "deleteApiUsersById"
