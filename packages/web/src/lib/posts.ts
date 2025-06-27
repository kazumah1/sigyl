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

// Import all markdown files from the posts directory
const postModules = import.meta.glob('../posts/*.md', { eager: true });

export function getSortedPostsData(): BlogPost[] {
  const posts: BlogPost[] = [];

  try {
    // Process each markdown file
    for (const path in postModules) {
      try {
        const file = postModules[path] as any;
        const slug = path.replace('../posts/', '').replace('.md', '');
        
        // Skip template file
        if (slug === '_template') continue;
        
        // Use file as string if possible, otherwise use file.default
        const rawContent = typeof file === 'string' ? file : file.default;
        
        // Parse frontmatter and content
        const { data, content } = matter(rawContent);
        
        // Create post object with fallbacks
        const post: BlogPost = {
          slug,
          title: data.title || 'Untitled Post',
          excerpt: data.excerpt || 'No excerpt available',
          author: data.author || 'SIGYL Team',
          date: data.date || new Date().toISOString().split('T')[0],
          readTime: data.readTime || getReadingTime(content),
          category: data.category || 'general',
          tags: data.tags || [],
          featured: data.featured || false,
          content,
        };

        posts.push(post);
      } catch (error) {
        console.error(`Error processing post ${path}:`, error);
        // Continue processing other posts even if one fails
      }
    }

    // Sort by date (newest first)
    return posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (error) {
    console.error('Error loading blog posts:', error);
    return [];
  }
}

export function getPostData(slug: string): BlogPost | null {
  try {
    const post = getSortedPostsData().find(post => post.slug === slug);
    return post || null;
  } catch (error) {
    console.error(`Error getting post data for slug: ${slug}`, error);
    return null;
  }
}

export function getPostsByCategory(category: string): BlogPost[] {
  return getSortedPostsData().filter(post => post.category === category);
}

export function getPostsByTag(tag: string): BlogPost[] {
  return getSortedPostsData().filter(post => post.tags.includes(tag));
}

export function getFeaturedPosts(): BlogPost[] {
  return getSortedPostsData().filter(post => post.featured);
}

export function getAllCategories(): string[] {
  const categories = getSortedPostsData().map(post => post.category);
  return [...new Set(categories)];
}

export function getAllTags(): string[] {
  const tags = getSortedPostsData().flatMap(post => post.tags);
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