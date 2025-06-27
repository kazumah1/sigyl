import React from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { getPostData } from '@/lib/posts';
import BlogPost from '@/components/BlogPost';
import PageHeader from '@/components/PageHeader';

const BlogPostPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();

  if (!slug) {
    return <Navigate to="/blog" replace />;
  }

  const post = getPostData(slug);

  if (!post) {
    return <Navigate to="/blog" replace />;
  }

  return (
    <>
      <PageHeader />
      <BlogPost post={post} />
    </>
  );
};

export default BlogPostPage; 