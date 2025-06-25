import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InteractiveBackground } from "@/components/InteractiveBackground";
import { OpeningAnimation } from "@/components/OpeningAnimation";
import { UserProfile } from "@/components/UserProfile";
import { AgentHighway } from "@/components/AgentHighway";
import { Search, Filter, Star, Download, ExternalLink, Zap, Database, Globe, Mail, MessageSquare, ShoppingCart, Code } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { MarketplaceModal } from '@/components/MarketplaceModal';
import { useAuth } from '@/contexts/AuthContext';

const PLACEHOLDER_MCPS = [
  {
    name: 'Supabase MCP Server',
    description: 'Connect your Supabase projects to AI assistants. Manage tables, fetch configs, and query data seamlessly.',
    logo: '/logos/supabase.svg',
    tags: ['database', 'AI', 'integration'],
    tools: ['Supabase', 'AI', 'Cursor', 'Claude'],
    screenshots: ['/screenshots/supabase-mcp-dark.png'],
    author: 'Supabase Community',
    lastUpdated: '2025-04-01',
    rating: 4.8,
    userRating: 0,
  },
  // ... more placeholder MCPs ...
];

const Marketplace = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const searchBarRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedMCP, setSelectedMCP] = useState(null);
  const [mcps, setMcps] = useState(PLACEHOLDER_MCPS);

  // Dark theme matching the landing page
  const currentTheme = {
    bg: 'bg-black',
    text: 'text-white',
    accent: 'text-indigo-400',
    card: 'bg-gray-900/50 border-gray-800',
    solid: 'text-indigo-400',
    gradient: 'from-indigo-500 to-pink-500',
    button: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    buttonSecondary: 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-700'
  };

  const categories = [
    "all", "frameworks", "apis", "agents", "tools", "connectors", "templates"
  ];

  const marketplaceItems = [
    {
      id: 1,
      name: "OpenAI Connector",
      description: "Seamless integration with OpenAI's API for chat completions and embeddings",
      category: "apis",
      rating: 4.8,
      downloads: 12400,
      author: "SIGYL Team",
      icon: <Zap className="w-8 h-8 text-indigo-400" />,
      tags: ["openai", "api", "chat", "embeddings"]
    },
    {
      id: 2,
      name: "Database Agent",
      description: "Intelligent database querying and management agent with natural language interface",
      category: "agents",
      rating: 4.6,
      downloads: 8900,
      author: "DB Solutions",
      icon: <Database className="w-8 h-8 text-indigo-400" />,
      tags: ["database", "sql", "query", "management"]
    },
    {
      id: 3,
      name: "Web Scraper Framework",
      description: "Robust web scraping framework with rate limiting and proxy support",
      category: "frameworks",
      rating: 4.7,
      downloads: 15200,
      author: "Web Tools Inc",
      icon: <Globe className="w-8 h-8 text-indigo-400" />,
      tags: ["scraping", "web", "automation", "data"]
    },
    {
      id: 4,
      name: "Email Automation",
      description: "Automated email campaigns and customer communication system",
      category: "tools",
      rating: 4.9,
      downloads: 6700,
      author: "Comm Solutions",
      icon: <Mail className="w-8 h-8 text-indigo-400" />,
      tags: ["email", "automation", "marketing", "communication"]
    },
    {
      id: 5,
      name: "Slack Integration",
      description: "Connect your agents to Slack workspaces for team collaboration",
      category: "connectors",
      rating: 4.5,
      downloads: 9800,
      author: "Team Tools",
      icon: <MessageSquare className="w-8 h-8 text-indigo-400" />,
      tags: ["slack", "integration", "collaboration", "team"]
    },
    {
      id: 6,
      name: "E-commerce Template",
      description: "Complete e-commerce agent template with inventory and order management",
      category: "templates",
      rating: 4.8,
      downloads: 4300,
      author: "Commerce Pro",
      icon: <ShoppingCart className="w-8 h-8 text-indigo-400" />,
      tags: ["ecommerce", "template", "inventory", "orders"]
    }
  ];

  const filteredItems = marketplaceItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleView = (item) => {
    // Convert marketplace item to MCP format for the modal
    const mcpData = {
      name: item.name,
      description: item.description,
      logo: '', // No logo in marketplace items
      tags: item.tags,
      tools: [item.author], // Use author as tool
      screenshots: [], // No screenshots in marketplace items
      author: item.author,
      lastUpdated: '2025-01-01', // Default date
      rating: item.rating,
      userRating: 0,
    };
    setSelectedMCP(mcpData);
    setModalOpen(true);
  };

  const handleInstall = (item) => {
    if (!user) {
      navigate('/deploy'); // Triggers login if not logged in
      return;
    }
    navigate(`/deploy?mcp=${encodeURIComponent(item.name)}`);
  };

  const handleRate = (rating: number) => {
    // TODO: Store user rating in Supabase (future)
    if (selectedMCP) {
      setSelectedMCP({ ...selectedMCP, userRating: rating });
    }
  };

  return (
    <div className={`min-h-screen ${currentTheme.bg} relative overflow-hidden transition-all duration-700 ease-out`}>
      <InteractiveBackground theme={theme} onThemeChange={setTheme} />
      <AgentHighway searchBarRef={searchBarRef} />
      
      {!isLoaded && <OpeningAnimation variant="page" onComplete={() => setIsLoaded(true)} />}
      
      {/* Header - Matching landing page exactly */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-black/80 backdrop-blur-md border-b border-white/10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div 
              className="text-2xl font-bold tracking-tight text-white cursor-pointer hover:text-indigo-400 transition-colors"
              onClick={() => navigate('/')}
            >
              SIGYL
            </div>
            <nav className="flex items-center space-x-6">
              <button 
                onClick={() => navigate('/marketplace')}
                className="text-white font-bold tracking-tight hover:text-indigo-400 transition-colors"
              >
                Marketplace
              </button>
              <button 
                onClick={() => navigate('/docs')}
                className="text-white font-bold tracking-tight hover:text-indigo-400 transition-colors"
              >
                Docs
              </button>
              <button 
                onClick={() => navigate('/blog')}
                className="text-white font-bold tracking-tight hover:text-indigo-400 transition-colors"
              >
                Blog
              </button>
              <Button 
                onClick={() => navigate('/deploy')}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold tracking-tight"
              >
                Deploy
              </Button>
              <UserProfile />
            </nav>
          </div>
        </div>
      </header>

      <div className={`pt-28 transition-all duration-1000 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
        {/* Hero Section */}
        <section className="py-20 px-6 text-center relative z-10">
          <div className="max-w-4xl mx-auto">
            <h1 className={`text-6xl md:text-7xl font-bold ${currentTheme.text} mb-6 animate-fade-in tracking-tight`}>
              Agent 
              <span className={`${currentTheme.accent}`}> Highway</span>
            </h1>
            <p className={`text-xl ${currentTheme.text} opacity-70 mb-8 animate-fade-in delay-200`}>
              Navigate the network of intelligent agents. Every connection leads to discovery.
            </p>
            
            {/* Search and Filter */}
            <div 
              ref={searchBarRef}
              className={`flex flex-col md:flex-row gap-4 max-w-2xl mx-auto mb-8 animate-fade-in delay-400 relative z-20`}
            >
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder="Search tools, agents, integrations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`pl-10 py-3 text-lg border-2 ${currentTheme.buttonSecondary} focus:border-indigo-500 bg-gray-900/80 backdrop-blur-sm`}
                />
              </div>
              <Button variant="outline" className={`px-6 py-3 border-2 ${currentTheme.buttonSecondary} font-bold tracking-tight bg-gray-900/80 backdrop-blur-sm`}>
                <Filter className="w-5 h-5 mr-2" />
                Filter
              </Button>
            </div>

            {/* Category Pills */}
            <div className={`flex flex-wrap justify-center gap-3 mb-12 animate-fade-in delay-600 relative z-20`}>
              {categories.map((category, index) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  onClick={() => setSelectedCategory(category)}
                  className={`capitalize px-4 py-2 transition-all duration-300 hover:scale-105 animate-fade-in font-bold tracking-tight bg-gray-900/80 backdrop-blur-sm ${
                    selectedCategory === category 
                      ? `${currentTheme.button}`
                      : `${currentTheme.buttonSecondary}`
                  }`}
                  style={{ animationDelay: `${800 + index * 100}ms` }}
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>
        </section>

        {/* Marketplace Grid */}
        <section className="px-6 pb-20 relative z-10">
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredItems.map((item, index) => (
                <div
                  key={item.id}
                  className={`${currentTheme.card} backdrop-blur-sm rounded-2xl p-6 border hover:shadow-2xl transition-all duration-500 hover:scale-105 hover:-translate-y-2 group animate-fade-in relative overflow-hidden`}
                  style={{ animationDelay: `${1000 + index * 150}ms` }}
                >
                  {/* Glowing border effect */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-indigo-500/20 to-pink-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {item.icon}
                        <div>
                          <h3 className={`font-bold tracking-tight ${currentTheme.text} text-lg group-hover:scale-105 transition-all duration-300`}>
                            {item.name}
                          </h3>
                          <p className={`text-sm ${currentTheme.text} opacity-50`}>
                            by {item.author}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className={`text-sm ${currentTheme.text}`}>{item.rating}</span>
                      </div>
                    </div>

                    <p className={`${currentTheme.text} opacity-60 mb-6 leading-relaxed`}>
                      {item.description}
                    </p>

                    <div className="flex flex-wrap gap-2 mb-6">
                      {item.tags.map(tag => (
                        <span 
                          key={tag}
                          className={`px-3 py-1 bg-indigo-900/50 text-indigo-300 text-xs rounded-full font-bold tracking-tight border border-indigo-800`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className={`text-sm ${currentTheme.text} opacity-50`}>
                        {item.downloads.toLocaleString()} downloads
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className={`${currentTheme.buttonSecondary} font-bold tracking-tight`}
                          onClick={() => handleView(item)}
                        >
                          <ExternalLink className="w-4 h-4 mr-1" />
                          View
                        </Button>
                        <Button 
                          size="sm" 
                          className={`${currentTheme.button} font-bold tracking-tight`}
                          onClick={() => handleInstall(item)}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Install
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredItems.length === 0 && (
              <div className="text-center py-20">
                <div className={`text-2xl font-bold ${currentTheme.text} mb-4`}>
                  No agents found
                </div>
                <p className={`${currentTheme.text} opacity-60`}>
                  Try adjusting your search terms or category filters
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
      <MarketplaceModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        mcp={selectedMCP}
        onInstall={() => selectedMCP && handleInstall(selectedMCP)}
        onRate={handleRate}
      />
    </div>
  );
};

export default Marketplace;
