import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

// Tool handlers
import { getApiUsers } from "./tools/getApiUsers.js";
import { getApiProducts } from "./tools/getApiProducts.js";
import { getApiUsersById } from "./tools/getApiUsersById.js";
import { postApiUsers } from "./tools/postApiUsers.js";

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
			properties: {"limit":{"type":"number","description":"Query parameter: limit"},"offset":{"type":"number","description":"Query parameter: offset"},"search":{"type":"string","description":"Query parameter: search"},"status":{"type":"string","description":"Query parameter: status"}},
			required: []
		}
	},
{
		name: "getApiProducts",
		description: "GET /api/products",
		inputSchema: {
			type: "object",
			properties: {"category":{"type":"string","description":"Query parameter: category"},"minPrice":{"type":"number","description":"Query parameter: minPrice"},"maxPrice":{"type":"number","description":"Query parameter: maxPrice"},"sortBy":{"type":"string","description":"Query parameter: sortBy"}},
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
		case "getApiProducts":
			return await getApiProducts(args || {});
		case "getApiUsersById":
			return await getApiUsersById(args || {});
		case "postApiUsers":
			return await postApiUsers(args || {});
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
