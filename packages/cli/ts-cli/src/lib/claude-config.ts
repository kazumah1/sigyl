import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs"
import { join, dirname, resolve } from "node:path"
import { homedir } from "node:os"
import chalk from "chalk"
import { verboseLog } from "../logger"

export interface ClaudeServerConfig {
	command: string
	args: string[]
	env?: Record<string, string>
	cwd?: string
}

export interface ClaudeConfig {
	mcpServers: Record<string, ClaudeServerConfig>
	[key: string]: any
}

/**
 * Get the Claude Desktop config file path based on platform
 */
export function getClaudeConfigPath(): string | null {
	const platform = process.platform
	let configPath: string

	switch (platform) {
		case "win32":
			const appData = process.env.APPDATA || join(homedir(), "AppData", "Roaming")
			configPath = join(appData, "Claude", "claude_desktop_config.json")
			break
		case "darwin":
			configPath = join(homedir(), "Library", "Application Support", "Claude", "claude_desktop_config.json")
			break
		case "linux":
			const xdgConfig = process.env.XDG_CONFIG_HOME || join(homedir(), ".config")
			configPath = join(xdgConfig, "Claude", "claude_desktop_config.json")
			break
		default:
			console.log(chalk.yellow(`⚠️  Unsupported platform: ${platform}`))
			return null
	}

	return configPath
}

/**
 * Read the current Claude Desktop configuration
 */
export function readClaudeConfig(): ClaudeConfig {
	const configPath = getClaudeConfigPath()
	if (!configPath) {
		throw new Error("Unsupported platform for Claude Desktop configuration")
	}

	verboseLog(`Reading Claude config from: ${configPath}`)

	if (!existsSync(configPath)) {
		verboseLog("Claude config file does not exist, returning empty config")
		return { mcpServers: {} }
	}

	try {
		const configContent = readFileSync(configPath, "utf8")
		const config = JSON.parse(configContent)
		verboseLog(`Claude config loaded: ${JSON.stringify(config, null, 2)}`)
		
		return {
			...config,
			mcpServers: config.mcpServers || {}
		}
	} catch (error) {
		console.log(chalk.yellow(`⚠️  Error reading Claude config: ${error}`))
		return { mcpServers: {} }
	}
}

/**
 * Write configuration to Claude Desktop
 */
export function writeClaudeConfig(config: ClaudeConfig): boolean {
	const configPath = getClaudeConfigPath()
	if (!configPath) {
		throw new Error("Unsupported platform for Claude Desktop configuration")
	}

	try {
		// Ensure the config directory exists
		const configDir = dirname(configPath)
		if (!existsSync(configDir)) {
			verboseLog(`Creating Claude config directory: ${configDir}`)
			mkdirSync(configDir, { recursive: true })
		}

		// Write the configuration
		verboseLog(`Writing Claude config to: ${configPath}`)
		verboseLog(`Config data: ${JSON.stringify(config, null, 2)}`)
		
		writeFileSync(configPath, JSON.stringify(config, null, 2))
		return true
	} catch (error) {
		console.error(chalk.red(`❌ Failed to write Claude config: ${error}`))
		return false
	}
}

/**
 * Install an MCP server in Claude Desktop
 */
export function installMCPServer(
	serverName: string,
	serverPath: string,
	options: {
		language?: "typescript" | "javascript"
		description?: string
		env?: Record<string, string>
	} = {}
): boolean {
	try {
		verboseLog(`Installing MCP server: ${serverName}`)
		
		// Read existing config
		const config = readClaudeConfig()
		
		// Determine the command and args based on language
		const absoluteServerPath = resolve(serverPath)
		let command: string
		let args: string[]
		
		if (options.language === "typescript") {
			// For TypeScript, we need to run the compiled JavaScript
			const jsPath = absoluteServerPath.replace(/\.ts$/, ".js")
			command = "node"
			args = [jsPath]
		} else {
			// For JavaScript
			command = "node"
			args = [absoluteServerPath]
		}

		// Create server configuration
		const serverConfig: ClaudeServerConfig = {
			command,
			args
		}

		// Add working directory if the server is in a subdirectory
		const serverDir = dirname(absoluteServerPath)
		if (serverDir !== process.cwd()) {
			serverConfig.cwd = serverDir
		}

		// Add environment variables if provided
		if (options.env && Object.keys(options.env).length > 0) {
			serverConfig.env = options.env
		}

		// Add or update the server in the config
		config.mcpServers[serverName] = serverConfig
		
		// Write the updated config
		const success = writeClaudeConfig(config)
		
		if (success) {
			console.log(chalk.green(`✅ Successfully installed '${serverName}' in Claude Desktop`))
			console.log(chalk.blue("📋 Server configuration:"))
			console.log(chalk.gray(`   Command: ${command} ${args.join(" ")}`))
			if (serverConfig.cwd) {
				console.log(chalk.gray(`   Working Directory: ${serverConfig.cwd}`))
			}
			if (serverConfig.env) {
				console.log(chalk.gray(`   Environment: ${Object.keys(serverConfig.env).join(", ")}`))
			}
			console.log(chalk.yellow("\n🔄 Please restart Claude Desktop to load the new server"))
			console.log(chalk.gray("💡 Look for the hammer icon (🔨) in Claude to confirm the server is loaded"))
			return true
		}
		
		return false
	} catch (error) {
		console.error(chalk.red(`❌ Failed to install MCP server: ${error}`))
		return false
	}
}

/**
 * List installed MCP servers in Claude Desktop
 */
export function listMCPServers(): void {
	try {
		const config = readClaudeConfig()
		const servers = config.mcpServers
		
		if (Object.keys(servers).length === 0) {
			console.log(chalk.yellow("📭 No MCP servers installed in Claude Desktop"))
			return
		}
		
		console.log(chalk.blue("📋 Installed MCP servers in Claude Desktop:\n"))
		
		Object.entries(servers).forEach(([name, serverConfig]) => {
			console.log(chalk.cyan(`• ${name}`))
			console.log(chalk.gray(`  Command: ${serverConfig.command} ${serverConfig.args.join(" ")}`))
			if (serverConfig.cwd) {
				console.log(chalk.gray(`  Working Directory: ${serverConfig.cwd}`))
			}
			if (serverConfig.env) {
				console.log(chalk.gray(`  Environment: ${Object.keys(serverConfig.env).join(", ")}`))
			}
			console.log()
		})
	} catch (error) {
		console.error(chalk.red(`❌ Failed to list MCP servers: ${error}`))
	}
}

/**
 * Remove an MCP server from Claude Desktop
 */
export function removeMCPServer(serverName: string): boolean {
	try {
		const config = readClaudeConfig()
		
		if (!(serverName in config.mcpServers)) {
			console.log(chalk.yellow(`⚠️  Server '${serverName}' not found in Claude Desktop config`))
			return false
		}
		
		delete config.mcpServers[serverName]
		
		const success = writeClaudeConfig(config)
		
		if (success) {
			console.log(chalk.green(`✅ Successfully removed '${serverName}' from Claude Desktop`))
			console.log(chalk.yellow("🔄 Please restart Claude Desktop to apply changes"))
			return true
		}
		
		return false
	} catch (error) {
		console.error(chalk.red(`❌ Failed to remove MCP server: ${error}`))
		return false
	}
} 