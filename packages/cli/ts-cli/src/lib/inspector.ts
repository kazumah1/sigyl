import chalk from "chalk"
import { spawn } from "node:child_process"
import { verboseLog } from "../logger"
import path from "path"

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

/**
 * Launches the official MCP Inspector UI, starting the generated server as a subprocess.
 * @param serverEntry Path to the generated MCP server TypeScript file (default: .mcp-generated/server.ts)
 * @param serverArgs Optional arguments to pass to the server
 * @param inspectorArgs Optional arguments to pass to the inspector
 */
export function launchMCPInspector(
	serverEntry: string = path.resolve(process.cwd(), ".mcp-generated/server.ts"),
	serverArgs: string[] = [],
	inspectorArgs: string[] = []
) {
	// Minimal, clear message before launching
	console.log("\x1b[36m\n================ MCP Inspector ================\x1b[0m")

	const args = [
		"@modelcontextprotocol/inspector",
		"npx",
		"tsx",
		serverEntry,
		...serverArgs,
		...inspectorArgs,
	]

	const proc = spawn("npx", args, {
		stdio: ["inherit", "pipe", "pipe"],
		shell: true,
	})

	proc.stdout.on("data", (data) => {
		const str = data.toString()
		// Only print the inspector link with the token pre-filled
		const match = str.match(/http:\/\/localhost:6274\/?\?MCP_PROXY_AUTH_TOKEN=[a-zA-Z0-9]+/)
		if (match) {
			console.log("Inspector UI:")
			console.log(match[0])
		}
	})

	proc.stderr.on("data", (data) => {
		// Optionally, you can print errors if needed
		// process.stderr.write(data)
	})

	proc.on("close", (code) => {
		if (code !== 0) {
			console.error(`Inspector exited with code ${code}`)
		}
	})

	proc.on("error", (err) => {
		console.error("Failed to launch MCP Inspector:", err)
	})
} 