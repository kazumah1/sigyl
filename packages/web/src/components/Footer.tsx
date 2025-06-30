import React from 'react';
import { FaGithub, FaLinkedin, FaDiscord, FaEnvelope } from 'react-icons/fa';
import { useNavigate, useLocation } from 'react-router-dom';

const Footer = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Hide footer on dashboard
  if (location.pathname.startsWith('/dashboard')) return null;

  return (
    <footer className="w-full bg-[#111113] border-t border-white/10 py-8 px-4 mt-20 relative z-10">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 md:gap-0">
        {/* Left: Social Icons */}
        <div className="flex items-center gap-6">
          <a href="https://github.com/sigyl-ai" target="_blank" rel="noopener noreferrer" aria-label="GitHub" className="text-gray-400 hover:text-white transition-colors text-2xl">
            <FaGithub />
          </a>
          <a href="https://x.com" target="_blank" rel="noopener noreferrer" aria-label="X" className="text-gray-400 hover:text-white transition-colors text-2xl">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
          </a>
          <a href="https://linkedin.com/company/sigyl" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="text-gray-400 hover:text-white transition-colors text-2xl">
            <FaLinkedin />
          </a>
          <a href="https://discord.gg/sigyl" target="_blank" rel="noopener noreferrer" aria-label="Discord" className="text-gray-400 hover:text-white transition-colors text-2xl">
            <FaDiscord />
          </a>
          <a href="mailto:info@sigyl.dev" aria-label="Email" className="text-gray-400 hover:text-white transition-colors text-2xl">
            <FaEnvelope />
          </a>
        </div>
        {/* Center: Copyright */}
        <div className="text-gray-400 text-sm font-medium" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
          © 2025 SIGYL. All rights reserved.
        </div>
        {/* Right: Links */}
        <div className="flex items-center gap-6">
          <button
            onClick={() => navigate('/contact')}
            className="bg-white text-black font-semibold px-5 py-2 rounded-lg border border-white hover:bg-gray-100 hover:text-black transition-colors text-base"
            style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}
          >
            Contact Us
          </button>
          <button
            onClick={() => navigate('/terms')}
            className="text-gray-400 hover:text-white transition-colors text-base font-medium"
            style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
          >
            Terms of Service
          </button>
          <button
            onClick={() => navigate('/privacy')}
            className="text-gray-400 hover:text-white transition-colors text-base font-medium"
            style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
          >
            Privacy Policy
          </button>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 