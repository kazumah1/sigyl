#!/usr/bin/env node

import chalk from "chalk"
import inquirer from "inquirer"
import { spawn } from "node:child_process"
import { existsSync, rmSync } from "node:fs"
import { join } from "node:path"

interface TestOption {
	name: string
	value: string
	description: string
	command: string
	cleanup?: boolean
	background?: boolean
}

const preGenOptions: TestOption[] = [
	{
		name: "🔍 Quick Scan Test",
		value: "scan",
		description: "Scan demo app and generate MCP server",
		command: "tsx src/index.ts scan ../demo",
		cleanup: false
	},
	{
		name: "🚀 Development Mode",
		value: "dev",
		description: "Start dev mode with Express app and MCP server",
		command: "tsx src/index.ts dev ../demo",
		cleanup: false,
		background: true
	},
	{
		name: "🏗️  Build Test",
		value: "build",
		description: "Build production MCP server",
		command: "tsx src/index.ts build ../demo",
		cleanup: false
	},
	{
		name: "✅ Full Pipeline Test",
		value: "full",
		description: "Clean → Scan → Install → Build generated server",
		command: "npm run test:full",
		cleanup: true
	},
	{
		name: "🧹 Clean Generated Files",
		value: "clean",
		description: "Remove .mcp-generated directory",
		command: "npm run test:clean",
		cleanup: true
	},
	{
		name: "📊 Project Status",
		value: "status",
		description: "Show current project status and generated files",
		command: "status",
		cleanup: false
	},
	{
		name: "🔧 Interactive Setup Wizard",
		value: "wizard",
		description: "Run the setup wizard (when implemented)",
		command: "wizard",
		cleanup: false
	}
]

const postGenOptions: TestOption[] = [
	...preGenOptions,
	{
		name: "🧪 Generated Server Test",
		value: "generated",
		description: "Install and build the generated MCP server",
		command: "npm run test:generated",
		cleanup: false
	},
	{
		name: "🕵️  Inspector UI",
		value: "inspect",
		description: "Launch the MCP Inspector UI for the generated server",
		command: "tsx src/index.ts inspect",
		cleanup: false
	}
]

async function runCommand(command: string, background = false): Promise<void> {
	return new Promise((resolve, reject) => {
		console.log(chalk.blue(`\n▶️  Running: ${command}\n`))
		
		const [cmd, ...args] = command.split(" ")
		const childProcess = spawn(cmd, args, {
			stdio: "inherit",
			shell: true
		})

		if (background) {
			console.log(chalk.yellow("🔄 Process running in background. Press Ctrl+C to stop and return to menu."))
			
			const cleanup = () => {
				childProcess.kill("SIGTERM")
				console.log(chalk.yellow("\n👋 Stopped background process"))
				resolve()
			}

			process.on("SIGINT", cleanup)
			
			childProcess.on("exit", () => {
				process.removeListener("SIGINT", cleanup)
				resolve()
			})
		} else {
			childProcess.on("exit", (code) => {
				if (code === 0) {
					console.log(chalk.green(`\n✅ Command completed successfully\n`))
					resolve()
				} else {
					console.log(chalk.red(`\n❌ Command failed with code ${code}\n`))
					reject(new Error(`Command failed with code ${code}`))
				}
			})
		}

		childProcess.on("error", (error) => {
			console.error(chalk.red(`\n❌ Command error: ${error.message}\n`))
			reject(error)
		})
	})
}

async function showStatus(): Promise<void> {
	console.log(chalk.blue("\n📊 MCP CLI Project Status\n"))
	
	// Check demo app
	const demoExists = existsSync("../demo/package.json")
	console.log(`Demo App: ${demoExists ? chalk.green("✅ Found") : chalk.red("❌ Missing")}`)
	
	// Check generated files
	const generatedDir = ".mcp-generated"
	const generatedExists = existsSync(generatedDir)
	console.log(`Generated Server: ${generatedExists ? chalk.green("✅ Exists") : chalk.yellow("⚠️  Not generated")}`)
	
	if (generatedExists) {
		const serverTs = existsSync(join(generatedDir, "server.ts"))
		const mcpYaml = existsSync(join(generatedDir, "mcp.yaml"))
		const toolsDir = existsSync(join(generatedDir, "tools"))
		const packageJson = existsSync(join(generatedDir, "package.json"))
		
		console.log(`  - server.ts: ${serverTs ? chalk.green("✅") : chalk.red("❌")}`)
		console.log(`  - mcp.yaml: ${mcpYaml ? chalk.green("✅") : chalk.red("❌")}`)
		console.log(`  - tools/: ${toolsDir ? chalk.green("✅") : chalk.red("❌")}`)
		console.log(`  - package.json: ${packageJson ? chalk.green("✅") : chalk.red("❌")}`)
		
		// Check if built
		const serverJs = existsSync(join(generatedDir, "server.js"))
		console.log(`  - Built (server.js): ${serverJs ? chalk.green("✅ Built") : chalk.yellow("⚠️  Not built")}`)
	}
	
	// Check CLI build
	const cliBuilt = existsSync("dist/index.js")
	console.log(`CLI Built: ${cliBuilt ? chalk.green("✅ Built") : chalk.yellow("⚠️  Not built")}`)
	
	console.log()
}

async function runWizard(): Promise<void> {
	console.log(chalk.blue("\n🔧 Setup Wizard\n"))
	console.log(chalk.yellow("This would guide users through:"))
	console.log("• Selecting their Express app directory")
	console.log("• Configuring port settings")
	console.log("• Choosing server language (TypeScript/Python)")
	console.log("• Setting up MCP Inspector integration")
	console.log("• Customizing tool generation options")
	console.log(chalk.gray("\nWizard implementation coming soon...\n"))
}

async function main(): Promise<void> {
	console.log(chalk.bold.blue("🧪 MCP CLI Test Suite"))
	console.log(chalk.gray("Interactive testing and development tool\n"))

	while (true) {
		try {
			const generatedServerExists = existsSync(join(".mcp-generated", "server.ts"))
			const menuOptions = generatedServerExists ? postGenOptions : preGenOptions
			const menuPrompt = generatedServerExists
				? "What would you like to test? (MCP server detected)"
				: "What would you like to do? (No MCP server detected)"

			const { selectedTest } = await inquirer.prompt([
				{
					type: "list",
					name: "selectedTest",
					message: menuPrompt,
					choices: [
						...menuOptions.map(option => ({
							name: `${option.name} - ${chalk.gray(option.description)}`,
							value: option.value
						})),
						new inquirer.Separator(),
						{
							name: "🚪 Exit",
							value: "exit"
						}
					]
				}
			])

			if (selectedTest === "exit") {
				console.log(chalk.green("👋 Goodbye!"))
				process.exit(0)
			}

			const testOption = [...menuOptions, ...postGenOptions].find(opt => opt.value === selectedTest)
			if (!testOption) {
				console.log(chalk.red("❌ Invalid test option"))
				continue
			}

			if (testOption.value === "status") {
				await showStatus()
				continue
			}
			if (testOption.value === "wizard") {
				await runWizard()
				continue
			}
			// Inspector UI option
			if (testOption.value === "inspect") {
				await runCommand(testOption.command, false)
				continue
			}

			// Clean up before running if needed
			if (testOption.cleanup && existsSync(".mcp-generated")) {
				console.log(chalk.yellow("🧹 Cleaning up previous generated files..."))
				try {
					rmSync(".mcp-generated", { recursive: true, force: true })
				} catch (error) {
					console.log(chalk.yellow("⚠️  Could not clean all files, continuing..."))
				}
			}

			// Run the command
			await runCommand(testOption.command, testOption.background)

		} catch (error) {
			if (error instanceof Error && error.message.includes("User force closed")) {
				console.log(chalk.yellow("\n👋 Exiting..."))
				process.exit(0)
			}
			console.error(chalk.red("❌ Test failed:"), error)
			
			// Ask if they want to continue
			const { continueTests } = await inquirer.prompt([
				{
					type: "confirm",
					name: "continueTests",
					message: "Continue with other tests?",
					default: true
				}
			])

			if (!continueTests) {
				break
			}
		}
	}
}

// Handle Ctrl+C gracefully
process.on("SIGINT", () => {
	console.log(chalk.yellow("\n👋 Goodbye!"))
	process.exit(0)
})

main().catch((error) => {
	console.error(chalk.red("❌ Test CLI failed:"), error)
	process.exit(1)
}) 