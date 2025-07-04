import { Command } from "commander"
import { join, resolve, basename } from "node:path"
import { existsSync } from "node:fs"
import chalk from "chalk"
import inquirer from "inquirer"
import { installMCPServer, listMCPServers, removeMCPServer } from "../lib/claude-config"
import { getRegistryConfig } from "../lib/config";

// Command for installing MCP server onto supported clients
interface InstallOptions {
	name?: string
	list?: boolean
	remove?: string
	client?: string
	env?: string[]
	cwd?: string
	profile?: string
	key?: string
}

// Fetch package information from the registry API
async function resolveRemoteMCPServer(pkgName: string, apiKey?: string, profile?: string) {
	const config = getRegistryConfig();
	
	try {
		console.log(chalk.gray(`🔍 Looking up package: ${pkgName}`));
		
		// Construct the API URL
		const apiUrl = `${config.registryUrl}/api/v1/packages/${pkgName}`;
		
		// Prepare headers
		const headers: Record<string, string> = {
			'Content-Type': 'application/json'
		};
		
		// Add API key if available
		if (config.apiKey) {
			headers['Authorization'] = `Bearer ${config.apiKey}`;
		}
		
		// Make the API request
		const response = await fetch(apiUrl, { headers });
		
		if (!response.ok) {
			if (response.status === 404) {
				console.error(chalk.red(`❌ Package '${pkgName}' not found in the registry.`));
				console.log(chalk.yellow(`💡 Check available packages at https://sigyl.dev/marketplace`));
			} else if (response.status === 401) {
				console.error(chalk.red(`❌ Authentication failed. Invalid API key.`));
				console.log(chalk.yellow(`💡 Get your API key from https://sigyl.dev/dashboard`));
				console.log(chalk.yellow(`💡 Or run 'sigyl config' to set it up`));
			} else {
				console.error(chalk.red(`❌ Failed to fetch package information (${response.status})`));
			}
			process.exit(1);
		}
		
		const data = await response.json() as { success: boolean; data?: any; error?: string };
		
		if (!data.success || !data.data) {
			console.error(chalk.red(`❌ Invalid response from registry API`));
			process.exit(1);
		}
		
		const packageInfo = data.data;
		
		if (!packageInfo.source_api_url) {
			console.error(chalk.red(`❌ Package '${pkgName}' does not have a valid source API URL`));
			process.exit(1);
		}
		
		console.log(chalk.green(`✅ Found package: ${packageInfo.name}`));
		if (packageInfo.description) {
			console.log(chalk.gray(`   ${packageInfo.description}`));
		}
		
		return {
			url: packageInfo.source_api_url,
			api_key: apiKey || 'demo-key',
			profile: profile || 'default',
			name: packageInfo.name,
			slug: pkgName,
			packageInfo
		};
	} catch (error) {
		console.error(chalk.red(`❌ Failed to connect to registry API:`), error instanceof Error ? error.message : String(error));
		console.log(chalk.yellow(`💡 Check your internet connection and try again`));
		console.log(chalk.yellow(`💡 Registry URL: ${config.registryUrl}`));
		process.exit(1);
	}
}

const SUPPORTED_CLIENTS = ["claude", "cursor", "vscode"] as const;
type SupportedClient = typeof SUPPORTED_CLIENTS[number];

export function createInstallCommand(): Command {
	return new Command("install")
		.description(
			"Install a remote MCP server in a desktop client (claude, cursor, vscode). Default: claude. Accepts a package name or identifier."
		)
		.argument("<package>", "MCP server package name or identifier (e.g. kazumah1/mcp-test)")
		.option("-n, --name <name>", "Custom name for the server in the client")
		.option("-l, --list", "List currently installed MCP servers")
		.option("-r, --remove <name>", "Remove an MCP server from the client")
		.option("--client <client>", "Target client: claude, cursor, vscode (default: claude)")
		.option("--env <key=value>", "Environment variables (can be used multiple times)", [])
		.option("--cwd <path>", "Working directory for the server")
		.option("--key <key>", "API key for the MCP server")
		.action(async (pkgName: string, options: InstallOptions) => {
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

				// Resolve remote MCP server details from the registry API
				const remote = await resolveRemoteMCPServer(pkgName, options.key /*, options.profile*/);
				await installRemoteServer(remote, options, client);
			} catch (error) {
				console.error(chalk.red("❌ Install command failed:"), error)
				process.exit(1)
			}
		})
}

// Install remote MCP server for client
async function installRemoteServer(
	remote: { url: string; api_key: string; profile: string; name: string; slug: string; packageInfo: any },
	options: InstallOptions,
	client: SupportedClient
): Promise<void> {
	const serverName = options.name || remote.name;
	const fs = require("fs");
	const os = require("os");
	const path = require("path");
	const { getRegistryConfig } = require("../lib/config");

	console.log(chalk.blue(`📦 Installing ${remote.name} for ${client}...`));

	if (client === "claude") {
		// Use API key from config unless overridden
		const configApiKey = getRegistryConfig().apiKey;
		const apiKeyToUse = options.key || configApiKey;
		if (!apiKeyToUse) {
			console.error(chalk.red("❌ No API key found. Please run 'sigyl config' or provide --key."));
			process.exit(1);
		}

		// Write config file for Claude Desktop (mcpServers field) using HTTP/gateway style
		const configPath = path.join(
			os.homedir(),
			"Library/Application Support/Claude/claude_desktop_config.json"
		);
		let config = { mcpServers: {} };
		if (fs.existsSync(configPath)) {
			try {
				config = JSON.parse(fs.readFileSync(configPath, "utf8"));
			} catch {}
		}
		let mcpServers: Record<string, any> = config.mcpServers || {};
		// Use package name as key, but slug for run command
		mcpServers[serverName] = {
			command: "npx",
			args: [
				"-y",
				"@sigyl-dev/cli@latest",
				"run",
				remote.slug,
				"--key",
				apiKeyToUse
			]
		};
		config.mcpServers = mcpServers;
		fs.mkdirSync(path.dirname(configPath), { recursive: true });
		fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
		console.log(chalk.green(`\n🎉 Installed remote MCP server '${serverName}' for Claude Desktop!`));
		console.log(chalk.yellow("\n🔄 Please restart Claude Desktop to load the new server."));
		return;
	}
	if (client === "vscode") {
		// Use API key from config unless overridden
		const configApiKey = getRegistryConfig().apiKey;
		const apiKeyToUse = options.key || configApiKey;
		if (!apiKeyToUse) {
			console.error(chalk.red("❌ No API key found. Please run 'sigyl config' or provide --key."));
			process.exit(1);
		}

		// Write config file for VS Code (mcpServers field) using 'command' and 'args' (smithery style)
		const configPath = path.join(os.homedir(), ".vscode", "mcp_servers.json");
		let config = { mcpServers: {} };
		if (fs.existsSync(configPath)) {
			try {
				config = JSON.parse(fs.readFileSync(configPath, "utf8"));
			} catch {}
		}
		let mcpServers: Record<string, any> = config.mcpServers || {};
		// Use package name as key, but slug for run command
		mcpServers[serverName] = {
			command: "npx",
			args: [
				"-y",
				"@sigyl-dev/cli@latest",
				"run",
				remote.slug,
				"--key",
				apiKeyToUse
			]
		};
		config.mcpServers = mcpServers;
		fs.mkdirSync(path.dirname(configPath), { recursive: true });
		fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
		console.log(chalk.green(`\n🎉 Installed remote MCP server '${serverName}' for VS Code!`));
		console.log(chalk.yellow("\n🔄 Please restart VS Code to load the new server."));
		return;
	}
	if (client === "cursor") {
		// Use API key from config unless overridden
		const configApiKey = getRegistryConfig().apiKey;
		const apiKeyToUse = options.key || configApiKey;
		if (!apiKeyToUse) {
			console.error(chalk.red("❌ No API key found. Please run 'sigyl config' or provide --key."));
			process.exit(1);
		}

		// Write config file for Cursor (mcpServers field) using 'command' and 'args' (smithery style)
		const configPath = path.join(os.homedir(), ".cursor", "mcp_servers.json");
		let config = { mcpServers: {} };
		if (fs.existsSync(configPath)) {
			try {
				config = JSON.parse(fs.readFileSync(configPath, "utf8"));
			} catch {}
		}
		let mcpServers: Record<string, any> = config.mcpServers || {};
		// Use package name as key, but slug for run command
		mcpServers[serverName] = {
			command: "npx",
			args: [
				"-y",
				"@sigyl-dev/cli@latest",
				"run",
				remote.slug,
				"--key",
				apiKeyToUse
			]
		};
		config.mcpServers = mcpServers;
		fs.mkdirSync(path.dirname(configPath), { recursive: true });
		fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
		console.log(chalk.green(`\n🎉 Installed remote MCP server '${serverName}' for Cursor!`));
		console.log(chalk.yellow("\n🔄 Please restart Cursor to load the new server."));
		return;
	}
} 