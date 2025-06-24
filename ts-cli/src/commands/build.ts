import chalk from "chalk"

export interface BuildOptions {
	directory: string
	outDir: string
	serverLanguage: "typescript" | "python"
	transport: "http" | "stdio"
}

export async function build(options: BuildOptions): Promise<void> {
	console.log(chalk.blue("🔨 Building MCP server..."))
	console.log(chalk.yellow("Build command not yet implemented"))
	console.log(chalk.gray("Use 'mcp-scan scan' to generate the server first"))
} 