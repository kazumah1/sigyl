import React, { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Github, CheckCircle, AlertCircle, ExternalLink, Shield, Lock } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { useNavigate } from 'react-router-dom'

const GitHubAppInstall = () => {
  const { user, hasInstallation, installationCheckError, signInWithGitHubApp } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [installing, setInstalling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleInstallApp = async () => {
    setInstalling(true)
    setError(null)

    try {
      const url = await signInWithGitHubApp()
      window.location.assign(url)
    } catch (err) {
      console.error('Error starting installation:', err)
      setError('Failed to start GitHub App installation')
    } finally {
      setInstalling(false)
    }
  }

  if (loading) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mx-auto" />
            <p className="text-gray-400">Loading repositories...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (hasInstallation) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            GitHub App Installed
          </CardTitle>
          <CardDescription>
            You have access to repositories
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Button 
              onClick={() => window.location.reload()}
              className="flex-1"
            >
              Continue to Deploy
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate('/registry')}
            >
              Browse Registry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-2xl mx-auto bg-black/80 border border-white/10 shadow-2xl rounded-2xl backdrop-blur-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white" style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}>
          <Github className="w-5 h-5 text-white" />
          GitHub App Installation
        </CardTitle>
        <CardDescription className="text-gray-300">
          You will be redirected to GitHub to sign in and install the SYGIL GitHub App in one step.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-black/60 border border-white/10 rounded-xl">
            <Shield className="w-5 h-5 text-green-400" />
            <div>
              <h4 className="font-medium text-white">Secure Repository Access</h4>
              <p className="text-sm text-gray-400">
                The GitHub App provides granular access to your repositories with minimal permissions.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 bg-black/60 border border-white/10 rounded-xl">
            <CheckCircle className="w-5 h-5 text-blue-400" />
            <div>
              <h4 className="font-medium text-white">One-Step Authentication</h4>
              <p className="text-sm text-gray-400">
                Sign in and grant repository access in a single step.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col sm:flex-row gap-3 mt-2">
          <Button
            onClick={() => {
              const url = signInWithGitHubApp();
              console.log('Opening GitHub App install URL:', url);
              window.open(url, '_blank');
            }}
            className="flex-1 h-14 rounded-xl font-semibold border-2 border-white/20 bg-black text-white hover:bg-neutral-900 hover:text-white shadow-lg flex items-center justify-center transition-all duration-150"
            style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif', fontWeight: 600 }}
          >
            <Github className="w-5 h-5 mr-2" />
            Install GitHub App
          </Button>
          <Button
            variant="outline"
            className="flex-1 h-14 rounded-xl font-semibold border-2 border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white flex items-center justify-center transition-all duration-150"
            style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif', fontWeight: 600 }}
          >
            Test Open GitHub
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/registry')}
            className="flex-1 h-14 rounded-xl font-semibold border-2 border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white flex items-center justify-center transition-all duration-150"
            style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif', fontWeight: 600 }}
          >
            Browse Registry
          </Button>
        </div>

        <div className="text-gray-400 text-sm text-center mt-4">
          By installing the GitHub App, you agree to grant access to your repositories for MCP server deployment.
        </div>
      </CardContent>
    </Card>
  )
}

export default GitHubAppInstall 