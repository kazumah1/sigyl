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
      <div className="min-h-screen bg-[#0a0a0a] text-white">
        <PageHeader />
        <div className="container mx-auto px-6 py-8 mt-16">
          <div className="text-center py-12">
            <div className="text-gray-400 text-lg">Loading blog posts...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white">
        <PageHeader />
        <div className="container mx-auto px-6 py-8 mt-16">
          <div className="text-center py-12">
            <div className="text-red-400 text-lg mb-4">{error}</div>
            <Button
              onClick={() => window.location.reload()}
              className="btn-primary"
            >
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <PageHeader />
      
      <div className="container mx-auto px-6 py-8 mt-16">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-5xl font-bold mb-4 gradient-text">SIGYL Blog</h1>
          <p className="text-xl text-gray-400 max-w-3xl">
            Insights, tutorials, and updates from the SIGYL team and community. 
            Stay up to date with the latest in MCP technology.
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
            <Card className="bg-gray-900/50 border-gray-800 overflow-hidden hover:bg-gray-800/50 transition-all duration-300 hover-lift">
              <div className="grid grid-cols-1 lg:grid-cols-2">
                <div className="lg:order-2">
                  <div className="h-64 lg:h-full bg-gradient-to-br from-gray-800 to-gray-900" />
                </div>
                <div className="p-8 lg:order-1">
                  <Badge className="bg-blue-500/20 text-blue-400 mb-4">Featured</Badge>
                  <CardTitle className="text-2xl lg:text-3xl font-bold text-white mb-4">
                    {featuredPost.title}
                  </CardTitle>
                  <CardDescription className="text-gray-400 text-lg mb-6">
                    {featuredPost.excerpt}
                  </CardDescription>
                  <div className="flex items-center gap-4 text-sm text-gray-400 mb-6">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {featuredPost.author}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(featuredPost.date)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {featuredPost.readTime}
                    </span>
                  </div>
                  <Link to={`/blog/${featuredPost.slug}`}>
                    <Button className="btn-primary">
                      Read More
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Blog Posts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {filteredPosts.map((post) => {
            const IconComponent = getCategoryIcon(post.category);
            return (
              <Card key={post.slug} className="bg-gray-900/50 border-gray-800 hover:bg-gray-800/50 transition-all duration-300 hover-lift">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-white/10 rounded-lg">
                      <IconComponent className="w-5 h-5 text-white" />
                    </div>
                    <Badge className="bg-gray-700/50 text-gray-300 text-xs capitalize">
                      {post.category.replace('-', ' ')}
                    </Badge>
                  </div>
                  <CardTitle className="text-white text-lg leading-tight mb-3">
                    {post.title}
                  </CardTitle>
                  <CardDescription className="text-gray-400 text-sm">
                    {post.excerpt}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {post.author}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {post.readTime}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      {formatDate(post.date)}
                    </span>
                    <Link to={`/blog/${post.slug}`}>
                      <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white p-0">
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* No Results */}
        {filteredPosts.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-lg mb-4">
              No articles found matching your criteria.
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery('');
                setSelectedTag('all');
                setSelectedCategory('all');
              }}
              className="border-gray-700 text-gray-300 hover:bg-gray-800/50"
            >
              Clear Filters
            </Button>
          </div>
        )}

        {/* Newsletter Signup */}
        <div className="mb-12">
          <div className="card-modern p-8 text-center max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold mb-4">Stay Updated</h3>
            <p className="text-gray-400 mb-6">
              Get the latest SIGYL news, tutorials, and insights delivered to your inbox.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <Input
                placeholder="Enter your email"
                className="bg-gray-800/50 border-gray-700 text-white"
              />
              <Button className="btn-primary">
                Subscribe
              </Button>
            </div>
          </div>
        </div>

        {/* Load More */}
        {filteredPosts.length > 0 && (
          <div className="text-center">
            <Button className="btn-secondary">
              Load More Articles
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Blog;
