import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Coins, Gift, Crown, CreditCard, CheckCircle, Star, Package, Tag, ArrowRight,
  Frame, Shield, Award, Sparkles, BadgeCheck,
} from 'lucide-react';
import useAuthStore from '../store/authStore';
import useSettingsStore from '../store/settingsStore';
import Skeleton from '../components/common/Skeleton';
import { cn, formatNumber } from '../lib/utils';
import api from '../lib/api';

const fadeIn = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };
const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };

const CREDIT_PACKS = [
  { id: 'small', amount: 500, xp: 500, bonus: 0, price: '$0.99', popular: false },
  { id: 'medium', amount: 1500, xp: 1500, bonus: 150, price: '$2.49', popular: false },
  { id: 'large', amount: 5000, xp: 5000, bonus: 750, price: '$6.99', popular: true },
  { id: 'mega', amount: 15000, xp: 15000, bonus: 3000, price: '$17.99', popular: false },
];

const XP_METHODS = [
  { action: 'Watch an episode', xp: 10, icon: '▶' },
  { action: 'Complete an anime', xp: 50, icon: '✓' },
  { action: 'Post a comment', xp: 5, icon: '💬' },
  { action: 'Add to watchlist', xp: 5, icon: '📋' },
  { action: 'Daily login', xp: 20, icon: '📅' },
];

export default function ShopPage() {
  const { user, isAuthenticated } = useAuthStore();
  const { premiumEnabled, fetched, fetchSettings } = useSettingsStore();
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(null);
  const [purchaseMsg, setPurchaseMsg] = useState('');
  const [frames, setFrames] = useState([]);
  const [purchasedFrames, setPurchasedFrames] = useState(new Set());
  const [buyingFrame, setBuyingFrame] = useState(null);

  // Badge state
  const [badges, setBadges] = useState([]);
  const [badgesLoading, setBadgesLoading] = useState(false);

  useEffect(() => {
    loadFrames();
    loadBadges();
    if (!fetched) fetchSettings();
    setLoading(false);
  }, [isAuthenticated]);

  const loadBadges = async () => {
    setBadgesLoading(true);
    try {
      const res = await api.get('/admin/badges');
      setBadges(res.data.data || []);
    } catch {}
    setBadgesLoading(false);
  };

  const loadFrames = async () => {
    try {
      const res = await api.get('/shop/frames');
      const data = res.data.data || res.data;
      setFrames(Array.isArray(data) ? data : []);
      if (isAuthenticated) {
        const myRes = await api.get('/shop/frames/my');
        const myData = myRes.data.data || {};
        const owned = new Set((myData.frames || []).map(f => f.frame_id));
        setPurchasedFrames(owned);
      }
    } catch (err) {
      console.error('Failed to load frames:', err);
    }
  };

  const handlePurchase = async (packId) => {
    if (!isAuthenticated) {
      window.location.href = '/login';
      return;
    }
    setPurchasing(packId);
    setPurchaseMsg('');
    try {
      const res = await api.post('/shop/purchase', { itemId: packId });
      setPurchaseMsg(res.data.message || 'Purchase successful!');
      setTimeout(() => setPurchaseMsg(''), 3000);
    } catch (err) {
      setPurchaseMsg(err.response?.data?.message || 'Purchase failed');
      setTimeout(() => setPurchaseMsg(''), 3000);
    }
    setPurchasing(null);
  };

  const handleFramePurchase = async (frame) => {
    if (!isAuthenticated) {
      window.location.href = '/login';
      return;
    }
    setBuyingFrame(frame.id);
    setPurchaseMsg('');
    try {
      const res = await api.post('/shop/frames/purchase', { frame_id: frame.id });
      setPurchaseMsg(res.data.message || 'Frame purchased!');
      setPurchasedFrames(prev => new Set([...prev, frame.id]));
      if (user && res.data.data?.new_xp !== undefined) {
        useAuthStore.setState({ user: { ...user, xp: res.data.data.new_xp } });
      }
      setTimeout(() => setPurchaseMsg(''), 3000);
    } catch (err) {
      setPurchaseMsg(err.response?.data?.message || 'Failed');
      setTimeout(() => setPurchaseMsg(''), 3000);
    }
    setBuyingFrame(null);
  };

  const RARITY_COLORS = {
    common: 'text-[#94a3b8] border-[#94a3b8]/30 bg-[#94a3b8]/5',
    rare: 'text-[#0ea5e9] border-[#0ea5e9]/30 bg-[#0ea5e9]/5',
    epic: 'text-purple-400 border-purple-400/30 bg-purple-400/5',
    legendary: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/5',
  };

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-[#f8fafc] mb-3">Shop</h1>
          <p className="text-[#94a3b8]">Get XP to unlock premium features and perks</p>
          {isAuthenticated && (
            <div className="inline-flex items-center gap-2 mt-4 px-5 py-2 bg-[#1e293b] rounded-full border border-[rgba(148,163,184,0.12)]">
              <Coins className="w-5 h-5 text-yellow-400" />
              <span className="text-[#f8fafc] font-semibold">{formatNumber(user?.xp || 0)} XP</span>
            </div>
          )}
          {purchaseMsg && (
            <div className={cn('mt-3 text-sm', purchaseMsg.includes('success') || purchaseMsg.includes('Successful') ? 'text-green-400' : 'text-red-400')}>
              {purchaseMsg}
            </div>
          )}
        </motion.div>

        {/* How to Earn XP */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-[#f8fafc] mb-6 flex items-center gap-2">
            <Star className="w-6 h-6 text-yellow-400" /> How to Earn XP
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {XP_METHODS.map((method, i) => (
              <div key={i} className="bg-[#1e293b] border border-[rgba(148,163,184,0.12)] rounded-xl p-4 flex items-center gap-4">
                <span className="text-2xl">{method.icon}</span>
                <div className="flex-1">
                  <p className="text-[#f8fafc] font-medium text-sm">{method.action}</p>
                </div>
                <span className="text-[#0ea5e9] font-bold">+{method.xp} XP</span>
              </div>
            ))}
          </div>
        </section>

        {/* Available Badges */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-[#f8fafc] mb-2 flex items-center gap-2">
            <BadgeCheck className="w-6 h-6 text-[#0ea5e9]" /> Badges
          </h2>
          <p className="text-[#94a3b8] text-sm mb-6">Earn badges by contributing to the community. Admins assign badges to recognize members.</p>
          {badgesLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
            </div>
          ) : badges.length > 0 ? (
            <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true }}
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {badges.map((badge) => (
                <motion.div key={badge.id} variants={fadeIn}
                  className="bg-[#1e293b] border border-[rgba(148,163,184,0.12)] rounded-xl p-4 text-center hover:scale-[1.02] transition-all">
                  <div className="w-12 h-12 mx-auto mb-2 rounded-full flex items-center justify-center text-2xl"
                    style={{ backgroundColor: `${badge.color}20` }}>
                    {badge.icon}
                  </div>
                  <h3 className="text-sm font-bold text-[#f8fafc] mb-1">{badge.name}</h3>
                  {badge.description && (
                    <p className="text-[10px] text-[#94a3b8]">{badge.description}</p>
                  )}
                  {badge.is_verified ? (
                    <span className="inline-flex items-center gap-0.5 mt-1 text-[10px] font-bold"
                      style={{ color: badge.color }}>
                      ✓ Official Badge
                    </span>
                  ) : null}
                </motion.div>
              ))}
            </motion.div>
          ) : null}
        </section>

        {/* XP Packs */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-[#f8fafc] mb-6 flex items-center gap-2">
            <Coins className="w-6 h-6 text-yellow-400" /> Buy XP Packs
          </h2>
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {CREDIT_PACKS.map((pack) => (
              <motion.div
                key={pack.id}
                variants={fadeIn}
                className={cn(
                  'relative bg-[#1e293b] border rounded-xl p-6 text-center transition-all hover:scale-[1.02]',
                  pack.popular
                    ? 'border-[#0ea5e9]/50 shadow-lg shadow-[#0ea5e9]/10'
                    : 'border-[rgba(148,163,184,0.12)]'
                )}
              >
                {pack.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#0ea5e9] text-white text-xs px-3 py-1 rounded-full font-medium">
                    Best Value
                  </div>
                )}
                <Coins className="w-10 h-10 text-yellow-400 mx-auto mb-3" />
                <div className="text-3xl font-bold text-[#f8fafc] mb-1">{formatNumber(pack.xp)}</div>
                <div className="text-[#94a3b8] text-sm mb-1">XP</div>
                {pack.bonus > 0 && (
                  <div className="text-[#22c55e] text-xs mb-1">+{formatNumber(pack.bonus)} bonus XP</div>
                )}
                <div className="text-[#94a3b8] text-sm mb-3">{pack.price}</div>
                <button
                  onClick={() => handlePurchase(pack.id)}
                  disabled={purchasing === pack.id}
                  className="w-full py-2.5 bg-[#0ea5e9] hover:bg-[#0ea5e9]/90 text-white rounded-lg font-medium transition-colors text-sm disabled:opacity-50"
                >
                  {purchasing === pack.id ? 'Processing...' : `Get ${formatNumber(pack.xp)} XP`}
                </button>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* Profile Frames */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-[#f8fafc] mb-2 flex items-center gap-2">
            <Frame className="w-6 h-6 text-[#0ea5e9]" /> Profile Frames
          </h2>
          <p className="text-[#94a3b8] text-sm mb-6">Buy frames with XP to customize your profile avatar</p>
          {frames.length > 0 ? (
            <motion.div
              variants={container}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4"
            >
              {frames.map((frame) => {
                const owned = purchasedFrames.has(frame.id);
                return (
                  <motion.div
                    key={frame.id}
                    variants={fadeIn}
                    className={cn(
                      'relative bg-[#1e293b] border rounded-xl p-5 text-center transition-all hover:scale-[1.02]',
                      RARITY_COLORS[frame.rarity] || 'border-[rgba(148,163,184,0.12)]'
                    )}
                  >
                    <div className="w-16 h-16 mx-auto mb-3 rounded-full overflow-hidden border-2" style={{ borderColor: frame.border_color }}>
                      {frame.image_url ? (
                        <img src={frame.image_url} alt={frame.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-[#0f172a] flex items-center justify-center">
                          <Frame className="w-6 h-6 text-[#94a3b8]" />
                        </div>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-[#f8fafc] mb-1">{frame.name}</h3>
                    <span className={cn('text-[10px] font-bold uppercase tracking-wider', RARITY_COLORS[frame.rarity]?.split(' ')[0])}>
                      {frame.rarity}
                    </span>
                    {frame.price_xp === 0 ? (
                      <div className="mt-2 text-xs text-[#94a3b8]">Default</div>
                    ) : owned ? (
                      <div className="mt-2 text-xs text-green-400 font-medium flex items-center justify-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Owned
                      </div>
                    ) : (
                      <button
                        onClick={() => handleFramePurchase(frame)}
                        disabled={buyingFrame === frame.id}
                        className="mt-2 w-full py-1.5 bg-[#0ea5e9] hover:bg-[#0ea5e9]/90 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                      >
                        {buyingFrame === frame.id ? 'Buying...' : `${formatNumber(frame.price_xp)} XP`}
                      </button>
                    )}
                  </motion.div>
                );
              })}
            </motion.div>
          ) : (
            <div className="text-center py-8 text-[#94a3b8]">No frames available yet</div>
          )}
        </section>

        {premiumEnabled && (
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-[#f8fafc] mb-6 flex items-center gap-2">
            <Crown className="w-6 h-6 text-yellow-400" /> Premium Plans
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { id: 'monthly', name: 'Monthly', xp: 5000, price: '$4.99/mo', duration: '1 month' },
              { id: 'quarterly', name: 'Quarterly', xp: 12000, price: '$12.99/3mo', duration: '3 months', popular: true },
              { id: 'yearly', name: 'Yearly', xp: 35000, price: '$39.99/yr', duration: '1 year', savings: '33%' },
            ].map((plan) => (
              <div
                key={plan.id}
                className={cn(
                  'relative bg-[#1e293b] border rounded-2xl p-8 text-center transition-all hover:scale-[1.02]',
                  plan.popular ? 'border-[#0ea5e9]/50 shadow-lg shadow-[#0ea5e9]/10' : 'border-[rgba(148,163,184,0.12)]'
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
                <Crown className="w-10 h-10 text-yellow-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-[#f8fafc] mb-1">{plan.name}</h3>
                <p className="text-[#94a3b8] text-sm mb-4">{plan.duration}</p>
                <div className="text-3xl font-bold text-[#f8fafc] mb-1">{plan.price}</div>
                <p className="text-[#94a3b8] text-sm mb-6">{formatNumber(plan.xp)} XP/month</p>
                <ul className="space-y-2 mb-6 text-left">
                  <li className="flex items-center gap-2 text-[#94a3b8] text-sm">
                    <CheckCircle className="w-4 h-4 text-[#22c55e] flex-shrink-0" /> No ads
                  </li>
                  <li className="flex items-center gap-2 text-[#94a3b8] text-sm">
                    <CheckCircle className="w-4 h-4 text-[#22c55e] flex-shrink-0" /> Early access
                  </li>
                  <li className="flex items-center gap-2 text-[#94a3b8] text-sm">
                    <CheckCircle className="w-4 h-4 text-[#22c55e] flex-shrink-0" /> HD streaming
                  </li>
                  <li className="flex items-center gap-2 text-[#94a3b8] text-sm">
                    <CheckCircle className="w-4 h-4 text-[#22c55e] flex-shrink-0" /> All episodes unlocked
                  </li>
                </ul>
                <Link
                  to="/premium"
                  className="block w-full py-3 bg-gradient-to-r from-[#0ea5e9] to-[#0ea5e9]/80 hover:from-[#0ea5e9]/90 hover:to-[#0ea5e9]/70 text-white rounded-lg font-semibold transition-all shadow-lg shadow-[#0ea5e9]/25"
                >
                  Learn More
                </Link>
              </div>
            ))}
          </div>
        </section>
        )}

        {/* Redeem Code */}
        <section className="mb-12">
          <div className="bg-[#1e293b] border border-[rgba(148,163,184,0.12)] rounded-2xl p-8 text-center">
            <Tag className="w-10 h-10 text-[#0ea5e9] mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-[#f8fafc] mb-3">Have a Redeem Code?</h2>
            <p className="text-[#94a3b8] mb-6">Enter your code to get XP, premium days, or other rewards</p>
            <Link
              to="/redeem"
              className="inline-flex items-center gap-2 px-8 py-3 bg-[#0ea5e9] hover:bg-[#0ea5e9]/90 text-white rounded-lg font-semibold transition-colors"
            >
              Go to Redeem Page <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
