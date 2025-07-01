import { Octokit } from 'octokit'
import yaml from 'js-yaml'
import { z } from 'zod'

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

export type SigylConfig = z.infer<typeof SigylConfigSchema>

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
