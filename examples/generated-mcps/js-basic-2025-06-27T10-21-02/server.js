import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

// Tool handlers
import { getApiUsers } from "./tools/getApiUsers.js";
import { getApiUsersById } from "./tools/getApiUsersById.js";
import { postApiUsers } from "./tools/postApiUsers.js";
import { putApiUsersById } from "./tools/putApiUsersById.js";
import { deleteApiUsersById } from "./tools/deleteApiUsersById.js";

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
{
		name: "getApiUsers",
		description: "GET /api/users",
		inputSchema: {
			type: "object",
			properties: {},
			required: []
		}
	},
{
		name: "getApiUsersById",
		description: "GET /api/users/:id",
		inputSchema: {
			type: "object",
			properties: {"id":{"type":"number","description":"Path parameter: id","required":true}},
			required: ["id"]
		}
	},
{
		name: "postApiUsers",
		description: "POST /api/users",
		inputSchema: {
			type: "object",
			properties: {"body":{"type":"object","description":"Request body data"}},
			required: []
		}
	},
{
		name: "putApiUsersById",
		description: "PUT /api/users/:id",
		inputSchema: {
			type: "object",
			properties: {"id":{"type":"number","description":"Path parameter: id","required":true},"body":{"type":"object","description":"Request body data"}},
			required: ["id"]
		}
	},
{
		name: "deleteApiUsersById",
		description: "DELETE /api/users/:id",
		inputSchema: {
			type: "object",
			properties: {"id":{"type":"number","description":"Path parameter: id","required":true}},
			required: ["id"]
		}
	}
		]
	};
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
	const { name, arguments: args } = request.params;

	switch (name) {
		case "getApiUsers":
			return await getApiUsers(args || {});
		case "getApiUsersById":
			return await getApiUsersById(args || {});
		case "postApiUsers":
			return await postApiUsers(args || {});
		case "putApiUsersById":
			return await putApiUsersById(args || {});
		case "deleteApiUsersById":
			return await deleteApiUsersById(args || {});
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
