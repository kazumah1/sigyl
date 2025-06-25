import { useState, useEffect } from "react";
import { InteractiveBackground } from "@/components/InteractiveBackground";
import { OpeningAnimation } from "@/components/OpeningAnimation";
import { UserProfile } from "@/components/UserProfile";
import { ArrowRight, Calendar, User, Tag } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Blog = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const navigate = useNavigate();

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

  const posts = [
    {
      id: 1,
      title: "The Future of MCP: Building Intelligent Agent Networks",
      excerpt: "Exploring how Model Context Protocol is revolutionizing the way we build and deploy AI agents at scale.",
      author: "Alex Chen",
      date: "Dec 15, 2024",
      tags: ["MCP", "AI", "Architecture"],
      readTime: "8 min read",
      featured: true
    },
    {
      id: 2,
      title: "Deployment Strategies for Production MCP Servers",
      excerpt: "Best practices for scaling your MCP infrastructure from prototype to production.",
      author: "Sarah Kim",
      date: "Dec 12, 2024",
      tags: ["Deployment", "DevOps", "Performance"],
      readTime: "12 min read"
    },
    {
      id: 3,
      title: "Building Your First MCP Integration",
      excerpt: "A step-by-step guide to creating custom integrations that extend your agent capabilities.",
      author: "Mike Rodriguez",
      date: "Dec 10, 2024",
      tags: ["Tutorial", "Integration", "Development"],
      readTime: "15 min read"
    }
  ];

  const allTags = Array.from(new Set(posts.flatMap(post => post.tags)));

  const filteredPosts = selectedTag 
    ? posts.filter(post => post.tags.includes(selectedTag))
    : posts;

  return (
    <div className={`min-h-screen ${currentTheme.bg} relative overflow-hidden transition-all duration-700 ease-out`}>
      <InteractiveBackground theme={theme} onThemeChange={setTheme} />
      
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

      <div className={`pt-28 pb-16 transition-all duration-1000 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
        <div className="max-w-6xl mx-auto px-6">
          {/* Hero Section */}
          <div className="text-center mb-20 animate-fade-in">
            <h1 className={`text-5xl md:text-6xl font-bold ${currentTheme.text} mb-6 tracking-tight`}>
              Insights & 
              <span className={`${currentTheme.accent}`}> Updates</span>
            </h1>
            <p className={`text-xl ${currentTheme.text} opacity-70 max-w-2xl mx-auto leading-relaxed`}>
              Deep dives into MCP architecture, deployment strategies, and the future of intelligent agent systems.
            </p>
          </div>

          {/* Tags Filter */}
          <div className="flex flex-wrap justify-center gap-3 mb-12 animate-fade-in delay-200">
            <button
              onClick={() => setSelectedTag(null)}
              className={`px-4 py-2 rounded-full text-sm font-bold tracking-tight transition-all duration-300 hover:scale-105 ${
                !selectedTag 
                  ? `${currentTheme.button} border-2`
                  : `${currentTheme.buttonSecondary} border-2`
              }`}
            >
              All Posts
            </button>
            {allTags.map((tag, index) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={`px-4 py-2 rounded-full text-sm font-bold tracking-tight transition-all duration-300 hover:scale-105 animate-fade-in ${
                  selectedTag === tag
                    ? `${currentTheme.button} border-2`
                    : `${currentTheme.buttonSecondary} border-2`
                }`}
                style={{ animationDelay: `${300 + index * 100}ms` }}
              >
                <Tag className="w-3 h-3 mr-1 inline" />
                {tag}
              </button>
            ))}
          </div>

          {/* Blog Posts Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredPosts.map((post, index) => (
              <article 
                key={post.id} 
                className={`${currentTheme.card} backdrop-blur-sm rounded-2xl p-6 border hover:shadow-2xl transition-all duration-500 hover:scale-105 hover:-translate-y-2 group animate-fade-in ${
                  post.featured ? 'md:col-span-2 lg:col-span-2' : ''
                }`}
                style={{ animationDelay: `${500 + index * 150}ms` }}
              >
                <div className={`flex items-center gap-4 mb-4 text-sm ${currentTheme.text} opacity-50`}>
                  <div className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    {post.author}
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {post.date}
                  </div>
                  <span>{post.readTime}</span>
                </div>

                <h2 className={`font-bold tracking-tight ${currentTheme.text} mb-3 group-hover:scale-105 transition-all duration-300 ${
                  post.featured ? 'text-2xl' : 'text-xl'
                }`}>
                  {post.title}
                </h2>

                <p className={`${currentTheme.text} opacity-60 mb-6 leading-relaxed`}>
                  {post.excerpt}
                </p>

                <div className="flex flex-wrap gap-2 mb-4">
                  {post.tags.map(tag => (
                    <span 
                      key={tag}
                      className={`px-3 py-1 bg-indigo-900/50 text-indigo-300 text-xs rounded-full font-bold tracking-tight border border-indigo-800`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <button className={`flex items-center ${currentTheme.accent} font-bold tracking-tight hover:opacity-70 transition-all duration-300 group-hover:translate-x-1`}>
                  Read More
                  <ArrowRight className="ml-2 w-4 h-4 transition-transform duration-300" />
                </button>
              </article>
            ))}
          </div>

          {/* CTA Section */}
          <div className="text-center mt-20 animate-fade-in delay-1000">
            <div className={`${currentTheme.card} backdrop-blur-sm rounded-2xl p-12 border max-w-4xl mx-auto`}>
              <h2 className={`text-3xl font-bold ${currentTheme.text} mb-4 tracking-tight`}>
                Stay Updated with 
                <span className={`${currentTheme.accent}`}> SIGYL</span>
              </h2>
              <p className={`${currentTheme.text} opacity-70 mb-8 max-w-2xl mx-auto`}>
                Get the latest insights on MCP deployment, AI agent development, and industry trends delivered to your inbox.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <input 
                  type="email" 
                  placeholder="Enter your email" 
                  className={`px-6 py-3 rounded-lg ${currentTheme.buttonSecondary} border-2 focus:outline-none focus:border-indigo-500 min-w-[300px]`}
                />
                <button className={`px-8 py-3 rounded-lg ${currentTheme.button} font-bold tracking-tight transition-all duration-300 hover:scale-105`}>
                  Subscribe
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Blog;
