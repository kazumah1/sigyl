
import React, { useState } from 'react';
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
import PageHeader from '@/components/PageHeader';

const Blog = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('all');

  const tags = [
    'all', 'announcements', 'tutorials', 'case-studies', 'technical', 'community'
  ];

  const featuredPost = {
    id: '1',
    title: 'Introducing SIGYL 2.0: The Future of MCP Deployment',
    excerpt: 'Today we\'re excited to announce SIGYL 2.0, packed with new features including enhanced security, improved performance, and a completely redesigned developer experience.',
    author: 'SIGYL Team',
    date: '2024-01-20',
    readTime: '8 min read',
    category: 'announcements',
    image: '/lovable-uploads/af1b4422-333a-4173-86fe-9414947d2c59.png',
    tags: ['announcements', 'platform'],
    featured: true
  };

  const blogPosts = [
    {
      id: '2',
      title: 'Building Your First MCP Integration: A Complete Guide',
      excerpt: 'Learn how to create your first Model Context Protocol integration from scratch, including setup, configuration, and deployment best practices.',
      author: 'Sarah Chen',
      date: '2024-01-18',
      readTime: '12 min read',
      category: 'tutorials',
      tags: ['tutorials', 'beginner'],
      icon: Code
    },
    {
      id: '3',
      title: 'How TechCorp Scaled to 10M+ API Calls with SIGYL',
      excerpt: 'A deep dive into how TechCorp successfully migrated their legacy integration system to SIGYL and achieved 99.99% uptime.',
      author: 'Marcus Johnson',
      date: '2024-01-15',
      readTime: '6 min read',
      category: 'case-studies',
      tags: ['case-studies', 'scaling'],
      icon: TrendingUp
    },
    {
      id: '4',
      title: 'Security Best Practices for MCP Deployments',
      excerpt: 'Essential security considerations when deploying Model Context Protocol servers, including authentication, encryption, and monitoring.',
      author: 'Alex Rivera',
      date: '2024-01-12',
      readTime: '10 min read',
      category: 'technical',
      tags: ['security', 'technical'],
      icon: Shield
    },
    {
      id: '5',
      title: 'The Evolution of AI Integration Patterns',
      excerpt: 'Exploring how integration patterns have evolved with the rise of AI and what the Model Context Protocol means for the future.',
      author: 'Dr. Emily Watson',
      date: '2024-01-10',
      readTime: '15 min read',
      category: 'technical',
      tags: ['ai', 'patterns'],
      icon: Lightbulb
    },
    {
      id: '6',
      title: 'Community Spotlight: Amazing MCP Projects',
      excerpt: 'Highlighting incredible projects built by our community, from innovative integrations to creative use cases.',
      author: 'Community Team',
      date: '2024-01-08',
      readTime: '5 min read',
      category: 'community',
      tags: ['community', 'showcase'],
      icon: Globe
    },
    {
      id: '7',
      title: 'Performance Optimization Tips for MCP Servers',
      excerpt: 'Advanced techniques to optimize your MCP server performance, reduce latency, and improve resource utilization.',
      author: 'David Kim',
      date: '2024-01-05',
      readTime: '11 min read',
      category: 'technical',
      tags: ['performance', 'optimization'],
      icon: Zap
    }
  ];

  const filteredPosts = blogPosts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         post.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = selectedTag === 'all' || post.tags.includes(selectedTag);
    return matchesSearch && matchesTag;
  });

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
                    {new Date(featuredPost.date).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {featuredPost.readTime}
                  </span>
                </div>
                <Button className="btn-primary">
                  Read More
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Blog Posts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {filteredPosts.map((post) => {
            const IconComponent = post.icon;
            return (
              <Card key={post.id} className="bg-gray-900/50 border-gray-800 hover:bg-gray-800/50 transition-all duration-300 hover-lift">
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
                      {new Date(post.date).toLocaleDateString()}
                    </span>
                    <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white p-0">
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

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
        <div className="text-center">
          <Button className="btn-secondary">
            Load More Articles
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Blog;
