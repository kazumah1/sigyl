/**
 * Auto-generated MCP Server (template)
 * 
 * This server provides a template tool for you to customize.
 * To add a new tool, use the template at the bottom of this file.
 */

import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js"
import { z } from "zod"
import cors from 'cors';

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

const app = express();
app.use(express.json());
app.use(cors());

app.post('/mcp', async (req, res) => {
	const server = createStatelessServer({ config: {} });
	const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
	res.on('close', () => {
		transport.close();
		server.close();
	});
	await server.connect(transport);
	await transport.handleRequest(req, res, req.body);
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
	console.log("MCP Server listening on port " + port);
});
