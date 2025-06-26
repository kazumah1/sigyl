// GitHub API service for fetching repositories and MCP metadata
export interface GitHubRepo {
  id: number
  name: string
  full_name: string
  description: string | null
  private: boolean
  html_url: string
  clone_url: string
  ssh_url: string
  default_branch: string
  language: string | null
  stargazers_count: number
  forks_count: number
  updated_at: string
  created_at: string
  has_mcp_yaml?: boolean
  mcp_metadata?: MCPMetadata
}

export interface MCPMetadata {
  name: string
  description: string
  port: number
  tools: MCPTool[]
  version?: string
  author?: string
}

export interface MCPTool {
  name: string
  description: string
  input_schema: object
  output_schema: object
}

export async function fetchUserRepos(token: string): Promise<GitHubRepo[]> {
  try {
    const response = await fetch("https://api.github.com/user/repos?sort=updated&per_page=100", {
      headers: { 
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json"
      }
    })

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`)
    }

    const repos: GitHubRepo[] = await response.json()
    
    // Check for MCP yaml files in each repo
    const reposWithMCP = await Promise.all(
      repos.map(async (repo) => {
        const hasYaml = await checkForMCPYaml(repo.full_name, token)
        return { ...repo, has_mcp_yaml: hasYaml }
      })
    )

    return reposWithMCP
  } catch (error) {
    console.error('Error fetching repositories:', error)
    throw error
  }
}

export async function checkForMCPYaml(repoFullName: string, token: string): Promise<boolean> {
  try {
    // Common locations where mcp.yaml might be found
    const commonPaths = [
      'mcp.yaml',
      'mcp.yml', 
      '.mcp/mcp.yaml',
      '.mcp/mcp.yml',
      'mcp/mcp.yaml',
      'mcp/mcp.yml',
      'examples/mcp.yaml',
      'examples/mcp.yml'
    ]
    
    // Check each common path directly
    for (const path of commonPaths) {
      try {
        const response = await fetch(`https://api.github.com/repos/${repoFullName}/contents/${path}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github.v3+json"
          }
        })
        
        if (response.ok) {
          return true
        }
      } catch (error) {
        // Continue checking other paths
        continue
      }
    }
    
    // For public repos only, try the search API as a last resort
    // Skip search API for private repos to avoid 403 errors
    try {
      // First check if repo is public by trying to access it without auth
      const repoResponse = await fetch(`https://api.github.com/repos/${repoFullName}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json"
        }
      })
      
      if (repoResponse.ok) {
        const repoData = await repoResponse.json()
        
        // Only use search API for public repositories
        if (!repoData.private) {
          const searchResponse = await fetch(`https://api.github.com/search/code?q=filename:mcp.yaml+repo:${repoFullName}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/vnd.github.v3+json"
            }
          })
          
          if (searchResponse.ok) {
            const searchData = await searchResponse.json()
            return searchData.total_count > 0
          }
        } else {
          // For private repos, try to recursively check common directories
          const commonDirs = ['examples', 'src', 'lib', 'server', 'generated-mcps']
          
          for (const dir of commonDirs) {
            try {
              const dirResponse = await fetch(`https://api.github.com/repos/${repoFullName}/contents/${dir}`, {
                headers: {
                  Authorization: `Bearer ${token}`,
                  Accept: "application/vnd.github.v3+json"
                }
              })
              
              if (dirResponse.ok) {
                const dirContents = await dirResponse.json()
                if (Array.isArray(dirContents)) {
                  // Check for mcp.yaml in subdirectories
                  for (const item of dirContents) {
                    if (item.type === 'dir') {
                      // Check one level deeper
                      try {
                        const subdirResponse = await fetch(`https://api.github.com/repos/${repoFullName}/contents/${dir}/${item.name}/mcp.yaml`, {
                          headers: {
                            Authorization: `Bearer ${token}`,
                            Accept: "application/vnd.github.v3+json"
                          }
                        })
                        if (subdirResponse.ok) {
                          return true
                        }
                      } catch (error) {
                        continue
                      }
                    }
                  }
                }
              }
            } catch (error) {
              continue
            }
          }
        }
      }
    } catch (error) {
      // If we can't determine repo visibility, skip search
    }
    
    return false
  } catch (error) {
    // Silently return false for any errors (including 403s)
    return false
  }
}

export async function fetchMCPMetadata(repoFullName: string, token: string): Promise<MCPMetadata | null> {
  try {
    // Common locations where mcp.yaml might be found
    const commonPaths = [
      'mcp.yaml',
      'mcp.yml', 
      '.mcp/mcp.yaml',
      '.mcp/mcp.yml',
      'mcp/mcp.yaml',
      'mcp/mcp.yml',
      'examples/mcp.yaml',
      'examples/mcp.yml'
    ]
    
    let mcpFileUrl: string | null = null
    
    // Check each common path directly
    for (const path of commonPaths) {
      try {
        const response = await fetch(`https://api.github.com/repos/${repoFullName}/contents/${path}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github.v3+json"
          }
        })
        
        if (response.ok) {
          mcpFileUrl = `https://api.github.com/repos/${repoFullName}/contents/${path}`
          break
        }
      } catch (error) {
        continue
      }
    }
    
    // If not found in common paths, try to search in common directories for private repos
    if (!mcpFileUrl) {
      const commonDirs = ['examples', 'src', 'lib', 'server', 'generated-mcps']
      
      for (const dir of commonDirs) {
        try {
          const dirResponse = await fetch(`https://api.github.com/repos/${repoFullName}/contents/${dir}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/vnd.github.v3+json"
            }
          })
          
          if (dirResponse.ok) {
            const dirContents = await dirResponse.json()
            if (Array.isArray(dirContents)) {
              // Check for mcp.yaml in subdirectories
              for (const item of dirContents) {
                if (item.type === 'dir') {
                  // Check one level deeper
                  try {
                    const subdirResponse = await fetch(`https://api.github.com/repos/${repoFullName}/contents/${dir}/${item.name}/mcp.yaml`, {
                      headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: "application/vnd.github.v3+json"
                      }
                    })
                    if (subdirResponse.ok) {
                      mcpFileUrl = `https://api.github.com/repos/${repoFullName}/contents/${dir}/${item.name}/mcp.yaml`
                      break
                    }
                  } catch (error) {
                    continue
                  }
                }
              }
            }
          }
          if (mcpFileUrl) break
        } catch (error) {
          continue
        }
      }
    }

    // If still not found and repo is public, try search API
    if (!mcpFileUrl) {
      try {
        const repoResponse = await fetch(`https://api.github.com/repos/${repoFullName}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github.v3+json"
          }
        })
        
        if (repoResponse.ok) {
          const repoData = await repoResponse.json()
          
          // Only use search API for public repositories
          if (!repoData.private) {
            const searchResponse = await fetch(`https://api.github.com/search/code?q=filename:mcp.yaml+repo:${repoFullName}`, {
              headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/vnd.github.v3+json"
              }
            })
            
            if (searchResponse.ok) {
              const searchData = await searchResponse.json()
              if (searchData.total_count > 0) {
                mcpFileUrl = searchData.items[0].url
              }
            }
          }
        }
      } catch (error) {
        // Continue without search
      }
    }

    if (!mcpFileUrl) {
      return null
    }

    // Fetch the actual file content
    const response = await fetch(mcpFileUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json"
      }
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    const content = atob(data.content)
    
    // Parse YAML (basic implementation, you might want to use a proper YAML parser)
    try {
      // For now, assuming JSON format for simplicity
      // In production, use js-yaml or similar
      const metadata = JSON.parse(content) as MCPMetadata
      return metadata
    } catch (parseError) {
      // Try to extract basic info from YAML format
      const lines = content.split('\n')
      const yamlData: any = {}
      
      for (const line of lines) {
        const match = line.match(/^(\w+):\s*(.+)$/)
        if (match) {
          const [, key, value] = match
          yamlData[key] = value.replace(/^["']|["']$/g, '') // Remove quotes
        }
      }
      
      // Create basic metadata from YAML
      if (yamlData.name || yamlData.description) {
        return {
          name: yamlData.name || 'Unknown MCP Server',
          description: yamlData.description || 'MCP Server',
          port: parseInt(yamlData.port) || 3000,
          tools: [] // TODO: Parse tools from YAML
        }
      }
      
      return null
    }
  } catch (error) {
    // Silently handle network errors
    return null
  }
}

// Legacy function for backward compatibility
export async function fetchRepos(token: string) {
  return await fetchUserRepos(token)
}
  