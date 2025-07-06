
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, Download, Calendar, User, Package, ExternalLink, ArrowRight } from 'lucide-react';
import { MCPPackage, useMarketplace } from '@/hooks/useMarketplace';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface PackageModalProps {
  package: MCPPackage | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PackageModal: React.FC<PackageModalProps> = ({ package: pkg, isOpen, onClose }) => {
  const [userRating, setUserRating] = useState<number | null>(null);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const { ratePackage, downloadPackage, getUserRating } = useMarketplace();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (pkg && user) {
      getUserRating(pkg.id).then(setUserRating);
    }
  }, [pkg, user, getUserRating]);

  const handleRate = async (rating: number) => {
    if (!pkg || !user) {
      toast.error('Please log in to rate packages');
      return;
    }

    try {
      await ratePackage(pkg.id, rating);
      setUserRating(rating);
      toast.success(`Rated ${pkg.name} ${rating} stars`);
    } catch (error) {
      toast.error('Failed to rate package');
    }
  };

  const handleDownload = async () => {
    if (!pkg) return;

    setIsDownloading(true);
    try {
      await downloadPackage(pkg.id);
      toast.success(`${pkg.name} downloaded successfully!`);
    } catch (error) {
      toast.error('Failed to download package');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleLearnMore = () => {
    if (pkg) {
      onClose();
      navigate(`/registry/package/${pkg.id}`);
    }
  };

  if (!pkg) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-gray-900/95 border-gray-800 text-white">
        <DialogHeader>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/10 rounded-lg">
              <Package className="w-8 h-8 text-white" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold text-white">{pkg.name}</DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-gray-400">by {pkg.author?.username || 'Unknown'}</span>
                {pkg.verified && (
                  <Badge className="bg-green-500/20 text-green-400 text-xs">
                    Verified
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Rating */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => handleRate(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(null)}
                  className="transition-colors"
                  disabled={!user}
                >
                  <Star
                    className={`w-5 h-5 ${
                      star <= (hoveredRating || userRating || 0)
                        ? 'fill-yellow-400 text-yellow-400'
                        : star <= pkg.rating
                        ? 'fill-yellow-400/50 text-yellow-400/50'
                        : 'text-gray-600'
                    }`}
                  />
                </button>
              ))}
            </div>
            <span className="text-sm text-gray-400">
              {pkg.rating.toFixed(1)} average
              {userRating && <span className="ml-2 text-blue-400">Your rating: {userRating}</span>}
            </span>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Description</h3>
            <p className="text-gray-300 leading-relaxed line-clamp-3">{pkg.description}</p>
          </div>

          {/* Tags */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {pkg.tags.slice(0, 6).map((tag) => (
                <Badge key={tag} variant="outline" className="text-gray-400 border-gray-600">
                  {tag}
                </Badge>
              ))}
              {pkg.tags.length > 6 && (
                <Badge variant="outline" className="text-gray-400 border-gray-600">
                  +{pkg.tags.length - 6} more
                </Badge>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2 text-gray-400">
              <Download className="w-4 h-4" />
              <span>{pkg.downloads_count.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <Package className="w-4 h-4" />
              <span>v{pkg.version}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <Calendar className="w-4 h-4" />
              <span>{new Date(pkg.last_updated).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <User className="w-4 h-4" />
              <span>{pkg.author?.username || 'Unknown'}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-800">
            <Button
              onClick={handleDownload}
              disabled={isDownloading}
              className="flex-1 bg-white hover:bg-gray-100 text-black font-semibold"
            >
              {isDownloading ? 'Installing...' : 'Quick Install'}
            </Button>
            <Button
              onClick={handleLearnMore}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              Learn More
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
