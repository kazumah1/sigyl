import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Github, GitBranch, Star, Eye, EyeOff, CheckCircle, AlertCircle, ExternalLink, ArrowLeft, Rocket, Shield, Lock, FileText, Settings, Code, RefreshCw } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { 
  fetchRepositoriesWithApp, 
  getMCPConfigWithApp, 
  deployMCPWithApp,
  GitHubAppRepository,
  MCPMetadata 
} from "@/lib/githubApp"
import GitHubAppInstall from "./GitHubAppInstall"

const REGISTRY_API_BASE = import.meta.env.VITE_REGISTRY_API_URL || 'http://localhost:3000/api/v1'
const GITHUB_APP_NAME = import.meta.env.VITE_GITHUB_APP_NAME || 'sigyl-dev'
const BACKEND_CALLBACK_URL = `${REGISTRY_API_BASE}/github/callback`

interface DeployWizardWithGitHubAppProps {
  onDeploy?: (deployment: any) => void
  activeGitHubAccount?: {
    installationId: number
    username: string
    fullName?: string
    avatarUrl?: string
    email?: string
    isActive: boolean
    accountLogin: string
    accountType: string
  } | null
}

const DeployWizardWithGitHubApp: React.FC<DeployWizardWithGitHubAppProps> = ({ onDeploy, activeGitHubAccount }) => {
  const navigate = useNavigate()
  const { user, installationId: authInstallationId, hasInstallation, installationCheckError } = useAuth()
  const [repositories, setRepositories] = useState<GitHubAppRepository[]>([])
  const [selectedRepo, setSelectedRepo] = useState<GitHubAppRepository | null>(null)
  const [selectedBranch, setSelectedBranch] = useState('main')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [deploying, setDeploying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deployError, setDeployError] = useState<string | null>(null)
  const [mcpMetadata, setMcpMetadata] = useState<MCPMetadata | null>(null)
  const [loadingMetadata, setLoadingMetadata] = useState(false)
  const [installationError, setInstallationError] = useState<boolean>(false)
  const lastCheckRef = useRef<{ username: string | null, timestamp: number }>({ username: null, timestamp: 0 })

  // Use the installationId from the activeGitHubAccount prop if provided, else fallback to AuthContext
  const installationId = activeGitHubAccount?.installationId ?? authInstallationId;

  // Load repositories when active account is available
  useEffect(() => {
    if (user && typeof installationId === 'number' && !isNaN(installationId)) {
      loadRepositories(installationId)
    } else if (user && installationId === null) {
      // No installation found, stop loading
      setLoading(false)
    }
  }, [user, installationId])

  // Load MCP metadata when repo is selected
  useEffect(() => {
    if (selectedRepo && selectedRepo.has_mcp && user) {
      loadMCPMetadata()
    } else {
      setMcpMetadata(null)
    }
  }, [selectedRepo, user])

  const loadMCPMetadata = async () => {
    if (!selectedRepo || !user) return

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
    await loadRepositories(installId)
  }

  const loadRepositories = async (installId: number) => {
    if (typeof installId !== 'number' || isNaN(installId)) return;
    setLoading(true)
    setError(null)
    setInstallationError(false)

    try {
      const repos = await fetchRepositoriesWithApp(installId)
      setRepositories(repos)
    } catch (err) {
      console.error('Error loading repositories:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to load repositories'
      setError(errorMessage)
      
      // Check if this is a GitHub App installation error
      if (errorMessage.includes('500') || errorMessage.includes('404') || errorMessage.includes('Not Found') || errorMessage.includes('installation')) {
        console.log('Detected GitHub App installation error')
        setInstallationError(true)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleClearInstallations = () => {
    console.log('User requested to clear invalid installations')
    // The component will re-render and show the GitHubAppInstall component
  }

  const handleDeploy = async () => {
    if (!selectedRepo || !user) return

    setDeploying(true)
    setDeployError(null)

    try {
      const [owner, repo] = selectedRepo.full_name.split('/')
      
      // Start deployment and immediately redirect to package page
      const result = await deployMCPWithApp(installationId, owner, repo, selectedBranch, user.id)
      
      // Call the onDeploy callback
      onDeploy?.(result)
      
      console.log('Deployment initiated:', result)
      
      // Redirect to the new MCP package page using the actual package ID
      if (result.packageId) {
        navigate(`/mcp/${result.packageId}?new=true&deploying=true`)
      } else {
        // Fallback if no package ID (shouldn't happen with proper backend)
        const fallbackId = `${owner}-${repo}-${Date.now()}`
        navigate(`/mcp/${fallbackId}?new=true&deploying=true`)
      }
    } catch (err) {
      setDeployError(err instanceof Error ? err.message : 'Deployment failed')
      console.error('Deployment failed:', err)
    } finally {
      setDeploying(false)
    }
  }

  const handleBackToRepos = () => {
    setSelectedRepo(null)
    setMcpMetadata(null)
    setDeployError(null)
  }

  // Filter repositories based on search only (always show private repos)
  const filteredRepos = repositories.filter(repo => {
    return (
      repo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      repo.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      repo.full_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  })

  // Separate repos by configuration type
  const sigylRepos = filteredRepos.filter(repo => repo.has_sigyl)
  const mcpRepos = filteredRepos.filter(repo => repo.has_mcp && !repo.has_sigyl) // MCP-only repos
  const regularRepos = filteredRepos.filter(repo => !repo.has_mcp && !repo.has_sigyl)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
        <span className="ml-3 text-gray-300">Loading repositories...</span>
      </div>
    )
  }

  if (installationCheckError) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Alert className="border-red-500 bg-red-500/10 max-w-lg">
          <AlertCircle className="h-6 w-6 text-red-500 mb-2" />
          <AlertDescription className="text-gray-300">
            Error checking GitHub App installation:<br />
            <span className="font-mono text-red-400">{installationCheckError}</span>
            <br />
            Please try again later or contact support if this persists.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!installationId) {
    // Build the GitHub App install URL with backend callback as redirect_uri
    const installUrl = `https://github.com/apps/${GITHUB_APP_NAME}/installations/new?state=${encodeURIComponent(window.location.origin + '/post-install-login')}&request_oauth_on_install=true&redirect_uri=${encodeURIComponent(BACKEND_CALLBACK_URL)}`
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Github className="w-12 h-12 text-gray-400 mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Install the GitHub App</h2>
        <p className="text-gray-300 mb-6 text-center max-w-md">
          To deploy your MCP server, you need to install the SIGYL GitHub App and grant it access to your repositories.
        </p>
        <Button
          asChild
          className="btn-modern hover:bg-neutral-900 hover:text-white"
        >
          <a href={installUrl} target="_blank" rel="noopener noreferrer">
            <Github className="w-5 h-5 mr-2 inline" />
            Install GitHub App
          </a>
        </Button>
      </div>
    )
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Repository Selection with smooth accordion animation */}
      <div className={`overflow-hidden transition-all duration-700 ease-in-out ${
        selectedRepo 
          ? 'max-h-0 opacity-0' 
          : 'max-h-[5000px] opacity-100'
      }`}>
        <Card className="bg-[#18181b] border border-white/10 rounded-2xl p-6">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-white">
              <Shield className="w-5 h-5 text-white" />
              Select Repository
            </CardTitle>
            <CardDescription className="text-white">
              Choose a repository to deploy as an MCP server using GitHub App
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pb-8">
            {/* Search and Filter Controls */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-4 w-full">
              <div className="flex-1 flex flex-col">
                <Label htmlFor="search" className="text-white mb-2">Search repositories</Label>
                <Input
                  id="search"
                  placeholder="Filter by name or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="min-h-[44px] bg-black border-white/10 border-2text-white placeholder-white placeholder:text-white/50 rounded-lg w-full"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadRepositories(installationId)}
                disabled={loading}
                className="flex items-center justify-center gap-2 min-h-[44px] sm:min-w-[140px] mt-2 sm:mt-0 touch-manipulation border-white/20 text-white bg-black hover:bg-white/10 hover:text-white hover:border-white/30 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-5 h-5 text-white" />
                    Refresh
                  </>
                )}
              </Button>
            </div>

            {/* Installation Error Message */}
            {installationError && (
              <Alert className="border-yellow-500 bg-yellow-500/10">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                <AlertDescription className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-white">
                  <span>GitHub App installation may be corrupted or expired.</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearInstallations}
                    className="min-h-[36px] touch-manipulation border-yellow-500 text-yellow-400 hover:bg-yellow-500/10 shrink-0"
                  >
                    Clear & Reinstall
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {/* Error Display */}
            {error && !installationError && (
              <Alert className="border-red-500 bg-red-500/10">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <AlertDescription className="text-gray-300">{error}</AlertDescription>
              </Alert>
            )}

            {/* Loading State */}
            {loading && (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="w-8 h-8 animate-spin text-white" />
                  <p className="text-sm text-white text-center">Loading repositories...</p>
                </div>
              </div>
            )}

            {/* Repository Lists */}
            {!loading && repositories.length > 0 && (
              <div className="space-y-6">
                {/* Sigyl-Ready Repositories */}
                {sigylRepos.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Settings className="w-5 h-5 text-white" />
                      <h3 className="text-lg font-semibold text-white">Sigyl-Ready Repositories</h3>
                      <Badge variant="default" className="ml-auto bg-white/10 text-white hover:bg-white/10">{sigylRepos.length}</Badge>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      {sigylRepos.map((repo) => (
                        <RepoCard
                          key={repo.id}
                          repo={repo}
                          isSelected={selectedRepo?.id === repo.id}
                          onSelect={setSelectedRepo}
                          configType="sigyl"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* MCP-Only Repositories */}
                {mcpRepos.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <CheckCircle className="w-5 h-5 text-white" />
                      <h3 className="text-lg font-semibold text-white">MCP-Ready Repositories</h3>
                      <Badge variant="secondary" className="ml-auto bg-white/10 text-white">{mcpRepos.length}</Badge>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      {mcpRepos.map((repo) => (
                        <RepoCard
                          key={repo.id}
                          repo={repo}
                          isSelected={selectedRepo?.id === repo.id}
                          onSelect={setSelectedRepo}
                          configType="mcp"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Regular Repositories */}
                {regularRepos.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Github className="w-5 h-5 text-white" />
                      <h3 className="text-lg font-semibold text-white">Other Repositories</h3>
                      <Badge variant="outline" className="ml-auto border-white/20 text-white">{regularRepos.length}</Badge>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      {regularRepos.map((repo) => (
                        <RepoCard
                          key={repo.id}
                          repo={repo}
                          isSelected={selectedRepo?.id === repo.id}
                          onSelect={setSelectedRepo}
                          configType="none"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {filteredRepos.length === 0 && (
                  <div className="text-center py-12">
                    <Github className="w-12 h-12 text-white mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2 text-white">No repositories found</h3>
                    <p className="text-sm text-white mb-4">
                      {searchTerm ? 'Try adjusting your search terms.' : 'No repositories match your current filters.'}
                    </p>
                    {searchTerm && (
                      <Button
                        variant="outline"
                        onClick={() => setSearchTerm('')}
                        className="min-h-[44px] touch-manipulation border-white/20 text-white bg-black hover:bg-white/10"
                      >
                        Clear Search
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}

            {!loading && repositories.length === 0 && !error && (
              <div className="text-center py-12">
                <Github className="w-12 h-12 text-white mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2 text-white">No repositories available</h3>
                <p className="text-sm text-white mb-4 max-w-md mx-auto">
                  Make sure the GitHub App has access to your repositories. You may need to configure repository access in your GitHub settings.
                </p>
                <Button
                  variant="outline"
                  onClick={() => window.open('https://github.com/settings/installations', '_blank')}
                  className="min-h-[44px] touch-manipulation border-white/20 text-white bg-black hover:bg-white/10"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Manage GitHub App
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Deployment Configuration with smooth entrance */}
      <div className={`overflow-hidden transition-all duration-700 ease-in-out ${
        selectedRepo 
          ? 'max-h-[5000px] opacity-100' 
          : 'max-h-0 opacity-0'
      }`}>
        {selectedRepo && (
          <div className="relative">
            <div className="mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBackToRepos}
                className="flex items-center gap-2 border-white/20 text-white bg-black hover:bg-white/10 hover:border-white/30 hover:text-white rounded-lg"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Repositories
              </Button>
            </div>
            <Card className="bg-[#18181b] border border-[#23232a] rounded-2xl p-6">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-white">
                  <Rocket className="w-5 h-5 text-white" />
                  Deploy Configuration
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Configure deployment settings for {selectedRepo.full_name}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* Repository Info */}
                <div className="flex items-center gap-4 p-4 bg-black/60 border border-white/10 rounded-lg">
                  <Github className="w-8 h-8 text-gray-300" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-white">{selectedRepo.full_name}</h4>
                    <p className="text-sm text-gray-400">
                      {selectedRepo.description || 'No description available'}
                    </p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {selectedRepo.private && (
                        <Badge variant="outline" className="text-xs border-white/20 text-white rounded-md">
                          <Lock className="w-3 h-3 mr-1" />
                          Private
                        </Badge>
                      )}
                      {selectedRepo.has_sigyl && (
                        <Badge className="text-xs bg-white/10 text-white rounded-md">
                          <Settings className="w-3 h-3 mr-1" />
                          Sigyl Ready
                        </Badge>
                      )}
                      {selectedRepo.has_mcp && !selectedRepo.has_sigyl && (
                        <Badge className="text-xs bg-white/10 text-white rounded-md">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          MCP Ready
                        </Badge>
                      )}
                      {selectedRepo.sigyl_config && (
                        <Badge variant="outline" className="text-xs border-white/20 text-white rounded-md">
                          <Code className="w-3 h-3 mr-1" />
                          {selectedRepo.sigyl_config.runtime}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Branch Selection */}
                <div>
                  <Label htmlFor="branch" className="text-white">Branch</Label>
                  <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                    <SelectTrigger className="bg-black border-white/10 text-white">
                      <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                    <SelectContent className="bg-black border-white/10">
                      <SelectItem value="main">main</SelectItem>
                      <SelectItem value="master">master</SelectItem>
                      <SelectItem value="develop">develop</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* MCP Metadata Display */}
                {loadingMetadata ? (
                  <div className="flex items-center gap-2 text-gray-300">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Loading MCP configuration...</span>
                  </div>
                ) : mcpMetadata ? (
                  <div className="space-y-4">
                    <h4 className="font-semibold text-white">MCP Configuration</h4>
                    <div className="grid gap-4 p-4 bg-black border border-white/10 rounded-lg">
                      <div>
                        <Label className="text-sm font-medium text-gray-300">Name</Label>
                        <p className="text-sm text-white">{mcpMetadata.name}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-300">Description</Label>
                        <p className="text-sm text-white">{mcpMetadata.description}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-300">Port</Label>
                        <p className="text-sm text-white">{mcpMetadata.port}</p>
                      </div>
                      {mcpMetadata.tools && mcpMetadata.tools.length > 0 && (
                        <div>
                          <Label className="text-sm font-medium text-gray-300">Tools ({mcpMetadata.tools.length})</Label>
                          <div className="space-y-2">
                            {mcpMetadata.tools.map((tool, index) => (
                              <div key={index} className="text-sm p-2 bg-black border border-white/10 rounded">
                                <strong className="text-white">{tool.name}</strong>: <span className="text-gray-300">{tool.description}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : selectedRepo.has_mcp && (
                  <Alert className="border-yellow-500 bg-yellow-500/10">
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                    <AlertDescription className="text-gray-300">
                      MCP configuration found but could not be loaded. The deployment will proceed with default settings.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Deployment Error */}
                {deployError && (
                  <Alert className="border-red-500 bg-red-500/10">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <AlertDescription className="text-gray-300">{deployError}</AlertDescription>
                  </Alert>
                )}

                {/* Deploy Button */}
                <Button
                  onClick={handleDeploy}
                  disabled={deploying}
                  className="w-full btn-modern-inverted hover:bg-transparent hover:text-white"
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
          </div>
        )}
      </div>
    </div>
  )
}

interface RepoCardProps {
  repo: GitHubAppRepository
  isSelected: boolean
  onSelect: (repo: GitHubAppRepository) => void
  configType: 'sigyl' | 'mcp' | 'none'
}

const RepoCard: React.FC<RepoCardProps> = ({ repo, isSelected, onSelect, configType }) => {
  return (
    <div
      className={`p-5 border rounded-xl cursor-pointer transition-all shadow-sm hover:shadow-lg hover:shadow-black/20 touch-manipulation ${
        isSelected 
          ? 'border-white/20 bg-[#23232a] shadow-lg shadow-white/10' 
          : 'border-white/10 bg-[#18181b] hover:border-white/20 hover:bg-white/10'
      }`}
      onClick={() => onSelect(repo)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Github className="w-4 h-4 text-gray-400" />
            <h4 className="font-bold text-white text-lg">{repo.name}</h4>
            {repo.private && <Lock className="w-3 h-3 text-gray-500" />}
          </div>
          <p className="text-sm text-gray-400 mb-3 leading-relaxed">
            {repo.description || 'No description available'}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            {configType === 'sigyl' && (
              <Badge variant="outline" className="text-xs border-white/20 text-white bg-white/10 rounded-md">
                <Settings className="w-3 h-3 mr-1" />
                sigyl.yaml
              </Badge>
            )}
            {configType === 'mcp' && (
              <Badge className="text-xs bg-white/10 text-white font-medium rounded-md">
                <CheckCircle className="w-3 h-3 mr-1" />
                mcp.yaml
              </Badge>
            )}
            {repo.has_sigyl && repo.has_mcp && (
              <Badge variant="outline" className="text-xs border-white/20 text-white font-medium bg-white/10 rounded-md">
                <FileText className="w-3 h-3 mr-1" />
                Both configs
              </Badge>
            )}
            {repo.sigyl_config && (
              <Badge variant="outline" className="text-xs border-white/20 text-white bg-white/10 rounded-md">
                <Code className="w-3 h-3 mr-1" />
                {repo.sigyl_config.runtime}
                {repo.sigyl_config.language && ` (${repo.sigyl_config.language})`}
              </Badge>
            )}
            <span className="text-xs text-gray-500 ml-auto">{repo.full_name}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DeployWizardWithGitHubApp 