import chalk from "chalk"
import { join, resolve } from "node:path"
import { existsSync } from "node:fs"
import ora from "ora"
import { ExpressScanner } from "../lib/express-scanner"
import { MCPGenerator } from "../lib/mcp-generator"
import { verboseLog } from "../logger"

export interface ScanOptions {
	port?: string
	framework?: string
	outDir: string
	serverLanguage: "typescript" | "javascript" | "python"
	config?: Record<string, unknown>
}

export async function scanAndGenerate(
	directory: string,
	options: ScanOptions
): Promise<void> {
	const spinner = ora("Scanning Express application...").start()
	
	try {
		// Resolve directory path
		const targetDir = resolve(process.cwd(), directory)
		if (!existsSync(targetDir)) {
			throw new Error(`Directory not found: ${targetDir}`)
		}

		verboseLog(`Scanning directory: ${targetDir}`)
		verboseLog(`Output directory: ${options.outDir}`)
		verboseLog(`Server language: ${options.serverLanguage}`)

		// Scan for Express endpoints
		spinner.text = "Detecting Express routes..."
		const scanner = new ExpressScanner(targetDir)
		const endpoints = await scanner.scanForEndpoints(options.framework)
		
		if (endpoints.length === 0) {
			spinner.fail("No Express endpoints found!")
			console.log(chalk.yellow("Make sure your Express app has route definitions like:"))
			console.log(chalk.gray("  app.get('/api/users', handler)"))
			console.log(chalk.gray("  app.post('/api/orders', handler)"))
			return
		}

		spinner.succeed(`Found ${endpoints.length} endpoints`)
		
		// Display found endpoints
		console.log(chalk.blue("\n📍 Discovered endpoints:"))
		for (const endpoint of endpoints) {
			console.log(chalk.green(`  ${endpoint.method.toUpperCase()} ${endpoint.path}`))
			if (endpoint.description) {
				console.log(chalk.gray(`    ${endpoint.description}`))
			}
		}

		// Generate MCP server
		spinner.start("Generating MCP server...")
		const generator = new MCPGenerator(options.outDir, options.serverLanguage)
		await generator.generateFromEndpoints(endpoints, {
			appPort: options.port,
			...options.config
		})

		spinner.succeed("MCP server generated successfully!")
		
		console.log(chalk.green("\n🎉 Generated files:"))
		console.log(chalk.gray(`  ${join(options.outDir, "sigyl.yaml")} - MCP configuration`))
		console.log(chalk.gray(`  ${join(options.outDir, "server.ts")} - MCP server`))
		console.log(chalk.gray(`  ${join(options.outDir, "tools/")} - Tool handlers`))
		
		console.log(chalk.blue("\n🚀 Next steps:"))
		console.log(chalk.gray(`  cd ${options.outDir}`))
		console.log(chalk.gray("  npm install"))
		console.log(chalk.gray("  mcp-scan dev"))
		
	} catch (error) {
		spinner.fail("Scan failed")
		throw error
	}
} 