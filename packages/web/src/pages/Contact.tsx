import React, { useState } from 'react';
import PageHeader from '@/components/PageHeader';

const reasons = [
  { value: 'demo', label: 'Demo' },
  { value: 'enterprise', label: 'Enterprise Interest' },
  { value: 'feature', label: 'Feature Requests' },
  { value: 'investor', label: 'Investor Interests' },
  { value: 'misc', label: 'Misc' },
];

const Contact = () => {
  const [form, setForm] = useState({ name: '', email: '', reason: '', message: '' });
  const [status, setStatus] = useState<'idle'|'success'|'error'>('idle');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('idle');
    setIsSubmitting(true);

    try {
      // Send to API for both email notifications and storage
      const REGISTRY_API_BASE = import.meta.env.VITE_REGISTRY_API_URL || 'http://localhost:3000';
      const apiUrl = REGISTRY_API_BASE.endsWith('/api/v1') ? REGISTRY_API_BASE : `${REGISTRY_API_BASE}/api/v1`;
      
      // Use the emails/subscribe endpoint which handles both email sending and storage
      const response = await fetch(`${apiUrl}/emails/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          purpose: form.reason,
          message: form.message,
          source: 'contact_form'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send message');
      }

      setStatus('success');
      // Reset form on success
      setForm({ name: '', email: '', reason: '', message: '' });
    } catch (error) {
      console.error('Contact form submission error:', error);
      setStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader />
      <div className="min-h-screen bg-black flex items-center justify-center px-4 pt-32 pb-20 font-sans">
        <div className="w-full max-w-xl mx-auto">
          <form
            className="backdrop-blur-lg bg-[#101014] border border-white/10 shadow-2xl rounded-2xl px-10 py-12 flex flex-col gap-7"
            style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
            onSubmit={handleSubmit}
          >
            <div className="text-4xl font-bold text-white mb-2 text-center" style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif', letterSpacing: '-0.02em' }}>
              Contact Us
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm text-gray-400" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Name</label>
              <input 
                name="name" 
                value={form.name} 
                onChange={handleChange} 
                required 
                disabled={isSubmitting}
                className="rounded-lg bg-[#18181b] text-white px-4 py-3 border border-white/10 focus:outline-none focus:ring-2 focus:ring-white/20 transition disabled:opacity-50 placeholder-gray-500" 
                style={{ fontFamily: 'Inter, system-ui, sans-serif' }} 
                placeholder="Your name"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm text-gray-400" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Email</label>
              <input 
                name="email" 
                type="email" 
                value={form.email} 
                onChange={handleChange} 
                required 
                disabled={isSubmitting}
                className="rounded-lg bg-[#18181b] text-white px-4 py-3 border border-white/10 focus:outline-none focus:ring-2 focus:ring-white/20 transition disabled:opacity-50 placeholder-gray-500" 
                style={{ fontFamily: 'Inter, system-ui, sans-serif' }} 
                placeholder="you@email.com"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm text-gray-400" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Purpose</label>
              <select 
                name="reason" 
                value={form.reason} 
                onChange={handleChange} 
                required 
                disabled={isSubmitting}
                className="rounded-lg bg-[#18181b] text-white px-4 py-3 border border-white/10 focus:outline-none focus:ring-2 focus:ring-white/20 transition disabled:opacity-50" 
                style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
              >
                <option value="">Select a purpose</option>
                {reasons.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm text-gray-400" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Additional Comments</label>
              <textarea 
                name="message" 
                value={form.message} 
                onChange={handleChange} 
                required 
                rows={5} 
                disabled={isSubmitting}
                className="rounded-lg bg-[#18181b] text-white px-4 py-3 border border-white/10 focus:outline-none focus:ring-2 focus:ring-white/20 transition disabled:opacity-50 placeholder-gray-500" 
                style={{ fontFamily: 'Inter, system-ui, sans-serif' }} 
                placeholder="Type your message here..."
              />
            </div>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full bg-white text-black font-semibold py-3 rounded-lg border border-white hover:bg-gray-100 hover:text-black transition-colors text-lg mt-2 disabled:opacity-50 disabled:cursor-not-allowed" 
              style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif', fontSize: '1.08rem' }}
            >
              {isSubmitting ? 'Sending...' : 'Submit'}
            </button>
            {status === 'success' && (
              <div className="text-green-400 text-center p-4 bg-green-400/10 rounded-lg border border-green-400/20">
                <div className="font-semibold mb-2">Message sent successfully!</div>
                <div className="text-sm text-green-300">
                  We've received your message and will get back to you within 24 hours.
                </div>
              </div>
            )}
            {status === 'error' && (
              <div className="text-red-400 text-center p-4 bg-red-400/10 rounded-lg border border-red-400/20">
                <div className="font-semibold mb-2">There was an error</div>
                <div className="text-sm text-red-300">
                  Please try again or contact us directly at info@sigyl.dev
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </>
  );
};

export default Contact; 