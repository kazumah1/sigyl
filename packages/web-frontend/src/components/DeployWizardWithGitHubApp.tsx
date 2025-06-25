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
  const { user } = useAuth()
  const [installationId, setInstallationId] = useState<number | null>(null)
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

  // Load MCP metadata when repo is selected
  useEffect(() => {
    if (selectedRepo && selectedRepo.has_mcp && installationId) {
      loadMCPMetadata()
    } else {
      setMcpMetadata(null)
    }
  }, [selectedRepo, installationId])

  const loadMCPMetadata = async () => {
    if (!selectedRepo || !installationId) return

    setLoadingMetadata(true)
    try {
      const [owner, repo] = selectedRepo.full_name.split('/')
      const metadata = await getMCPConfigWithApp(installationId, owner, repo)
      setMcpMetadata(metadata)
    } catch (err) {
      console.error('Failed to load MCP metadata:', err)
    } finally {
      setLoadingMetadata(false)
    }
  }

  const handleInstallationComplete = async (installId: number) => {
    setInstallationId(installId)
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
    if (!selectedRepo || !installationId) return

    setDeploying(true)
    setDeployError(null)

    try {
      const [owner, repo] = selectedRepo.full_name.split('/')
      const result = await deployMCPWithApp(installationId, owner, repo, selectedBranch)
      
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

  if (!user) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Github className="w-5 h-5" />
            Authentication Required
          </CardTitle>
          <CardDescription>
            Please sign in to access your repositories
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  // Show GitHub App installation if no installation ID
  if (!installationId) {
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
                  onClick={() => loadRepositories(installationId)}
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
                <div className="text-center space-y-4">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mx-auto" />
                  <p className="text-gray-400">Loading repositories...</p>
                </div>
              </div>
            ) : (
              <Tabs defaultValue="mcp" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="mcp" className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    MCP Ready ({mcpRepos.length})
                  </TabsTrigger>
                  <TabsTrigger value="all" className="flex items-center gap-2">
                    <Github className="w-4 h-4" />
                    All Repos ({filteredRepos.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="mcp" className="space-y-4">
                  {mcpRepos.length === 0 ? (
                    <div className="text-center py-8">
                      <Github className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-200 mb-2">No MCP repositories found</h3>
                      <p className="text-gray-400">
                        Repositories with MCP configuration files will appear here
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-4">
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
                  )}
                </TabsContent>

                <TabsContent value="all" className="space-y-4">
                  {filteredRepos.length === 0 ? (
                    <div className="text-center py-8">
                      <Github className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-200 mb-2">No repositories found</h3>
                      <p className="text-gray-400">
                        Try adjusting your search or filter settings
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {filteredRepos.map((repo) => (
                        <RepoCard
                          key={repo.id}
                          repo={repo}
                          isSelected={false}
                          onSelect={setSelectedRepo}
                          isMCP={repo.has_mcp}
                        />
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
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
                Back to Repos
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Repository Info */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Github className="w-5 h-5" />
                <div>
                  <h4 className="font-medium">{selectedRepo.name}</h4>
                  <p className="text-sm text-gray-500">{selectedRepo.full_name}</p>
                  {selectedRepo.description && (
                    <p className="text-sm text-gray-400 mt-1">{selectedRepo.description}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selectedRepo.private && <Lock className="w-4 h-4 text-gray-400" />}
                {selectedRepo.has_mcp && (
                  <Badge variant="default">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    MCP Ready
                  </Badge>
                )}
              </div>
            </div>

            {/* MCP Configuration */}
            {selectedRepo.has_mcp && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <h4 className="font-medium">MCP Configuration Found</h4>
                </div>
                
                {loadingMetadata ? (
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading MCP configuration...
                  </div>
                ) : mcpMetadata ? (
                  <div className="p-4 border rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{mcpMetadata.name}</span>
                      <Badge variant="outline">v{mcpMetadata.version || '1.0.0'}</Badge>
                    </div>
                    <p className="text-sm text-gray-400">{mcpMetadata.description}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>Port: {mcpMetadata.port}</span>
                      <span>Tools: {mcpMetadata.tools.length}</span>
                    </div>
                  </div>
                ) : (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      MCP configuration found but could not be loaded
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* Branch Selection */}
            <div className="space-y-2">
              <Label htmlFor="branch">Deployment Branch</Label>
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

            {/* Deploy Button */}
            <div className="space-y-4">
              {deployError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{deployError}</AlertDescription>
                </Alert>
              )}

              <Button
                onClick={handleDeploy}
                disabled={deploying || !selectedRepo.has_mcp}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold tracking-tight"
                size="lg"
              >
                {deploying ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Deploying...
                  </>
                ) : (
                  <>
                    <Rocket className="w-5 h-5 mr-2" />
                    Deploy MCP Server
                  </>
                )}
              </Button>

              {!selectedRepo.has_mcp && (
                <p className="text-sm text-gray-500 text-center">
                  This repository doesn't contain MCP configuration files
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// RepoCard component
interface RepoCardProps {
  repo: GitHubAppRepository
  isSelected: boolean
  onSelect: (repo: GitHubAppRepository) => void
  isMCP: boolean
}

const RepoCard: React.FC<RepoCardProps> = ({ repo, isSelected, onSelect, isMCP }) => {
  return (
    <Card 
      className={`cursor-pointer transition-all hover:border-indigo-500/50 ${
        isSelected ? 'border-indigo-500 bg-indigo-500/5' : ''
      }`}
      onClick={() => onSelect(repo)}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Github className="w-5 h-5" />
            <div className="flex-1">
              <h4 className="font-medium">{repo.name}</h4>
              <p className="text-sm text-gray-500">{repo.full_name}</p>
              {repo.description && (
                <p className="text-sm text-gray-400 mt-1 line-clamp-2">{repo.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {repo.private && <Lock className="w-4 h-4 text-gray-400" />}
            {isMCP && (
              <Badge variant="default" className="text-xs">
                <CheckCircle className="w-3 h-3 mr-1" />
                MCP Ready
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default DeployWizardWithGitHubApp 