import React, { useState, useEffect } from 'react';

interface MarketplaceModalProps {
  open: boolean;
  onClose: () => void;
  mcp: {
    name: string;
    description: string;
    logo: string;
    tags: string[];
    tools: string[];
    screenshots: string[];
    author: string;
    lastUpdated: string;
    rating: number;
    userRating?: number;
  };
  onInstall: () => void;
  onRate: (rating: number) => void;
}

export const MarketplaceModal = ({ open, onClose, mcp, onInstall, onRate }: MarketplaceModalProps) => {
  const [hovered, setHovered] = useState<number | null>(null);
  const [userRating, setUserRating] = useState<number>(() => {
    if (!mcp) return 0;
    const stored = localStorage.getItem(`mcp-rating-${mcp.name}`);
    return stored ? parseInt(stored, 10) : 0;
  });
  const [avgRating, setAvgRating] = useState<number>(mcp?.rating || 0);

  useEffect(() => {
    if (!mcp) return;
    const stored = localStorage.getItem(`mcp-rating-${mcp.name}`);
    setUserRating(stored ? parseInt(stored, 10) : 0);
    setAvgRating(mcp.rating || 0);
  }, [mcp]);

  const handleRate = (rating: number) => {
    setUserRating(rating);
    localStorage.setItem(`mcp-rating-${mcp.name}`, rating.toString());
    // For now, just update avg locally
    setAvgRating((prev) => (prev * 4 + rating) / 5);
    onRate(rating);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-neutral-900 rounded-xl shadow-2xl w-full max-w-2xl p-8 relative border border-white/10">
        <button onClick={onClose} className="absolute top-4 right-4 text-white/60 hover:text-white text-2xl">×</button>
        <div className="flex gap-6 items-center mb-6">
          <img src={mcp.logo} alt={mcp.name} className="w-20 h-20 rounded-lg bg-neutral-800 object-contain border border-white/10" />
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">{mcp.name}</h2>
            <div className="flex gap-2 flex-wrap mb-1">
              {mcp.tags.map(tag => (
                <span key={tag} className="bg-indigo-700/30 text-indigo-300 px-2 py-0.5 rounded text-xs font-medium">{tag}</span>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-2">
              {[1,2,3,4,5].map((star) => (
                <span
                  key={star}
                  onClick={() => handleRate(star)}
                  style={{ cursor: 'pointer', color: star <= userRating ? '#facc15' : '#374151', fontSize: 24 }}
                  title={`Rate ${star} star${star > 1 ? 's' : ''}`}
                >
                  ★
                </span>
              ))}
              <span className="ml-2 text-sm text-gray-400">{avgRating.toFixed(1)} avg</span>
              {userRating > 0 && <span className="ml-2 text-xs text-indigo-400">Your rating: {userRating}</span>}
            </div>
          </div>
        </div>
        <p className="text-white/80 mb-4 min-h-[48px]">{mcp.description}</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {mcp.tools.map(tool => (
            <span key={tool} className="bg-neutral-800 text-white/60 px-2 py-0.5 rounded text-xs">{tool}</span>
          ))}
        </div>
        <div className="flex gap-4 mb-4 overflow-x-auto">
          {mcp.screenshots.length > 0 ? mcp.screenshots.map((src, i) => (
            <img key={i} src={src} alt="screenshot" className="w-32 h-20 object-cover rounded border border-white/10" />
          )) : <div className="text-white/30 italic">No screenshots yet</div>}
        </div>
        <div className="flex justify-between items-center mt-6">
          <div className="text-xs text-white/40">
            <div>By <span className="text-white/70">{mcp.author}</span></div>
            <div>Last updated: {mcp.lastUpdated}</div>
          </div>
          <button
            onClick={onInstall}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 py-2 rounded-lg shadow-lg transition"
          >Install & Deploy</button>
        </div>
      </div>
    </div>
  );
}; 