import { Command } from "commander"
import { join, resolve, basename } from "node:path"
import { existsSync } from "node:fs"
import chalk from "chalk"
import inquirer from "inquirer"
import { installMCPServer, listMCPServers, removeMCPServer } from "../lib/claude-config"
import { createClient } from '@supabase/supabase-js';

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

// Remove the mock resolveRemoteMCPServer and replace with real implementation
async function resolveRemoteMCPServer(pkgName: string, apiKey?: string, profile?: string) {
	const SUPABASE_URL = process.env.SUPABASE_URL;
	const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
	if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
		console.error('❌ SUPABASE_URL and SUPABASE_ANON_KEY environment variables must be set.');
		process.exit(1);
	}
	const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
	const { data, error } = await supabase
		.from('mcp_packages')
		.select('source_api_url')
		.eq('slug', pkgName)
		.single();
	if (error || !data || !data.source_api_url) {
		console.error(`❌ Could not find a valid source_api_url for package '${pkgName}'.`);
		process.exit(1);
	}
	return {
		url: data.source_api_url,
		api_key: apiKey || 'demo-key',
		profile: profile || 'default',
		name: pkgName,
	};
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
		.option("--profile <profile>", "Profile name for the MCP config")
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

				// New: resolve remote MCP server details
				const remote = await resolveRemoteMCPServer(pkgName, options.key, options.profile);
				await installRemoteServer(remote, options, client);
			} catch (error) {
				console.error(chalk.red("❌ Install command failed:"), error)
				process.exit(1)
			}
		})
}

// New: install remote MCP server for client
async function installRemoteServer(
	remote: { url: string; api_key: string; profile: string; name: string },
	options: InstallOptions,
	client: SupportedClient
): Promise<void> {
	const serverName = options.name || remote.name;
	const fs = require("fs");
	const os = require("os");
	const path = require("path");
	if (client === "claude") {
		// Write config file for Claude Desktop (mcpServers field) using 'command' and 'args' (smithery style)
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
		mcpServers[remote.name] = {
			command: "npx",
			args: [
				"-y",
				"sigyl/cli@latest",
				"run",
				remote.name,
				"--key",
				remote.api_key,
				"--profile",
				remote.profile
			]
		};
		config.mcpServers = mcpServers;
		fs.mkdirSync(path.dirname(configPath), { recursive: true });
		fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
		console.log(chalk.green(`\n🎉 Installed remote MCP server '${serverName}' for Claude Desktop!`));
		console.log(chalk.gray(`  Profile: ${remote.profile}`));
		console.log(chalk.gray(`  Command: npx -y sigyl/cli@latest run ${remote.name} --key <api_key> --profile <profile>`));
		console.log(chalk.yellow("\n🔄 Please restart Claude Desktop to load the new server."));
		return;
	}
	if (client === "vscode") {
		// Write config file for VS Code (mcpServers field) using 'command' and 'args' (smithery style)
		const configPath = path.join(os.homedir(), ".vscode", "mcp_servers.json");
		let config = { mcpServers: {} };
		if (fs.existsSync(configPath)) {
			try {
				config = JSON.parse(fs.readFileSync(configPath, "utf8"));
			} catch {}
		}
		let mcpServers: Record<string, any> = config.mcpServers || {};
		mcpServers[remote.name] = {
			command: "npx",
			args: [
				"-y",
				"sigyl/cli@latest",
				"run",
				remote.name,
				"--key",
				remote.api_key,
				"--profile",
				remote.profile
			]
		};
		config.mcpServers = mcpServers;
		fs.mkdirSync(path.dirname(configPath), { recursive: true });
		fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
		console.log(chalk.green(`\n🎉 Installed remote MCP server '${serverName}' for VS Code!`));
		console.log(chalk.gray(`  Profile: ${remote.profile}`));
		console.log(chalk.gray(`  Command: npx -y sigyl/cli@latest run ${remote.name} --key <api_key> --profile <profile>`));
		console.log(chalk.yellow("\n🔄 Please restart VS Code to load the new server."));
		return;
	}
	if (client === "cursor") {
		// Write config file for Cursor (mcpServers field) using 'command' and 'args' (smithery style)
		const configPath = path.join(os.homedir(), ".cursor", "mcp_servers.json");
		let config = { mcpServers: {} };
		if (fs.existsSync(configPath)) {
			try {
				config = JSON.parse(fs.readFileSync(configPath, "utf8"));
			} catch {}
		}
		let mcpServers: Record<string, any> = config.mcpServers || {};
		mcpServers[remote.name] = {
			command: "npx",
			args: [
				"-y",
				"sigyl/cli@latest",
				"run",
				remote.name,
				"--key",
				remote.api_key,
				"--profile",
				remote.profile
			]
		};
		config.mcpServers = mcpServers;
		fs.mkdirSync(path.dirname(configPath), { recursive: true });
		fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
		console.log(chalk.green(`\n🎉 Installed remote MCP server '${serverName}' for Cursor!`));
		console.log(chalk.gray(`  Profile: ${remote.profile}`));
		console.log(chalk.gray(`  Command: npx -y sigyl/cli@latest run ${remote.name} --key <api_key> --profile <profile>`));
		console.log(chalk.yellow("\n🔄 Please restart Cursor to load the new server."));
		return;
	}
} 