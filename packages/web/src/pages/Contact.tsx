import React, { useState } from 'react';

const reasons = [
  { value: 'investor', label: 'Investor Inquiry' },
  { value: 'user', label: 'User Help' },
  { value: 'misc', label: 'Miscellaneous' },
  { value: 'demo', label: 'Enterprise Demo' },
  { value: 'pricing', label: 'Enterprise Pricing' },
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
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) setStatus('success');
      else setStatus('error');
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-[#18181b] flex items-center justify-center px-4 py-12">
      <form className="dashboard-card max-w-lg w-full flex flex-col gap-6" onSubmit={handleSubmit}>
        <div className="dashboard-card-title text-2xl mb-2">Contact Us</div>
        <div className="flex flex-col gap-2">
          <label className="text-sm text-gray-300">Name</label>
          <input name="name" value={form.name} onChange={handleChange} required className="rounded bg-[#232329] text-white px-4 py-2" />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm text-gray-300">Email</label>
          <input name="email" type="email" value={form.email} onChange={handleChange} required className="rounded bg-[#232329] text-white px-4 py-2" />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm text-gray-300">Reason</label>
          <select name="reason" value={form.reason} onChange={handleChange} required className="rounded bg-[#232329] text-white px-4 py-2">
            <option value="">Select a reason</option>
            {reasons.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm text-gray-300">Message</label>
          <textarea name="message" value={form.message} onChange={handleChange} required rows={5} className="rounded bg-[#232329] text-white px-4 py-2" />
        </div>
        <button type="submit" className="bg-[#3ecf8e] hover:bg-[#34b97a] text-black font-semibold px-8 py-3 rounded-lg text-lg shadow-lg">Submit</button>
        {status === 'success' && <div className="text-green-400">Your message has been sent!</div>}
        {status === 'error' && <div className="text-red-400">There was an error. Please try again.</div>}
      </form>
    </div>
  );
};

export default Contact; 