/**
 * Auto-generated MCP Server (template)
 * 
 * This server provides a template tool for you to customize.
 * To add a new tool, use the template at the bottom of this file.
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
	// TEMPLATE TOOL
	// ============================================================================
	// Replace or add more tools as needed.

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
		console.log(`✅ MCP Server connected and ready on port ${port}`);
		
		// Keep the process alive
		console.log("🔄 Server running... Press Ctrl+C to stop");
		
		// Graceful shutdown handling
		process.on('SIGINT', () => {
			console.log('\n⏹️ Received SIGINT, shutting down gracefully...');
			process.exit(0);
		});
		
		process.on('SIGTERM', () => {
			console.log('\n⏹️ Received SIGTERM, shutting down gracefully...');
			process.exit(0);
		});
		
		// Keep alive with periodic logging (optional)
		setInterval(() => {
			console.log(`💓 Server heartbeat - listening on port ${port}`);
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
