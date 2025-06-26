import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Search, 
  Filter, 
  Star, 
  Download, 
  ExternalLink, 
  Zap, 
  Database, 
  Globe, 
  Mail, 
  MessageSquare, 
  ShoppingCart, 
  Code,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  BookOpen,
  Heart
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { MarketplaceService } from '../services/marketplaceService'
import { MCPPackage, PackageWithDetails, MarketplaceFilters } from '@/types/marketplace'
import { toast } from 'sonner'
import { InstallationGuide } from './InstallationGuide'

interface MCPExplorerProps {
  searchBarRef?: React.RefObject<HTMLDivElement>
}

const CATEGORY_ICONS = {
  frameworks: <Code className="w-6 h-6 text-indigo-400" />,
  apis: <Zap className="w-6 h-6 text-indigo-400" />,
  agents: <Globe className="w-6 h-6 text-indigo-400" />,
  tools: <Database className="w-6 h-6 text-indigo-400" />,
  connectors: <MessageSquare className="w-6 h-6 text-indigo-400" />,
  templates: <ShoppingCart className="w-6 h-6 text-indigo-400" />,
  database: <Database className="w-6 h-6 text-indigo-400" />,
  ai: <Zap className="w-6 h-6 text-indigo-400" />,
  integration: <Mail className="w-6 h-6 text-indigo-400" />
}

export const MCPExplorer: React.FC<MCPExplorerProps> = ({ searchBarRef }) => {
  const [isLoaded, setIsLoaded] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [activeTab, setActiveTab] = useState('discover')
  const [packages, setPackages] = useState<MCPPackage[]>([])
  const [popularPackages, setPopularPackages] = useState<MCPPackage[]>([])
  const [trendingPackages, setTrendingPackages] = useState<MCPPackage[]>([])
  const [loading, setLoading] = useState(true)
  const [installing, setInstalling] = useState<string | null>(null)
  const [selectedPackage, setSelectedPackage] = useState<PackageWithDetails | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [showInstallGuide, setShowInstallGuide] = useState(false)
  const [lastInstalledPackage, setLastInstalledPackage] = useState<{
    name: string
    deploymentUrl?: string
    tools?: Array<{ tool_name?: string; description?: string }>
  } | null>(null)
  
  const { user } = useAuth()
  const navigate = useNavigate()

  // Load packages on component mount
  useEffect(() => {
    loadPackages()
  }, [])

  // Load packages based on search and filters
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (searchTerm || selectedCategory !== 'all') {
        searchPackages()
      } else {
        loadPackages()
      }
    }, 300)

    return () => clearTimeout(debounceTimer)
  }, [searchTerm, selectedCategory])

  const loadPackages = async () => {
    setLoading(true)
    try {
      const [allPackages, popular, trending] = await Promise.all([
        MarketplaceService.getAllPackages(),
        MarketplaceService.getPopularPackages(6),
        MarketplaceService.getTrendingPackages(6)
      ])
      
      setPackages(allPackages)
      setPopularPackages(popular)
      setTrendingPackages(trending)
    } catch (error) {
      console.error('Failed to load packages:', error)
      toast.error('Failed to load MCP packages')
    } finally {
      setLoading(false)
      setIsLoaded(true)
    }
  }

  const searchPackages = async () => {
    setLoading(true)
    try {
      const filters: MarketplaceFilters = {
        q: searchTerm || undefined,
        limit: 50
      }
      
      if (selectedCategory !== 'all') {
        filters.tags = [selectedCategory]
      }
      
      const result = await MarketplaceService.searchPackages(filters)
      setPackages(result.packages)
    } catch (error) {
      console.error('Failed to search packages:', error)
      toast.error('Failed to search MCP packages')
    } finally {
      setLoading(false)
    }
  }

  const handleViewDetails = async (pkg: MCPPackage) => {
    try {
      const details = await MarketplaceService.getPackageDetails(pkg.name)
      if (details) {
        setSelectedPackage(details)
        setShowDetails(true)
      }
    } catch (error) {
      console.error('Failed to load package details:', error)
      toast.error('Failed to load package details')
    }
  }

  const handleInstall = async (pkg: MCPPackage) => {
    if (!user) {
      navigate('/deploy') // Triggers login if not logged in
      return
    }

    setInstalling(pkg.id)
    try {
      const result = await MarketplaceService.installPackage({
        packageName: pkg.name,
        userId: user.id
      })

      if (result.success) {
        toast.success(`Successfully installed ${pkg.name}!`)
        
        // Store the installed package info for the installation guide
        setLastInstalledPackage({
          name: pkg.name,
          deploymentUrl: result.deploymentUrl,
          tools: selectedPackage?.tools || []
        })
        
        // Show installation guide
        setShowInstallGuide(true)
        
        // Close details modal if open
        setShowDetails(false)
      } else {
        toast.error(result.error || 'Installation failed')
      }
    } catch (error) {
      console.error('Installation failed:', error)
      toast.error('Installation failed')
    } finally {
      setInstalling(null)
    }
  }

  const getCategoryIcon = (tags: string[] = []) => {
    for (const tag of tags) {
      if (CATEGORY_ICONS[tag as keyof typeof CATEGORY_ICONS]) {
        return CATEGORY_ICONS[tag as keyof typeof CATEGORY_ICONS]
      }
    }
    return <Code className="w-6 h-6 text-indigo-400" />
  }

  const getStatusIcon = (deployments: any[] = []) => {
    const activeDeployment = deployments.find(d => d.status === 'active')
    if (activeDeployment) {
      return <CheckCircle className="w-4 h-4 text-green-400" />
    }
    return <AlertCircle className="w-4 h-4 text-yellow-400" />
  }

  const renderPackageCard = (pkg: MCPPackage, index: number) => (
    <Card
      key={pkg.id}
      className="bg-gray-900/50 border-gray-800 hover:shadow-2xl transition-all duration-500 hover:scale-105 hover:-translate-y-2 group relative overflow-hidden"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-indigo-500/20 to-pink-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <CardHeader className="relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getCategoryIcon(pkg.tags)}
            <div>
              <CardTitle className="text-white text-lg group-hover:scale-105 transition-all duration-300">
                {pkg.name}
              </CardTitle>
              <CardDescription className="text-gray-400 text-sm">
                {pkg.version && `v${pkg.version}`} • {pkg.downloads_count} downloads
              </CardDescription>
            </div>
          </div>
          {getStatusIcon([])} {/* TODO: Add deployments to package data */}
        </div>
      </CardHeader>
      
      <CardContent className="relative z-10">
        <p className="text-gray-300 mb-4 line-clamp-2">
          {pkg.description || 'No description available'}
        </p>

        <div className="flex flex-wrap gap-2 mb-4">
          {pkg.tags?.slice(0, 3).map(tag => (
            <Badge key={tag} variant="secondary" className="bg-indigo-900/50 text-indigo-300 border-indigo-800">
              {tag}
            </Badge>
          ))}
          {pkg.tags && pkg.tags.length > 3 && (
            <Badge variant="outline" className="text-gray-400">
              +{pkg.tags.length - 3}
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-400">
            {new Date(pkg.created_at).toLocaleDateString()}
          </div>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline" 
              className="bg-gray-800 hover:bg-gray-700 text-white border-gray-700"
              onClick={() => handleViewDetails(pkg)}
            >
              <ExternalLink className="w-4 h-4 mr-1" />
              Details
            </Button>
            <Button 
              size="sm" 
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={() => handleInstall(pkg)}
              disabled={installing === pkg.id}
            >
              {installing === pkg.id ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-1" />
              )}
              {installing === pkg.id ? 'Installing...' : 'Install'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  const categories = [
    'all', 'frameworks', 'apis', 'agents', 'tools', 'connectors', 'templates'
  ]

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <div className="pt-28 transition-all duration-1000">
        {/* Hero Section */}
        <section className="py-20 px-6 text-center relative z-10">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-6xl md:text-7xl font-bold text-white mb-6 animate-fade-in tracking-tight">
              MCP 
              <span className="text-indigo-400"> Explorer</span>
            </h1>
            <p className="text-xl text-white opacity-70 mb-8 animate-fade-in delay-200">
              Discover and install Model Context Protocol servers. Connect your AI to the world.
            </p>
            
            {/* Search and Filter */}
            <div 
              ref={searchBarRef}
              className="flex flex-col md:flex-row gap-4 max-w-2xl mx-auto mb-8 animate-fade-in delay-400 relative z-20"
            >
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder="Search MCP servers, tools, integrations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 py-3 text-lg border-2 bg-gray-900/80 backdrop-blur-sm border-gray-700 focus:border-indigo-500 text-white"
                />
              </div>
              <Button variant="outline" className="px-6 py-3 border-2 bg-gray-900/80 backdrop-blur-sm border-gray-700 text-white font-bold tracking-tight">
                <Filter className="w-5 h-5 mr-2" />
                Filter
              </Button>
            </div>

            {/* Category Pills */}
            <div className="flex flex-wrap justify-center gap-3 mb-12 animate-fade-in delay-600 relative z-20">
              {categories.map((category, index) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  onClick={() => setSelectedCategory(category)}
                  className={`capitalize px-4 py-2 transition-all duration-300 hover:scale-105 animate-fade-in font-bold tracking-tight bg-gray-900/80 backdrop-blur-sm ${
                    selectedCategory === category 
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      : 'bg-gray-800 hover:bg-gray-700 text-white border-gray-700'
                  }`}
                  style={{ animationDelay: `${800 + index * 100}ms` }}
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>
        </section>

        {/* Main Content */}
        <section className="px-6 pb-20 relative z-10">
          <div className="max-w-7xl mx-auto">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-gray-900/80 backdrop-blur-sm border-gray-700">
                <TabsTrigger value="discover" className="text-white data-[state=active]:bg-indigo-600">
                  <Globe className="w-4 h-4 mr-2" />
                  Discover
                </TabsTrigger>
                <TabsTrigger value="popular" className="text-white data-[state=active]:bg-indigo-600">
                  <Heart className="w-4 h-4 mr-2" />
                  Popular
                </TabsTrigger>
                <TabsTrigger value="trending" className="text-white data-[state=active]:bg-indigo-600">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Trending
                </TabsTrigger>
              </TabsList>

              <TabsContent value="discover" className="mt-8">
                {loading ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                    <span className="ml-2 text-white">Loading MCP packages...</span>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {packages.map((pkg, index) => renderPackageCard(pkg, index))}
                  </div>
                )}

                {!loading && packages.length === 0 && (
                  <div className="text-center py-20">
                    <div className="text-2xl font-bold text-white mb-4">
                      No MCP packages found
                    </div>
                    <p className="text-white opacity-60">
                      Try adjusting your search terms or category filters
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="popular" className="mt-8">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {popularPackages.map((pkg, index) => renderPackageCard(pkg, index))}
                </div>
              </TabsContent>

              <TabsContent value="trending" className="mt-8">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {trendingPackages.map((pkg, index) => renderPackageCard(pkg, index))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </section>
      </div>

      {/* Package Details Modal */}
      {showDetails && selectedPackage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-gray-900 rounded-xl shadow-2xl w-full max-w-2xl p-8 relative border border-gray-700">
            <button 
              onClick={() => setShowDetails(false)} 
              className="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl"
            >
              ×
            </button>
            
            <div className="flex gap-6 items-center mb-6">
              {getCategoryIcon(selectedPackage.tags)}
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">{selectedPackage.name}</h2>
                <div className="flex gap-2 flex-wrap mb-1">
                  {selectedPackage.tags?.map(tag => (
                    <Badge key={tag} variant="secondary" className="bg-indigo-900/50 text-indigo-300 border-indigo-800">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm text-gray-400">4.5 avg</span>
                  <span className="text-sm text-gray-400">• {selectedPackage.downloads_count} downloads</span>
                </div>
              </div>
            </div>
            
            <p className="text-white/80 mb-4">{selectedPackage.description}</p>
            
            {selectedPackage.tools && selectedPackage.tools.length > 0 && (
              <div className="mb-4">
                <h3 className="text-white font-semibold mb-2">Available Tools:</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedPackage.tools.map(tool => (
                    <Badge key={tool.id} variant="outline" className="bg-gray-800 text-white/60 border-gray-700">
                      {tool.tool_name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {selectedPackage.deployments && selectedPackage.deployments.length > 0 && (
              <div className="mb-4">
                <h3 className="text-white font-semibold mb-2">Deployments:</h3>
                <div className="space-y-2">
                  {selectedPackage.deployments.map(deployment => (
                    <div key={deployment.id} className="flex items-center justify-between p-2 bg-gray-800 rounded">
                      <span className="text-white/80 text-sm">{deployment.deployment_url}</span>
                      <Badge 
                        variant={deployment.status === 'active' ? 'default' : 'destructive'}
                        className={deployment.status === 'active' ? 'bg-green-600' : 'bg-red-600'}
                      >
                        {deployment.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between items-center mt-6">
              <div className="text-xs text-gray-400">
                <div>Created: {new Date(selectedPackage.created_at).toLocaleDateString()}</div>
                <div>Updated: {new Date(selectedPackage.updated_at).toLocaleDateString()}</div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    setShowDetails(false)
                    setShowInstallGuide(true)
                    setLastInstalledPackage({
                      name: selectedPackage.name,
                      deploymentUrl: selectedPackage.deployments?.[0]?.deployment_url,
                      tools: selectedPackage.tools
                    })
                  }}
                  className="bg-gray-700 hover:bg-gray-600 text-white font-semibold px-4 py-2 rounded-lg shadow-lg transition"
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  Installation Guide
                </Button>
                <Button
                  onClick={() => handleInstall(selectedPackage)}
                  disabled={installing === selectedPackage.id}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-2 rounded-lg shadow-lg transition"
                >
                  {installing === selectedPackage.id ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Installing...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Install & Deploy
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Installation Guide Modal */}
      {showInstallGuide && lastInstalledPackage && (
        <InstallationGuide
          packageName={lastInstalledPackage.name}
          deploymentUrl={lastInstalledPackage.deploymentUrl}
          tools={lastInstalledPackage.tools}
          onClose={() => setShowInstallGuide(false)}
        />
      )}
    </div>
  )
} 