import { Octokit } from 'octokit'
import yaml from 'js-yaml'
import { z } from 'zod'

// Zod schema for required secrets
const MCPSecretSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  required: z.boolean().default(true),
  type: z.enum(['string', 'number', 'boolean']).default('string'),
})

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
  port: z.number(),
  tools: z.array(MCPToolSchema),
  // Optional secrets section
  secrets: z.array(MCPSecretSchema).optional(),
})

// Zod schema for the minimal Sigyl configuration (no env, build, or entryPoint)
const SigylConfigSchema = z.object({
  runtime: z.enum(['node', 'container']),
  language: z.enum(['typescript', 'javascript']).optional(),
  startCommand: z.object({
    type: z.literal('http'),
    configSchema: z.record(z.any()).optional(),
    exampleConfig: z.record(z.any()).optional(),
  }).optional(),
})

export type MCPYaml = z.infer<typeof MCPMetadataSchema>
export type MCPSecret = z.infer<typeof MCPSecretSchema>
export type SigylConfig = z.infer<typeof SigylConfigSchema>

export async function fetchMCPYaml(
  owner: string,
  repo: string,
  branch = 'main',
  token: string
): Promise<MCPYaml> {
  const octokit = new Octokit({ auth: token })
  const { data } = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
    owner,
    repo,
    path: 'mcp.yaml',
    ref: branch,
  })

  if (!data || Array.isArray(data) || typeof data !== 'object' || !('content' in data) || typeof data.content !== 'string') {
    throw new Error('mcp.yaml file content not found in GitHub API response');
  }

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

export async function fetchSigylYaml(
  owner: string,
  repo: string,
  branch = 'main',
  token?: string
): Promise<SigylConfig> {
  const octokit = new Octokit({ auth: token })
  const { data } = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
    owner,
    repo,
    path: 'sigyl.yaml',
    ref: branch,
  })

  if (!data || Array.isArray(data) || typeof data !== 'object' || !('content' in data) || typeof data.content !== 'string') {
    throw new Error('sigyl.yaml file content not found in GitHub API response');
  }

  const file = Buffer.from(data.content, 'base64').toString('utf-8')
  const parsed = yaml.load(file)
  const result = SigylConfigSchema.safeParse(parsed)
  if (!result.success) {
    throw new Error(
      'Invalid sigyl.yaml structure: ' + JSON.stringify(result.error.format(), null, 2)
    )
  }
  return result.data
}
