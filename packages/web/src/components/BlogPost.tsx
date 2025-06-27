import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  Clock, 
  User, 
  ArrowLeft,
  Share2,
  Bookmark,
  MessageCircle
} from 'lucide-react';
import { BlogPost as BlogPostType, formatDate } from '@/lib/posts';
import { useNavigate } from 'react-router-dom';

interface BlogPostProps {
  post: BlogPostType;
}

const BlogPost: React.FC<BlogPostProps> = ({ post }) => {
  const navigate = useNavigate();

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: post.title,
        text: post.excerpt,
        url: window.location.href,
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="container mx-auto px-6 py-8 mt-16">
        {/* Back Button */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/blog')}
            className="text-gray-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Blog
          </Button>
        </div>

        {/* Article Header */}
        <article className="max-w-4xl mx-auto">
          {/* Category Badge */}
          <div className="mb-6">
            <Badge className="bg-blue-500/20 text-blue-400 capitalize">
              {post.category.replace('-', ' ')}
            </Badge>
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-bold mb-6 gradient-text leading-tight">
            {post.title}
          </h1>

          {/* Excerpt */}
          <p className="text-xl text-gray-400 mb-8 leading-relaxed">
            {post.excerpt}
          </p>

          {/* Meta Information */}
          <div className="flex flex-wrap items-center gap-6 text-sm text-gray-400 mb-8 pb-8 border-b border-gray-800">
            <span className="flex items-center gap-2">
              <User className="w-4 h-4" />
              {post.author}
            </span>
            <span className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {formatDate(post.date)}
            </span>
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              {post.readTime}
            </span>
          </div>

          {/* Tags */}
          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-8">
              {post.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="bg-gray-800/50 text-gray-300 hover:bg-gray-700/50 cursor-pointer"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 mb-12">
            <Button
              variant="outline"
              onClick={handleShare}
              className="border-gray-700 text-gray-300 hover:bg-gray-800/50"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
            <Button
              variant="outline"
              className="border-gray-700 text-gray-300 hover:bg-gray-800/50"
            >
              <Bookmark className="w-4 h-4 mr-2" />
              Bookmark
            </Button>
            <Button
              variant="outline"
              className="border-gray-700 text-gray-300 hover:bg-gray-800/50"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Comment
            </Button>
          </div>

          {/* Article Content */}
          <div className="prose prose-invert prose-lg max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
              components={{
                // Custom styling for different elements
                h1: ({ children }) => (
                  <h1 className="text-3xl font-bold text-white mb-6 mt-12 first:mt-0">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-2xl font-bold text-white mb-4 mt-10">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-xl font-bold text-white mb-3 mt-8">
                    {children}
                  </h3>
                ),
                p: ({ children }) => (
                  <p className="text-gray-300 leading-relaxed mb-6">
                    {children}
                  </p>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc list-inside text-gray-300 mb-6 space-y-2">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal list-inside text-gray-300 mb-6 space-y-2">
                    {children}
                  </ol>
                ),
                li: ({ children }) => (
                  <li className="text-gray-300">
                    {children}
                  </li>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-blue-500 pl-6 py-4 my-6 bg-gray-900/50 rounded-r-lg">
                    <p className="text-gray-300 italic">
                      {children}
                    </p>
                  </blockquote>
                ),
                code: ({ children, className }) => {
                  const isInline = !className;
                  if (isInline) {
                    return (
                      <code className="bg-gray-800 text-blue-400 px-2 py-1 rounded text-sm">
                        {children}
                      </code>
                    );
                  }
                  return (
                    <code className={className}>
                      {children}
                    </code>
                  );
                },
                pre: ({ children }) => (
                  <pre className="bg-gray-900 border border-gray-700 rounded-lg p-4 mb-6 overflow-x-auto">
                    {children}
                  </pre>
                ),
                a: ({ href, children }) => (
                  <a
                    href={href}
                    className="text-blue-400 hover:text-blue-300 underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {children}
                  </a>
                ),
                strong: ({ children }) => (
                  <strong className="font-bold text-white">
                    {children}
                  </strong>
                ),
                em: ({ children }) => (
                  <em className="italic text-gray-200">
                    {children}
                  </em>
                ),
                hr: () => (
                  <hr className="border-gray-700 my-8" />
                ),
                table: ({ children }) => (
                  <div className="overflow-x-auto mb-6">
                    <table className="min-w-full border border-gray-700 rounded-lg">
                      {children}
                    </table>
                  </div>
                ),
                th: ({ children }) => (
                  <th className="border border-gray-700 px-4 py-2 text-left bg-gray-800 text-white">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="border border-gray-700 px-4 py-2 text-gray-300">
                    {children}
                  </td>
                ),
              }}
            >
              {post.content}
            </ReactMarkdown>
          </div>

          {/* Article Footer */}
          <div className="mt-12 pt-8 border-t border-gray-800">
            <div className="flex flex-wrap items-center justify-between">
              <div className="flex items-center gap-4 text-sm text-gray-400">
                <span>Written by {post.author}</span>
                <span>•</span>
                <span>{formatDate(post.date)}</span>
              </div>
              
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleShare}
                  className="border-gray-700 text-gray-300 hover:bg-gray-800/50"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share Article
                </Button>
              </div>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
};

export default BlogPost; 