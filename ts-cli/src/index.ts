#!/usr/bin/env node

import chalk from "chalk"
import { Command } from "commander"
import { scanAndGenerate } from "./commands/scan"
import { dev } from "./commands/dev"
import { build } from "./commands/build"
import { setVerbose, setDebug } from "./logger"

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

// Scan command - our main value proposition
program
	.command("scan <directory>")
	.description("Scan Express/Node.js app and generate MCP server")
	.option("--port <port>", "Port the app runs on (default: auto-detect)")
	.option("--framework <framework>", "Framework to scan (express, fastapi, etc)")
	.option("--out <directory>", "Output directory for generated MCP server", ".mcp-generated")
	.option("--server-language <language>", "Language for generated server (typescript, python)", "typescript")
	.option("--config <json>", "Additional configuration as JSON")
	.action(async (directory, options) => {
		try {
			await scanAndGenerate(directory, {
				port: options.port,
				framework: options.framework,
				outDir: options.out,
				serverLanguage: options.serverLanguage,
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
	.description("Development mode with hot reload and MCP Inspector integration")
	.option("--port <port>", "Port to run the MCP server on (default: 8181)")
	.option("--app-port <port>", "Port the Express app runs on (default: auto-detect)")
	.option("--no-open", "Don't automatically open MCP Inspector")
	.option("--inspector-url <url>", "Custom MCP Inspector URL")
	.action(async (directory, options) => {
		try {
			await dev({
				directory: directory || process.cwd(),
				port: options.port,
				appPort: options.appPort,
				open: options.open,
				inspectorUrl: options.inspectorUrl
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
	.description("Build MCP server for production")
	.option("--out <directory>", "Output directory", ".mcp-generated")
	.option("--server-language <language>", "Language for generated server", "typescript")
	.option("--transport <type>", "Transport type: http or stdio", "http")
	.action(async (directory, options) => {
		try {
			await build({
				directory: directory || process.cwd(),
				outDir: options.out,
				serverLanguage: options.serverLanguage,
				transport: options.transport
			})
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error)
			console.error(chalk.red(`❌ Build failed: ${errorMessage}`))
			process.exit(1)
		}
	})

// Show help if no command provided
if (process.argv.length <= 2) {
	program.help()
}

// Parse command line arguments
program.parse() 