import React, { useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { supabase } from '@/lib/supabase';

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('idle');
    try {
      const { error } = await supabase.from('emails').insert([
        {
          name: form.name,
          email: form.email,
          purpose: form.reason,
          message: form.message,
        }
      ]);
      if (error) setStatus('error');
      else setStatus('success');
    } catch {
      setStatus('error');
    }
  };

  return (
    <>
      <PageHeader />
      <div className="min-h-screen bg-[#18181b] flex items-center justify-center px-4 pt-32 pb-20 font-sans">
        <div className="w-full max-w-xl mx-auto">
          <form
            className="backdrop-blur-lg bg-white/5 border border-white/10 shadow-xl rounded-2xl px-10 py-12 flex flex-col gap-7"
            style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
            onSubmit={handleSubmit}
          >
            <div className="text-4xl font-bold text-white mb-2 text-center" style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif', letterSpacing: '-0.02em' }}>
              Contact Us
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm text-gray-300" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Name</label>
              <input name="name" value={form.name} onChange={handleChange} required className="rounded-lg bg-[#232329]/80 text-white px-4 py-3 border border-white/10 focus:outline-none focus:ring-2 focus:ring-white/20 transition" style={{ fontFamily: 'Inter, system-ui, sans-serif' }} />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm text-gray-300" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Email</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} required className="rounded-lg bg-[#232329]/80 text-white px-4 py-3 border border-white/10 focus:outline-none focus:ring-2 focus:ring-white/20 transition" style={{ fontFamily: 'Inter, system-ui, sans-serif' }} />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm text-gray-300" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Purpose</label>
              <select name="reason" value={form.reason} onChange={handleChange} required className="rounded-lg bg-[#232329]/80 text-white px-4 py-3 border border-white/10 focus:outline-none focus:ring-2 focus:ring-white/20 transition" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                <option value="">Select a purpose</option>
                {reasons.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm text-gray-300" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Additional Comments</label>
              <textarea name="message" value={form.message} onChange={handleChange} required rows={5} className="rounded-lg bg-[#232329]/80 text-white px-4 py-3 border border-white/10 focus:outline-none focus:ring-2 focus:ring-white/20 transition" style={{ fontFamily: 'Inter, system-ui, sans-serif' }} />
            </div>
            <button type="submit" className="w-full bg-white text-black font-semibold py-3 rounded-lg border border-white hover:bg-gray-100 hover:text-black transition-colors text-lg mt-2" style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif', fontSize: '1.08rem' }}>
              Submit
            </button>
            {status === 'success' && <div className="text-green-400 text-center">Your message has been sent!</div>}
            {status === 'error' && <div className="text-red-400 text-center">There was an error. Please try again.</div>}
          </form>
        </div>
      </div>
    </>
  );
};

export default Contact; 