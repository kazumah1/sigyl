import chalk from "chalk"
import { writeFileSync, mkdirSync, existsSync } from "node:fs"
import { join } from "node:path"
import * as yaml from "yaml"
import ora from "ora"
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"

export interface InitOptions {
	outDir: string
	serverLanguage: "typescript" | "javascript"
	name: string
}

export async function initTemplate(options: InitOptions): Promise<void> {
	const spinner = ora("Creating template MCP server...").start()
	
	try {
		// Ensure output directory exists
		if (!existsSync(options.outDir)) {
			mkdirSync(options.outDir, { recursive: true })
		}

		// Generate MCP configuration
		spinner.text = "Generating MCP configuration..."
		await generateMCPConfig(options)

		// Generate server code
		spinner.text = "Generating server code..."
		if (options.serverLanguage === "typescript") {
			await generateTypeScriptServer(options)
		} else {
			await generateJavaScriptServer(options)
		}

		spinner.succeed("Template MCP server created successfully!")
		
		console.log(chalk.green("\n🎉 Generated files:"))
		console.log(chalk.gray(`  ${join(options.outDir, "sigyl.yaml")} - MCP configuration`))
		console.log(chalk.gray(`  ${join(options.outDir, "server.ts")} - MCP server`))
		
		console.log(chalk.blue("\n🚀 Next steps:"))
		console.log(chalk.gray(`  cd ${options.outDir}`))
		console.log(chalk.gray("  npm install"))
		console.log(chalk.gray("  npm run build"))
		console.log(chalk.gray("  mcp-scan inspect"))
		
	} catch (error) {
		spinner.fail("Template creation failed")
		throw error
	}
}

async function generateMCPConfig(options: InitOptions): Promise<void> {
	// Use the MCP config schema and header as in the attached sigyl.yaml
	const config = {
		runtime: "node",
		startCommand: {
			type: "http",
			configSchema: {
				type: "object",
				required: ["apiKey", "environment"],
				properties: {
					apiKey: {
						type: "string",
						title: "MCP API Key",
						description: "Your MCP API key (required)"
					},
					serviceName: {
						type: "string",
						title: "Service Name",
						default: "my-mcp-service",
						description: "Name of the MCP-compatible service"
					},
					logLevel: {
						type: "string",
						title: "Log Level",
						default: "info",
						enum: ["debug", "info", "warn", "error"],
						description: "Logging verbosity level"
					},
					timeout: {
						type: "number",
						title: "Timeout",
						description: "Request timeout in seconds",
						default: 30,
						minimum: 1,
						maximum: 300
					},
					enableMetrics: {
						type: "boolean",
						title: "Enable Metrics",
						description: "Enable metrics collection",
						default: false
					},
					allowedClients: {
						type: "array",
						title: "Allowed Clients",
						description: "List of client IDs allowed to access the server",
						items: { type: "string" },
						default: []
					},
					customSettings: {
						type: "object",
						title: "Custom Settings",
						description: "Advanced custom settings for the server",
						properties: {
							maxConnections: { type: "number", default: 100 },
							useCache: { type: "boolean", default: true }
						},
						default: {}
					},
					environment: {
						type: "string",
						title: "Environment",
						description: "Deployment environment",
						enum: ["development", "staging", "production"],
						default: "development"
					}
				}
			}
		}
	};

	const yamlHeader = `# MCP-compatible server configuration\n# This template demonstrates all major JSON Schema features for configSchema.\n# - apiKey: Secret string field\n# - serviceName: Arbitrary string field\n# - logLevel: Enum string field\n# - timeout: Number field with min/max\n# - enableMetrics: Boolean field\n# - allowedClients: Array of strings\n# - customSettings: Object field\n# - environment: Enum for environment\n# Add/remove fields as needed for your server.\n`;
	const yamlContent = yamlHeader + yaml.stringify(config, { indent: 2 });
	writeFileSync(join(options.outDir, "sigyl.yaml"), yamlContent);
}

async function generateTypeScriptServer(options: InitOptions): Promise<void> {
	const serverCode = `/**
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
	await server.connect(transport);
	console.log(`✅ MCP Server connected and ready on port ${port}`);
}

main().catch((error) => {
	console.error("❌ Server error:", error);
	process.exit(1);
});
`;

	writeFileSync(join(options.outDir, "server.ts"), serverCode)

	// Generate package.json for the server
	const packageJson = {
		name: options.name,
		version: "1.0.0",
		type: "module",
		main: "server.js",
		description: "Template MCP server with a sample tool",
		scripts: {
			build: "tsc",
			start: "node server.js"
		},
		dependencies: {
			"@modelcontextprotocol/sdk": "^1.10.1",
			"zod": "^3.22.0"
		},
		devDependencies: {
			"typescript": "^5.0.0",
			"@types/node": "^20.0.0"
		}
	};

	writeFileSync(join(options.outDir, "package.json"), JSON.stringify(packageJson, null, 2));

	// Always generate a valid tsconfig.json for TypeScript/ESM compatibility
	const tsConfig = {
		compilerOptions: {
			target: "ES2020",
			module: "ESNext",
			moduleResolution: "node",
			outDir: "./",
			rootDir: "./",
			strict: true,
			esModuleInterop: true,
			skipLibCheck: true
		},
		include: ["*.ts"],
		exclude: ["node_modules", "*.js"]
	};
	writeFileSync(join(options.outDir, "tsconfig.json"), JSON.stringify(tsConfig, null, 2));
}

async function generateJavaScriptServer(options: InitOptions): Promise<void> {
	const serverCode = `const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { CallToolRequestSchema, ListToolsRequestSchema } = require("@modelcontextprotocol/sdk/types.js");

// Tool handlers
const { sayHello } = require("./tools/sayHello.js");
const { searchWeb } = require("./tools/searchWeb.js");
const { getWeather } = require("./tools/getWeather.js");

const server = new Server(
	{
		name: "${options.name}",
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
				name: "say_hello",
				description: "A simple greeting tool that says hello to someone",
				inputSchema: {
					type: "object",
					properties: {
						name: {
							type: "string",
							description: "The name of the person to greet"
						},
						language: {
							type: "string",
							description: "Language for the greeting",
							enum: ["en", "es", "fr", "de"],
							default: "en"
						}
					},
					required: ["name"]
				}
			},
			{
				name: "search_web",
				description: "A mock web search tool that simulates searching the internet",
				inputSchema: {
					type: "object",
					properties: {
						query: {
							type: "string",
							description: "The search query"
						},
						max_results: {
							type: "number",
							description: "Maximum number of results to return",
							default: 5
						}
					},
					required: ["query"]
				}
			},
			{
				name: "get_weather",
				description: "A mock weather tool that returns weather information",
				inputSchema: {
					type: "object",
					properties: {
						city: {
							type: "string",
							description: "The city to get weather for"
						},
						units: {
							type: "string",
							description: "Temperature units",
							enum: ["celsius", "fahrenheit"],
							default: "celsius"
						}
					},
					required: ["city"]
				}
			}
		]
	};
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
	const { name, arguments: args } = request.params;

	switch (name) {
		case "say_hello":
			return await sayHello(args);
		case "search_web":
			return await searchWeb(args);
		case "get_weather":
			return await getWeather(args);
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
`;

	writeFileSync(join(options.outDir, "server.js"), serverCode)

	// Generate package.json for the server
	const packageJson = {
		name: options.name,
		version: "1.0.0",
		main: "server.js",
		scripts: {
			start: "node server.js"
		},
		dependencies: {
			"@modelcontextprotocol/sdk": "^1.10.1",
		}
	};

	writeFileSync(join(options.outDir, "package.json"), JSON.stringify(packageJson, null, 2));
} 