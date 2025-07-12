import chalk from "chalk"
import { writeFileSync, mkdirSync, existsSync } from "node:fs"
import { join } from "node:path"
import * as yaml from "yaml"
import ora from "ora"
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import express from "express"
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js"
import cors from "cors"

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
		console.log(chalk.gray(`  ${join(options.outDir, "package.json")} - Node.js package`))
		
		console.log(chalk.blue("\n🚀 Next steps:"))
		console.log(chalk.gray(`  cd ${options.outDir}`))
		console.log(chalk.gray("  npm install"))
		console.log(chalk.gray("  npm run build"))
		console.log(chalk.gray("  sigyl inspect server.js"))
		
	} catch (error) {
		spinner.fail("Template creation failed")
		throw error
	}
}

async function generateMCPConfig(options: InitOptions): Promise<void> {
	// Use the MCP config schema and header as in the old working sigyl.yaml
	const config = {
		runtime: "node",
		language: options.serverLanguage || "typescript",
		startCommand: {
			type: "http"
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
			"zod": "^3.22.0",
			"express": "^4.18.2",
			"cors": "^2.8.5"
		},
		devDependencies: {
			"typescript": "^5.0.0",
			"@types/node": "^20.0.0",
			"@types/express": "^4.17.17",
			"@types/cors": "^2.8.17"
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
	const serverCode = `/**
 * Auto-generated MCP Server (template, JavaScript)
 *
 * This server provides a template tool for you to customize.
 * To add a new tool, use the template at the bottom of this file.
 */
const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { z } = require("zod");

// ============================================================================
// SERVER CONFIGURATION
// ============================================================================

function createStatelessServer({ config }) {
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
			"zod": "^3.22.0",
			"express": "^4.18.2",
			"cors": "^2.8.5"
		}
	};

	writeFileSync(join(options.outDir, "package.json"), JSON.stringify(packageJson, null, 2));
} 