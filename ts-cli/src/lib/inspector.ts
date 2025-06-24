import chalk from "chalk"
import { spawn } from "node:child_process"
import { verboseLog } from "../logger"

export async function openMCPInspector(
	mcpPort: string,
	customUrl?: string
): Promise<void> {
	try {
		// Default MCP Inspector URL - this would be the public MCP Inspector
		const inspectorUrl = customUrl || "https://mcp-inspector.com"
		
		// Construct URL with MCP server connection info
		const connectionUrl = `${inspectorUrl}?server=localhost:${mcpPort}`
		
		verboseLog(`Opening MCP Inspector: ${connectionUrl}`)
		console.log(chalk.blue(`🔍 MCP Inspector: ${chalk.underline(connectionUrl)}`))
		
		// Open browser on different platforms
		const platform = process.platform
		let command: string
		let args: string[]
		
		switch (platform) {
			case 'darwin':
				command = 'open'
				args = [connectionUrl]
				break
			case 'win32':
				command = 'start'
				args = ['', connectionUrl]
				break
			default:
				command = 'xdg-open'
				args = [connectionUrl]
				break
		}
		
		spawn(command, args, { detached: true, stdio: 'ignore' })
		
	} catch (error) {
		console.log(chalk.yellow("⚠️  Could not auto-open MCP Inspector"))
		console.log(chalk.gray(`Please visit: https://mcp-inspector.com?server=localhost:${mcpPort}`))
		verboseLog(`Error: ${error}`)
	}
} 