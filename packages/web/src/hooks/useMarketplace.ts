import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

// Remove direct supabase import and replace with API calls
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface MCPPackage {
  id: string;
  name: string;
  slug: string;
  description: string;
  version: string;
  author_id: string;
  tags: string[];
  downloads_count: number;
  rating: number;
  category: string;
  verified: boolean;
  logo_url: string;
  screenshots: string[];
  tools: (string | { name: string; description?: string })[];
  last_updated: string;
  created_at: string;
  source_api_url?: string;
  author?: {
    username: string;
    full_name: string;
  };
}

export interface PackageRating {
  id: string;
  package_id: string;
  user_id: string;
  rating: number;
}

// Helper function to get auth token
const getAuthToken = (): string | null => {
  // Try to get Supabase session token first
  const supabaseSession = JSON.parse(localStorage.getItem('sb-zcudhsyvfrlfgqqhjrqv-auth-token') || '{}');
  if (supabaseSession?.access_token) {
    return supabaseSession.access_token;
  }

  // Fallback to GitHub token
  const githubToken = localStorage.getItem('github_app_token');
  if (githubToken && githubToken !== 'db_restored_token') {
    return githubToken;
  }

  return null;
};

// Helper function to make API calls
const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const token = getAuthToken();
  
  const response = await fetch(`${API_BASE_URL}/api/v1${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API call failed: ${response.statusText}`);
  }

  return response.json();
};

export const useMarketplace = () => {
  const [packages, setPackages] = useState<MCPPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchPackages = async () => {
    try {
      setLoading(true);
      
      const result = await apiCall('/packages/marketplace/all');
      
      // Transform the data to match our interface
      const transformedPackages: MCPPackage[] = (result.data || []).map((pkg: any) => ({
        id: pkg.id,
        name: pkg.name,
        slug: pkg.name?.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'unknown',
        description: pkg.description || '',
        version: pkg.version || '1.0.0',
        author_id: pkg.author_id || '',
        tags: pkg.tags || [],
        downloads_count: pkg.downloads_count || 0,
        rating: Number(pkg.rating) || 0,
        category: pkg.category || 'general',
        verified: pkg.verified || false,
        logo_url: '/favicon.png',
        screenshots: Array.isArray(pkg.screenshots) ? pkg.screenshots as string[] : [],
        tools: Array.isArray(pkg.tools) ? pkg.tools as string[] : [],
        last_updated: pkg.last_updated || pkg.created_at || new Date().toISOString(),
        created_at: pkg.created_at || new Date().toISOString(),
        source_api_url: pkg.source_api_url,
        author: pkg.author
      }));

      setPackages(transformedPackages);
    } catch (err) {
      console.error('Error fetching packages:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch packages');
    } finally {
      setLoading(false);
    }
  };

  const ratePackage = async (packageId: string, rating: number) => {
    if (!user) throw new Error('Must be logged in to rate packages');

    try {
      await apiCall(`/packages/${packageId}/rate`, {
        method: 'POST',
        body: JSON.stringify({ rating }),
      });
      
      // Refresh packages to get updated rating
      await fetchPackages();
    } catch (err) {
      console.error('Error rating package:', err);
      throw err;
    }
  };

  const downloadPackage = async (packageId: string) => {
    try {
      await apiCall(`/packages/${packageId}/download`, {
        method: 'POST',
      });
      
      // Refresh packages to get updated count
      await fetchPackages();
    } catch (err) {
      console.error('Error downloading package:', err);
      throw err;
    }
  };

  const getUserRating = async (packageId: string) => {
    if (!user) return null;

    try {
      const result = await apiCall(`/packages/${packageId}/rating`);
      return result.data?.rating || null;
    } catch (err) {
      console.error('Error fetching user rating:', err);
      return null;
    }
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  return {
    packages,
    loading,
    error,
    ratePackage,
    downloadPackage,
    getUserRating,
    refreshPackages: fetchPackages
  };
};
