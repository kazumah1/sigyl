import React, { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Github, GitBranch, Star, Eye, EyeOff, CheckCircle, AlertCircle, ExternalLink, ArrowLeft, Rocket, Shield, Lock } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { 
  fetchRepositoriesWithApp, 
  getMCPConfigWithApp, 
  deployMCPWithApp,
  GitHubAppRepository,
  MCPMetadata 
} from "@/lib/githubApp"
import GitHubAppInstall from "./GitHubAppInstall"

interface DeployWizardWithGitHubAppProps {
  onDeploy?: (deployment: any) => void
}

const DeployWizardWithGitHubApp: React.FC<DeployWizardWithGitHubAppProps> = ({ onDeploy }) => {
  const { user, githubInstallationId } = useAuth()
  const [repositories, setRepositories] = useState<GitHubAppRepository[]>([])
  const [selectedRepo, setSelectedRepo] = useState<GitHubAppRepository | null>(null)
  const [selectedBranch, setSelectedBranch] = useState('main')
  const [showPrivate, setShowPrivate] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [deploying, setDeploying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deployError, setDeployError] = useState<string | null>(null)
  const [mcpMetadata, setMcpMetadata] = useState<MCPMetadata | null>(null)
  const [loadingMetadata, setLoadingMetadata] = useState(false)

  // Load repositories when installation ID is available
  useEffect(() => {
    if (githubInstallationId) {
      loadRepositories(githubInstallationId)
    }
  }, [githubInstallationId])

  // Load MCP metadata when repo is selected
  useEffect(() => {
    if (selectedRepo && selectedRepo.has_mcp && githubInstallationId) {
      loadMCPMetadata()
    } else {
      setMcpMetadata(null)
    }
  }, [selectedRepo, githubInstallationId])

  const loadMCPMetadata = async () => {
    if (!selectedRepo || !githubInstallationId) return

    setLoadingMetadata(true)
    try {
      const [owner, repo] = selectedRepo.full_name.split('/')
      const metadata = await getMCPConfigWithApp(githubInstallationId, owner, repo)
      setMcpMetadata(metadata)
    } catch (err) {
      console.error('Failed to load MCP metadata:', err)
    } finally {
      setLoadingMetadata(false)
    }
  }

  const handleInstallationComplete = async (installId: number) => {
    await loadRepositories(installId)
  }

  const loadRepositories = async (installId: number) => {
    setLoading(true)
    setError(null)

    try {
      const repos = await fetchRepositoriesWithApp(installId)
      setRepositories(repos)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load repositories')
    } finally {
      setLoading(false)
    }
  }

  const handleDeploy = async () => {
    if (!selectedRepo || !githubInstallationId) return

    setDeploying(true)
    setDeployError(null)

    try {
      const [owner, repo] = selectedRepo.full_name.split('/')
      const result = await deployMCPWithApp(githubInstallationId, owner, repo, selectedBranch)
      
      // Call the onDeploy callback
      onDeploy?.(result)
      
      console.log('Deployment successful:', result)
    } catch (err) {
      setDeployError(err instanceof Error ? err.message : 'Deployment failed')
    } finally {
      setDeploying(false)
    }
  }

  const handleBackToRepos = () => {
    setSelectedRepo(null)
    setMcpMetadata(null)
    setDeployError(null)
  }

  // Filter repositories based on search and visibility preferences
  const filteredRepos = repositories.filter(repo => {
    const matchesSearch = repo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         repo.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         repo.full_name.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesVisibility = showPrivate || !repo.private
    
    return matchesSearch && matchesVisibility
  })

  // Separate MCP and non-MCP repos
  const mcpRepos = filteredRepos.filter(repo => repo.has_mcp)
  const regularRepos = filteredRepos.filter(repo => !repo.has_mcp)

  // Show GitHub App installation if no installation ID
  if (!githubInstallationId) {
    return (
      <GitHubAppInstall 
        onInstallationComplete={handleInstallationComplete}
        onRepositoriesLoaded={setRepositories}
      />
    )
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Repository Selection - Only show if no repo is selected */}
      {!selectedRepo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-500" />
              Select Repository
            </CardTitle>
            <CardDescription>
              Choose a repository to deploy as an MCP server using GitHub App
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search and Filter Controls */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Label htmlFor="search">Search repositories</Label>
                <Input
                  id="search"
                  placeholder="Filter by name or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPrivate(!showPrivate)}
                  className="flex items-center gap-2"
                >
                  {showPrivate ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  {showPrivate ? 'Hide Private' : 'Show Private'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadRepositories(githubInstallationId)}
                  disabled={loading}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Refresh'}
                </Button>
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="ml-2">Loading repositories...</span>
              </div>
            ) : (
              <div className="space-y-4">
                {/* MCP Ready Repositories */}
                {mcpRepos.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      MCP Ready ({mcpRepos.length})
                    </h3>
                    <div className="grid gap-3">
                      {mcpRepos.map((repo) => (
                        <RepoCard
                          key={repo.id}
                          repo={repo}
                          isSelected={false}
                          onSelect={setSelectedRepo}
                          isMCP={true}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Regular Repositories */}
                {regularRepos.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <Github className="w-5 h-5" />
                      Other Repositories ({regularRepos.length})
                    </h3>
                    <div className="grid gap-3">
                      {regularRepos.map((repo) => (
                        <RepoCard
                          key={repo.id}
                          repo={repo}
                          isSelected={false}
                          onSelect={setSelectedRepo}
                          isMCP={false}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {filteredRepos.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Github className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No repositories found matching your criteria.</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Deployment Configuration - Show when repo is selected */}
      {selectedRepo && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Rocket className="w-5 h-5" />
                  Deploy Configuration
                </CardTitle>
                <CardDescription>
                  Configure deployment settings for {selectedRepo.full_name}
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBackToRepos}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Repositories
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Repository Info */}
            <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <Github className="w-8 h-8" />
              <div className="flex-1">
                <h4 className="font-semibold">{selectedRepo.full_name}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedRepo.description || 'No description available'}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  {selectedRepo.private && (
                    <Badge variant="outline" className="text-xs">
                      <Lock className="w-3 h-3 mr-1" />
                      Private
                    </Badge>
                  )}
                  {selectedRepo.has_mcp && (
                    <Badge className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      MCP Ready
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Branch Selection */}
            <div>
              <Label htmlFor="branch">Branch</Label>
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger>
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="main">main</SelectItem>
                  <SelectItem value="master">master</SelectItem>
                  <SelectItem value="develop">develop</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* MCP Metadata Display */}
            {loadingMetadata ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Loading MCP configuration...</span>
              </div>
            ) : mcpMetadata ? (
              <div className="space-y-4">
                <h4 className="font-semibold">MCP Configuration</h4>
                <div className="grid gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <Label className="text-sm font-medium">Name</Label>
                    <p className="text-sm">{mcpMetadata.name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Description</Label>
                    <p className="text-sm">{mcpMetadata.description}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Port</Label>
                    <p className="text-sm">{mcpMetadata.port}</p>
                  </div>
                  {mcpMetadata.tools && mcpMetadata.tools.length > 0 && (
                    <div>
                      <Label className="text-sm font-medium">Tools ({mcpMetadata.tools.length})</Label>
                      <div className="space-y-2">
                        {mcpMetadata.tools.map((tool, index) => (
                          <div key={index} className="text-sm p-2 bg-white dark:bg-gray-700 rounded">
                            <strong>{tool.name}</strong>: {tool.description}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : selectedRepo.has_mcp && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  MCP configuration found but could not be loaded. The deployment will proceed with default settings.
                </AlertDescription>
              </Alert>
            )}

            {/* Deployment Error */}
            {deployError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{deployError}</AlertDescription>
              </Alert>
            )}

            {/* Deploy Button */}
            <Button
              onClick={handleDeploy}
              disabled={deploying}
              className="w-full"
            >
              {deploying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deploying...
                </>
              ) : (
                <>
                  <Rocket className="w-4 h-4 mr-2" />
                  Deploy MCP Server
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

interface RepoCardProps {
  repo: GitHubAppRepository
  isSelected: boolean
  onSelect: (repo: GitHubAppRepository) => void
  isMCP: boolean
}

const RepoCard: React.FC<RepoCardProps> = ({ repo, isSelected, onSelect, isMCP }) => {
  return (
    <div
      className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
        isSelected ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'
      }`}
      onClick={() => onSelect(repo)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Github className="w-4 h-4" />
            <h4 className="font-medium">{repo.name}</h4>
            {repo.private && <Lock className="w-3 h-3 text-gray-400" />}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            {repo.description || 'No description available'}
          </p>
          <div className="flex items-center gap-2">
            {isMCP && (
              <Badge className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                <CheckCircle className="w-3 h-3 mr-1" />
                MCP Ready
              </Badge>
            )}
            <span className="text-xs text-gray-500">{repo.full_name}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Star className="w-4 h-4 text-gray-400" />
        </div>
      </div>
    </div>
  )
}

export default DeployWizardWithGitHubApp 