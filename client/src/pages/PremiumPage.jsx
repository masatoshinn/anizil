import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Crown, Check, X, ChevronDown, Zap, Play, Lock, Star, Shield, Headphones,
} from 'lucide-react';
import useAuthStore from '../store/authStore';
import useSettingsStore from '../store/settingsStore';
import { cn, formatNumber } from '../lib/utils';

const fadeIn = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };
const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };

const PLANS = [
  { id: 'monthly', name: 'Monthly', xp: 5000, price: '$4.99/mo', duration: '1 month' },
  { id: 'quarterly', name: 'Quarterly', xp: 12000, price: '$12.99/3mo', duration: '3 months', popular: true },
  { id: 'yearly', name: 'Yearly', xp: 35000, price: '$39.99/yr', duration: '1 year', savings: '33%' },
];

const FEATURES = [
  { name: 'Ad-free experience', free: true, premium: true },
  { name: 'HD streaming', free: false, premium: true },
  { name: 'Early access to episodes', free: false, premium: true },
  { name: 'Unlimited episode access', free: false, premium: true },
  { name: 'Download for offline', free: false, premium: true },
  { name: 'Priority support', free: false, premium: true },
  { name: 'Custom profile themes', free: false, premium: true },
  { name: 'Access to exclusive content', free: false, premium: true },
];

const FAQ = [
  {
    q: 'What is Premium?',
    a: 'Premium gives you access to all features including HD streaming, early access, offline downloads, and more.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes, you can cancel your subscription at any time. Your premium access continues until the end of your billing period.',
  },
  {
    q: 'What payment methods are accepted?',
    a: 'We accept all major credit cards, PayPal, and various local payment methods.',
  },
  {
    q: 'Is there a free trial?',
    a: 'We offer a 7-day free trial for new subscribers. No charge until the trial ends.',
  },
  {
    q: 'Can I share my account?',
    a: 'Premium accounts are for personal use. Sharing with family members is allowed on up to 2 devices.',
  },
];

const BENEFITS = [
  { icon: Play, title: 'Unlimited Streaming', desc: 'Watch all anime without limits' },
  { icon: Lock, title: 'All Episodes', desc: 'Access every episode including premium-only' },
  { icon: Star, title: 'Early Access', desc: 'Watch new episodes before everyone else' },
  { icon: Shield, title: 'Ad-Free', desc: 'Enjoy uninterrupted viewing' },
  { icon: Headphones, title: 'Priority Support', desc: 'Get help faster from our team' },
  { icon: Zap, title: 'HD Quality', desc: 'Stream in full HD and 4K quality' },
];

// PremiumPage: marketing page for the premium subscription with plans, features, and FAQ
export default function PremiumPage() {
  const { user, isAuthenticated } = useAuthStore();
  const { premiumEnabled, fetched, fetchSettings } = useSettingsStore();
  const [openFaq, setOpenFaq] = useState(null);

  useEffect(() => { if (!fetched) fetchSettings(); }, []);

  if (fetched && !premiumEnabled) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center px-4">
          <Crown className="w-16 h-16 text-[#94a3b8] mx-auto mb-4 opacity-50" />
          <h1 className="text-3xl font-bold text-[#f8fafc] mb-2">Premium Unavailable</h1>
          <p className="text-[#94a3b8] mb-6 max-w-md mx-auto">
            The premium system is currently disabled by the site administrator.
          </p>
          <Link to="/" className="inline-flex items-center gap-2 px-6 py-3 bg-[#0ea5e9] hover:bg-[#0ea5e9]/90 text-white rounded-lg font-semibold transition-all">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0ea5e9]/10 via-[#0f172a] to-[#0ea5e9]/5" />
        <div className="relative max-w-4xl mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Crown className="w-16 h-16 text-yellow-400 mx-auto mb-6" />
            <h1 className="text-4xl md:text-5xl font-bold text-[#f8fafc] mb-4">
              Go Premium
            </h1>
            <p className="text-[#94a3b8] text-lg max-w-2xl mx-auto mb-8">
              Unlock the full Anizil experience with unlimited streaming, early access, and exclusive features
            </p>
          </motion.div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Benefits */}
        <motion.section
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-16"
        >
          {BENEFITS.map((b, i) => (
            <motion.div
              key={i}
              variants={fadeIn}
              className="bg-[#1e293b] border border-[rgba(148,163,184,0.12)] rounded-xl p-5 text-center"
            >
              <b.icon className="w-8 h-8 text-[#0ea5e9] mx-auto mb-3" />
              <h3 className="text-[#f8fafc] font-semibold mb-1">{b.title}</h3>
              <p className="text-[#94a3b8] text-sm">{b.desc}</p>
            </motion.div>
          ))}
        </motion.section>

        {/* Features Comparison */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-[#f8fafc] text-center mb-8">Free vs Premium</h2>
          <div className="max-w-2xl mx-auto bg-[#1e293b] border border-[rgba(148,163,184,0.12)] rounded-xl overflow-hidden">
            <div className="grid grid-cols-3 bg-[#0f172a] p-4 text-sm font-semibold text-[#f8fafc]">
              <span>Feature</span>
              <span className="text-center">Free</span>
              <span className="text-center text-yellow-400">Premium</span>
            </div>
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className={cn(
                  'grid grid-cols-3 p-4 text-sm border-t border-[rgba(148,163,184,0.06)]',
                  i % 2 === 0 ? 'bg-[#1e293b]' : 'bg-[#1e293b]/50'
                )}
              >
                <span className="text-[#94a3b8]">{f.name}</span>
                <div className="flex justify-center">
                  {f.free ? (
                    <Check className="w-5 h-5 text-[#22c55e]" />
                  ) : (
                    <X className="w-5 h-5 text-[#ef4444]" />
                  )}
                </div>
                <div className="flex justify-center">
                  <Check className="w-5 h-5 text-[#22c55e]" />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Subscription Status */}
        {isAuthenticated && user?.premium && (
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-12 bg-[#1e293b] border border-[#22c55e]/30 rounded-xl p-6 text-center"
          >
            <Crown className="w-10 h-10 text-yellow-400 mx-auto mb-3" />
            <h3 className="text-[#f8fafc] font-bold text-lg mb-1">You're Premium!</h3>
            <p className="text-[#94a3b8] text-sm">
              Your subscription is active until {new Date(user.premiumExpiry).toLocaleDateString()}
            </p>
          </motion.section>
        )}

        {/* Pricing Cards */}
        <motion.section
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16"
        >
          {PLANS.map((plan) => (
            <motion.div
              key={plan.id}
              variants={fadeIn}
              className={cn(
                'relative bg-[#1e293b] border rounded-2xl p-8 text-center transition-all hover:scale-[1.02]',
                plan.popular
                  ? 'border-[#0ea5e9]/50 shadow-lg shadow-[#0ea5e9]/10'
                  : 'border-[rgba(148,163,184,0.12)]'
              )}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#0ea5e9] text-white text-xs px-3 py-1 rounded-full font-medium">
                  Best Value
                </div>
              )}
              {plan.savings && (
                <div className="absolute top-4 right-4 bg-[#22c55e]/20 text-[#22c55e] text-xs px-2 py-0.5 rounded-full">
                  Save {plan.savings}
                </div>
              )}
              <Crown className="w-8 h-8 text-yellow-400 mx-auto mb-3" />
              <h3 className="text-xl font-bold text-[#f8fafc] mb-1">{plan.name}</h3>
              <p className="text-[#94a3b8] text-sm mb-4">{plan.duration}</p>
              <div className="text-3xl font-bold text-[#f8fafc] mb-1">{plan.price}</div>
              <p className="text-[#94a3b8] text-sm mb-6">{formatNumber(plan.xp)} XP/month</p>
              <button className="w-full py-3 bg-gradient-to-r from-[#0ea5e9] to-[#0ea5e9]/80 hover:from-[#0ea5e9]/90 hover:to-[#0ea5e9]/70 text-white rounded-lg font-semibold transition-all shadow-lg shadow-[#0ea5e9]/25">
                {isAuthenticated ? 'Subscribe' : 'Get Started'}
              </button>
            </motion.div>
          ))}
        </motion.section>

        {/* FAQ */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-[#f8fafc] text-center mb-8">Frequently Asked Questions</h2>
          <div className="max-w-2xl mx-auto space-y-3">
            {FAQ.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                className="bg-[#1e293b] border border-[rgba(148,163,184,0.12)] rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="flex items-center justify-between w-full p-4 text-left"
                >
                  <span className="text-[#f8fafc] font-medium text-sm">{faq.q}</span>
                  <ChevronDown
                    className={cn(
                      'w-5 h-5 text-[#94a3b8] transition-transform',
                      openFaq === i && 'rotate-180'
                    )}
                  />
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <p className="px-4 pb-4 text-[#94a3b8] text-sm leading-relaxed">
                        {faq.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="text-center mb-16">
          <div className="bg-gradient-to-r from-[#0ea5e9]/10 to-[#0ea5e9]/5 border border-[#0ea5e9]/20 rounded-2xl p-12">
            <Crown className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-[#f8fafc] mb-3">Ready to go premium?</h2>
            <p className="text-[#94a3b8] mb-6">Start your free trial today and unlock everything</p>
            <Link
              to={isAuthenticated ? '/shop' : '/register'}
              className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-[#0ea5e9] to-[#0ea5e9]/80 hover:from-[#0ea5e9]/90 hover:to-[#0ea5e9]/70 text-white rounded-lg font-semibold transition-all shadow-lg shadow-[#0ea5e9]/25"
            >
              <Crown className="w-5 h-5" />
              {isAuthenticated ? 'Get Premium' : 'Start Free Trial'}
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
