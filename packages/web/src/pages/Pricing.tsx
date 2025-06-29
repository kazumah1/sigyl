import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Pricing = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleFree = () => {
    if (!user) {
      window.location.href = '/api/auth/github'; // Adjust to your auth route
    } else {
      navigate('/dashboard');
    }
  };

  const handleEnterprise = () => {
    navigate('/contact?reason=enterprise');
  };

  return (
    <div className="min-h-screen bg-[#18181b] flex items-center justify-center px-4 pt-20">
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Free Plan */}
        <div className="bg-[#232329] rounded-2xl shadow-lg p-8 flex flex-col items-start border border-[#232329]">
          <h2 className="text-2xl font-bold text-white mb-2">Free</h2>
          <p className="text-gray-400 mb-4">For individuals and small teams getting started.</p>
          <ul className="text-gray-300 text-sm space-y-2 mb-6">
            <li>✔️ 5,000 API calls/month</li>
            <li>✔️ Staff support</li>
            <li>✔️ Basic security features</li>
            <li>✔️ Limited CLI & SDK usage</li>
            <li>✔️ Access to the marketplace</li>
          </ul>
          <button
            onClick={handleFree}
            className="bg-[#3ecf8e] hover:bg-[#34b97a] text-black font-semibold px-6 py-2 rounded-lg text-base shadow w-full"
          >
            Get Started Free
          </button>
        </div>
        {/* Enterprise Plan */}
        <div className="bg-[#232329] rounded-2xl shadow-lg p-8 flex flex-col items-start border border-[#3ecf8e]">
          <h2 className="text-2xl font-bold text-[#3ecf8e] mb-2">Enterprise</h2>
          <p className="text-gray-400 mb-4">For organizations needing scale, security, and support.</p>
          <ul className="text-gray-300 text-sm space-y-2 mb-6">
            <li>✨ Curated marketplace of exclusive & enterprise deals</li>
            <li>✨ Unlimited CLI & SDK usage</li>
            <li>✨ Enterprise-grade security & monitoring</li>
            <li>✨ Customizations upon request</li>
            <li>✨ Tooling plug & play</li>
            <li>✨ 24/7 enterprise-grade support</li>
            <li>✨ 100k+ API calls/month</li>
            <li>✨ 30+ servers hosted at any time</li>
          </ul>
          <button
            onClick={handleEnterprise}
            className="bg-gradient-to-r from-[#3ecf8e] to-[#34b97a] text-black font-semibold px-6 py-2 rounded-lg text-base shadow w-full"
          >
            Contact for Enterprise
          </button>
        </div>
      </div>
    </div>
  );
};

export default Pricing; 