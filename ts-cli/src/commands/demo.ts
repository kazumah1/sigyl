import { Command } from "commander"
import { spawn, ChildProcess } from "node:child_process"
import { join } from "node:path"
import { existsSync, writeFileSync } from "node:fs"
import chalk from "chalk"
import inquirer from "inquirer"
import { ExpressScanner } from "../lib/express-scanner"
import { MCPGenerator } from "../lib/mcp-generator"
import { installMCPServer } from "../lib/claude-config"

interface DemoOptions {
	app?: string
	mode?: string
	autoStart?: boolean
}

const DEMO_APPS = {
	'js-basic': {
		name: 'Basic JavaScript',
		description: 'Simple CRUD operations without query parameters',
		path: '../demos/js-basic',
		language: 'javascript',
		startCommand: 'node app.js'
	},
	'js-query': {
		name: 'JavaScript with Query Parameters', 
		description: 'JavaScript app with destructured query parameters',
		path: '../demos/js-with-query',
		language: 'javascript',
		startCommand: 'node app.js'
	},
	'ts-typed': {
		name: 'TypeScript with Types',
		description: 'TypeScript app with proper interface typing',
		path: '../demos/ts-typed',
		language: 'typescript',
		startCommand: 'npx ts-node app.ts'
	},
	'ts-complex': {
		name: 'Complex TypeScript',
		description: 'Advanced TypeScript with nested types and complex queries',
		path: '../demos/ts-complex',
		language: 'typescript',
		startCommand: 'npx ts-node app.ts'
	}
}

let runningProcesses: ChildProcess[] = []

// Cleanup function for graceful shutdown
function cleanup() {
	console.log(chalk.yellow("\n🧹 Cleaning up running processes..."))
	runningProcesses.forEach(proc => {
		if (proc && !proc.killed) {
			proc.kill('SIGTERM')
		}
	})
	runningProcesses = []
}

// Handle process termination
process.on('SIGINT', () => {
	cleanup()
	process.exit(0)
})

process.on('SIGTERM', () => {
	cleanup()
	process.exit(0)
})

export function createDemoCommand(): Command {
	return new Command("demo")
		.description("Interactive demo with built-in Express applications")
		.option("--app <type>", "Demo app type: js-basic, js-query, ts-typed, ts-complex")
		.option("--mode <mode>", "Demo mode: scan, test, dev", "test")
		.option("--auto-start", "Automatically start servers and inspector", true)
		.action(async (options: DemoOptions) => {
			try {
				let selectedApp = options.app
				
				// If no app specified, show interactive selection
				if (!selectedApp) {
					console.log(chalk.blue("🎯 MCP CLI Interactive Demo\n"))
					
					const { app } = await inquirer.prompt([
						{
							type: "list",
							name: "app",
							message: "Which demo scenario would you like to test?",
							choices: Object.entries(DEMO_APPS).map(([key, app]) => ({
								name: `${app.name} - ${chalk.gray(app.description)}`,
								value: key
							}))
						}
					])
					selectedApp = app
				}
				
				const demoApp = DEMO_APPS[selectedApp as keyof typeof DEMO_APPS]
				if (!demoApp) {
					console.error(chalk.red(`❌ Unknown demo app: ${selectedApp}`))
					console.log(chalk.yellow("Available apps:"), Object.keys(DEMO_APPS).join(", "))
					process.exit(1)
				}
				
				const appDir = join(process.cwd(), demoApp.path)
				if (!existsSync(appDir)) {
					console.error(chalk.red(`❌ Demo app directory not found: ${appDir}`))
					process.exit(1)
				}
				
				console.log(chalk.blue(`\n🚀 Starting ${demoApp.name} Demo\n`))
				
				switch (options.mode) {
					case 'scan':
						await runScanDemo(appDir, demoApp.language)
						break
					case 'test':
						await runInteractiveTest(appDir, demoApp)
						break
					case 'dev':
						await runDevDemo(appDir, demoApp)
						break
					default:
						console.error(chalk.red(`❌ Unknown mode: ${options.mode}`))
						console.log(chalk.yellow("Available modes: scan, test, dev"))
						process.exit(1)
				}
			} catch (error) {
				console.error(chalk.red("❌ Demo failed:"), error)
				cleanup()
				process.exit(1)
			}
		})
}

async function runInteractiveTest(appDir: string, demoApp: any): Promise<void> {
	console.log(chalk.blue("📝 Step 1: Scanning Express app for endpoints..."))
	
	// Scan the demo app
	const scanner = new ExpressScanner(appDir)
	const endpoints = await scanner.scanForEndpoints()
	
	console.log(chalk.green(`✔ Found ${endpoints.length} endpoints\n`))
	
	// Show discovered endpoints
	console.log(chalk.blue("📍 Discovered endpoints:"))
	endpoints.forEach(endpoint => {
		console.log(`  ${chalk.cyan(endpoint.method)} ${endpoint.path}`)
		
		// Show query parameters if any
		const queryParams = endpoint.parameters?.filter(p => p.location === "query")
		if (queryParams && queryParams.length > 0) {
			console.log(chalk.gray(`    Query: ${queryParams.map(p => `${p.name}:${p.type}`).join(", ")}`))
		}
		
		// Show body parameters if any
		if (endpoint.requestBody?.properties) {
			const bodyProps = Object.keys(endpoint.requestBody.properties)
			console.log(chalk.gray(`    Body: ${bodyProps.join(", ")}`))
		}
	})
	
	console.log(chalk.blue("\n🔧 Step 2: Generating MCP server..."))
	
	// Generate MCP server
	const generator = new MCPGenerator(".mcp-generated", demoApp.language as 'typescript' | 'javascript')
	await generator.generateFromEndpoints(endpoints, {
		appPort: "3000"
	})
	
	console.log(chalk.green("✔ MCP server generated successfully!\n"))
	
	// Install dependencies for generated server
	console.log(chalk.blue("📦 Step 3: Installing MCP server dependencies..."))
	await runCommand("npm install", ".mcp-generated", false)
	console.log(chalk.green("✔ Dependencies installed!\n"))
	
	// Ask user if they want to start the full test
	const { startTest } = await inquirer.prompt([
		{
			type: "confirm",
			name: "startTest",
			message: "Start Express app, MCP server, and Inspector for testing?",
			default: true
		}
	])
	
	if (!startTest) {
		console.log(chalk.yellow("Demo stopped. Generated files are in .mcp-generated/"))
		return
	}
	
	console.log(chalk.blue("🌐 Step 4: Starting Express application..."))
	
	// Start Express app
	const expressProcess = await startExpressApp(appDir, demoApp.startCommand)
	runningProcesses.push(expressProcess)
	
	// Wait a moment for Express to start
	await new Promise(resolve => setTimeout(resolve, 2000))
	
	console.log(chalk.blue("🤖 Step 5: Starting MCP server..."))
	
	// Build MCP server if TypeScript
	if (demoApp.language === 'typescript') {
		await runCommand("npm run build", ".mcp-generated", false)
	}
	
	// Start MCP server
	const mcpProcess = await startMCPServer(demoApp.language)
	runningProcesses.push(mcpProcess)
	
	// Wait a moment for MCP server to start
	await new Promise(resolve => setTimeout(resolve, 2000))
	
	console.log(chalk.blue("🕵️  Step 6: Launching MCP Inspector...\n"))
	
	// Launch Inspector
	await launchInspector(demoApp.language)
	
	// Show status and wait for user input
	console.log(chalk.green("🎉 Demo is now running!\n"))
	console.log(chalk.blue("Services running:"))
	console.log(`  📱 Express App: ${chalk.cyan("http://localhost:3000")}`)
	console.log(`  🤖 MCP Server: ${chalk.cyan("stdio (connected to Inspector)")}`)
	console.log(`  🕵️  Inspector: ${chalk.cyan("http://localhost:5173")}\n`)
	
	console.log(chalk.yellow("Available MCP tools in Inspector:"))
	endpoints.forEach(endpoint => {
		const toolName = generateToolName(endpoint)
		console.log(`  • ${chalk.cyan(toolName)} - ${endpoint.method} ${endpoint.path}`)
	})
	
	console.log(chalk.gray("\nPress Ctrl+C to stop all services and exit"))
	
	// Keep the process alive
	await new Promise(() => {}) // Wait indefinitely
}

async function startExpressApp(appDir: string, startCommand: string): Promise<ChildProcess> {
	return new Promise((resolve, reject) => {
		console.log(chalk.gray(`  Running: ${startCommand}`))
		
		const [cmd, ...args] = startCommand.split(' ')
		const process = spawn(cmd, args, {
			cwd: appDir,
			stdio: ['pipe', 'pipe', 'pipe'],
			shell: true
		})
		
		let started = false
		
		process.stdout?.on('data', (data) => {
			const output = data.toString()
			if (output.includes('Server running') || output.includes('listening')) {
				if (!started) {
					started = true
					console.log(chalk.green("  ✔ Express app started on port 3000"))
					resolve(process)
				}
			}
		})
		
		process.stderr?.on('data', (data) => {
			console.error(chalk.red(`Express error: ${data}`))
		})
		
		process.on('error', (error) => {
			reject(error)
		})
		
		// Fallback timeout
		setTimeout(() => {
			if (!started) {
				started = true
				console.log(chalk.green("  ✔ Express app started (timeout)"))
				resolve(process)
			}
		}, 3000)
	})
}

async function startMCPServer(language: string): Promise<ChildProcess> {
	return new Promise((resolve, reject) => {
		console.log(chalk.gray("  Starting MCP server with stdio transport..."))
		
		const process = spawn('node', ['server.js'], {
			cwd: '.mcp-generated',
			stdio: ['pipe', 'pipe', 'pipe'],
			shell: true
		})
		
		let started = false
		
		// MCP servers don't typically output startup messages, so we'll use a timeout
		setTimeout(() => {
			if (!started) {
				started = true
				console.log(chalk.green("  ✔ MCP server started"))
				resolve(process)
			}
		}, 1000)
		
		process.stderr?.on('data', (data) => {
			const output = data.toString()
			if (!output.includes('DeprecationWarning')) {
				console.error(chalk.red(`MCP server error: ${output}`))
			}
		})
		
		process.on('error', (error) => {
			reject(error)
		})
	})
}

async function launchInspector(language: string): Promise<void> {
	// Create MCP Inspector configuration
	const serverFile = "server.js" // Always use .js since TypeScript gets compiled to .js
	const inspectorConfig = {
		mcpServers: {
			"demo-server": {
				command: "node",
				args: [serverFile],
				cwd: join(process.cwd(), ".mcp-generated")
			}
		}
	}
	
	// Write config file for Inspector
	writeFileSync('.mcp-inspector-config.json', JSON.stringify(inspectorConfig, null, 2))
	
	console.log(chalk.gray("  Opening MCP Inspector in browser..."))
	
	// Launch Inspector
	const inspectorProcess = spawn('npx', ['@modelcontextprotocol/inspector'], {
		stdio: 'inherit',
		shell: true
	})
	
	runningProcesses.push(inspectorProcess)
	
	// Wait a moment then open browser
	setTimeout(() => {
		const open = spawn('open', ['http://localhost:5173'], { shell: true })
		open.on('error', () => {
			// Ignore errors if 'open' command doesn't exist
			console.log(chalk.cyan("  Manual: Open http://localhost:5173 in your browser"))
		})
	}, 3000)
}

async function runCommand(command: string, cwd: string, showOutput: boolean = true): Promise<void> {
	return new Promise((resolve, reject) => {
		const [cmd, ...args] = command.split(' ')
		const process = spawn(cmd, args, {
			cwd,
			stdio: showOutput ? 'inherit' : 'pipe',
			shell: true
		})
		
		process.on('exit', (code) => {
			if (code === 0) {
				resolve()
			} else {
				reject(new Error(`Command failed with code ${code}`))
			}
		})
		
		process.on('error', (error) => {
			reject(error)
		})
	})
}

function generateToolName(endpoint: { method: string; path: string }): string {
	// Convert HTTP method and path to camelCase tool name
	const method = endpoint.method.toLowerCase()
	const pathParts = endpoint.path
		.split('/')
		.filter(part => part && !part.startsWith(':'))
		.map(part => {
			// Handle hyphens and other special characters
			return part
				.replace(/[-_]/g, ' ') // Replace hyphens and underscores with spaces
				.split(' ')
				.map(word => word.charAt(0).toUpperCase() + word.slice(1))
				.join('')
		})
	
	return method + pathParts.join('')
}

// Keep existing functions for backward compatibility
async function runScanDemo(appDir: string, language: string): Promise<void> {
	// Scan the demo app
	const scanner = new ExpressScanner(appDir)
	const endpoints = await scanner.scanForEndpoints()
	
	console.log(chalk.green(`✔ Found ${endpoints.length} endpoints`))
	console.log()
	console.log(chalk.blue("📍 Discovered endpoints:"))
	endpoints.forEach(endpoint => {
		console.log(`  ${endpoint.method} ${endpoint.path}`)
		
		// Show query parameters if any
		const queryParams = endpoint.parameters?.filter(p => p.location === "query")
		if (queryParams && queryParams.length > 0) {
			console.log(chalk.gray(`    Query: ${queryParams.map(p => `${p.name}:${p.type}`).join(", ")}`))
		}
		
		// Show body parameters if any
		if (endpoint.requestBody?.properties) {
			const bodyProps = Object.keys(endpoint.requestBody.properties)
			console.log(chalk.gray(`    Body: ${bodyProps.join(", ")}`))
		}
	})
	console.log()
	
	// Generate MCP server
	const generator = new MCPGenerator(".mcp-generated", language as 'typescript' | 'javascript')
	await generator.generateFromEndpoints(endpoints, {
		appPort: "3000"
	})
	
	console.log(chalk.green("✔ MCP server generated successfully!"))
	console.log()
	console.log(chalk.blue("🎉 Generated files:"))
	console.log("  .mcp-generated/mcp.yaml - MCP configuration")
	console.log(`  .mcp-generated/server.${language === 'typescript' ? 'ts' : 'js'} - MCP server`)
	console.log("  .mcp-generated/tools/ - Tool handlers")
	console.log()
	
	// Ask if user wants to install in Claude Desktop
	const { installInClaude } = await inquirer.prompt([
		{
			type: "confirm",
			name: "installInClaude",
			message: "Install this server in Claude Desktop?",
			default: true
		}
	])
	
	if (installInClaude) {
		const { serverName } = await inquirer.prompt([
			{
				type: "input",
				name: "serverName",
				message: "Server name for Claude Desktop:",
				default: `demo-${language}-server`
			}
		])
		
		const serverPath = `.mcp-generated/server.${language === 'typescript' ? 'js' : 'js'}`
		const success = installMCPServer(serverName, serverPath, { language: language as 'typescript' | 'javascript' })
		
		if (success) {
			console.log(chalk.blue("\n🚀 Next steps:"))
			console.log("  1. Restart Claude Desktop completely")
			console.log("  2. Look for the hammer icon (🔨) in Claude")
			console.log("  3. Your demo MCP tools are now available!")
		}
		console.log()
	}
	
	console.log(chalk.blue("🚀 Alternative next steps:"))
	console.log("  cd .mcp-generated")
	console.log("  npm install")
	console.log("  mcp-scan demo --mode test")
}

async function runDevDemo(appDir: string, demoApp: any): Promise<void> {
	console.log(chalk.yellow("🚧 Dev mode with hot reload coming soon!"))
	console.log(chalk.gray("For now, running interactive test mode...\n"))
	
	await runInteractiveTest(appDir, demoApp)
} 