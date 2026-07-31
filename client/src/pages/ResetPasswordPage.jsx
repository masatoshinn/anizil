import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, KeyRound, Loader2, CheckCircle, ArrowLeft } from 'lucide-react';
import api from '../lib/api';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const errs = {};
    if (!password) errs.password = 'New password is required';
    else if (password.length < 6) errs.password = 'Password must be at least 6 characters';
    if (!confirmPassword) errs.confirmPassword = 'Please confirm your password';
    else if (password !== confirmPassword) errs.confirmPassword = 'Passwords do not match';
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    if (!token) {
      setError('Missing reset token. Please request a new reset link.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-[#1e293b]/80 backdrop-blur-xl border border-[rgba(148,163,184,0.12)] rounded-2xl p-8 shadow-2xl">
          {done ? (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-[#22c55e]/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-[#22c55e]" />
              </div>
              <h1 className="text-2xl font-bold text-[#f8fafc] mb-2">Password Reset!</h1>
              <p className="text-[#94a3b8] text-sm mb-6">Your password has been updated successfully.</p>
              <button
                onClick={() => navigate('/login')}
                className="w-full py-3 bg-gradient-to-r from-[#0ea5e9] to-[#0ea5e9]/80 text-white rounded-lg font-semibold transition-all"
              >
                Sign In
              </button>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-full bg-[#0ea5e9]/20 flex items-center justify-center mx-auto mb-4">
                  <KeyRound className="w-8 h-8 text-[#0ea5e9]" />
                </div>
                <h1 className="text-2xl font-bold text-[#f8fafc] mb-2">Set New Password</h1>
                <p className="text-[#94a3b8] text-sm">Choose a new password for your account</p>
              </div>

              {!token && (
                <div className="bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-lg p-3 mb-6">
                  <p className="text-[#ef4444] text-sm text-center">Invalid reset link. Please request a new one.</p>
                </div>
              )}

              {error && (
                <div className="bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-lg p-3 mb-6">
                  <p className="text-[#ef4444] text-sm text-center">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[#94a3b8] text-sm mb-1.5">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError(''); setFieldErrors({ ...fieldErrors, password: '' }); }}
                      placeholder="••••••••"
                      className={`w-full bg-[#0f172a] border rounded-lg pl-10 pr-4 py-2.5 text-[#f8fafc] placeholder-[#94a3b8] text-sm focus:outline-none focus:border-[#0ea5e9]/50 transition-colors ${
                        fieldErrors.password ? 'border-[#ef4444]/50' : 'border-[rgba(148,163,184,0.12)]'
                      }`}
                    />
                  </div>
                  {fieldErrors.password && <p className="text-[#ef4444] text-xs mt-1">{fieldErrors.password}</p>}
                </div>

                <div>
                  <label className="block text-[#94a3b8] text-sm mb-1.5">Confirm New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => { setConfirmPassword(e.target.value); setError(''); setFieldErrors({ ...fieldErrors, confirmPassword: '' }); }}
                      placeholder="••••••••"
                      className={`w-full bg-[#0f172a] border rounded-lg pl-10 pr-4 py-2.5 text-[#f8fafc] placeholder-[#94a3b8] text-sm focus:outline-none focus:border-[#0ea5e9]/50 transition-colors ${
                        fieldErrors.confirmPassword ? 'border-[#ef4444]/50' : 'border-[rgba(148,163,184,0.12)]'
                      }`}
                    />
                  </div>
                  {fieldErrors.confirmPassword && <p className="text-[#ef4444] text-xs mt-1">{fieldErrors.confirmPassword}</p>}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-[#0ea5e9] to-[#0ea5e9]/80 text-white rounded-lg font-semibold transition-all shadow-lg shadow-[#0ea5e9]/25 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Reset Password'}
                </button>
              </form>

              <div className="text-center mt-6">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-[#94a3b8] hover:text-[#f8fafc] text-sm transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Sign In
                </Link>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
