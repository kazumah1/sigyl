import React, { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, Github, GitBranch, Star, Eye, EyeOff, CheckCircle, AlertCircle, ExternalLink, ArrowLeft, Rocket, Shield } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { fetchUserRepos, GitHubRepo, fetchMCPMetadata, MCPMetadata } from "@/lib/github"
import deploymentService, { DeploymentRequest, DeploymentResult } from "@/services/deploymentService"
import secretsService, { Secret } from "@/services/secretsService"

interface DeployWizardProps {
  onDeploy?: (deployment: DeploymentRequest) => void
}

const DeployWizard: React.FC<DeployWizardProps> = ({ onDeploy }) => {
  const { user, session } = useAuth()
  const [loading, setLoading] = useState(false)
  const [deploying, setDeploying] = useState(false)
  const [repos, setRepos] = useState<GitHubRepo[]>([])
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null)
  const [selectedBranch, setSelectedBranch] = useState('main')
  const [showPrivate, setShowPrivate] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [deployError, setDeployError] = useState<string | null>(null)
  const [deployResult, setDeployResult] = useState<DeploymentResult | null>(null)
  const [mcpMetadata, setMcpMetadata] = useState<MCPMetadata | null>(null)
  const [loadingMetadata, setLoadingMetadata] = useState(false)
  
  // Secrets state
  const [secrets, setSecrets] = useState<Secret[]>([])
  const [selectedSecrets, setSelectedSecrets] = useState<string[]>([])
  const [loadingSecrets, setLoadingSecrets] = useState(false)

  // Load user repositories on component mount
  useEffect(() => {
    if (user && session?.provider_token) {
      loadRepositories()
      loadSecrets()
    }
  }, [user, session])

  // Load MCP metadata when repo is selected
  useEffect(() => {
    if (selectedRepo && selectedRepo.has_mcp_yaml && session?.provider_token) {
      loadMCPMetadata()
    } else {
      setMcpMetadata(null)
    }
  }, [selectedRepo, session])

  // Load user secrets using the secrets service
  const loadSecrets = async () => {
    setLoadingSecrets(true);
    try {
      const userSecrets = await secretsService.getSecrets();
      setSecrets(userSecrets);
    } catch (error) {
      console.error('Error fetching secrets:', error);
    } finally {
      setLoadingSecrets(false);
    }
  };

  const loadRepositories = async () => {
    if (!session?.provider_token) return

    setLoading(true)
    setError(null)

    try {
      const fetchedRepos = await fetchUserRepos(session.provider_token)
      setRepos(fetchedRepos)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load repositories')
    } finally {
      setLoading(false)
    }
  }

  const loadMCPMetadata = async () => {
    if (!selectedRepo || !session?.provider_token) return

    setLoadingMetadata(true)
    try {
      const metadata = await fetchMCPMetadata(selectedRepo.full_name, session.provider_token)
      setMcpMetadata(metadata)
    } catch (err) {
      console.error('Failed to load MCP metadata:', err)
    } finally {
      setLoadingMetadata(false)
    }
  }

  const handleDeploy = async () => {
    if (!selectedRepo || !session?.provider_token) return

    setDeploying(true)
    setDeployError(null)
    setDeployResult(null)

    try {
      const deploymentRequest: DeploymentRequest = {
        repoUrl: selectedRepo.html_url,
        repoName: selectedRepo.full_name,
        branch: selectedBranch,
        env: mcpMetadata ? { PORT: mcpMetadata.port.toString() } : {},
        githubToken: session.provider_token
      }

      // Use the updated deployment service
      const result = await deploymentService.deployFromGitHub(deploymentRequest)
      
      setDeployResult(result)
      
      if (result.success) {
        // Call the onDeploy callback
        onDeploy?.(deploymentRequest)
        
        // Show success message with deployment details
        console.log('Deployment successful:', result)
      } else {
        setDeployError(result.error || 'Deployment failed')
      }
      
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
    setDeployResult(null)
    setSelectedSecrets([])
  }

  // Handle secret selection
  const handleSecretToggle = (secretId: string) => {
    setSelectedSecrets(prev => 
      prev.includes(secretId) 
        ? prev.filter(id => id !== secretId)
        : [...prev, secretId]
    );
  };

  // Filter repositories based on search and visibility preferences
  const filteredRepos = repos.filter(repo => {
    const matchesSearch = repo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         repo.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         repo.full_name.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesVisibility = showPrivate || !repo.private
    
    return matchesSearch && matchesVisibility
  })

  // Separate MCP and non-MCP repos
  const mcpRepos = filteredRepos.filter(repo => repo.has_mcp_yaml)
  const regularRepos = filteredRepos.filter(repo => !repo.has_mcp_yaml)

  if (!user) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Github className="w-5 h-5" />
            GitHub Authentication Required
          </CardTitle>
          <CardDescription>
            Please sign in with GitHub to access your repositories
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Repository Selection - Only show if no repo is selected */}
      {!selectedRepo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Github className="w-5 h-5" />
              Select Repository
            </CardTitle>
            <CardDescription>
              Choose a repository to deploy as an MCP server
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
                  onClick={loadRepositories}
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
                <Loader2 className="w-8 h-8 animate-spin" />
                <span className="ml-2">Loading repositories...</span>
              </div>
            ) : (
              <div className="space-y-4">
                {/* MCP Repositories */}
                {mcpRepos.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      MCP-Ready Repositories ({mcpRepos.length})
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
                      <AlertCircle className="w-5 h-5 text-yellow-500" />
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

                {filteredRepos.length === 0 && !loading && (
                  <div className="text-center py-8 text-gray-500">
                    No repositories found matching your criteria
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* MCP Deployment Configuration - Only show when repo is selected */}
      {selectedRepo && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToRepos}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Repositories
              </Button>
            </div>
            <CardTitle className="flex items-center gap-2">
              <Rocket className="w-5 h-5" />
              Deploy Configuration
            </CardTitle>
            <CardDescription>
              Repository: {selectedRepo.full_name}
              {selectedRepo.has_mcp_yaml && (
                <Badge className="ml-2 bg-green-500 text-white">MCP Detected</Badge>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Branch Selection */}
            <div>
              <Label htmlFor="branch">Branch</Label>
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="main">main</SelectItem>
                  <SelectItem value="master">master</SelectItem>
                  <SelectItem value="develop">develop</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* MCP Metadata */}
            {selectedRepo.has_mcp_yaml && (
              <div>
                <Label>MCP Configuration</Label>
                {loadingMetadata ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading MCP metadata...
                  </div>
                ) : mcpMetadata ? (
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <strong>Name:</strong> {mcpMetadata.name}
                      </div>
                      <div>
                        <strong>Port:</strong> {mcpMetadata.port}
                      </div>
                      <div className="col-span-2">
                        <strong>Description:</strong> {mcpMetadata.description}
                      </div>
                      {mcpMetadata.tools && mcpMetadata.tools.length > 0 && (
                        <div className="col-span-2">
                          <strong>Tools:</strong> {mcpMetadata.tools.map(t => t.name).join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      mcp.yaml found but could not parse metadata
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* NEW: Secret Selection */}
            <div>
              <Label className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Secrets & Environment Variables
              </Label>
              <div className="text-sm text-gray-500 mb-3">
                Select which secrets to include in your deployment. These will be available as environment variables.
              </div>
              
              {loadingSecrets ? (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading secrets...
                </div>
              ) : secrets.length === 0 ? (
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                  <div className="text-center">
                    <Shield className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500 mb-2">No secrets configured</p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.open('/secrets', '_blank')}
                    >
                      Manage Secrets
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {secrets.map((secret) => (
                    <div key={secret.id} className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <Checkbox
                        id={secret.id}
                        checked={selectedSecrets.includes(secret.id)}
                        onCheckedChange={() => handleSecretToggle(secret.id)}
                      />
                      <Label 
                        htmlFor={secret.id} 
                        className="flex-1 cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-sm">{secret.key}</span>
                          <span className="text-xs text-gray-500">
                            Created {new Date(secret.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </Label>
                    </div>
                  ))}
                  
                  {selectedSecrets.length > 0 && (
                    <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        <strong>{selectedSecrets.length}</strong> secret{selectedSecrets.length !== 1 ? 's' : ''} selected
                      </p>
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        These will be securely injected as environment variables during deployment
                      </p>
                    </div>
                  )}
                  
                  <div className="mt-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.open('/secrets', '_blank')}
                    >
                      Manage Secrets
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Deploy Error */}
            {deployError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{deployError}</AlertDescription>
              </Alert>
            )}

            {/* Deploy Success */}
            {deployResult && deployResult.success && (
              <Alert className="border-green-500 bg-green-50 dark:bg-green-900/20">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <AlertDescription className="text-green-700 dark:text-green-400">
                  <strong>Deployment Successful!</strong><br />
                  Your MCP server is now live at: <a href={deployResult.deploymentUrl} target="_blank" rel="noopener noreferrer" className="underline">{deployResult.deploymentUrl}</a><br />
                  {deployResult.packageId ? (
                    <>Package ID: {deployResult.packageId}</>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400">
                      ⚠️ Registry offline - deployment succeeded but not yet registered
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Deploy Button */}
            <Button 
              onClick={handleDeploy}
              disabled={!selectedRepo || deploying}
              className="w-full"
            >
              {deploying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Deploying...
                </>
              ) : (
                'Deploy to MCP Registry'
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Repository Card Component
interface RepoCardProps {
  repo: GitHubRepo
  isSelected: boolean
  onSelect: (repo: GitHubRepo) => void
  isMCP: boolean
}

const RepoCard: React.FC<RepoCardProps> = ({ repo, isSelected, onSelect, isMCP }) => {
  return (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-md ${
        isSelected ? 'ring-2 ring-blue-500' : ''
      }`}
      onClick={() => onSelect(repo)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h4 className="font-semibold">{repo.name}</h4>
              {repo.private && (
                <Badge variant="secondary" className="text-xs">Private</Badge>
              )}
              {isMCP && (
                <Badge className="text-xs bg-green-500 text-white font-bold">MCP Detected</Badge>
              )}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {repo.description || 'No description'}
            </p>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
              {repo.language && (
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  {repo.language}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Star className="w-3 h-3" />
                {repo.stargazers_count}
              </span>
              <span className="flex items-center gap-1">
                <GitBranch className="w-3 h-3" />
                {repo.forks_count}
              </span>
            </div>
          </div>
          <a
            href={repo.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-gray-600 ml-2"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </CardContent>
    </Card>
  )
}

export default DeployWizard
