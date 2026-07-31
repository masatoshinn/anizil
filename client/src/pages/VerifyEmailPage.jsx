import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle, XCircle, Mail, Send } from 'lucide-react';
import api from '../lib/api';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const sentParam = searchParams.get('sent');

  const [status, setStatus] = useState('loading'); // loading | success | error | sent
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (sentParam === '1') {
      setStatus('sent');
      return;
    }

    if (!token) {
      setStatus('error');
      setMessage('No verification token provided');
      return;
    }

    const verify = async () => {
      try {
        const res = await api.get('/auth/verify-email', { params: { token } });
        setStatus('success');
        setMessage(res.data.message || 'Email verified successfully');
      } catch (err) {
        setStatus('error');
        setMessage(err.response?.data?.message || 'Verification failed');
      }
    };
    verify();
  }, [token, sentParam]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-[#1e293b]/80 backdrop-blur-xl border border-[rgba(148,163,184,0.12)] rounded-2xl p-8 shadow-2xl text-center"
      >
        {status === 'loading' && (
          <>
            <Loader2 className="w-12 h-12 text-[#0ea5e9] animate-spin mx-auto mb-4" />
            <h1 className="text-xl font-bold text-[#f8fafc] mb-2">Verifying Email...</h1>
          </>
        )}

        {status === 'sent' && (
          <>
            <div className="w-16 h-16 rounded-full bg-[#0ea5e9]/20 flex items-center justify-center mx-auto mb-4">
              <Send className="w-8 h-8 text-[#0ea5e9]" />
            </div>
            <h1 className="text-xl font-bold text-[#f8fafc] mb-2">Check Your Email</h1>
            <p className="text-[#94a3b8] text-sm mb-2">We've sent a verification link to your email address.</p>
            <p className="text-[#94a3b8] text-xs mb-6">Click the link in the email to verify your account. Didn't get it? Check your spam folder.</p>
            <Link
              to="/dashboard"
              className="inline-flex items-center justify-center gap-2 w-full py-3 bg-[#0ea5e9] hover:bg-[#0284c7] text-white rounded-lg font-semibold transition-colors"
            >
              <Mail className="w-4 h-4" /> Go to Dashboard
            </Link>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 rounded-full bg-[#22c55e]/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-[#22c55e]" />
            </div>
            <h1 className="text-xl font-bold text-[#f8fafc] mb-2">Email Verified!</h1>
            <p className="text-[#94a3b8] text-sm mb-6">{message}</p>
            <Link
              to="/login"
              className="inline-block w-full py-3 bg-[#0ea5e9] hover:bg-[#0284c7] text-white rounded-lg font-semibold transition-colors"
            >
              Continue to Login
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 rounded-full bg-[#ef4444]/20 flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-[#ef4444]" />
            </div>
            <h1 className="text-xl font-bold text-[#f8fafc] mb-2">Verification Failed</h1>
            <p className="text-[#94a3b8] text-sm mb-2">{message}</p>
            <p className="text-[#94a3b8] text-xs mb-6">The link may be expired. You can request a new one from your dashboard.</p>
            <Link
              to="/dashboard"
              className="inline-flex items-center justify-center gap-2 w-full py-3 bg-[#0ea5e9] hover:bg-[#0284c7] text-white rounded-lg font-semibold transition-colors"
            >
              <Mail className="w-4 h-4" /> Go to Dashboard
            </Link>
          </>
        )}
      </motion.div>
    </div>
  );
}
