import { Command } from "commander"
import { join, resolve, basename } from "node:path"
import { existsSync } from "node:fs"
import chalk from "chalk"
import inquirer from "inquirer"
import { installMCPServer, listMCPServers, removeMCPServer } from "../lib/claude-config"

interface InstallOptions {
	name?: string
	list?: boolean
	remove?: string
	env?: string[]
	cwd?: string
}

export function createInstallCommand(): Command {
	return new Command("install")
		.description("Install generated MCP servers in Claude Desktop")
		.argument("[server-path]", "Path to the generated MCP server (default: .mcp-generated/server.js)")
		.option("-n, --name <name>", "Custom name for the server in Claude Desktop")
		.option("-l, --list", "List currently installed MCP servers")
		.option("-r, --remove <name>", "Remove an MCP server from Claude Desktop")
		.option("--env <key=value>", "Environment variables (can be used multiple times)", [])
		.option("--cwd <path>", "Working directory for the server")
		.action(async (serverPath: string | undefined, options: InstallOptions) => {
			try {
				// Handle list option
				if (options.list) {
					listMCPServers()
					return
				}

				// Handle remove option
				if (options.remove) {
					const success = removeMCPServer(options.remove)
					process.exit(success ? 0 : 1)
				}

				// Install server
				await installServer(serverPath, options)
			} catch (error) {
				console.error(chalk.red("❌ Install command failed:"), error)
				process.exit(1)
			}
		})
}

async function installServer(serverPath: string | undefined, options: InstallOptions): Promise<void> {
	// Default to generated server if no path provided
	const defaultServerPath = ".mcp-generated/server.js"
	const targetPath = serverPath || defaultServerPath

	// Check if the server file exists
	if (!existsSync(targetPath)) {
		if (!serverPath) {
			console.log(chalk.yellow("⚠️  No generated MCP server found"))
			console.log(chalk.blue("💡 Generate a server first with:"))
			console.log(chalk.gray("   mcp-scan demo --mode scan"))
			console.log(chalk.gray("   # or"))
			console.log(chalk.gray("   mcp-scan scan /path/to/express/app"))
		} else {
			console.error(chalk.red(`❌ Server file not found: ${targetPath}`))
		}
		process.exit(1)
	}

	// Determine language based on file extension and check for TypeScript source
	const isJavaScript = targetPath.endsWith(".js")
	const isTypeScript = targetPath.endsWith(".ts")
	let language: "typescript" | "javascript" = "javascript"

	if (isTypeScript) {
		language = "typescript"
	} else if (isJavaScript) {
		// Check if there's a corresponding .ts file
		const tsPath = targetPath.replace(/\.js$/, ".ts")
		if (existsSync(tsPath)) {
			language = "typescript"
		}
	}

	// Get server name
	let serverName = options.name
	if (!serverName) {
		// Try to read from package.json or use directory name
		const serverDir = targetPath.includes("/") ? targetPath.split("/").slice(0, -1).join("/") : "."
		const packageJsonPath = join(serverDir, "package.json")
		
		if (existsSync(packageJsonPath)) {
			try {
				const packageJson = JSON.parse(require("fs").readFileSync(packageJsonPath, "utf8"))
				serverName = packageJson.name || basename(serverDir)
			} catch {
				serverName = basename(serverDir)
			}
		} else {
			serverName = basename(serverDir)
		}

		// If it's the default generated path, use a more descriptive name
		if (targetPath === defaultServerPath) {
			serverName = "generated-mcp-server"
		}

		// Ask user to confirm the name
		const { confirmedName } = await inquirer.prompt([
			{
				type: "input",
				name: "confirmedName",
				message: "Server name for Claude Desktop:",
				default: serverName
			}
		])
		serverName = confirmedName
	}

	// Parse environment variables
	const env: Record<string, string> = {}
	if (options.env && options.env.length > 0) {
		for (const envVar of options.env) {
			const [key, ...valueParts] = envVar.split("=")
			if (key && valueParts.length > 0) {
				env[key] = valueParts.join("=")
			} else {
				console.log(chalk.yellow(`⚠️  Invalid environment variable format: ${envVar}`))
				console.log(chalk.gray("Expected format: KEY=VALUE"))
			}
		}
	}

	// Show installation summary
	console.log(chalk.blue("\n📦 Installing MCP server in Claude Desktop"))
	console.log(chalk.gray(`   Server: ${targetPath}`))
	console.log(chalk.gray(`   Name: ${serverName}`))
	console.log(chalk.gray(`   Language: ${language}`))
	if (Object.keys(env).length > 0) {
		console.log(chalk.gray(`   Environment: ${Object.keys(env).join(", ")}`))
	}
	console.log()

	// Confirm installation
	const { proceed } = await inquirer.prompt([
		{
			type: "confirm",
			name: "proceed",
			message: "Install this server in Claude Desktop?",
			default: true
		}
	])

	if (!proceed) {
		console.log(chalk.yellow("Installation cancelled"))
		return
	}

	// Install the server
	const success = installMCPServer(serverName!, targetPath, {
		language,
		env: Object.keys(env).length > 0 ? env : undefined
	})

	if (success) {
		console.log(chalk.green("\n🎉 Installation completed!"))
		console.log(chalk.blue("Next steps:"))
		console.log(chalk.gray("1. Restart Claude Desktop completely"))
		console.log(chalk.gray("2. Look for the hammer icon (🔨) in the chat input"))
		console.log(chalk.gray("3. Your MCP tools should now be available in Claude"))
		
		// Show what tools are available if we can read the mcp.yaml
		const mcpYamlPath = join(targetPath.includes("/") ? targetPath.split("/").slice(0, -1).join("/") : ".", "mcp.yaml")
		if (existsSync(mcpYamlPath)) {
			try {
				const yaml = require("yaml")
				const mcpConfig = yaml.parse(require("fs").readFileSync(mcpYamlPath, "utf8"))
				if (mcpConfig.tools && mcpConfig.tools.length > 0) {
					console.log(chalk.blue("\n🔧 Available tools:"))
					mcpConfig.tools.forEach((tool: any) => {
						console.log(chalk.cyan(`   • ${tool.name} - ${tool.description || "No description"}`))
					})
				}
			} catch {
				// Ignore errors reading mcp.yaml
			}
		}
	} else {
		process.exit(1)
	}
} 