import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { deploymentService, DeploymentConfig } from '@/services/deploymentService'
import { Deployment } from '@/lib/supabase'
import { Play, Stop, Trash2, ExternalLink, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react'

interface DeploymentDashboardProps {
  onDeployNew: () => void
}

const DeploymentDashboard: React.FC<DeploymentDashboardProps> = ({ onDeployNew }) => {
  const [deployments, setDeployments] = useState<Deployment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadDeployments()
  }, [])

  const loadDeployments = async () => {
    try {
      setLoading(true)
      const data = await deploymentService.getDeployments()
      setDeployments(data)
    } catch (err) {
      setError('Failed to load deployments')
      console.error('Error loading deployments:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteDeployment = async (id: string) => {
    try {
      await deploymentService.deleteDeployment(id)
      await loadDeployments() // Reload the list
    } catch (err) {
      console.error('Error deleting deployment:', err)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-400" />
      case 'deploying':
        return <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-400" />
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-400" />
      case 'stopped':
        return <Stop className="w-4 h-4 text-gray-400" />
      default:
        return <Clock className="w-4 h-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-900/50 text-green-300 border-green-800'
      case 'deploying':
        return 'bg-blue-900/50 text-blue-300 border-blue-800'
      case 'pending':
        return 'bg-yellow-900/50 text-yellow-300 border-yellow-800'
      case 'failed':
        return 'bg-red-900/50 text-red-300 border-red-800'
      case 'stopped':
        return 'bg-gray-900/50 text-gray-300 border-gray-800'
      default:
        return 'bg-gray-900/50 text-gray-300 border-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <p className="text-red-400 mb-4">{error}</p>
        <Button onClick={loadDeployments} variant="outline">
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Your Deployments</h2>
          <p className="text-gray-400 mt-1">Manage your MCP server deployments</p>
        </div>
        <Button onClick={onDeployNew} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold tracking-tight">
          <Play className="w-4 h-4 mr-2" />
          Deploy New
        </Button>
      </div>

      {deployments.length === 0 ? (
        <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
          <CardContent className="text-center py-12">
            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Play className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No Deployments Yet</h3>
            <p className="text-gray-400 mb-6">Get started by deploying your first MCP server</p>
            <Button onClick={onDeployNew} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold tracking-tight">
              Deploy Your First Server
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {deployments.map((deployment) => (
            <Card key={deployment.id} className="bg-gray-900/50 border-gray-800 backdrop-blur-sm hover:bg-gray-900/70 transition-all duration-300">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(deployment.status)}
                    <div>
                      <CardTitle className="text-white font-bold tracking-tight">{deployment.name}</CardTitle>
                      <CardDescription className="text-gray-400">
                        Template: {deployment.template_id}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={`${getStatusColor(deployment.status)} font-bold tracking-tight`}>
                      {deployment.status}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteDeployment(deployment.id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">Created</p>
                    <p className="text-white font-medium">
                      {new Date(deployment.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">Updated</p>
                    <p className="text-white font-medium">
                      {new Date(deployment.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">GitHub Repo</p>
                    <p className="text-white font-medium">
                      {deployment.github_repo || 'Not connected'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">Actions</p>
                    <div className="flex space-x-2">
                      {deployment.status === 'active' && (
                        <Button variant="ghost" size="sm" className="text-green-400 hover:text-green-300">
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      )}
                      {deployment.status === 'active' && (
                        <Button variant="ghost" size="sm" className="text-yellow-400 hover:text-yellow-300">
                          <Stop className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export default DeploymentDashboard 