import matter from 'gray-matter';
import { format } from 'date-fns';

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  author: string;
  date: string;
  readTime: string;
  category: string;
  tags: string[];
  featured?: boolean;
  content: string;
  contentHtml?: string;
}

// Static blog post array (replace with your own content as needed)
const staticPosts: BlogPost[] = [
  {
    slug: 'security-best-practices',
    title: 'Security Best Practices for MCP Deployments',
    excerpt: 'Essential security considerations when deploying Model Context Protocol servers, including authentication, encryption, and monitoring.',
    author: 'Alex Rivera',
    date: '2024-01-12',
    readTime: '10 min read',
    category: 'technical',
    tags: ['security', 'technical'],
    featured: true,
    content: `# Security Best Practices for MCP Deployments\n\nSecurity is paramount when deploying Model Context Protocol (MCP) servers, especially when they handle sensitive data or provide access to critical systems. This guide covers essential security practices to keep your MCP deployments safe and compliant.\n\n... (rest of your content here) ...`,
  },
];

export function getSortedPostsData(): BlogPost[] {
  // Return the static array, sorted by date (newest first)
  return staticPosts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getPostData(slug: string): BlogPost | null {
  return staticPosts.find(post => post.slug === slug) || null;
}

export function getPostsByCategory(category: string): BlogPost[] {
  return staticPosts.filter(post => post.category === category);
}

export function getPostsByTag(tag: string): BlogPost[] {
  return staticPosts.filter(post => post.tags.includes(tag));
}

export function getFeaturedPosts(): BlogPost[] {
  return staticPosts.filter(post => post.featured);
}

export function getAllCategories(): string[] {
  const categories = staticPosts.map(post => post.category);
  return [...new Set(categories)];
}

export function getAllTags(): string[] {
  const tags = staticPosts.flatMap(post => post.tags);
  return [...new Set(tags)];
}

export function formatDate(dateString: string): string {
  try {
    return format(new Date(dateString), 'MMMM d, yyyy');
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
}

export function getReadingTime(content: string): string {
  const wordsPerMinute = 200;
  const words = content.split(/\s+/).length;
  const minutes = Math.ceil(words / wordsPerMinute);
  return `${minutes} min read`;
} 