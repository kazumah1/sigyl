export interface CLIOptions {
	verbose?: boolean
	debug?: boolean
}

export interface MCPTool {
	name: string
	description: string
	inputSchema: {
		type: string
		properties: Record<string, any>
		required?: string[]
	}
}

export interface MCPServerConfig {
	name: string
	description: string
	version: string
	tools: MCPTool[]
} 