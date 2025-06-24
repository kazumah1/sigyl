#!/usr/bin/env node

import chalk from "chalk"
import { Command } from "commander"
import inquirer from "inquirer"
import { scanAndGenerate } from "./commands/scan"
import { dev } from "./commands/dev"
import { build } from "./commands/build"
import { setVerbose, setDebug } from "./logger"
import inspectCommand from "./commands/inspect"

// Helper function to prompt for directory selection
async function promptForDirectory(): Promise<string> {
	const { selectedDirectory } = await inquirer.prompt([
		{
			type: "list",
			name: "selectedDirectory",
			message: "Select your Express app directory:",
			choices: [
				{ name: "📁 ../demo (JavaScript Express app)", value: "../demo" },
				{ name: "📁 ../demo-ts (TypeScript Express app)", value: "../demo-ts" },
				{ name: "📁 Current directory (./)", value: "./" },
				{ name: "📁 Custom path...", value: "custom" }
			],
			default: "../demo"
		}
	])

	if (selectedDirectory === "custom") {
		const { customPath } = await inquirer.prompt([
			{
				type: "input",
				name: "customPath",
				message: "Enter the path to your Express app directory:",
				default: "../demo",
				validate: (input) => {
					if (!input || input.trim() === "") {
						return "Please enter a valid directory path"
					}
					return true
				}
			}
		])
		return customPath
	}

	return selectedDirectory
}

const program = new Command()

// Configure the CLI
program
	.name("mcp-scan")
	.description("Scan Express/Node.js applications and generate MCP servers")
	.version("0.1.0")
	.option("--verbose", "Show detailed logs")
	.option("--debug", "Show debug logs")
	.hook("preAction", (thisCommand, actionCommand) => {
		// Set verbose mode if flag is present
		const opts = thisCommand.opts()
		if (opts.verbose) {
			setVerbose(true)
		}
		if (opts.debug) {
			setDebug(true)
		}
	})

// Demo command - quick test with demo apps
program
	.command("demo")
	.description("Run a quick demo with the included Express apps")
	.option("--app <app>", "Demo app to use (js, ts)")
	.option("--mode <mode>", "Demo mode (scan, dev, build)", "scan")
	.action(async (options) => {
		try {
			let app = options.app
			if (!app) {
				const { selectedApp } = await inquirer.prompt([
					{
						type: "list",
						name: "selectedApp",
						message: "Which demo app would you like to use?",
						choices: [
							{ name: "JavaScript", value: "js" },
							{ name: "TypeScript", value: "ts" }
						],
						default: "js"
					}
				])
				app = selectedApp
			}
			app = String(app).toLowerCase().trim()
			let appDir = app === "ts" ? "../demo-ts" : "../demo"
			let language: 'typescript' | 'javascript' = app === "ts" ? "typescript" : "javascript"
			const { existsSync } = await import("node:fs")
			if (!existsSync(appDir)) {
				console.log(chalk.yellow(`⚠️  App directory ${appDir} not found, falling back to ../demo`))
				appDir = "../demo"
				language = "javascript"
			}
			console.log(chalk.blue(`[DEBUG] app: ${app}, appDir: ${appDir}, language: ${language}`))
			console.log(chalk.blue(`🎯 Running demo with ${app.toUpperCase()} app in ${options.mode} mode`))
			
			if (options.mode === "dev") {
				await dev({
					directory: appDir,
					port: "8181",
					appPort: undefined,
					open: true,
					inspectorUrl: undefined,
					serverLanguage: language
				})
			} else if (options.mode === "build") {
				await build({
					directory: appDir,
					outDir: ".mcp-generated",
					serverLanguage: language,
					transport: "http"
				})
			} else {
				// Default scan mode
				await scanAndGenerate(appDir, {
					port: undefined,
					framework: undefined,
					outDir: ".mcp-generated",
					serverLanguage: language,
					config: undefined
				})
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error)
			console.error(chalk.red(`❌ Demo failed: ${errorMessage}`))
			process.exit(1)
		}
	})

// Scan command - scan real Express app
program
	.command("scan [directory]")
	.description("Scan your Express/Node.js app and generate MCP server")
	.option("--port <port>", "Port the app runs on (default: auto-detect)")
	.option("--framework <framework>", "Framework to scan (express, fastapi, etc)")
	.option("--out <directory>", "Output directory for generated MCP server", ".mcp-generated")
	.option("--server-language <language>", "Language for generated server (typescript, javascript)", "typescript")
	.option("--config <json>", "Additional configuration as JSON")
	.action(async (directory, options) => {
		try {
			const targetDirectory = directory || await promptForDirectory()
			await scanAndGenerate(targetDirectory, {
				port: options.port,
				framework: options.framework,
				outDir: options.out,
				serverLanguage: options.serverLanguage || "typescript",
				config: options.config ? JSON.parse(options.config) : undefined
			})
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error)
			console.error(chalk.red(`❌ Scan failed: ${errorMessage}`))
			process.exit(1)
		}
	})

// Dev command - development workflow with hot reload
program
	.command("dev [directory]")
	.description("Start development mode with hot reload and MCP Inspector")
	.option("--port <port>", "Port to run the MCP server on (default: 8181)")
	.option("--app-port <port>", "Port the Express app runs on (default: auto-detect)")
	.option("--no-open", "Don't automatically open MCP Inspector")
	.option("--inspector-url <url>", "Custom MCP Inspector URL")
	.option("--server-language <language>", "Language for generated server (typescript, javascript)", "typescript")
	.action(async (directory, options) => {
		try {
			const targetDirectory = directory || await promptForDirectory()
			await dev({
				directory: targetDirectory,
				port: options.port,
				appPort: options.appPort,
				open: options.open,
				inspectorUrl: options.inspectorUrl,
				serverLanguage: options.serverLanguage || "typescript"
			})
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error)
			console.error(chalk.red(`❌ Dev server failed: ${errorMessage}`))
			process.exit(1)
		}
	})

// Build command - production build
program
	.command("build [directory]")
	.description("Build MCP server for production deployment")
	.option("--out <directory>", "Output directory", ".mcp-generated")
	.option("--server-language <language>", "Language for generated server (typescript, javascript)", "typescript")
	.option("--transport <type>", "Transport type: http or stdio", "http")
	.action(async (directory, options) => {
		try {
			const targetDirectory = directory || await promptForDirectory()
			await build({
				directory: targetDirectory,
				outDir: options.out,
				serverLanguage: options.serverLanguage || "typescript",
				transport: options.transport
			})
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error)
			console.error(chalk.red(`❌ Build failed: ${errorMessage}`))
			process.exit(1)
		}
	})

// Inspect command - launch the MCP Inspector UI
program
	.command("inspect [args...]")
	.description("Launch MCP Inspector UI to test your generated server")
	.action(async (args) => {
		try {
			await inspectCommand(args)
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error)
			console.error(chalk.red(`❌ Inspector failed: ${errorMessage}`))
			process.exit(1)
		}
	})

// Clean command - remove generated files
program
	.command("clean")
	.description("Remove generated MCP server files")
	.option("--out <directory>", "Directory to clean", ".mcp-generated")
	.action(async (options) => {
		try {
			const { rmSync } = await import("node:fs")
			const { existsSync } = await import("node:fs")
			
			if (existsSync(options.out)) {
				rmSync(options.out, { recursive: true, force: true })
				console.log(chalk.green(`✅ Cleaned ${options.out} directory`))
			} else {
				console.log(chalk.yellow(`⚠️  ${options.out} directory not found`))
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error)
			console.error(chalk.red(`❌ Clean failed: ${errorMessage}`))
			process.exit(1)
		}
	})

// Show help if no command provided
if (process.argv.length <= 2) {
	program.help()
}

// Parse command line arguments
program.parse() 