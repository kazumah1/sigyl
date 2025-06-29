import React, { useRef } from 'react';
import PageHeader from '@/components/PageHeader';
import { MCPExplorer } from '@/components/MCPExplorer';
import Footer from '@/components/Footer';

const Marketplace = () => {
  const searchBarRef = useRef<HTMLDivElement>(null);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <PageHeader />
      
      <div className="flex-1">
        {/* MCP Explorer Component */}
        <div ref={searchBarRef}>
          <MCPExplorer searchBarRef={searchBarRef} />
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default Marketplace;
