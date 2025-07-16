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
  frameworks: <Code className="w-5 h-5 text-gray-400" />,
  apis: <Zap className="w-5 h-5 text-gray-400" />,
  agents: <Globe className="w-5 h-5 text-gray-400" />,
  tools: <Database className="w-5 h-5 text-gray-400" />,
  connectors: <MessageSquare className="w-5 h-5 text-gray-400" />,
  templates: <ShoppingCart className="w-5 h-5 text-gray-400" />,
  database: <Database className="w-5 h-5 text-gray-400" />,
  ai: <Zap className="w-5 h-5 text-gray-400" />,
  integration: <Mail className="w-5 h-5 text-gray-400" />
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
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(12)
  const [totalPackages, setTotalPackages] = useState(0)
  
  const { user } = useAuth()
  const navigate = useNavigate()
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load packages based on search, filters, and pagination
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      searchPackages();
    }, 800); // Increased debounce to 800ms

    return () => {
      clearTimeout(debounceTimer);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [searchTerm, selectedCategory, currentPage, pageSize]);

  // Reset to first page when search term or category changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory]);

  // Load popular and trending packages (not paginated)
  useEffect(() => {
    const loadPopularTrending = async () => {
      try {
        const [popular, trending] = await Promise.all([
          MarketplaceService.getPopularPackages(6),
          MarketplaceService.getTrendingPackages(6)
        ]);
        setPopularPackages(popular);
        setTrendingPackages(trending);
      } catch (error: any) {
        // ignore errors here
      }
    };
    loadPopularTrending();
  }, []);

  const searchPackages = async () => {
    setLoading(true);
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;
    try {
      const filters: MarketplaceFilters = {
        q: searchTerm || undefined,
        limit: pageSize,
        offset: (currentPage - 1) * pageSize
      };
      if (selectedCategory !== 'all') {
        filters.tags = [selectedCategory];
      }
      const result = await MarketplaceService.searchPackages(filters, { signal: controller.signal });
      setPackages(result.packages);
      setTotalPackages(result.total || 0);
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Failed to search MCP packages', error);
        toast.error('Failed to search MCP packages');
      }
      setPackages([]);
      setTotalPackages(0);
    } finally {
      setLoading(false);
      setIsLoaded(true);
    }
  };

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

  const getCategoryIcon = (tags?: string[] | null) => {
    // Ensure tags is an array and handle null/undefined cases
    const tagArray = Array.isArray(tags) ? tags : []
    
    for (const tag of tagArray) {
      if (CATEGORY_ICONS[tag as keyof typeof CATEGORY_ICONS]) {
        return CATEGORY_ICONS[tag as keyof typeof CATEGORY_ICONS]
      }
    }
    return <Code className="w-5 h-5 text-gray-400" />
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
      className="bg-white/10 border border-white/10 hover:border-white/20 transition-all duration-300 cursor-pointer group flex flex-col justify-between h-full"
      style={{ animationDelay: `${index * 100}ms` }}
      onClick={() => navigate(`/mcp/${pkg.id}`)}
    >
      <div className="flex-1 flex flex-col">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={pkg.logo_url ? pkg.logo_url : "/favicon.png"}
                alt={pkg.name}
                className="w-14 h-14 rounded-lg bg-neutral-800 object-contain border border-white/10 mr-3"
              />
              <div>
                <CardTitle 
                  className="text-white group-hover:text-gray-200 transition-colors truncate whitespace-nowrap overflow-hidden max-w-[180px]"
                  style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}
                  title={pkg.name}
                >
                  {pkg.name}
                </CardTitle>
                {/* <CardDescription className="text-gray-400 text-sm" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                  {pkg.version && `v${pkg.version}`} • {pkg.downloads_count} downloads
                </CardDescription> */}
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0 flex-1 flex flex-col">
          <p className="text-white mb-4 line-clamp-2" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
            {pkg.description || 'No description available'}
          </p>

          <div className="flex flex-wrap gap-2 mb-4 min-h-[32px]">
            {Array.isArray(pkg.tags) && pkg.tags.slice(0, 3).map(tag => (
              <Badge key={tag} variant="secondary" className="bg-white/10 text-white border-white/20 hover:bg-white/10 hover:text-white transition-all duration-200">
                {tag}
              </Badge>
            ))}
            {Array.isArray(pkg.tags) && pkg.tags.length > 3 && (
              <Badge variant="outline" className="text-gray-400 border-white/20">
                +{pkg.tags.length - 3}
              </Badge>
            )}
          </div>
          <div className="flex-grow" />
        </CardContent>
      </div>
      <div className="flex items-center justify-between px-6 pb-4 pt-0 mt-auto">
        <div className="text-sm text-gray-400" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
          {new Date(pkg.created_at).toLocaleDateString()}
        </div>
        <div className="text-sm text-gray-400 group-hover:text-white transition-colors" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
          View details →
        </div>
      </div>
    </Card>
  )

  const categories = [
    'all', 'frameworks', 'apis', 'agents', 'tools', 'connectors', 'templates'
  ]

  return (
    <div className="min-h-screen bg-[#0a0a0a] relative">
      <div className="pt-16">
        {/* Hero Section */}
        <section className="py-10 px-6 text-center relative z-10">
          <div className="max-w-4xl mx-auto">
            <h1 
              className="text-5xl md:text-6xl font-bold text-white mb-6"
              style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}
            >
              MCP Registry
            </h1>
            <p className="text-xl text-gray-400 mb-12" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
              Discover and deploy Model Context Protocol servers. Connect your AI to the world.
            </p>
            
            {/* Search and Filter */}
            <div 
              ref={searchBarRef}
              className="flex flex-col md:flex-row gap-4 max-w-2xl mx-auto mb-10"
            >
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white w-5 h-5" />
                <Input
                  placeholder="Search MCP servers, tools, integrations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 py-3 text-lg border border-white/10 bg-black/60 focus:border-white/30 text-white placeholder:text-white/50"
                  style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                />
              </div>
              <Button 
                variant="outline" 
                className="px-6 py-3 border border-white/10 bg-black/60 text-white hover:bg-white/5 hover:border-white/20 hover:text-white"
                style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}
              >
                <Filter className="w-5 h-5 mr-2" />
                Filter
              </Button>
            </div>

            {/* Category Pills */}
            <div className="flex flex-wrap justify-center gap-3">
              {categories.map((category, index) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  onClick={() => setSelectedCategory(category)}
                  className={`capitalize px-4 py-2 transition-all duration-300 ${
                    selectedCategory === category 
                      ? 'bg-white text-black hover:bg-gray-100 border-white/20'
                      : 'bg-black/60 border border-white/10 text-white hover:bg-white/5 hover:border-white/20 hover:text-white'
                  }`}
                  style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>
        </section>

        {/* Main Content */}
        <section className="px-6 pb-10">
          <div className="max-w-7xl mx-auto">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="flex w-full bg-black/60 border border-white/10 rounded-xl mb-6 h-12 items-stretch justify-around">
                <TabsTrigger 
                  value="discover" 
                  className="flex-1 h-full flex items-center justify-center px-6 data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:font-bold text-gray-400 font-semibold rounded-xl transition-all"
                  style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}
                >
                  <Globe className="w-4 h-4 mr-2" />
                  Discover
                </TabsTrigger>
                <TabsTrigger 
                  value="popular" 
                  className="flex-1 h-full flex items-center justify-center px-6 data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:font-bold text-gray-400 font-semibold rounded-xl transition-all"
                  style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}
                >
                  <Heart className="w-4 h-4 mr-2" />
                  Popular
                </TabsTrigger>
                <TabsTrigger 
                  value="trending" 
                  className="flex-1 h-full flex items-center justify-center px-6 data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:font-bold text-gray-400 font-semibold rounded-xl transition-all"
                  style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Trending
                </TabsTrigger>
              </TabsList>

              <TabsContent value="discover" className="mt-8">
                {loading ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-white" />
                    <span className="ml-2 text-white" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                      Loading MCP packages...
                    </span>
                  </div>
                ) : (
                  <>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {packages.map((pkg, index) => renderPackageCard(pkg, index))}
                  </div>
                  {/* Pagination Controls */}
                  <div className="flex flex-col items-center mt-8">
                    <div className="text-gray-400 mb-2" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                      Showing {packages.length > 0 ? ((currentPage - 1) * pageSize + 1) : 0}
                      -{(currentPage - 1) * pageSize + packages.length} of {totalPackages} results
                    </div>
                    {(() => {
                      const totalPages = Math.max(1, Math.ceil(totalPackages / pageSize));
                      if (totalPages === 1) {
                        // Only one page, show just the current page number (or nothing)
                        return (
                          <Button
                            variant="default"
                            className="px-3 py-1 bg-white text-black"
                            disabled
                            style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}
                          >
                            1
                          </Button>
                        );
                      }
                      return (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            className="px-3 py-1"
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}
                          >
                            Previous
                          </Button>
                          {/* Page numbers */}
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                            <Button
                              key={pageNum}
                              variant={currentPage === pageNum ? 'default' : 'outline'}
                              className={`px-3 py-1 ${currentPage === pageNum ? 'bg-white text-black' : ''}`}
                              onClick={() => setCurrentPage(pageNum)}
                              style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}
                            >
                              {pageNum}
                            </Button>
                          ))}
                          <Button
                            variant="outline"
                            className="px-3 py-1"
                            onClick={() => setCurrentPage((p) => p + 1)}
                            disabled={currentPage >= totalPages}
                            style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}
                          >
                            Next
                          </Button>
                        </div>
                      );
                    })()}
                  </div>
                  </>
                )}

                {!loading && packages.length === 0 && (
                  <div className="text-center py-20">
                    <div 
                      className="text-2xl font-bold text-white mb-4"
                      style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}
                    >
                      No MCP packages found
                    </div>
                    <p className="text-gray-400" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
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
          <div className="bg-black/60 rounded-2xl shadow-2xl w-full max-w-2xl p-8 relative border border-white/10">
            <button 
              onClick={() => setShowDetails(false)} 
              className="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl"
            >
              ×
            </button>
            
            <div className="flex gap-6 items-center mb-6">
              <img src="/favicon.png" alt={selectedPackage.name} className="w-14 h-14 rounded-lg bg-neutral-800 object-contain border border-white/10 mr-3" />
              <div>
                <h2 
                  className="text-2xl font-bold text-white mb-1"
                  style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}
                >
                  {selectedPackage.name}
                </h2>
                <div className="flex gap-2 flex-wrap mb-1">
                  {Array.isArray(selectedPackage.tags) && selectedPackage.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="bg-white/10 text-white border-white/20 hover:bg-white/10 hover:text-white transition-all duration-200">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm text-gray-400" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                    4.5 avg
                  </span>
                  <span className="text-sm text-gray-400" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                    • {selectedPackage.downloads_count} downloads
                  </span>
                </div>
              </div>
            </div>
            
            <p className="text-gray-300 mb-4" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
              {selectedPackage.description}
            </p>
            
            {selectedPackage.tools && selectedPackage.tools.length > 0 && (
              <div className="mb-4">
                <h3 
                  className="text-white font-semibold mb-2"
                  style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}
                >
                  Available Tools:
                </h3>
                <div className="flex flex-wrap gap-2">
                  {selectedPackage.tools.map(tool => (
                    <Badge key={tool.id} variant="outline" className="bg-white/5 text-gray-300 border-white/20">
                      {tool.tool_name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {selectedPackage.deployments && selectedPackage.deployments.length > 0 && (
              <div className="mb-4">
                <h3 
                  className="text-white font-semibold mb-2"
                  style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}
                >
                  Deployments:
                </h3>
                <div className="space-y-2">
                  {selectedPackage.deployments.map(deployment => (
                    <div key={deployment.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                      <span className="text-gray-300 text-sm" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                        {deployment.deployment_url}
                      </span>
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
              <div className="text-xs text-gray-400" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
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
                  className="bg-white/10 hover:bg-white/20 text-white border border-white/20"
                  style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  Installation Guide
                </Button>
                <Button
                  onClick={() => handleInstall(selectedPackage)}
                  disabled={installing === selectedPackage.id}
                  className="bg-white text-black hover:bg-gray-100"
                  style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}
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