import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { UserProfile } from "@/components/UserProfile";
import { useNavigate } from "react-router-dom";
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Menu, X } from 'lucide-react';

const HEADER_HEIGHT = 64; // px

const PageHeader = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  // Add admin session check
  const adminSession = (() => {
    try {
      const adminData = localStorage.getItem('admin_session');
      return adminData ? JSON.parse(adminData) : null;
    } catch {
      return null;
    }
  })();

  // Hide nav bar on landing page until 1 second has passed
  const [showNav, setShowNav] = useState(window.location.pathname !== '/');
  useEffect(() => {
    if (window.location.pathname !== '/') {
      setShowNav(true);
      return;
    }
    const timer = setTimeout(() => setShowNav(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  // Mobile menu state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Navigation links
  const navLinks = [
    { label: 'Dashboard', show: !!(user || adminSession), onClick: () => navigate('/dashboard') },
    { label: 'Marketplace', show: true, onClick: () => navigate('/marketplace') },
    { label: 'Docs', show: true, onClick: () => window.open('https://docs.sigyl.dev', '_blank') },
    { label: 'Pricing', show: true, onClick: () => navigate('/pricing') },
    // { label: 'Blog', show: true, onClick: () => navigate('/blog') },
  ];

  // Prevent background scroll when menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-40 bg-black/80 backdrop-blur-md border-b border-white/10 transition-opacity duration-700 ${showNav ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        style={{ height: HEADER_HEIGHT }}
      >
        <div className="container mx-auto px-6 py-4" style={{ height: HEADER_HEIGHT }}>
          <div className="flex items-center justify-between h-full">
            <div className="flex items-center space-x-4">
              <div 
                className="cursor-pointer flex items-center" 
                onClick={() => navigate('/')}
              >
                <img src="/favicon.png" alt="SIGYL Logo" className="w-10 h-10 rounded-full object-cover shadow-sm" style={{background:'#18181b'}} />
              </div>
              <div 
                className="text-2xl font-bold tracking-tight text-white cursor-pointer hover:text-gray-300 transition-colors"
                onClick={() => navigate('/')}
              >
                SIGYL
              </div>
            </div>
            {isMobile ? (
              <button
                className="text-white p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-white"
                onClick={() => setMobileMenuOpen(v => !v)}
                aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              >
                {mobileMenuOpen ? <X className="w-7 h-7" /> : <Menu className="w-7 h-7" />}
              </button>
            ) : (
              <nav className="flex items-center space-x-8">
                {navLinks.filter(l => l.show).map(link => (
                  <button 
                    key={link.label}
                    onClick={link.onClick}
                    className="text-gray-300 hover:text-white font-medium transition-colors"
                  >
                    {link.label}
                  </button>
                ))}
                <Button 
                  onClick={() => navigate('/deploy')}
                  className="btn-modern-inverted hover:bg-transparent hover:text-white"
                >
                  Deploy
                </Button>
                <UserProfile />
              </nav>
            )}
          </div>
        </div>
      </header>
      {isMobile && mobileMenuOpen && (
        <div
          className="fixed left-0 right-0 z-40 bg-black/95 border-b border-white/10 animate-slide-down shadow-2xl"
          style={{
            top: HEADER_HEIGHT,
            borderRadius: '0 0 1.5rem 1.5rem',
            maxWidth: '100vw',
            paddingBottom: '1.5rem',
          }}
        >
          <nav className="flex flex-col gap-2 mt-2 px-6 pb-2 pt-2">
            {navLinks.filter(l => l.show).map(link => (
              <button
                key={link.label}
                onClick={() => { link.onClick(); setMobileMenuOpen(false); }}
                className="w-full text-left text-lg text-gray-200 hover:text-white py-2 px-2 rounded-md transition-colors font-medium"
              >
                {link.label}
              </button>
            ))}
            <Button 
              onClick={() => { navigate('/deploy'); setMobileMenuOpen(false); }}
              className="btn-modern-inverted mt-4 w-full text-lg py-3"
            >
              Deploy
            </Button>
            <div className="mt-4 flex justify-center">
              <UserProfile />
            </div>
          </nav>
        </div>
      )}
    </>
  );
};

export default PageHeader;
