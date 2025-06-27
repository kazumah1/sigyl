/**
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

	// ===== GET /api/users =====
	server.tool(
		"getApiUsers",
		"GET /api/users",
		{
	limit: z.number().optional(),
	offset: z.number().optional(),
	search: z.string().optional(),
	status: z.string().optional()
	},
		async (args) => {
			// ===== REQUEST CONFIGURATION =====
			const url = `http://localhost:${config.appPort || 3000}/api/users`;
			const method = "GET";
			
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
			
			// Add query parameter limit
			if (args.limit !== undefined) queryParams.append("limit", String(args.limit));
			// Add query parameter offset
			if (args.offset !== undefined) queryParams.append("offset", String(args.offset));
			// Add query parameter search
			if (args.search !== undefined) queryParams.append("search", String(args.search));
			// Add query parameter status
			if (args.status !== undefined) queryParams.append("status", String(args.status));
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
							text: `Error calling GET /api/users: ${error instanceof Error ? error.message : String(error)}`
						}
					]
				};
			}
		}
	);


	// ===== GET /api/products =====
	server.tool(
		"getApiProducts",
		"GET /api/products",
		{
	category: z.string().optional(),
	minPrice: z.number().optional(),
	maxPrice: z.number().optional(),
	sortBy: z.string().optional(),
	inStock: z.boolean().optional()
	},
		async (args) => {
			// ===== REQUEST CONFIGURATION =====
			const url = `http://localhost:${config.appPort || 3000}/api/products`;
			const method = "GET";
			
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
			
			// Add query parameter category
			if (args.category !== undefined) queryParams.append("category", String(args.category));
			// Add query parameter minPrice
			if (args.minPrice !== undefined) queryParams.append("minPrice", String(args.minPrice));
			// Add query parameter maxPrice
			if (args.maxPrice !== undefined) queryParams.append("maxPrice", String(args.maxPrice));
			// Add query parameter sortBy
			if (args.sortBy !== undefined) queryParams.append("sortBy", String(args.sortBy));
			// Add query parameter inStock
			if (args.inStock !== undefined) queryParams.append("inStock", String(args.inStock));
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
							text: `Error calling GET /api/products: ${error instanceof Error ? error.message : String(error)}`
						}
					]
				};
			}
		}
	);


	// ===== GET /api/users/:id =====
	server.tool(
		"getApiUsersById",
		"GET /api/users/:id",
		{
	id: z.number()
	},
		async (args) => {
			// ===== REQUEST CONFIGURATION =====
			const url = `http://localhost:${config.appPort || 3000}/api/users/:id`;
			const method = "GET";
			
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
			
			// Replace path parameter :id
			requestOptions.url = requestOptions.url.replace(":id", String(args.id) || "");
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
							text: `Error calling GET /api/users/:id: ${error instanceof Error ? error.message : String(error)}`
						}
					]
				};
			}
		}
	);


	// ===== POST /api/users =====
	server.tool(
		"postApiUsers",
		"POST /api/users",
		{
	body: z.object({
		name: z.string(),
		email: z.string(),
		status: z.string().optional()
	}).optional()
	},
		async (args) => {
			// ===== REQUEST CONFIGURATION =====
			const url = `http://localhost:${config.appPort || 3000}/api/users`;
			const method = "POST";
			
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
			
			// Add request body
			if (args.body) Object.assign(bodyParams, args.body);
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
							text: `Error calling POST /api/users: ${error instanceof Error ? error.message : String(error)}`
						}
					]
				};
			}
		}
	);


	// ===== PUT /api/users/:id =====
	server.tool(
		"putApiUsersById",
		"PUT /api/users/:id",
		{
	id: z.number(),
	body: z.object({
		name: z.string().optional(),
		email: z.string().optional(),
		status: z.string().optional()
	}).optional()
	},
		async (args) => {
			// ===== REQUEST CONFIGURATION =====
			const url = `http://localhost:${config.appPort || 3000}/api/users/:id`;
			const method = "PUT";
			
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
			
			// Replace path parameter :id
			requestOptions.url = requestOptions.url.replace(":id", String(args.id) || "");
			// Add request body
			if (args.body) Object.assign(bodyParams, args.body);
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
							text: `Error calling PUT /api/users/:id: ${error instanceof Error ? error.message : String(error)}`
						}
					]
				};
			}
		}
	);


	// ===== DELETE /api/users/:id =====
	server.tool(
		"deleteApiUsersById",
		"DELETE /api/users/:id",
		{
	id: z.number()
	},
		async (args) => {
			// ===== REQUEST CONFIGURATION =====
			const url = `http://localhost:${config.appPort || 3000}/api/users/:id`;
			const method = "DELETE";
			
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
			
			// Replace path parameter :id
			requestOptions.url = requestOptions.url.replace(":id", String(args.id) || "");
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
							text: `Error calling DELETE /api/users/:id: ${error instanceof Error ? error.message : String(error)}`
						}
					]
				};
			}
		}
	);


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

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

async function main() {
	const server = createStatelessServer({ config: { appPort: "3000" } });
	console.log("🚀 MCP Server starting...");
	console.log("📡 Connecting to Express app on port 3000");
	const transport = new StdioServerTransport();
	await server.connect(transport);
	console.log("✅ MCP Server connected and ready");
}

main().catch((error) => {
	console.error("❌ Server error:", error);
	process.exit(1);
});
