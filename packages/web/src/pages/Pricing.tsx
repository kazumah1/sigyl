import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Star, Zap, Shield, Users, Globe, Settings, Headphones } from 'lucide-react';
import PageHeader from '@/components/PageHeader';

const Pricing = () => {
  const navigate = useNavigate();

  const handleFree = () => {
    navigate('/deploy');
  };

  const handleEnterprise = () => {
    navigate('/contact?reason=enterprise');
  };

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Liquid Glass Blobs */}
      <div className="liquid-glass-blob blob-1" />
      <div className="liquid-glass-blob blob-2" />
      <div className="liquid-glass-blob blob-3" />
      <PageHeader />
      <div className="container mx-auto px-6 py-8 mt-16 relative z-10">
        <div className="w-full max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="hero-heading text-3xl sm:text-4xl lg:text-5xl xl:text-6xl mb-4">Choose Your Plan</h1>
            <p className="hero-subheading text-lg sm:text-xl max-w-2xl mx-auto">
              Start with our free tier or unlock enterprise features for your team
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Free Tier */}
            <div className="card-modern p-10 flex flex-col items-center h-full min-h-[600px]">
              <div className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}>Free</div>
              <div className="text-gray-400 text-lg mb-2">Perfect for getting started</div>
              <div className="text-4xl font-bold text-white mb-2">$0</div>
              <div className="text-gray-400 mb-8">Forever</div>
              <ul className="space-y-3 mb-8 w-full text-left">
                <li className="flex items-center gap-3 text-gray-300"><span className="text-green-400">✔</span> 1 hosted MCP server</li>
                <li className="flex items-center gap-3 text-gray-300"><span className="text-green-400">✔</span> CLI access</li>
                <li className="flex items-center gap-3 text-gray-300"><span className="text-green-400">✔</span> SDK access</li>
                <li className="flex items-center gap-3 text-gray-300"><span className="text-green-400">✔</span> Marketplace access</li>
                <li className="flex items-center gap-3 text-gray-300"><span className="text-green-400">✔</span> Dashboard access</li>
                <li className="flex items-center gap-3 text-gray-300"><span className="text-green-400">✔</span> Standard security</li>
                <li className="flex items-center gap-3 text-gray-300"><span className="text-green-400">✔</span> Standard support</li>
              </ul>
              <div className="flex-grow" />
              <Button 
                onClick={handleFree}
                className="w-64 bg-white text-black font-semibold py-3 rounded-lg border border-white hover:bg-gray-100 hover:text-black transition-colors mt-2"
                style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif', fontSize: '1.08rem' }}
              >
                Get Started Free
              </Button>
            </div>

            {/* Enterprise Tier */}
            <div className="card-modern p-10 flex flex-col items-center h-full min-h-[600px]">
              <div className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}>Enterprise</div>
              <div className="text-gray-400 text-lg mb-2">For teams and organizations</div>
              <div className="text-4xl font-bold text-white mb-2">Custom</div>
              <div className="text-gray-400 mb-8">Contact sales</div>
              <ul className="space-y-3 mb-8 w-full text-left">
                <li className="flex items-center gap-3 text-gray-300"><span className="text-green-400">✔</span> <b>Everything in Free</b></li>
                <li className="flex items-center gap-3 text-gray-300"><span className="text-green-400">✔</span> Private Internal MCPs</li>
                <li className="flex items-center gap-3 text-gray-300"><span className="text-green-400">✔</span> Unlimited MCP servers</li>
                <li className="flex items-center gap-3 text-gray-300"><span className="text-green-400">✔</span> Advanced CLI & SDK features</li>
                <li className="flex items-center gap-3 text-gray-300"><span className="text-green-400">✔</span> Curated & exclusive marketplace</li>
                <li className="flex items-center gap-3 text-gray-300"><span className="text-green-400">✔</span> Custom integrations & automations</li>
                <li className="flex items-center gap-3 text-gray-300"><span className="text-green-400">✔</span> Enterprise-grade 24/7 support</li>
                <li className="flex items-center gap-3 text-gray-300"><span className="text-green-400">✔</span> Advanced analytics & monitoring</li>
                <li className="flex items-center gap-3 text-gray-300"><span className="text-green-400">✔</span> Enterprise security & compliance</li>
                <li className="flex items-center gap-3 text-gray-300"><span className="text-green-400">✔</span> Dedicated onboarding & migration</li>
              </ul>
              <div className="flex-grow" />
              <Button 
                onClick={handleEnterprise}
                className="w-64 bg-black text-white font-semibold py-3 rounded-lg border border-white hover:bg-gray-900 hover:text-white transition-colors mt-2"
                style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif', fontSize: '1.08rem' }}
              >
                Contact Enterprise Sales
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pricing; 