import { Command } from "commander"
import { join, resolve, basename } from "node:path"
import { existsSync } from "node:fs"
import chalk from "chalk"
import inquirer from "inquirer"
import { installMCPServer, listMCPServers, removeMCPServer } from "../lib/claude-config"

// Command for installing MCP server onto supported clients
interface InstallOptions {
	name?: string
	list?: boolean
	remove?: string
	client?: string
	env?: string[]
	cwd?: string
}

const SUPPORTED_CLIENTS = ["claude", "cursor", "vscode"] as const;
type SupportedClient = typeof SUPPORTED_CLIENTS[number];

export function createInstallCommand(): Command {
	return new Command("install")
		.description(
			"Install generated MCP servers in a desktop client (claude, cursor, vscode). Default: claude"
		)
		.argument("[server-path]", "Path to the generated MCP server (default: template-mcp/server.js)")
		.option("-n, --name <name>", "Custom name for the server in the client")
		.option("-l, --list", "List currently installed MCP servers")
		.option("-r, --remove <name>", "Remove an MCP server from the client")
		.option("--client <client>", "Target client: claude, cursor, vscode (default: claude)")
		.option("--env <key=value>", "Environment variables (can be used multiple times)", [])
		.option("--cwd <path>", "Working directory for the server")
		.action(async (serverPath: string | undefined, options: InstallOptions) => {
			try {
				const client = (options.client || "claude").toLowerCase() as SupportedClient;
				if (!SUPPORTED_CLIENTS.includes(client)) {
					console.error(
						chalk.red(
							`❌ Unsupported client: ${client}. Supported clients: ${SUPPORTED_CLIENTS.join(", ")}`
						)
					)
					process.exit(1)
				}

				if (options.list) {
					// For now, only list for claude
					if (client === "claude") {
						listMCPServers()
					} else {
						console.log(chalk.yellow(`Listing is not yet implemented for client: ${client}`))
					}
					return
				}

				if (options.remove) {
					// For now, only remove for claude
					if (client === "claude") {
						const success = removeMCPServer(options.remove)
						process.exit(success ? 0 : 1)
					} else {
						console.log(chalk.yellow(`Remove is not yet implemented for client: ${client}`))
						process.exit(1)
					}
				}

				await installServer(serverPath, options, client)
			} catch (error) {
				console.error(chalk.red("❌ Install command failed:"), error)
				process.exit(1)
			}
		})
}

async function installServer(
	serverPath: string | undefined,
	options: InstallOptions,
	client: SupportedClient
): Promise<void> {
	if (client === "claude") {
		// Existing Claude logic
		const defaultServerPath = ".mcp-generated/server.js"
		const targetPath = serverPath || defaultServerPath

		if (!existsSync(targetPath)) {
			if (!serverPath) {
				console.log(chalk.yellow("⚠️  No generated MCP server found"))
				console.log(chalk.blue("💡 Generate a server first with:"))
				console.log(chalk.gray("   sigyl demo --mode scan"))
				console.log(chalk.gray("   # or"))
				console.log(chalk.gray("   sigyl scan /path/to/express/app"))
			} else {
				console.error(chalk.red(`❌ Server file not found: ${targetPath}`))
			}
			process.exit(1)
		}

		const isJavaScript = targetPath.endsWith(".js")
		const isTypeScript = targetPath.endsWith(".ts")
		let language: "typescript" | "javascript" = "javascript"

		if (isTypeScript) {
			language = "typescript"
		} else if (isJavaScript) {
			const tsPath = targetPath.replace(/\.js$/, ".ts")
			if (existsSync(tsPath)) {
				language = "typescript"
			}
		}

		let serverName = options.name
		if (!serverName) {
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
			if (targetPath === defaultServerPath) {
				serverName = "generated-mcp-server"
			}
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

		console.log(chalk.blue("\n📦 Installing MCP server in Claude Desktop"))
		console.log(chalk.gray(`   Server: ${targetPath}`))
		console.log(chalk.gray(`   Name: ${serverName}`))
		console.log(chalk.gray(`   Language: ${language}`))
		if (Object.keys(env).length > 0) {
			console.log(chalk.gray(`   Environment: ${Object.keys(env).join(", ")}`))
		}
		console.log()

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
			const mcpYamlPath = join(targetPath.includes("/") ? targetPath.split("/").slice(0, -1).join("/") : ".", "sigyl.yaml")
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
					// Ignore errors reading sigyl.yaml
				}
			}
		} else {
			process.exit(1)
		}
		return
	}

	// TODO: Implement install logic for cursor
	if (client === "cursor") {
		console.log(chalk.yellow("Install for Cursor is not yet implemented. TODO."))
		return
	}

	// TODO: Implement install logic for vscode
	if (client === "vscode") {
		console.log(chalk.yellow("Install for VS Code is not yet implemented. TODO."))
		return
	}
} 