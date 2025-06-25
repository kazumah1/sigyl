import { Octokit } from 'octokit'
import yaml from 'js-yaml'
import { z } from 'zod'
// Use relative import for shared types
import type { MCPTool, MCPMetadata } from '../../../shared/types'

// Zod schema matching the CLI's mcp.yaml output
const MCPToolSchema = z.object({
  name: z.string(),
  description: z.string(),
  inputSchema: z.object({
    type: z.literal('object'),
    properties: z.record(z.any()),
    required: z.array(z.string()).optional(),
  }),
  // outputSchema is optional in CLI output
  outputSchema: z.record(z.any()).optional(),
})

const MCPMetadataSchema = z.object({
  name: z.string(),
  description: z.string(),
  version: z.string(),
  tools: z.array(MCPToolSchema),
})

export type MCPYaml = z.infer<typeof MCPMetadataSchema>

export async function fetchMCPYaml(
  owner: string,
  repo: string,
  branch = 'main',
  token: string
): Promise<MCPYaml> {
  const octokit = new Octokit({ auth: token })
  const { data } = await octokit.repos.getContent({
    owner,
    repo,
    path: 'mcp.yaml',
    ref: branch,
  }) as any

  const file = Buffer.from(data.content, 'base64').toString('utf-8')
  const parsed = yaml.load(file)
  const result = MCPMetadataSchema.safeParse(parsed)
  if (!result.success) {
    throw new Error(
      'Invalid mcp.yaml structure: ' + JSON.stringify(result.error.format(), null, 2)
    )
  }
  return result.data
}
