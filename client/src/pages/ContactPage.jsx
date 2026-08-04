import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, User, MessageSquare, Send, Loader2, CheckCircle, Tag } from 'lucide-react';
import api from '../lib/api';
import useSEO from '../hooks/useSEO';

const CATEGORIES = [
  { value: 'general', label: 'General Question' },
  { value: 'suggestion', label: 'Suggestion' },
  { value: 'bug', label: 'Bug Report' },
  { value: 'report', label: 'Report Issue' },
  { value: 'copyright', label: 'Copyright / DMCA' },
];

// ContactPage: contact form for questions, suggestions, bug reports, and copyright requests
export default function ContactPage() {
  useSEO({ title: 'Contact', description: 'Contact the Anizil team for questions, suggestions, bug reports or copyright takedowns.' });
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('general');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  // Validates the contact form fields and returns an error message if invalid
  const validate = () => {
    if (!name.trim()) return 'Name is required';
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) return 'Enter a valid email';
    if (!message.trim()) return 'Message is required';
    return '';
  };

  // Sends the contact message after validation and shows a success state
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const err = validate();
    if (err) { setError(err); return; }

    setLoading(true);
    try {
      await api.post('/contact', { name, email, subject, category, message });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send message');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen">
      <section className="relative py-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0ea5e9]/10 via-[#0f172a] to-transparent" />
        <div className="relative max-w-3xl mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold text-[#f8fafc] mb-3">Contact Us</h1>
          <p className="text-[#94a3b8]">Questions, suggestions, or issues? We'd love to hear from you.</p>
        </div>
      </section>

      <div className="max-w-xl mx-auto px-4 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#1e293b]/80 backdrop-blur-xl border border-[rgba(148,163,184,0.12)] rounded-2xl p-8"
        >
          {sent ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-[#22c55e]/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-[#22c55e]" />
              </div>
              <h2 className="text-2xl font-bold text-[#f8fafc] mb-2">Message Sent!</h2>
              <p className="text-[#94a3b8] text-sm">We'll get back to you at <span className="text-[#f8fafc]">{email}</span> as soon as possible.</p>
              <button
                onClick={() => { setSent(false); setName(''); setEmail(''); setSubject(''); setMessage(''); }}
                className="mt-6 text-[#0ea5e9] text-sm hover:underline"
              >
                Send another message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-lg p-3">
                  <p className="text-[#ef4444] text-sm text-center">{error}</p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#94a3b8] text-sm mb-1.5">Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => { setName(e.target.value); setError(''); }}
                      placeholder="Your name"
                      className="w-full bg-[#0f172a] border border-[rgba(148,163,184,0.12)] rounded-lg pl-10 pr-4 py-2.5 text-[#f8fafc] placeholder-[#94a3b8] text-sm focus:outline-none focus:border-[#0ea5e9]/50 transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[#94a3b8] text-sm mb-1.5">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError(''); }}
                      placeholder="you@example.com"
                      className="w-full bg-[#0f172a] border border-[rgba(148,163,184,0.12)] rounded-lg pl-10 pr-4 py-2.5 text-[#f8fafc] placeholder-[#94a3b8] text-sm focus:outline-none focus:border-[#0ea5e9]/50 transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#94a3b8] text-sm mb-1.5">Category</label>
                  <div className="relative">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-[#0f172a] border border-[rgba(148,163,184,0.12)] rounded-lg pl-10 pr-4 py-2.5 text-[#f8fafc] text-sm focus:outline-none focus:border-[#0ea5e9]/50 transition-colors appearance-none"
                    >
                      {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[#94a3b8] text-sm mb-1.5">Subject</label>
                  <div className="relative">
                    <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Subject (optional)"
                      className="w-full bg-[#0f172a] border border-[rgba(148,163,184,0.12)] rounded-lg pl-10 pr-4 py-2.5 text-[#f8fafc] placeholder-[#94a3b8] text-sm focus:outline-none focus:border-[#0ea5e9]/50 transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[#94a3b8] text-sm mb-1.5">Message</label>
                <textarea
                  value={message}
                  onChange={(e) => { setMessage(e.target.value); setError(''); }}
                  rows={5}
                  placeholder="Write your message here..."
                  className="w-full bg-[#0f172a] border border-[rgba(148,163,184,0.12)] rounded-lg px-4 py-2.5 text-[#f8fafc] placeholder-[#94a3b8] text-sm focus:outline-none focus:border-[#0ea5e9]/50 transition-colors resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-[#0ea5e9] to-[#0ea5e9]/80 hover:from-[#0ea5e9]/90 hover:to-[#0ea5e9]/70 text-white rounded-lg font-semibold transition-all shadow-lg shadow-[#0ea5e9]/25 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-5 h-5" /> Send Message</>}
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
}
