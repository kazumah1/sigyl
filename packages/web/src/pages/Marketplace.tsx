import React, { useRef } from 'react';
import PageHeader from '@/components/PageHeader';
import { MCPExplorer } from '@/components/MCPExplorer';

const Marketplace = () => {
  const searchBarRef = useRef<HTMLDivElement>(null);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <PageHeader />
      
      <div className="container mx-auto px-6 py-8 mt-16">
        {/* MCP Explorer Component */}
        <div ref={searchBarRef}>
          <MCPExplorer searchBarRef={searchBarRef} />
        </div>
      </div>
    </div>
  );
};

export default Marketplace;
