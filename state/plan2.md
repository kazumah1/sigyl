Absolutely — here’s your updated **Smithery-style one-click deploy implementation timeline**, now including:

* ⏱ Hour-by-hour breakdown
* 🗂 Where each task lives in your monorepo
* 💻 Actual code scaffolding + file templates

This version is tailored for **speed**, **clarity**, and **alignment with your monorepo**, so you can complete this in 18 hours.

---

# ✅ **One-Click GitHub Deploy Timeline (with Code)**

### 🧱 Assumes your monorepo structure:



---

## ⏱ **Hour 0–2: Parse `mcp.yaml` from GitHub**

### 📍 File:

* `packages/registry-api/src/services/yaml.ts`
* `packages/shared/types.ts`

### 💻 Code

**`packages/shared/types.ts`**

```ts
export interface MCPTool {
  name: string
  description: string
  input_schema: object
  output_schema: object
}

export interface MCPMetadata {
  name: string
  description: string
  port: number
  tools: MCPTool[]
}
```

**`packages/registry-api/src/services/yaml.ts`**

```ts
import { Octokit } from 'octokit'
import yaml from 'js-yaml'
import { MCPMetadata } from '@shared/types'

export async function fetchMCPYaml(owner: string, repo: string, branch = 'main', token: string): Promise<MCPMetadata> {
  const octokit = new Octokit({ auth: token })
  const { data } = await octokit.repos.getContent({
    owner,
    repo,
    path: 'mcp.yaml',
    ref: branch
  }) as any

  const file = Buffer.from(data.content, 'base64').toString('utf-8')
  return yaml.load(file) as MCPMetadata
}
```

---

## ⏱ **Hour 2–4: GitHub OAuth + Repo Selector**

### 📍 Files:

* `packages/web-frontend/lib/github.ts`
* `packages/web-frontend/components/DeployWizard.tsx`
* `packages/registry-api/src/services/github.ts`

### 💻 Code

**`lib/github.ts`**

```ts
export async function fetchRepos(token: string) {
  return await fetch("https://api.github.com/user/repos", {
    headers: { Authorization: `Bearer ${token}` }
  }).then(res => res.json())
}
```

**`DeployWizard.tsx` (step 1–2 UI)**

```tsx
const [repos, setRepos] = useState([])
useEffect(() => {
  fetch('/api/github/repos').then(res => res.json()).then(setRepos)
}, [])

return (
  <select onChange={e => setSelectedRepo(e.target.value)}>
    {repos.map(r => <option value={r.full_name}>{r.full_name}</option>)}
  </select>
)
```

**`registry-api/src/services/github.ts`**

```ts
import { Octokit } from 'octokit'

export async function getUserRepos(token: string) {
  const octokit = new Octokit({ auth: token })
  const { data } = await octokit.rest.repos.listForAuthenticatedUser()
  return data
}
```

---

## ⏱ **Hour 4–6: Trigger Deploy via Render**

### 📍 Files:

* `packages/registry-api/src/services/deployer.ts`
* `packages/registry-api/src/routes/deploy.ts`

### 💻 Code

**`services/deployer.ts`**

```ts
export async function deployRepo({ repoUrl, env }: { repoUrl: string, env: Record<string, string> }) {
  return await fetch('https://api.render.com/v1/services', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RENDER_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      serviceName: 'mcp-' + Date.now(),
      repo: repoUrl,
      branch: 'main',
      envVars: env
    })
  }).then(res => res.json())
}
```

**`routes/deploy.ts`**

```ts
app.post('/api/v1/deploy', async (req, res) => {
  const { repoUrl, githubToken } = req.body
  const [owner, repo] = repoUrl.replace('https://github.com/', '').split('/')
  const metadata = await fetchMCPYaml(owner, repo, 'main', githubToken)

  const deployment = await deployRepo({
    repoUrl,
    env: { PORT: metadata.port.toString() }
  })

  const registered = await MCPRegistry.publish({ ...metadata, deploymentUrl: deployment.url })

  res.json({ packageId: registered.id, deploymentUrl: deployment.url })
})
```

---

## ⏱ **Hour 6–8: Register MCP Package in Registry**

### 📍 File:

* `packages/registry-api/src/services/registry.ts`

### 💻 Code

```ts
import { supabase } from '../lib/supabaseClient'
import { MCPMetadata } from '@shared/types'

export async function publish(metadata: MCPMetadata & { deploymentUrl: string }) {
  const { data: pkg } = await supabase.from('mcp_packages').insert({
    name: metadata.name,
    description: metadata.description,
    tags: [],  // Add this if you parse tags
    deployment_url: metadata.deploymentUrl
  }).select().single()

  for (const tool of metadata.tools) {
    await supabase.from('mcp_tools').insert({
      package_id: pkg.id,
      tool_name: tool.name,
      description: tool.description,
      input_schema: tool.input_schema,
      output_schema: tool.output_schema
    })
  }

  return pkg
}
```

---

## ⏱ **Hour 8–10: Deploy Wizard UI (Full Flow)**

### 📍 File:

* `packages/web-frontend/components/DeployWizard.tsx`

### 💻 Code (Wizard Steps)

```tsx
// On deploy click:
await fetch('/api/v1/deploy', {
  method: 'POST',
  body: JSON.stringify({ repoUrl: selectedRepo, githubToken }),
  headers: { 'Content-Type': 'application/json' }
}).then(res => res.json()).then(data => {
  setDeploymentUrl(data.deploymentUrl)
  setStatus('success')
})
```

---

## ⏱ **Hour 10–12: MCP Explorer + Install**

### 📍 File:

* `packages/web-frontend/components/MCPExplorer.tsx`
* `packages/web-frontend/components/PackageCard.tsx`
* `packages/registry-api/src/routes/packages.ts`

### 💻 Code

**Explorer Fetch**

```tsx
useEffect(() => {
  fetch('/api/v1/packages/search').then(res => res.json()).then(setPackages)
}, [])
```

**PackageCard.tsx**

```tsx
return (
  <div>
    <h3>{pkg.name}</h3>
    <p>{pkg.description}</p>
    <a href={pkg.deployment_url}>View</a>
    <button onClick={() => installInClaude(pkg)}>Install</button>
  </div>
)
```

---

## ⏱ **Hour 12–14: Error Handling + Health Check**

### 📍 Files:

* `deployer.ts`, `yaml.ts`, `DeployWizard.tsx`

### 💻 Code

**Health check before registry insert**

```ts
const isHealthy = await fetch(`${deployment.url}/health`).then(r => r.ok)
if (!isHealthy) throw new Error("Deployment not healthy")
```

---

## ⏱ **Hour 14–16: Admin Tools (Optional)**

* Add `/api/v1/packages` GET
* Add re-deploy button (calls `/deploy` again)

---

## ⏱ **Hour 16–18: QA + Launch**

* Push test MCP repo to GitHub
* Deploy registry-api to Railway
* Deploy frontend to Vercel
* Final end-to-end testing

---

## ✅ Summary Table

| Feature                    | Path in Monorepo                                                |
| -------------------------- | --------------------------------------------------------------- |
| `mcp.yaml` parser          | `registry-api/services/yaml.ts`                                 |
| GitHub OAuth + repo picker | `web-frontend/components/DeployWizard.tsx`                      |
| GitHub API fetch           | `web-frontend/lib/github.ts`, `registry-api/services/github.ts` |
| Deploy to Render/Railway   | `registry-api/services/deployer.ts`                             |
| MCP registry insert        | `registry-api/services/registry.ts`                             |
| Wizard UI                  | `web-frontend/components/DeployWizard.tsx`                      |
| MCP Explorer               | `web-frontend/components/MCPExplorer.tsx`                       |
| Claude install button      | `web-frontend/components/PackageCard.tsx`                       |

---

Let me know which file or step you want to generate next — I can fill it out in full for you.
