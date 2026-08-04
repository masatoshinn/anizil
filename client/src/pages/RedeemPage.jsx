import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Tag, Loader2, CheckCircle, ArrowLeft } from 'lucide-react';
import useAuthStore from '../store/authStore';
import { cn } from '../lib/utils';
import api from '../lib/api';

// RedeemPage: form to redeem codes for XP, premium days, and other rewards
export default function RedeemPage() {
  const { isAuthenticated } = useAuthStore();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);

  // Submits a redeem code and shows the reward message
  const handleRedeem = async (e) => {
    e.preventDefault();
    if (!code.trim() || !isAuthenticated) return;
    setLoading(true);
    setMessage('');
    setSuccess(false);
    try {
      const res = await api.post('/shop/redeem', { code: code.trim() });
      setMessage(res.data.message || 'Code redeemed successfully!');
      setSuccess(true);
      setCode('');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Invalid or already redeemed code');
      setSuccess(false);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-md mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="w-20 h-20 rounded-full bg-[#0ea5e9]/15 flex items-center justify-center mx-auto mb-6">
            <Tag className="w-10 h-10 text-[#0ea5e9]" />
          </div>
          <h1 className="text-3xl font-bold text-[#f8fafc] mb-2">Redeem Code</h1>
          <p className="text-[#94a3b8]">Enter your redeem code to get rewards</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#1e293b] rounded-2xl border border-[rgba(148,163,184,0.12)] p-8"
        >
          {!isAuthenticated ? (
            <div className="text-center">
              <p className="text-[#94a3b8] mb-4">You need to be logged in to redeem codes</p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#0ea5e9] hover:bg-[#0ea5e9]/90 text-white rounded-lg font-medium transition-colors"
              >
                Login to Redeem
              </Link>
            </div>
          ) : (
            <form onSubmit={handleRedeem} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-[#94a3b8] mb-2">Enter your code</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="XXXX-XXXX-XXXX"
                  className="w-full px-4 py-3 bg-[#0f172a] border border-[rgba(148,163,184,0.12)] rounded-xl text-[#f8fafc] placeholder-[#64748b] text-center text-lg font-mono tracking-widest focus:outline-none focus:border-[#0ea5e9] transition-colors"
                  maxLength={20}
                />
              </div>

              <button
                type="submit"
                disabled={loading || !code.trim()}
                className="w-full flex items-center justify-center gap-2 py-3 bg-[#0ea5e9] hover:bg-[#0ea5e9]/90 text-white rounded-xl font-semibold transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Redeeming...</>
                ) : (
                  <>Redeem Code</>
                )}
              </button>

              {message && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    'flex items-center gap-2 p-3 rounded-lg text-sm',
                    success ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                  )}
                >
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  {message}
                </motion.div>
              )}
            </form>
          )}

          <div className="mt-6 pt-6 border-t border-[rgba(148,163,184,0.12)]">
            <Link to="/shop" className="flex items-center justify-center gap-2 text-[#94a3b8] hover:text-[#f8fafc] text-sm transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to Shop
            </Link>
          </div>
        </motion.div>

        {/* Info Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-8 space-y-4"
        >
          <h3 className="text-lg font-semibold text-[#f8fafc] text-center">What are redeem codes?</h3>
          <div className="grid grid-cols-1 gap-3">
            {[
              { type: 'XP Codes', desc: 'Get bonus XP to level up faster', example: '+500 XP' },
              { type: 'Premium Codes', desc: 'Unlock premium access for a limited time', example: '+7 Premium Days' },
              { type: 'Special Codes', desc: 'Get exclusive rewards from events', example: 'Special rewards' },
            ].map((item, i) => (
              <div key={i} className="bg-[#1e293b] border border-[rgba(148,163,184,0.12)] rounded-xl p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-[#0ea5e9]/15 flex items-center justify-center flex-shrink-0">
                  <Tag className="w-5 h-5 text-[#0ea5e9]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[#f8fafc] font-medium text-sm">{item.type}</p>
                  <p className="text-[#94a3b8] text-xs">{item.desc}</p>
                </div>
                <span className="text-[#0ea5e9] text-xs font-mono">{item.example}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
