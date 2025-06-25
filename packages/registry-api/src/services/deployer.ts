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
  