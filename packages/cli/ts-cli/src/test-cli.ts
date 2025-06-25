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
	background?: boolean
}

const testOptions: TestOption[] = [
	{
		name: "🎯 Demo Mode",
		value: "demo",
		description: "Quick demo with included Express apps (JS/TS)",
		command: "tsx src/index.ts demo"
	},
	{
		name: "Create Blank Template",
		value: "init",
		description: "Create a template MCP server with sample tools",
		command: "tsx src/index.ts init"
	},
	{
		name: "Create from Existing App",
		value: "scan",
		description: "Scan your own Express app and generate MCP server",
		command: "tsx src/index.ts scan"
	},
	{
		name: "🚀 Development Mode",
		value: "dev",
		description: "Start dev mode with hot reload and MCP Inspector",
		command: "tsx src/index.ts dev",
		background: true
	},
	{
		name: "🕵️  Open Inspector",
		value: "inspect",
		description: "Launch MCP Inspector UI to test your server",
		command: "tsx src/index.ts inspect"
	},
	{
		name: "🧹 Clean Generated Files",
		value: "clean",
		description: "Remove .mcp-generated directory",
		command: "tsx src/index.ts clean"
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
	console.log(chalk.blue("\n📊 MCP CLI Status\n"))
	
	// Check generated files
	const generatedDir = ".mcp-generated"
	const generatedExists = existsSync(generatedDir)
	console.log(`Generated Server: ${generatedExists ? chalk.green("✅ Exists") : chalk.yellow("⚠️  Not generated")}`)
	
	if (generatedExists) {
		const serverTs = existsSync(join(generatedDir, "server.ts"))
		const serverJs = existsSync(join(generatedDir, "server.js"))
		const mcpYaml = existsSync(join(generatedDir, "mcp.yaml"))
		const toolsDir = existsSync(join(generatedDir, "tools"))
		const packageJson = existsSync(join(generatedDir, "package.json"))
		
		console.log(`  - server.ts: ${serverTs ? chalk.green("✅") : chalk.red("❌")}`)
		console.log(`  - server.js: ${serverJs ? chalk.green("✅") : chalk.red("❌")}`)
		console.log(`  - mcp.yaml: ${mcpYaml ? chalk.green("✅") : chalk.red("❌")}`)
		console.log(`  - tools/: ${toolsDir ? chalk.green("✅") : chalk.red("❌")}`)
		console.log(`  - package.json: ${packageJson ? chalk.green("✅") : chalk.red("❌")}`)
	}
	
	// Check demo apps
	const demoJs = existsSync("../demo/package.json")
	const demoTs = existsSync("../demo-ts/package.json")
	console.log(`Demo Apps:`)
	console.log(`  - JavaScript: ${demoJs ? chalk.green("✅") : chalk.red("❌")}`)
	console.log(`  - TypeScript: ${demoTs ? chalk.green("✅") : chalk.red("❌")}`)
	
	console.log()
}

async function main(): Promise<void> {
	console.log(chalk.bold.blue("🧪 MCP CLI Test Suite"))
	console.log(chalk.gray("Simplified testing and development tool\n"))

	while (true) {
		try {
			const { selectedTest } = await inquirer.prompt([
				{
					type: "list",
					name: "selectedTest",
					message: "What would you like to do?",
					choices: [
						...testOptions.map(option => ({
							name: `${option.name} - ${chalk.gray(option.description)}`,
							value: option.value
						})),
						new inquirer.Separator(),
						{
							name: "📊 Show Status",
							value: "status"
						},
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

			if (selectedTest === "status") {
				await showStatus()
				continue
			}

			const testOption = testOptions.find(opt => opt.value === selectedTest)
			if (!testOption) {
				console.log(chalk.red("❌ Invalid test option"))
				continue
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