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
