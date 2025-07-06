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
 * @param mode 'local' (default) uses inspector-proxy, 'remote' uses mcp-inspector.com
 */
export function launchMCPInspector(
	serverEntry: string = path.resolve(process.cwd(), "template-mcp/server.ts"),
	serverArgs: string[] = [],
	inspectorArgs: string[] = [],
	mode: 'local' | 'remote' = (process.env.SIGYL_INSPECTOR_MODE as 'local' | 'remote') || 'local'
) {
	console.log("\x1b[36m\n================ MCP Inspector ================\x1b[0m")

	const isHttpServer = serverEntry.includes('server.js') || serverEntry.includes('server.ts')

	if (isHttpServer) {
		console.log("Starting HTTP MCP Server...")
		const serverProcess = spawn("npx", ["tsx", serverEntry, ...serverArgs], {
			stdio: ["inherit", "pipe", "pipe"],
			env: {
				...process.env,
				PORT: "8080"
			}
		})

		let serverStarted = false
		let inspectorOpened = false
		let proxyProcess: ReturnType<typeof spawn> | null = null

		function openInspectorUI(url: string) {
			if (inspectorOpened) return;
			inspectorOpened = true;
			console.log(`\n🌐 Opening MCP Inspector UI: ${url}`);
			const platform = process.platform;
			let command: string;
			let args: string[];
			switch (platform) {
				case 'darwin':
					command = 'open'; args = [url]; break;
				case 'win32':
					command = 'start'; args = ['', url]; break;
				default:
					command = 'xdg-open'; args = [url]; break;
			}
			spawn(command, args, { detached: true, stdio: 'ignore' });
		}

		function cleanup() {
			if (serverProcess) serverProcess.kill('SIGTERM');
			if (proxyProcess) proxyProcess.kill('SIGTERM');
			process.exit(0);
		}

		serverProcess.stdout?.on("data", (data) => {
			const str = data.toString()
			console.log(str)
			if (str.includes("MCP Server listening") && !serverStarted) {
				serverStarted = true
				if (mode === 'local') {
					console.log("\n🚀 Starting local Inspector Proxy...");
					proxyProcess = spawn("npx", ["@modelcontextprotocol/inspector-proxy"], {
						stdio: ["ignore", "pipe", "pipe"]
					});
					let proxyStarted = false;
					proxyProcess.stdout?.on("data", (pdata) => {
						const pstr = pdata.toString();
						if (!proxyStarted && (pstr.includes("Inspector Proxy listening") || pstr.includes("http://localhost:3001"))) {
							proxyStarted = true;
							console.log("\n🎉 Inspector Proxy is running at http://localhost:3001");
							console.log("\n1. Your MCP server is running at http://localhost:8080/mcp");
							console.log("2. The Inspector UI will open in your browser.");
							console.log("3. Connect using the UI to inspect your MCP server.");
							openInspectorUI("http://localhost:3001");
						}
					});
					// Fallback: open after 3s if not detected
					setTimeout(() => { if (!inspectorOpened) openInspectorUI("http://localhost:3001"); }, 3000);
				} else {
					console.log("\n1. Open your browser and go to: \x1b[36mhttps://mcp-inspector.com?transport=streamable-http&url=http://localhost:8080/mcp\x1b[0m");
					console.log("2. In the MCP Inspector, 'Streamable HTTP' should be pre-selected.");
					console.log("   • \x1b[33mURL:\x1b[0m http://localhost:8080/mcp");
					console.log("3. Click 'Connect' to test your MCP server");
					openInspectorUI("https://mcp-inspector.com?transport=streamable-http&url=http://localhost:8080/mcp");
				}
			}
		})

		setTimeout(() => {
			if (!serverStarted) {
				if (mode === 'local') {
					console.log("\n(Timeout) MCP Inspector instructions:");
					console.log("1. Your MCP server is running at http://localhost:8080/mcp");
					console.log("2. The Inspector Proxy will open at http://localhost:3001");
					openInspectorUI("http://localhost:3001");
				} else {
					console.log("\n(Timeout) MCP Inspector instructions:");
					console.log("1. Open your browser and go to: \x1b[36mhttps://mcp-inspector.com?transport=streamable-http&url=http://localhost:8080/mcp\x1b[0m");
					openInspectorUI("https://mcp-inspector.com?transport=streamable-http&url=http://localhost:8080/mcp");
				}
			}
		}, 2000)

		serverProcess.stderr?.on("data", (data) => { console.error(data.toString()) })
		serverProcess.on("error", (err) => { console.error("Failed to start MCP Server:", err) })
		serverProcess.on("close", (code) => { if (code !== 0) { console.error(`Server exited with code ${code}`) } else { console.log("\n👋 MCP Server stopped") } })
		process.on('SIGINT', cleanup)
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