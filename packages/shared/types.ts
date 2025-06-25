export interface MCPTool {
    name: string
    description: string
    inputSchema: {
        type: string
        properties: Record<string, any>
        required?: string[]
    }
    outputSchema?: Record<string, any>
}

export interface MCPMetadata {
    name: string
    description: string
    version: string
    port: number
    tools: MCPTool[]
}
  