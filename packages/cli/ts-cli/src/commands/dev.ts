import chalk from "chalk"
import { join } from "node:path"
import { spawn, type ChildProcess } from "node:child_process"
import { existsSync } from "node:fs"
import { verboseLog } from "../logger"
import { startSubprocess } from "../lib/subprocess"
import { openMCPInspector } from "../lib/inspector"
import { ExpressScanner } from "../lib/express-scanner"
import { MCPGenerator } from "../lib/mcp-generator"

interface DevOptions {
	directory: string
	port?: string
	appPort?: string
	open?: boolean
	inspectorUrl?: string
	serverLanguage?: 'typescript' | 'javascript'
}

export async function dev(options: DevOptions): Promise<void> {
	try {
		const mcpPort = options.port || "8181"
		const outDir = join(options.directory, ".mcp-generated")
		
		let expressProcess: ChildProcess | undefined
		let mcpProcess: ChildProcess | undefined
		let isFirstBuild = true
		let isRebuilding = false

		console.log(chalk.blue("🔍 Starting development mode..."))

		// Function to rebuild MCP server from Express app
		const rebuildMCPServer = async () => {
			try {
				verboseLog("Scanning Express application...")
				const scanner = new ExpressScanner(options.directory)
				const endpoints = await scanner.scanForEndpoints()
				
				if (endpoints.length > 0) {
					verboseLog(`Found ${endpoints.length} endpoints, generating MCP server...`)
					const generator = new MCPGenerator(outDir, options.serverLanguage || "typescript")
					await generator.generateFromEndpoints(endpoints, {
						appPort: options.appPort
					})
					verboseLog("MCP server generated")
				}
			} catch (error) {
				console.error(chalk.red("❌ Failed to rebuild MCP server:"), error)
			}
		}

		// Function to start the Express app
		const startExpressApp = async () => {
			if (expressProcess && !expressProcess.killed) {
				expressProcess.kill("SIGTERM")
				await new Promise(resolve => setTimeout(resolve, 100))
			}

			// Try to detect and start Express app
			const packageJsonPath = join(options.directory, "package.json")
			if (existsSync(packageJsonPath)) {
				try {
					const { process: expressProc, detectedPort } = await startSubprocess(
						"npm start",
						options.appPort,
						undefined,
						options.directory  // Pass the directory to run the command in
					)
					expressProcess = expressProc
					options.appPort = detectedPort
					verboseLog(`Express app started on port ${detectedPort}`)
				} catch (error) {
					console.log(chalk.yellow("⚠️  Could not auto-start Express app"))
					verboseLog("You may need to start your Express app manually")
				}
			}
		}

		// Function to start MCP server
		const startMCPServer = async () => {
			if (mcpProcess && !mcpProcess.killed) {
				isRebuilding = true
				mcpProcess.kill("SIGTERM")
				await new Promise(resolve => setTimeout(resolve, 100))
			}

			const serverPath = join(outDir, "server.js")
			if (!existsSync(serverPath)) {
				verboseLog("MCP server not found, rebuilding...")
				await rebuildMCPServer()
			}

			if (existsSync(serverPath)) {
				mcpProcess = spawn("node", [serverPath], {
					stdio: ["inherit", "pipe", "pipe"],
					env: {
						...process.env,
						PORT: mcpPort,
					},
				})

				mcpProcess.stdout?.on("data", (data) => {
					process.stdout.write(data)
				})

				mcpProcess.stderr?.on("data", (data) => {
					process.stderr.write(data)
				})

				mcpProcess.on("exit", (code) => {
					if (isRebuilding) {
						isRebuilding = false
						return
					}
					if (code !== 0 && code !== null) {
						console.log(chalk.yellow(`⚠️  MCP server exited with code ${code}`))
					}
				})

				if (isFirstBuild) {
					console.log(chalk.green(`✅ MCP server starting on port ${mcpPort}`))
					
					// Open MCP Inspector
					if (options.open !== false) {
						await openMCPInspector(mcpPort, options.inspectorUrl)
					}
					
					isFirstBuild = false
				}
			}
		}

		// Initial setup
		await startExpressApp()
		await rebuildMCPServer()
		await startMCPServer()

		// TODO: Set up file watching for hot reload
		// This would use chokidar or similar to watch for Express app changes
		
		console.log(chalk.gray("Press Ctrl+C to stop the dev server"))

		// Handle cleanup on exit
		const cleanup = async () => {
			console.log(chalk.yellow("\n👋 Shutting down dev server..."))

			if (expressProcess && !expressProcess.killed) {
				console.log(chalk.yellow("Stopping Express app..."))
				expressProcess.kill("SIGTERM")
			}

			if (mcpProcess && !mcpProcess.killed) {
				console.log(chalk.yellow("Stopping MCP server..."))
				mcpProcess.kill("SIGTERM")
			}

			process.exit(0)
		}

		// Set up signal handlers
		process.on("SIGINT", cleanup)
		process.on("SIGTERM", cleanup)

		// Keep the process alive
		await new Promise<void>(() => {})
		
	} catch (error) {
		console.error(chalk.red("❌ Dev server failed:"), error)
		process.exit(1)
	}
} 