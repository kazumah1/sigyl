import chalk from "chalk"
import { spawn } from "node:child_process"
import { verboseLog } from "../logger"
import path from "path"
import { existsSync } from "node:fs"

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
 * @param serverEntry Path to the generated MCP server TypeScript file (default: template-mcp/server.ts)
 * @param serverArgs Optional arguments to pass to the server
 * @param inspectorArgs Optional arguments to pass to the inspector
 */
export function launchMCPInspector(
	serverEntry: string = path.resolve(process.cwd(), "template-mcp/server.ts"),
	serverArgs: string[] = [],
	inspectorArgs: string[] = []
) {
	// Minimal, clear message before launching
	console.log("\x1b[36m\n================ MCP Inspector ================\x1b[0m")

	// Check if this is an HTTP-based server (our generated servers use Express)
	const isHttpServer = serverEntry.includes('server.js') || serverEntry.includes('server.ts')
	
	if (isHttpServer) {
		// For HTTP servers, start the server and provide manual configuration instructions
		console.log("Starting HTTP MCP Server...")
		
		// Start the HTTP server
		const serverProcess = spawn("node", [serverEntry], {
			stdio: ["inherit", "pipe", "pipe"],
			env: {
				...process.env,
				PORT: "8080" // Default port for our HTTP servers
			}
		})

		let serverStarted = false
		
		serverProcess.stdout?.on("data", (data) => {
			const str = data.toString()
			console.log(str)
			
			// Look for server startup message
			if (str.includes("MCP Server listening") && !serverStarted) {
				serverStarted = true
				console.log("\n🎉 MCP Server is running!")
				console.log("\n" + "=".repeat(60))
				console.log("📋 MCP INSPECTOR CONFIGURATION INSTRUCTIONS")
				console.log("=".repeat(60))
				console.log("\n1. Open your browser and go to: \x1b[36mhttps://mcp-inspector.com\x1b[0m")
				console.log("\n2. In the MCP Inspector, configure the connection:")
				console.log("   • \x1b[33mTransport Type:\x1b[0m Select 'Streamable HTTP'")
				console.log("   • \x1b[33mURL:\x1b[0m http://localhost:8080/mcp")
				console.log("\n3. Click 'Connect' to test your MCP server")
				console.log("\n4. You should see the 'reverseString' tool available")
				console.log("\n💡 \x1b[32mTip:\x1b[0m Test the reverseString tool with any text to verify it's working!")
				console.log("\n⚠️  \x1b[31mKeep this terminal open\x1b[0m - the MCP server is running here")
				console.log("   Press Ctrl+C to stop the server when you're done")
				console.log("=".repeat(60))
			}
		})

		serverProcess.stderr?.on("data", (data) => {
			console.error(data.toString())
		})

		serverProcess.on("error", (err) => {
			console.error("Failed to start MCP Server:", err)
		})

		serverProcess.on("close", (code) => {
			if (code !== 0) {
				console.error(`Server exited with code ${code}`)
			} else {
				console.log("\n👋 MCP Server stopped")
			}
		})
		
		// Handle Ctrl+C gracefully
		process.on('SIGINT', () => {
			console.log("\n\n🛑 Stopping MCP Server...")
			serverProcess.kill('SIGTERM')
			process.exit(0)
		})
		
	} else {
		// For stdio servers, use the original approach
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
} 