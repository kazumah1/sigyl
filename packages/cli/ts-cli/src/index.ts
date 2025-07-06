#!/usr/bin/env node
import 'dotenv/config';

import { Command } from "commander"
import chalk from "chalk"
import { scanAndGenerate } from "./commands/scan"
import { initTemplate } from "./commands/init"
import { dev } from "./commands/dev"
import { createInstallCommand } from "./commands/install"
import { createRunCommand } from "./commands/run"
import inspectCommand from "./commands/inspect"
import { integrateWithExpress } from "./commands/integrate"
import { configCommand } from "./commands/config"
import { authCommand } from "./commands/auth"
import { existsSync, rmSync } from "node:fs"
import { join } from "node:path"
import inquirer from "inquirer"
import { runWizard } from "./wizard"

// Read version from package.json
const packageJson = require('../package.json');

const program = new Command()

program
	.name("sigyl/cli")
	.description("Sigyl/CLI: Add Model Context Protocol (MCP) endpoints to your Express/Node.js applications. Zero-config AI tool integration for REST APIs.")
	.version(packageJson.version)

// ============================================================================
// CONFIG Command - Configure CLI settings
// ============================================================================
program.addCommand(configCommand)

// ============================================================================
// AUTH Command - Browser-based authentication
// ============================================================================
program.addCommand(authCommand)

// ============================================================================
// INTEGRATE Command - Recommended developer flow
// ============================================================================
program
	.command("integrate")
	.description("Integrate MCP endpoints into your existing Express app (recommended)")
	.option("--out <directory>", "Output directory for integration code", ".sigyl-mcp")
	.option("--endpoint <path>", "MCP endpoint path", "/mcp")
	.option("--auto-add", "(Coming soon) Automatically add integration to your app")
	.option("-l, --language <language>", "Server language (typescript|javascript)", "typescript")
	.argument("[directory]", "Directory containing Express app", ".")
	.action(async (directory: string, options: any) => {
		try {
			console.log(chalk.blue("🔗 Sigyl MCP Integration"))
			console.log(chalk.gray("Integrating MCP endpoints into your Express app...\n"))
			await integrateWithExpress({
				directory,
				outDir: options.out,
				serverLanguage: options.language,
				autoAdd: options.autoAdd,
				endpoint: options.endpoint
			})
		} catch (error) {
			console.error(chalk.red("❌ Integration failed:"), error)
			process.exit(1)
		}
	})

// ============================================================================
// SCAN Command - Legacy/advanced
// ============================================================================
program
	.command("scan")
	.description("Scan Express application and generate standalone MCP server (legacy)")
	.argument("[directory]", "Directory to scan (default: current directory)", ".")
	.option("-o, --out <directory>", "Output directory for generated server", ".mcp-generated")
	.option("-p, --port <port>", "Port where your Express app runs", "3000")
	.option("-l, --language <language>", "Server language (typescript|javascript)", "typescript")
	.option("--framework <framework>", "Web framework (express)", "express")
	.action(async (directory: string, options: any) => {
		try {
			console.log(chalk.blue("🔍 Sigyl MCP Server Generator"))
			console.log(chalk.gray("Scanning Express application and generating MCP server...\n"))
			await scanAndGenerate(directory, {
				outDir: options.out,
				serverLanguage: options.language,
				port: options.port,
				framework: options.framework
			})
		} catch (error) {
			console.error(chalk.red("❌ Scan failed:"), error)
			process.exit(1)
		}
	})

// ============================================================================
// INIT Command - Create template server (legacy)
// ============================================================================
program
	.command("init")
	.description("Create a template MCP server with sample tools (legacy)")
	.option("-o, --out <directory>", "Output directory", ".mcp-generated")
	.option("-l, --language <language>", "Server language (typescript|javascript)", "typescript")
	.option("-n, --name <name>", "Server name", "my-mcp-server")
	.action(async (options: any) => {
		try {
			console.log(chalk.blue("🔧 Sigyl MCP Template Generator"))
			console.log(chalk.gray("Creating template MCP server...\n"))
			await initTemplate({
				outDir: options.out,
				serverLanguage: options.language,
				name: options.name
			})
		} catch (error) {
			console.error(chalk.red("❌ Template creation failed:"), error)
			process.exit(1)
		}
	})

// ============================================================================
// DEV Command - Development mode (legacy)
// ============================================================================
program
	.command("dev")
	.description("Start development mode with hot reload (legacy)")
	.argument("[directory]", "Directory containing Express app", ".")
	.option("-p, --port <port>", "MCP server port", "8181")
	.option("--app-port <port>", "Express app port", "3000")
	.option("-l, --language <language>", "Server language (typescript|javascript)", "typescript")
	.option("--no-open", "Don't open MCP Inspector automatically")
	.action(async (directory: string, options: any) => {
		try {
			console.log(chalk.blue("🚀 Sigyl MCP Development Mode"))
			console.log(chalk.gray("Starting development server with hot reload...\n"))
			await dev({
				directory,
				port: options.port,
				appPort: options.appPort,
				serverLanguage: options.language,
				open: options.open
			})
		} catch (error) {
			console.error(chalk.red("❌ Development mode failed:"), error)
			process.exit(1)
		}
	})

// ============================================================================
// INSPECT Command - Launch MCP Inspector
// ============================================================================
program
	.command("inspect")
	.description("Launch MCP Inspector to test your server or endpoint")
	.argument("[server-path]", "Path or URL to MCP server (default: .sigyl-mcp/integration or .mcp-generated/server.js)", ".sigyl-mcp/integration")
	.action(async (serverPath: string) => {
		try {
			console.log(chalk.blue("🕵️  Sigyl MCP Inspector"))
			console.log(chalk.gray("Launching MCP Inspector UI...\n"))
			await inspectCommand([], serverPath)
		} catch (error) {
			console.error(chalk.red("❌ Inspector launch failed:"), error)
			process.exit(1)
		}
	})

// ============================================================================
// INSTALL Command - Install in Claude Desktop (legacy)
// ============================================================================
program.addCommand(createInstallCommand())

// ============================================================================
// RUN Command - Run MCP server
// ============================================================================
program.addCommand(createRunCommand())

// ============================================================================
// CLEAN Command - Clean generated files (legacy)
// ============================================================================
program
	.command("clean")
	.description("Clean generated MCP server files (legacy)")
	.option("-o, --out <directory>", "Output directory to clean", ".mcp-generated")
	.action((options: any) => {
		try {
			const outDir = options.out
			if (existsSync(outDir)) {
				rmSync(outDir, { recursive: true, force: true })
				console.log(chalk.green(`✅ Cleaned ${outDir} directory`))
			} else {
				console.log(chalk.yellow(`⚠️  Directory ${outDir} not found`))
			}
		} catch (error) {
			console.error(chalk.red("❌ Clean failed:"), error)
			process.exit(1)
		}
	})

// ============================================================================
// BUILD Command - Build MCP server (legacy)
// ============================================================================
program
	.command("build")
	.description("Build MCP server from TypeScript to JavaScript (legacy)")
	.argument("[directory]", "Directory containing MCP server", ".mcp-generated")
	.action(async (directory: string) => {
		try {
			console.log(chalk.blue("🔨 Building Sigyl MCP Server"))
			console.log(chalk.gray("Compiling TypeScript to JavaScript...\n"))
			const packageJsonPath = join(directory, "package.json")
			const tsconfigPath = join(directory, "tsconfig.json")
			if (!existsSync(packageJsonPath)) {
				console.error(chalk.red(`❌ No package.json found in ${directory}`))
				console.log(chalk.blue("💡 Generate a server first with:"))
				console.log(chalk.gray("   sigyl scan"))
				process.exit(1)
			}
			if (!existsSync(tsconfigPath)) {
				console.error(chalk.red(`❌ No tsconfig.json found in ${directory}`))
				process.exit(1)
			}
			const { spawn } = await import("node:child_process")
			const tscProcess = spawn("npx", ["tsc"], {
				cwd: directory,
				stdio: "inherit"
			})
			tscProcess.on("exit", (code) => {
				if (code === 0) {
					console.log(chalk.green("✅ Build completed successfully"))
				} else {
					console.error(chalk.red("❌ Build failed"))
					process.exit(1)
				}
			})
		} catch (error) {
			console.error(chalk.red("❌ Build failed:"), error)
			process.exit(1)
		}
	})

// ============================================================================
// WIZARD Command - Launch interactive setup wizard
// ============================================================================
program
	.command("wizard")
	.description("Launch interactive setup wizard")
	.action(runWizard)

// ============================================================================
// ERROR HANDLING
// ============================================================================
program.configureOutput({
	writeErr: (str) => process.stderr.write(chalk.red(str)),
	writeOut: (str) => process.stdout.write(str),
})

process.on("unhandledRejection", (reason, promise) => {
	console.error(chalk.red("❌ Unhandled Rejection at:"), promise, chalk.red("reason:"), reason)
	process.exit(1)
})

process.on("uncaughtException", (error) => {
	console.error(chalk.red("❌ Uncaught Exception:"), error)
	process.exit(1)
})

if (require.main === module) {
	program.parse()
}

export default program 