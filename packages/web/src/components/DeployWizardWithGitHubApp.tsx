import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Github, GitBranch, Star, Eye, EyeOff, CheckCircle, AlertCircle, ExternalLink, ArrowLeft, Rocket, Shield, Lock, FileText, Settings, Code } from "lucide-react"
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
  const navigate = useNavigate()
  const { user, activeGitHubAccount, clearInvalidInstallations } = useAuth()
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
  const [installationError, setInstallationError] = useState<boolean>(false)
  const [deploymentProgress, setDeploymentProgress] = useState<{
    step: number;
    stepName: string;
    message: string;
    isComplete: boolean;
  }>({
    step: 0,
    stepName: '',
    message: '',
    isComplete: false
  })

  // Load repositories when active account is available
  useEffect(() => {
    if (activeGitHubAccount) {
      loadRepositories(activeGitHubAccount.installationId)
    }
  }, [activeGitHubAccount])

  // Load MCP metadata when repo is selected
  useEffect(() => {
    if (selectedRepo && selectedRepo.has_mcp && activeGitHubAccount) {
      loadMCPMetadata()
    } else {
      setMcpMetadata(null)
    }
  }, [selectedRepo, activeGitHubAccount])

  const loadMCPMetadata = async () => {
    if (!selectedRepo || !activeGitHubAccount) return

    setLoadingMetadata(true)
    try {
      const [owner, repo] = selectedRepo.full_name.split('/')
      const metadata = await getMCPConfigWithApp(activeGitHubAccount.installationId, owner, repo)
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
    clearInvalidInstallations()
    setInstallationError(false)
    setError(null)
    // The component will re-render and show the GitHubAppInstall component
  }

  const deploymentSteps = [
    { name: 'Security Scan', description: 'Analyzing repository for security issues' },
    { name: 'Build Setup', description: 'Preparing build environment' },
    { name: 'Container Build', description: 'Building and pushing container image' },
    { name: 'Cloud Deploy', description: 'Deploying to Google Cloud Run' },
    { name: 'Service Ready', description: 'Configuring and starting service' }
  ]

  const handleDeploy = async () => {
    if (!selectedRepo || !activeGitHubAccount) return

    setDeploying(true)
    setDeployError(null)
    setDeploymentProgress({ step: 0, stepName: '', message: '', isComplete: false })

    try {
      // Step 1: Security Scan
      setDeploymentProgress({
        step: 1,
        stepName: deploymentSteps[0].name,
        message: deploymentSteps[0].description,
        isComplete: false
      })
      
      // Simulate deployment steps with progress updates
      const [owner, repo] = selectedRepo.full_name.split('/')
      
      // Step 2: Build Setup
      setTimeout(() => {
        setDeploymentProgress({
          step: 2,
          stepName: deploymentSteps[1].name,
          message: deploymentSteps[1].description,
          isComplete: false
        })
      }, 2000)
      
      // Step 3: Container Build
      setTimeout(() => {
        setDeploymentProgress({
          step: 3,
          stepName: deploymentSteps[2].name,
          message: deploymentSteps[2].description,
          isComplete: false
        })
      }, 5000)
      
      // Step 4: Cloud Deploy
      setTimeout(() => {
        setDeploymentProgress({
          step: 4,
          stepName: deploymentSteps[3].name,
          message: deploymentSteps[3].description,
          isComplete: false
        })
      }, 8000)
      
      const result = await deployMCPWithApp(activeGitHubAccount.installationId, owner, repo, selectedBranch, user?.id)
      
      // Step 5: Complete
      setDeploymentProgress({
        step: 5,
        stepName: deploymentSteps[4].name,
        message: 'Deployment completed successfully!',
        isComplete: true
      })
      
      // Call the onDeploy callback
      onDeploy?.(result)
      
      console.log('Deployment successful:', result)
      
      // Redirect to the new MCP package page
      const packageId = result.packageId || `${owner}-${repo}-${Date.now()}`
      navigate(`/mcp/${packageId}?new=true`)
    } catch (err) {
      setDeployError(err instanceof Error ? err.message : 'Deployment failed')
      setDeploymentProgress(prev => ({
        ...prev,
        message: 'Deployment failed. Please try again.',
        isComplete: false
      }))
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

  // Separate repos by configuration type
  const sigylRepos = filteredRepos.filter(repo => repo.has_sigyl)
  const mcpRepos = filteredRepos.filter(repo => repo.has_mcp && !repo.has_sigyl) // MCP-only repos
  const regularRepos = filteredRepos.filter(repo => !repo.has_mcp && !repo.has_sigyl)

  // Show GitHub App installation if no installation ID
  if (!activeGitHubAccount) {
    return (
      <GitHubAppInstall 
        onInstallationComplete={handleInstallationComplete}
        onRepositoriesLoaded={setRepositories}
      />
    )
  }

  // Deployment Progress Modal Component
  const DeploymentProgressModal = () => (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl border border-gray-700 p-8 max-w-md w-full mx-4">
        <div className="text-center mb-6">
          <Rocket className="w-12 h-12 text-blue-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Deploying Your MCP Server</h3>
          <p className="text-gray-400 text-sm">
            {selectedRepo?.name} → Google Cloud Run
          </p>
        </div>
        
        <div className="space-y-4 mb-6">
          {deploymentSteps.map((step, index) => {
            const stepNumber = index + 1
            const isActive = deploymentProgress.step === stepNumber
            const isComplete = deploymentProgress.step > stepNumber
            const isFailed = deployError && isActive
            
            return (
              <div key={step.name} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                  isComplete 
                    ? 'bg-green-500 text-white' 
                    : isActive 
                      ? isFailed 
                        ? 'bg-red-500 text-white' 
                        : 'bg-blue-500 text-white' 
                      : 'bg-gray-700 text-gray-400'
                }`}>
                  {isComplete ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : isActive ? (
                    isFailed ? (
                      <AlertCircle className="w-4 h-4" />
                    ) : (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )
                  ) : (
                    <span className="text-sm font-semibold">{stepNumber}</span>
                  )}
                </div>
                <div className="flex-1">
                  <div className={`font-medium transition-colors ${
                    isActive ? 'text-white' : isComplete ? 'text-green-400' : 'text-gray-400'
                  }`}>
                    {step.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {isActive ? deploymentProgress.message : step.description}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        
        {deployError && (
          <Alert className="border-red-500 bg-red-500/10 mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              {deployError}
            </AlertDescription>
          </Alert>
        )}
        
        <div className={`w-full h-2 bg-gray-700 rounded-full overflow-hidden transition-all duration-300`}>
          <div 
            className={`h-full transition-all duration-500 ${
              deployError ? 'bg-red-500' : deploymentProgress.isComplete ? 'bg-green-500' : 'bg-blue-500'
            }`}
            style={{ 
              width: `${deployError ? 100 : (deploymentProgress.step / deploymentSteps.length) * 100}%` 
            }}
          />
        </div>
        
        {deploymentProgress.isComplete && (
          <Button
            onClick={() => setDeploying(false)}
            className="w-full mt-4 min-h-[44px] touch-manipulation"
          >
            Continue
          </Button>
        )}
      </div>
    </div>
  )

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Deployment Progress Modal */}
      {deploying && <DeploymentProgressModal />}
      
      {/* Repository Selection with smooth accordion animation */}
      <div className={`overflow-hidden transition-all duration-700 ease-in-out ${
        selectedRepo 
          ? 'max-h-0 opacity-0' 
          : 'max-h-[5000px] opacity-100'
      }`}>
        <Card className="bg-gray-900/50 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Shield className="w-5 h-5 text-green-500" />
              Select Repository
            </CardTitle>
            <CardDescription className="text-gray-400">
              Choose a repository to deploy as an MCP server using GitHub App
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pb-6">
            {/* Search and Filter Controls */}
            <div className="flex flex-col gap-4">
              <div className="w-full">
                <Label htmlFor="search" className="text-white">Search repositories</Label>
                <Input
                  id="search"
                  placeholder="Filter by name or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="min-h-[44px] touch-manipulation bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                />
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPrivate(!showPrivate)}
                  className="flex items-center justify-center gap-2 min-h-[44px] touch-manipulation bg-gray-800 border-gray-600 text-white hover:bg-gray-700 hover:border-gray-500"
                >
                  {showPrivate ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  {showPrivate ? 'Hide Private' : 'Show Private'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadRepositories(activeGitHubAccount.installationId)}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 min-h-[44px] touch-manipulation bg-gray-800 border-gray-600 text-white hover:bg-gray-700 hover:border-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Refresh
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Installation Error Message */}
            {installationError && (
              <Alert className="border-yellow-500 bg-yellow-500/10">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                <AlertDescription className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-gray-300">
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
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                  <p className="text-sm text-gray-400 text-center">Loading repositories...</p>
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
                      <Settings className="w-5 h-5 text-blue-500" />
                      <h3 className="text-lg font-semibold text-white">Sigyl-Ready Repositories</h3>
                      <Badge variant="default" className="ml-auto bg-blue-500 hover:bg-blue-600">{sigylRepos.length}</Badge>
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
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <h3 className="text-lg font-semibold text-white">MCP-Ready Repositories</h3>
                      <Badge variant="secondary" className="ml-auto">{mcpRepos.length}</Badge>
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
                      <Github className="w-5 h-5 text-gray-400" />
                      <h3 className="text-lg font-semibold text-white">Other Repositories</h3>
                      <Badge variant="outline" className="ml-auto border-gray-600 text-gray-400">{regularRepos.length}</Badge>
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
                    <Github className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2 text-white">No repositories found</h3>
                    <p className="text-sm text-gray-400 mb-4">
                      {searchTerm ? 'Try adjusting your search terms.' : 'No repositories match your current filters.'}
                    </p>
                    {searchTerm && (
                      <Button
                        variant="outline"
                        onClick={() => setSearchTerm('')}
                        className="min-h-[44px] touch-manipulation border-gray-600 text-gray-300 hover:bg-gray-800"
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
                <Github className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2 text-white">No repositories available</h3>
                <p className="text-sm text-gray-400 mb-4 max-w-md mx-auto">
                  Make sure the GitHub App has access to your repositories. You may need to configure repository access in your GitHub settings.
                </p>
                <Button
                  variant="outline"
                  onClick={() => window.open('https://github.com/settings/installations', '_blank')}
                  className="min-h-[44px] touch-manipulation border-gray-600 text-gray-300 hover:bg-gray-800"
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
          <Card className="bg-gray-900/50 border-gray-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Rocket className="w-5 h-5" />
                    Deploy Configuration
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Configure deployment settings for {selectedRepo.full_name}
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBackToRepos}
                  className="flex items-center gap-2 bg-gray-800 border-gray-600 text-white hover:bg-gray-700 hover:border-gray-500"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Repositories
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Repository Info */}
              <div className="flex items-center gap-4 p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
                <Github className="w-8 h-8 text-gray-300" />
                <div className="flex-1">
                  <h4 className="font-semibold text-white">{selectedRepo.full_name}</h4>
                  <p className="text-sm text-gray-400">
                    {selectedRepo.description || 'No description available'}
                  </p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {selectedRepo.private && (
                      <Badge variant="outline" className="text-xs border-gray-600 text-gray-300">
                        <Lock className="w-3 h-3 mr-1" />
                        Private
                      </Badge>
                    )}
                    {selectedRepo.has_sigyl && (
                      <Badge className="text-xs bg-blue-500 text-white hover:bg-blue-600">
                        <Settings className="w-3 h-3 mr-1" />
                        Sigyl Ready
                      </Badge>
                    )}
                    {selectedRepo.has_mcp && !selectedRepo.has_sigyl && (
                      <Badge className="text-xs bg-green-500 text-white hover:bg-green-600">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        MCP Ready
                      </Badge>
                    )}
                    {selectedRepo.sigyl_config && (
                      <Badge variant="outline" className="text-xs border-blue-400 text-blue-400">
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
                  <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
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
                  <div className="grid gap-4 p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
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
                            <div key={index} className="text-sm p-2 bg-gray-700/50 border border-gray-600 rounded">
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
                className="w-full bg-blue-600 hover:bg-blue-700 text-white border-0"
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
      className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-lg hover:shadow-black/20 touch-manipulation ${
        isSelected 
          ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20' 
          : 'border-gray-700 bg-gray-800/30 hover:border-gray-600 hover:bg-gray-800/50'
      }`}
      onClick={() => onSelect(repo)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Github className="w-4 h-4 text-gray-300" />
            <h4 className="font-medium text-white">{repo.name}</h4>
            {repo.private && <Lock className="w-3 h-3 text-gray-400" />}
          </div>
          <p className="text-sm text-gray-400 mb-3 leading-relaxed">
            {repo.description || 'No description available'}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            {configType === 'sigyl' && (
              <Badge className="text-xs bg-blue-500 text-white hover:bg-blue-600 font-medium">
                <Settings className="w-3 h-3 mr-1" />
                sigyl.yaml
              </Badge>
            )}
            {configType === 'mcp' && (
              <Badge className="text-xs bg-green-500 text-white hover:bg-green-600 font-medium">
                <CheckCircle className="w-3 h-3 mr-1" />
                mcp.yaml
              </Badge>
            )}
            {repo.has_sigyl && repo.has_mcp && (
              <Badge variant="outline" className="text-xs border-purple-400 text-purple-400 font-medium">
                <FileText className="w-3 h-3 mr-1" />
                Both configs
              </Badge>
            )}
            {repo.sigyl_config && (
              <Badge variant="outline" className="text-xs border-gray-500 text-gray-400">
                <Code className="w-3 h-3 mr-1" />
                {repo.sigyl_config.runtime}
                {repo.sigyl_config.language && ` (${repo.sigyl_config.language})`}
              </Badge>
            )}
            <span className="text-xs text-gray-500 ml-auto">{repo.full_name}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 ml-4">
          <Star className="w-4 h-4 text-gray-500" />
        </div>
      </div>
    </div>
  )
}

export default DeployWizardWithGitHubApp 