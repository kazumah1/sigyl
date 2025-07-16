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

	// ===== GET /api/users/search =====
	server.tool(
		"getApiUsersSearch",
		"GET /api/users/search",
		{
		q: z.string().optional().describe("Query parameter: q"),
		name: z.string().optional().describe("Query parameter: name"),
		email: z.string().optional().describe("Query parameter: email"),
		city: z.string().optional().describe("Query parameter: city"),
		country: z.string().optional().describe("Query parameter: country"),
		theme: z.string().optional().describe("Query parameter: theme"),
		limit: z.number().optional().describe("Query parameter: limit"),
		offset: z.number().optional().describe("Query parameter: offset"),
		sortBy: z.string().optional().describe("Query parameter: sortBy"),
		sortOrder: z.string().optional().describe("Query parameter: sortOrder"),
		includeProfile: z.boolean().optional().describe("Query parameter: includeProfile"),
		includePreferences: z.boolean().optional().describe("Query parameter: includePreferences")
	},
		async (args) => {
			// ===== REQUEST CONFIGURATION =====
			/**
			 * IMPORTANT: This MCP tool calls your Express API at the address below.
			 * To change the API base URL (host/port), set the APP_BASE_URL environment variable when starting this server,
			 * or edit the code below. Default is http://localhost:3000
			 * Example: APP_BASE_URL=http://myhost:4000 node server.js
			 */
			const baseUrl = process.env.APP_BASE_URL || `http://localhost:${config.appPort || 3000}`;
			const url = `${baseUrl}${endpoint.path}`;
			const method = "${endpoint.method.toUpperCase()}";
			
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
			
			if (args.q !== undefined) {
				queryParams.set("q", String(args.q));
			}
			if (args.name !== undefined) {
				queryParams.set("name", String(args.name));
			}
			if (args.email !== undefined) {
				queryParams.set("email", String(args.email));
			}
			if (args.city !== undefined) {
				queryParams.set("city", String(args.city));
			}
			if (args.country !== undefined) {
				queryParams.set("country", String(args.country));
			}
			if (args.theme !== undefined) {
				queryParams.set("theme", String(args.theme));
			}
			if (args.limit !== undefined) {
				queryParams.set("limit", String(args.limit));
			}
			if (args.offset !== undefined) {
				queryParams.set("offset", String(args.offset));
			}
			if (args.sortBy !== undefined) {
				queryParams.set("sortBy", String(args.sortBy));
			}
			if (args.sortOrder !== undefined) {
				queryParams.set("sortOrder", String(args.sortOrder));
			}
			if (args.includeProfile !== undefined) {
				queryParams.set("includeProfile", String(args.includeProfile));
			}
			if (args.includePreferences !== undefined) {
				queryParams.set("includePreferences", String(args.includePreferences));
			}

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
							text: `Error calling GET /api/users/search: ${error instanceof Error ? error.message : String(error)}`
						}
					]
				};
			}
		}
	);


	// ===== GET /api/users/advanced-search =====
	server.tool(
		"getApiUsersAdvancedSearch",
		"GET /api/users/advanced-search",
		{
		user: z.object().optional().describe("Query parameter: user"),
		preferences: z.string().optional().describe("Query parameter: preferences"),
		dateRange: z.object().optional().describe("Query parameter: dateRange"),
		pagination: z.object().optional().describe("Query parameter: pagination")
	},
		async (args) => {
			// ===== REQUEST CONFIGURATION =====
			/**
			 * IMPORTANT: This MCP tool calls your Express API at the address below.
			 * To change the API base URL (host/port), set the APP_BASE_URL environment variable when starting this server,
			 * or edit the code below. Default is http://localhost:3000
			 * Example: APP_BASE_URL=http://myhost:4000 node server.js
			 */
			const baseUrl = process.env.APP_BASE_URL || `http://localhost:${config.appPort || 3000}`;
			const url = `${baseUrl}${endpoint.path}`;
			const method = "${endpoint.method.toUpperCase()}";
			
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
			
			if (args.user !== undefined) {
				queryParams.set("user", String(args.user));
			}
			if (args.preferences !== undefined) {
				queryParams.set("preferences", String(args.preferences));
			}
			if (args.dateRange !== undefined) {
				queryParams.set("dateRange", String(args.dateRange));
			}
			if (args.pagination !== undefined) {
				queryParams.set("pagination", String(args.pagination));
			}

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
							text: `Error calling GET /api/users/advanced-search: ${error instanceof Error ? error.message : String(error)}`
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
		id: z.number().describe("Path parameter: id")
	},
		async (args) => {
			// ===== REQUEST CONFIGURATION =====
			/**
			 * IMPORTANT: This MCP tool calls your Express API at the address below.
			 * To change the API base URL (host/port), set the APP_BASE_URL environment variable when starting this server,
			 * or edit the code below. Default is http://localhost:3000
			 * Example: APP_BASE_URL=http://myhost:4000 node server.js
			 */
			const baseUrl = process.env.APP_BASE_URL || `http://localhost:${config.appPort || 3000}`;
			const url = `${baseUrl}${endpoint.path}`;
			const method = "${endpoint.method.toUpperCase()}";
			
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
		body: z.any().optional().describe("Request body data")
	},
		async (args) => {
			// ===== REQUEST CONFIGURATION =====
			/**
			 * IMPORTANT: This MCP tool calls your Express API at the address below.
			 * To change the API base URL (host/port), set the APP_BASE_URL environment variable when starting this server,
			 * or edit the code below. Default is http://localhost:3000
			 * Example: APP_BASE_URL=http://myhost:4000 node server.js
			 */
			const baseUrl = process.env.APP_BASE_URL || `http://localhost:${config.appPort || 3000}`;
			const url = `${baseUrl}${endpoint.path}`;
			const method = "${endpoint.method.toUpperCase()}";
			
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
			
			if (args.body !== undefined) {
				Object.assign(bodyParams, args.body);
			}

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