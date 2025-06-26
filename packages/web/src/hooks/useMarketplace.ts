
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface MCPPackage {
  id: string;
  name: string;
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

export const useMarketplace = () => {
  const [packages, setPackages] = useState<MCPPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchPackages = async () => {
    try {
      setLoading(true);
      
      // First fetch packages
      const { data: packagesData, error: packagesError } = await supabase
        .from('mcp_packages')
        .select('*')
        .order('downloads_count', { ascending: false });

      if (packagesError) throw packagesError;

      // Then fetch author profiles separately
      const authorIds = [...new Set((packagesData || []).map(pkg => pkg.author_id).filter(Boolean))];
      
      let profilesData: any[] = [];
      if (authorIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, full_name')
          .in('id', authorIds);
        
        if (!profilesError) {
          profilesData = profiles || [];
        }
      }

      // Transform the data to match our interface
      const transformedPackages: MCPPackage[] = (packagesData || []).map(pkg => {
        const authorProfile = profilesData.find(profile => profile.id === pkg.author_id);
        
        return {
          id: pkg.id,
          name: pkg.name,
          description: pkg.description || '',
          version: pkg.version || '1.0.0',
          author_id: pkg.author_id || '',
          tags: pkg.tags || [],
          downloads_count: pkg.downloads_count || 0,
          rating: Number(pkg.rating) || 0,
          category: pkg.category || 'general',
          verified: pkg.verified || false,
          logo_url: pkg.logo_url || '/placeholder.svg',
          screenshots: Array.isArray(pkg.screenshots) ? pkg.screenshots as string[] : [],
          tools: Array.isArray(pkg.tools) ? pkg.tools as string[] : [],
          last_updated: pkg.last_updated || pkg.created_at || new Date().toISOString(),
          created_at: pkg.created_at || new Date().toISOString(),
          author: authorProfile ? {
            username: authorProfile.username || 'Unknown',
            full_name: authorProfile.full_name || 'Unknown'
          } : undefined
        };
      });

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
      const { error } = await supabase
        .from('mcp_package_ratings')
        .upsert({
          package_id: packageId,
          user_id: user.id,
          rating
        });

      if (error) throw error;
      
      // Refresh packages to get updated rating
      await fetchPackages();
    } catch (err) {
      console.error('Error rating package:', err);
      throw err;
    }
  };

  const downloadPackage = async (packageId: string) => {
    try {
      // Log the download
      const { error } = await supabase
        .from('mcp_package_downloads')
        .insert({
          package_id: packageId,
          user_id: user?.id || null,
          ip_address: null, // Could be populated by edge function
          user_agent: navigator.userAgent
        });

      if (error) throw error;

      // Update downloads count
      await supabase.rpc('increment_downloads', { package_uuid: packageId });
      
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
      const { data, error } = await supabase
        .from('mcp_package_ratings')
        .select('rating')
        .eq('package_id', packageId)
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data?.rating || null;
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
