import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  Calendar, 
  Clock, 
  User, 
  ArrowRight, 
  TrendingUp,
  Zap,
  Shield,
  Globe,
  Code,
  Lightbulb
} from 'lucide-react';
import { Link } from 'react-router-dom';
import PageHeader from '@/components/PageHeader';
import { 
  getSortedPostsData, 
  getFeaturedPosts, 
  getAllCategories, 
  getAllTags,
  formatDate 
} from '@/lib/posts';

const Blog = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [posts, setPosts] = useState<any[]>([]);
  const [featuredPosts, setFeaturedPosts] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>(['all']);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const allPosts = getSortedPostsData();
      const featured = getFeaturedPosts();
      const cats = getAllCategories();
      const allTags = ['all', ...getAllTags()];

      setPosts(allPosts);
      setFeaturedPosts(featured);
      setCategories(cats);
      setTags(allTags);
      setLoading(false);
    } catch (err) {
      console.error('Error loading blog data:', err);
      setError('Failed to load blog posts');
      setLoading(false);
    }
  }, []);

  // Get icon for category
  const getCategoryIcon = (category: string) => {
    const iconMap: { [key: string]: any } = {
      'tutorials': Code,
      'case-studies': TrendingUp,
      'technical': Shield,
      'community': Globe,
      'announcements': Zap,
    };
    return iconMap[category] || Lightbulb;
  };

  // Filter posts based on search and filters
  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         post.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = selectedTag === 'all' || post.tags.includes(selectedTag);
    const matchesCategory = selectedCategory === 'all' || post.category === selectedCategory;
    return matchesSearch && matchesTag && matchesCategory;
  });

  // Get featured post (first featured post)
  const featuredPost = featuredPosts[0];

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white relative overflow-hidden">
        <div className="liquid-glass-blob blob-1" />
        <div className="liquid-glass-blob blob-2" />
        <div className="liquid-glass-blob blob-3" />
        <PageHeader />
        <div className="container mx-auto px-6 py-8 mt-16 relative z-10">
          <div className="text-center py-12">
            <div className="text-gray-400 text-lg">Loading blog posts...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white relative overflow-hidden">
        <div className="liquid-glass-blob blob-1" />
        <div className="liquid-glass-blob blob-2" />
        <div className="liquid-glass-blob blob-3" />
        <PageHeader />
        <div className="container mx-auto px-6 py-8 mt-16 relative z-10">
          <div className="text-center py-12">
            <div className="text-red-400 text-lg mb-4">{error}</div>
            <Button
              onClick={() => window.location.reload()}
              className="btn-modern"
            >
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Liquid Glass Blobs */}
      <div className="liquid-glass-blob blob-1" />
      <div className="liquid-glass-blob blob-2" />
      <div className="liquid-glass-blob blob-3" />
      <PageHeader />
      
      <div className="container mx-auto px-6 py-8 mt-16 relative z-10">
        {/* Header */}
        <div className="mb-12 text-left flex flex-col gap-3 sm:gap-5 max-w-2xl">
          <h1 className="hero-heading text-3xl sm:text-4xl lg:text-5xl xl:text-6xl mb-0" style={{lineHeight:'1.08', letterSpacing:'-0.02em'}}>SIGYL Blog</h1>
          <p className="hero-subheading text-lg sm:text-xl text-gray-300 font-normal w-full" style={{fontFamily:'Space Grotesk, Inter, system-ui, sans-serif', lineHeight:'1.5', marginTop:'0.25em'}}>
            Insights, tutorials, and updates from the SIGYL team and community. Stay up to date with the latest in MCP technology.
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-12">
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-gray-900/50 border-gray-700 text-white h-12"
              />
            </div>
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                selectedCategory === 'all'
                  ? 'bg-white text-black'
                  : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50 hover:text-white'
              }`}
            >
              All Categories
            </button>
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                  selectedCategory === category
                    ? 'bg-white text-black'
                    : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50 hover:text-white'
                }`}
              >
                {category.replace('-', ' ')}
              </button>
            ))}
          </div>

          {/* Tag Filter */}
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                  selectedTag === tag
                    ? 'bg-white text-black'
                    : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50 hover:text-white'
                }`}
              >
                {tag.replace('-', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Featured Post */}
        {featuredPost && (
          <div className="mb-12">
            <Link
              to={`/blog/${featuredPost.slug}`}
              className="block group focus:outline-none focus:ring-2 focus:ring-white rounded-xl"
              aria-label={`Read blog post: ${featuredPost.title}`}
              style={{ textDecoration: 'none' }}
            >
              <Card className="card-modern overflow-hidden hover-lift group-hover:shadow-lg group-focus:shadow-lg cursor-pointer">
                <div className="grid grid-cols-1 lg:grid-cols-2">
                  <div className="lg:order-2">
                    <div className="h-64 lg:h-full bg-gradient-to-br from-gray-800 to-gray-900" />
                  </div>
                  <div className="lg:order-1 p-6 lg:p-8">
                    <div className="flex items-center gap-2 mb-4">
                      <Badge className="text-xs bg-white/10 text-white">
                        Featured
                      </Badge>
                      <Badge className="text-xs bg-gray-500/20 text-gray-300">
                        {featuredPost.category}
                      </Badge>
                    </div>
                    <CardTitle className="text-2xl lg:text-3xl font-bold mb-3 text-white group-hover:text-white transition-colors" style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}>
                      {featuredPost.title}
                    </CardTitle>
                    <CardDescription className="text-gray-300 text-lg mb-4">
                      {featuredPost.excerpt}
                    </CardDescription>
                    <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(featuredPost.date)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {featuredPost.readTime || '5 min read'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <User className="w-4 h-4" />
                      {featuredPost.author || 'SIGYL Team'}
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          </div>
        )}

        {/* Blog Posts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPosts.map((post) => {
            const CategoryIcon = getCategoryIcon(post.category);
            return (
              <Link
                key={post.slug}
                to={`/blog/${post.slug}`}
                className="block group focus:outline-none focus:ring-2 focus:ring-white rounded-xl"
                aria-label={`Read blog post: ${post.title}`}
                style={{ textDecoration: 'none' }}
              >
                <Card className="card-modern hover-lift group-hover:shadow-lg group-focus:shadow-lg cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-center gap-2 mb-3">
                      <CategoryIcon className="w-4 h-4 text-gray-400" />
                      <Badge className="text-xs bg-gray-500/20 text-gray-300">
                        {post.category}
                      </Badge>
                    </div>
                    <CardTitle className="text-xl font-bold text-white group-hover:text-white transition-colors" style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}>
                      {post.title}
                    </CardTitle>
                    <CardDescription className="text-gray-300">
                      {post.excerpt}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="mt-auto">
                    <div className="flex items-center justify-between text-sm text-gray-400">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(post.date)}
                      </div>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredPosts.length === 0 && (
          <div className="text-center py-16">
            <div className="text-gray-400 text-lg mb-4">No posts found matching your criteria.</div>
            <Button
              onClick={() => {
                setSearchQuery('');
                setSelectedTag('all');
                setSelectedCategory('all');
              }}
              className="btn-modern"
            >
              Clear Filters
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Blog;
