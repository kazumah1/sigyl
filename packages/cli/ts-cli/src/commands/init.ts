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
		console.log(chalk.gray(`  ${join(options.outDir, "mcp.yaml")} - MCP configuration`))
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
	const config = {
		name: options.name,
		description: "Template MCP server with sample tools",
		version: "1.0.0",
		tools: [
			{
				name: "hello_world",
				description: "Say hello to someone",
				inputSchema: {
					type: "object",
					properties: {
						name: {
							type: "string",
							description: "The name of the person to greet"
						}
					},
					required: ["name"]
				}
			},
			{
				name: "get_user_info",
				description: "Get user information from a mock API",
				inputSchema: {
					type: "object",
					properties: {
						userId: {
							type: "number",
							description: "The user ID to fetch information for"
						}
					},
					required: ["userId"]
				}
			}
		]
	}

	const yamlContent = yaml.stringify(config, { indent: 2 })
	writeFileSync(join(options.outDir, "mcp.yaml"), yamlContent)
}

async function generateTypeScriptServer(options: InitOptions): Promise<void> {
	const serverCode = `import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export default function createStatelessServer({ config }: { config: any }) {
	const server = new McpServer({
		name: "${options.name}",
		version: "1.0.0",
	});

	// Example tool 1: Simple greeting (no external API calls)
	server.tool(
		"hello_world",
		"Say hello to someone",
		{
			name: z.string().describe("The name of the person to greet"),
		},
		async ({ name }) => {
			return {
				content: [{ type: "text", text: \`Hello, \${name}!\` }],
			};
		}
	);

	// Example tool 2: HTTP request to external API
	server.tool(
		"get_user_info",
		"Get user information from a mock API",
		{
			userId: z.number().describe("The user ID to fetch information for"),
		},
		async ({ userId }) => {
			try {
				// Make HTTP request to external API
				const response = await fetch(\`https://jsonplaceholder.typicode.com/users/\${userId}\`);
				
				if (!response.ok) {
					throw new Error(\`HTTP error! status: \${response.status}\`);
				}
				
				const userData = await response.json();
				
				return {
					content: [
						{
							type: "text",
							text: \`User Information:\\n\\nName: \${userData.name}\\nEmail: \${userData.email}\\nCompany: \${userData.company?.name || 'N/A'}\\nWebsite: \${userData.website || 'N/A'}\`
						}
					]
				};
			} catch (error) {
				return {
					content: [
						{
							type: "text",
							text: \`Error fetching user info: \${error.message}\`
						}
					]
				};
			}
		}
	);

	// Add more tools here...

	return server.server;
}

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

async function main() {
	const server = createStatelessServer({ config: {} });
	const transport = new StdioServerTransport();
	await server.connect(transport);
}

main().catch((error) => {
	console.error("Server error:", error);
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
		description: "Template MCP server with sample tools",
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