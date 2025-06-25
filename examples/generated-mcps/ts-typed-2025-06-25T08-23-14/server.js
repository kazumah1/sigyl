/**
 * Auto-generated MCP Server from Express endpoints
 *
 * This server provides tools that map to your Express API endpoints.
 * Each tool makes HTTP requests to your Express application and returns the responses.
 *
 * To add a new tool manually, follow the template at the bottom of this file.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
// ============================================================================
// SERVER CONFIGURATION
// ============================================================================
export default function createStatelessServer({ config, }) {
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
    server.tool("getApiUsers", "GET /api/users", z.object({
        limit: z.number().optional(),
        offset: z.number().optional(),
        search: z.string().optional(),
        status: z.string().optional()
    }), async (args) => {
        // ===== REQUEST CONFIGURATION =====
        const url = `http://localhost:${config.appPort || 3000}/api/users`;
        const method = "GET";
        // Build request options
        const requestOptions = {
            method,
            headers: {
                "Content-Type": "application/json",
            },
        };
        // ===== PARAMETER HANDLING =====
        const queryParams = new URLSearchParams();
        const bodyParams = {};
        // Add query parameter limit
        if (args.limit)
            queryParams.append("limit", args.limit);
        // Add query parameter offset
        if (args.offset)
            queryParams.append("offset", args.offset);
        // Add query parameter search
        if (args.search)
            queryParams.append("search", args.search);
        // Add query parameter status
        if (args.status)
            queryParams.append("status", args.status);
        // ===== URL CONSTRUCTION =====
        // Add query parameters to URL
        if (queryParams.toString()) {
            const separator = url.includes('?') ? '&' : '?';
            requestOptions.url = `${url}${separator}${queryParams.toString()}`;
        }
        else {
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
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(data, null, 2)
                    }
                ]
            };
        }
        catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Error calling ${method} /api/users: ${error.message}`
                    }
                ]
            };
        }
    });
    // ===== GET /api/products =====
    server.tool("getApiProducts", "GET /api/products", z.object({
        category: z.string().optional(),
        minPrice: z.number().optional(),
        maxPrice: z.number().optional(),
        sortBy: z.string().optional(),
        inStock: z.boolean().optional()
    }), async (args) => {
        // ===== REQUEST CONFIGURATION =====
        const url = `http://localhost:${config.appPort || 3000}/api/products`;
        const method = "GET";
        // Build request options
        const requestOptions = {
            method,
            headers: {
                "Content-Type": "application/json",
            },
        };
        // ===== PARAMETER HANDLING =====
        const queryParams = new URLSearchParams();
        const bodyParams = {};
        // Add query parameter category
        if (args.category)
            queryParams.append("category", args.category);
        // Add query parameter minPrice
        if (args.minPrice)
            queryParams.append("minPrice", args.minPrice);
        // Add query parameter maxPrice
        if (args.maxPrice)
            queryParams.append("maxPrice", args.maxPrice);
        // Add query parameter sortBy
        if (args.sortBy)
            queryParams.append("sortBy", args.sortBy);
        // Add query parameter inStock
        if (args.inStock)
            queryParams.append("inStock", args.inStock);
        // ===== URL CONSTRUCTION =====
        // Add query parameters to URL
        if (queryParams.toString()) {
            const separator = url.includes('?') ? '&' : '?';
            requestOptions.url = `${url}${separator}${queryParams.toString()}`;
        }
        else {
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
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(data, null, 2)
                    }
                ]
            };
        }
        catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Error calling ${method} /api/products: ${error.message}`
                    }
                ]
            };
        }
    });
    // ===== GET /api/users/:id =====
    server.tool("getApiUsersById", "GET /api/users/:id", z.object({
        id: z.number()
    }), async (args) => {
        // ===== REQUEST CONFIGURATION =====
        const url = `http://localhost:${config.appPort || 3000}/api/users/:id`;
        const method = "GET";
        // Build request options
        const requestOptions = {
            method,
            headers: {
                "Content-Type": "application/json",
            },
        };
        // ===== PARAMETER HANDLING =====
        const queryParams = new URLSearchParams();
        const bodyParams = {};
        // Replace path parameter :id
        requestOptions.url = requestOptions.url.replace(":id", args.id || "");
        // ===== URL CONSTRUCTION =====
        // Add query parameters to URL
        if (queryParams.toString()) {
            const separator = url.includes('?') ? '&' : '?';
            requestOptions.url = `${url}${separator}${queryParams.toString()}`;
        }
        else {
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
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(data, null, 2)
                    }
                ]
            };
        }
        catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Error calling ${method} /api/users/:id: ${error.message}`
                    }
                ]
            };
        }
    });
    // ===== POST /api/users =====
    server.tool("postApiUsers", "POST /api/users", z.object({
        body: z.object({
            name: z.string(),
            email: z.string(),
            status: z.string().optional()
        }).optional()
    }), async (args) => {
        // ===== REQUEST CONFIGURATION =====
        const url = `http://localhost:${config.appPort || 3000}/api/users`;
        const method = "POST";
        // Build request options
        const requestOptions = {
            method,
            headers: {
                "Content-Type": "application/json",
            },
        };
        // ===== PARAMETER HANDLING =====
        const queryParams = new URLSearchParams();
        const bodyParams = {};
        // Add request body
        if (args.body)
            Object.assign(bodyParams, args.body);
        // ===== URL CONSTRUCTION =====
        // Add query parameters to URL
        if (queryParams.toString()) {
            const separator = url.includes('?') ? '&' : '?';
            requestOptions.url = `${url}${separator}${queryParams.toString()}`;
        }
        else {
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
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(data, null, 2)
                    }
                ]
            };
        }
        catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Error calling ${method} /api/users: ${error.message}`
                    }
                ]
            };
        }
    });
    // ===== PUT /api/users/:id =====
    server.tool("putApiUsersById", "PUT /api/users/:id", z.object({
        id: z.number(),
        body: z.object({
            name: z.string().optional(),
            email: z.string().optional(),
            status: z.string().optional()
        }).optional()
    }), async (args) => {
        // ===== REQUEST CONFIGURATION =====
        const url = `http://localhost:${config.appPort || 3000}/api/users/:id`;
        const method = "PUT";
        // Build request options
        const requestOptions = {
            method,
            headers: {
                "Content-Type": "application/json",
            },
        };
        // ===== PARAMETER HANDLING =====
        const queryParams = new URLSearchParams();
        const bodyParams = {};
        // Replace path parameter :id
        requestOptions.url = requestOptions.url.replace(":id", args.id || "");
        // Add request body
        if (args.body)
            Object.assign(bodyParams, args.body);
        // ===== URL CONSTRUCTION =====
        // Add query parameters to URL
        if (queryParams.toString()) {
            const separator = url.includes('?') ? '&' : '?';
            requestOptions.url = `${url}${separator}${queryParams.toString()}`;
        }
        else {
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
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(data, null, 2)
                    }
                ]
            };
        }
        catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Error calling ${method} /api/users/:id: ${error.message}`
                    }
                ]
            };
        }
    });
    // ===== DELETE /api/users/:id =====
    server.tool("deleteApiUsersById", "DELETE /api/users/:id", z.object({
        id: z.number()
    }), async (args) => {
        // ===== REQUEST CONFIGURATION =====
        const url = `http://localhost:${config.appPort || 3000}/api/users/:id`;
        const method = "DELETE";
        // Build request options
        const requestOptions = {
            method,
            headers: {
                "Content-Type": "application/json",
            },
        };
        // ===== PARAMETER HANDLING =====
        const queryParams = new URLSearchParams();
        const bodyParams = {};
        // Replace path parameter :id
        requestOptions.url = requestOptions.url.replace(":id", args.id || "");
        // ===== URL CONSTRUCTION =====
        // Add query parameters to URL
        if (queryParams.toString()) {
            const separator = url.includes('?') ? '&' : '?';
            requestOptions.url = `${url}${separator}${queryParams.toString()}`;
        }
        else {
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
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(data, null, 2)
                    }
                ]
            };
        }
        catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Error calling ${method} /api/users/:id: ${error.message}`
                    }
                ]
            };
        }
    });
    // ============================================================================
    // MANUAL TOOL TEMPLATE
    // ============================================================================
    // To add a new tool manually, uncomment and modify the template below:
    /*
    server.tool(
        "myCustomTool",
        "Description of what this tool does",
        z.object({
            // ===== INPUT PARAMETERS =====
            // Define your tool's input parameters here
            param1: z.string().describe("Description of param1"),
            param2: z.number().optional().describe("Optional numeric parameter"),
            // For complex objects:
            // body: z.object({
            //     field1: z.string(),
            //     field2: z.number()
            // }).optional()
        }),
        async (args) => {
            // ===== REQUEST CONFIGURATION =====
            const url = "https://api.example.com/endpoint";
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
            // Example: Add query parameters
            // if (args.param1) queryParams.append("param1", args.param1);
            // Example: Add body parameters
            // if (args.body) Object.assign(bodyParams, args.body);

            // ===== URL CONSTRUCTION =====
            if (queryParams.toString()) {
                const separator = url.includes('?') ? '&' : '?';
                requestOptions.url = `${url}${separator}${queryParams.toString()}`;
            } else {
                requestOptions.url = url;
            }
            if (["POST", "PUT", "PATCH"].includes(method) && Object.keys(bodyParams).length > 0) {
                requestOptions.body = JSON.stringify(bodyParams);
            }

            // ===== CUSTOM LOGIC & HTTP REQUEST =====
            try {
                // Example: Make an HTTP request
                // const response = await fetch(requestOptions.url, requestOptions);
                // const data = await response.json();
                // Example: Custom logic without HTTP request
                const result = {
                    message: "Custom tool executed successfully",
                    parameters: args,
                    timestamp: new Date().toISOString()
                };
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify(result, null, 2)
                        }
                    ]
                };
            } catch (error) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Error in custom tool: ${error.message}`
                        }
                    ]
                };
            }
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
