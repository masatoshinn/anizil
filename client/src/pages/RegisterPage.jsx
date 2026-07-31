import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, User, Gift, Loader2, Check } from 'lucide-react';
import useAuthStore from '../store/authStore';

const getPasswordStrength = (pw) => {
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 2) return { label: 'Weak', color: 'text-[#ef4444]', bg: 'bg-[#ef4444]', width: '33%' };
  if (score <= 3) return { label: 'Medium', color: 'text-[#facc15]', bg: 'bg-[#facc15]', width: '66%' };
  return { label: 'Strong', color: 'text-[#22c55e]', bg: 'bg-[#22c55e]', width: '100%' };
};

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, isLoading, error, clearError } = useAuthStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState({});

  const strength = useMemo(() => getPasswordStrength(password), [password]);

  const validate = () => {
    const e = {};
    if (!name.trim()) e.name = 'Name is required';
    if (!email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Enter a valid email';
    if (!password) e.password = 'Password is required';
    else if (password.length < 6) e.password = 'Password must be at least 6 characters';
    if (!confirmPassword) e.confirmPassword = 'Please confirm your password';
    else if (password !== confirmPassword) e.confirmPassword = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    if (!validate()) return;
    const result = await register(name, email, password);
    if (result.success) {
      if (result.emailVerificationRequired) {
        navigate('/verify-email?sent=1');
      } else {
        navigate('/');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-[#1e293b]/80 backdrop-blur-xl border border-[rgba(148,163,184,0.12)] rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-[#f8fafc] mb-2">Create Account</h1>
            <p className="text-[#94a3b8] text-sm">Join Anizil and start watching</p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-lg p-3 mb-6"
            >
              <p className="text-[#ef4444] text-sm text-center">{error}</p>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-[#94a3b8] text-sm mb-1.5">Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setErrors({ ...errors, name: '' }); }}
                  placeholder="Your name"
                  className={`w-full bg-[#0f172a] border rounded-lg pl-10 pr-4 py-2.5 text-[#f8fafc] placeholder-[#94a3b8] text-sm focus:outline-none focus:border-[#0ea5e9]/50 transition-colors ${
                    errors.name ? 'border-[#ef4444]/50' : 'border-[rgba(148,163,184,0.12)]'
                  }`}
                />
              </div>
              {errors.name && <p className="text-[#ef4444] text-xs mt-1">{errors.name}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-[#94a3b8] text-sm mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setErrors({ ...errors, email: '' }); }}
                  placeholder="you@example.com"
                  className={`w-full bg-[#0f172a] border rounded-lg pl-10 pr-4 py-2.5 text-[#f8fafc] placeholder-[#94a3b8] text-sm focus:outline-none focus:border-[#0ea5e9]/50 transition-colors ${
                    errors.email ? 'border-[#ef4444]/50' : 'border-[rgba(148,163,184,0.12)]'
                  }`}
                />
              </div>
              {errors.email && <p className="text-[#ef4444] text-xs mt-1">{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block text-[#94a3b8] text-sm mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setErrors({ ...errors, password: '' }); }}
                  placeholder="••••••••"
                  className={`w-full bg-[#0f172a] border rounded-lg pl-10 pr-10 py-2.5 text-[#f8fafc] placeholder-[#94a3b8] text-sm focus:outline-none focus:border-[#0ea5e9]/50 transition-colors ${
                    errors.password ? 'border-[#ef4444]/50' : 'border-[rgba(148,163,184,0.12)]'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#f8fafc] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-[#ef4444] text-xs mt-1">{errors.password}</p>}

              {/* Password Strength */}
              {password && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-[#94a3b8]">Password strength</span>
                    <span className={`text-xs font-medium ${strength.color}`}>{strength.label}</span>
                  </div>
                  <div className="h-1.5 bg-[#0f172a] rounded-full overflow-hidden">
                    <div
                      className={`h-full ${strength.bg} rounded-full transition-all duration-300`}
                      style={{ width: strength.width }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-[#94a3b8] text-sm mb-1.5">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setErrors({ ...errors, confirmPassword: '' }); }}
                  placeholder="••••••••"
                  className={`w-full bg-[#0f172a] border rounded-lg pl-10 pr-10 py-2.5 text-[#f8fafc] placeholder-[#94a3b8] text-sm focus:outline-none focus:border-[#0ea5e9]/50 transition-colors ${
                    errors.confirmPassword ? 'border-[#ef4444]/50' : 'border-[rgba(148,163,184,0.12)]'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#f8fafc] transition-colors"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirmPassword && <p className="text-[#ef4444] text-xs mt-1">{errors.confirmPassword}</p>}
              {confirmPassword && password === confirmPassword && !errors.confirmPassword && (
                <p className="text-[#22c55e] text-xs mt-1 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Passwords match
                </p>
              )}
            </div>

            {/* Referral Code */}
            <div>
              <label className="block text-[#94a3b8] text-sm mb-1.5">Referral Code <span className="text-[#94a3b8]/50">(optional)</span></label>
              <div className="relative">
                <Gift className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
                <input
                  type="text"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value)}
                  placeholder="Enter referral code"
                  className="w-full bg-[#0f172a] border border-[rgba(148,163,184,0.12)] rounded-lg pl-10 pr-4 py-2.5 text-[#f8fafc] placeholder-[#94a3b8] text-sm focus:outline-none focus:border-[#0ea5e9]/50 transition-colors"
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-[#0ea5e9] to-[#0ea5e9]/80 hover:from-[#0ea5e9]/90 hover:to-[#0ea5e9]/70 text-white rounded-lg font-semibold transition-all shadow-lg shadow-[#0ea5e9]/25 disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          {/* Google OAuth */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[rgba(148,163,184,0.12)]" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-[#1e293b] px-3 text-[#94a3b8]">or</span>
            </div>
          </div>

          <a
            href="/api/auth/google"
            className="w-full flex items-center justify-center gap-2 py-3 bg-[#0f172a] text-[#f8fafc] rounded-lg font-medium border border-[rgba(148,163,184,0.12)] hover:bg-[#334155] hover:border-[#0ea5e9]/30 transition-all"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </a>

          <p className="text-center mt-6 text-[#94a3b8] text-sm">
            Already have an account?{' '}
            <Link to="/login" className="text-[#0ea5e9] hover:underline font-medium">
              Sign In
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
