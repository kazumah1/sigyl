import React, { useRef } from 'react';
import PageHeader from '@/components/PageHeader';
import { MCPExplorer } from '@/components/MCPExplorer';

const Marketplace = () => {
  const searchBarRef = useRef<HTMLDivElement>(null);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <PageHeader />
      
      <div className="container mx-auto px-6 py-8 mt-16">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-5xl font-bold mb-4 text-white">MCP Marketplace</h1>
          <p className="text-xl text-gray-400 max-w-3xl">
            Discover and deploy pre-built MCP servers from our community. 
            Get started in minutes with battle-tested integrations.
          </p>
        </div>

        {/* MCP Explorer Component */}
        <div ref={searchBarRef}>
          <MCPExplorer searchBarRef={searchBarRef} />
        </div>
      </div>
    </div>
  );
};

export default Marketplace;
