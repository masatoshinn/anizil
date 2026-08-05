import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Calendar, MessageSquare, Bookmark, CheckCircle, Trophy, ListVideo,
  ChevronLeft, Loader2, UserPlus, UserCheck, Gift, Copy, Check, Play,
  Flame, Eye, Sparkles,
} from 'lucide-react';
import api from '../lib/api';
import useSEO from '../hooks/useSEO';
import useAuthStore from '../store/authStore';
import BadgeIcon from '../components/common/BadgeIcon';
import { cn } from '../lib/utils';

const roleLabels = {
  super_admin: 'Super Admin',
  content_admin: 'Content Admin',
  moderator: 'Moderator',
  creator: 'Creator',
  user: 'Member'
};

const roleBadgeCls = {
  super_admin: 'bg-red-500/15 text-red-400 border-red-500/30',
  content_admin: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  moderator: 'bg-[#0ea5e9]/15 text-[#0ea5e9] border-[#0ea5e9]/30',
  creator: 'bg-pink-500/15 text-pink-400 border-pink-500/30',
};

// Maps watchlist status to a friendly label + Tailwind classes
const STATUS_META = {
  watching: { label: 'Watching', cls: 'bg-green-500/15 text-green-400 border-green-500/30' },
  completed: { label: 'Completed', cls: 'bg-[#0ea5e9]/15 text-[#0ea5e9] border-[#0ea5e9]/30' },
  plan_to_watch: { label: 'Planned', cls: 'bg-purple-500/15 text-purple-400 border-purple-500/30' },
  on_hold: { label: 'On Hold', cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  dropped: { label: 'Dropped', cls: 'bg-red-500/15 text-red-400 border-red-500/30' },
};

const STAT_CARDS = [
  { key: 'watchlist', icon: Bookmark, label: 'Watchlist', color: '#0ea5e9', bg: 'rgba(14,165,233,0.12)' },
  { key: 'completed', icon: CheckCircle, label: 'Completed', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
  { key: 'comments', icon: MessageSquare, label: 'Comments', color: '#a855f7', bg: 'rgba(168,85,247,0.12)' },
  { key: 'achievements', icon: Trophy, label: 'Achievements', color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
];

// UserProfilePage: public profile page showing user info, stats, watchlist, and recent comments
export default function UserProfilePage() {
  const { id } = useParams();
  const currentUser = useAuthStore((s) => s.user);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useSEO({
    title: data?.user?.name ? `${data.user.name}'s Profile` : 'User Profile',
    description: data?.user?.bio || `View ${data?.user?.name || 'user'}'s profile, watchlist, badges and achievements on Anizil.`,
  });

  useEffect(() => {
    // Fetches and loads the profile data for the requested user
    const fetchProfile = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await api.get(`/user/users/${id}`);
        setData(res.data.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [id]);

  useEffect(() => {
    let active = true;
    if (currentUser?.id && currentUser.id !== Number(id)) {
      api.get(`/user/follow-status/${id}`)
        .then((res) => {
          if (active) setIsFollowing(res.data.data?.is_following || false);
        })
        .catch(() => {});
    } else {
      setIsFollowing(false);
    }
    return () => { active = false; };
  }, [currentUser?.id, id]);

  // Follows or unfollows the profile user depending on current state
  const handleFollow = useCallback(async () => {
    if (!currentUser) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await api.delete(`/user/follow/${id}`);
        setIsFollowing(false);
        setData((prev) => prev ? { ...prev, stats: { ...prev.stats, followers: Math.max(0, (prev.stats.followers || 0) - 1) } } : prev);
      } else {
        await api.post(`/user/follow/${id}`);
        setIsFollowing(true);
        setData((prev) => prev ? { ...prev, stats: { ...prev.stats, followers: (prev.stats.followers || 0) + 1 } } : prev);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFollowLoading(false);
    }
  }, [currentUser, isFollowing, id]);

  // Copies the user's referral code to the clipboard
  const handleCopyReferral = async () => {
    if (!currentUser?.referral_code) return;
    try {
      await navigator.clipboard.writeText(currentUser.referral_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const isOwnProfile = currentUser?.id && currentUser.id === Number(id);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#0ea5e9] animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <h1 className="text-2xl font-bold text-[#f8fafc] mb-2">Profile Not Found</h1>
        <p className="text-[#94a3b8] mb-6">{error || 'This user does not exist'}</p>
        <Link to="/" className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0ea5e9] hover:bg-[#0284c7] text-white rounded-lg font-medium transition-colors">
          <ChevronLeft className="w-4 h-4" /> Go Home
        </Link>
      </div>
    );
  }

  const { user, stats, recent_watchlist, recent_comments } = data;
  const joinedDate = new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  const accent = (user.badges?.[0]?.color) || '#0ea5e9';

  // XP progress toward next level (level = floor(xp / 1000) + 1)
  const level = user.level || 1;
  const xp = user.xp || 0;
  const xpInLevel = Math.max(0, xp - (level - 1) * 1000);
  const xpPct = Math.min(100, Math.round((xpInLevel / 1000) * 100));

  const visibleBadges = user.badges?.slice(0, 6) || [];
  const extraBadgeCount = (user.badges?.length || 0) - visibleBadges.length;

  return (
    <div className="min-h-screen">
      {/* Header / Banner */}
      <section className="relative overflow-hidden">
        <div className="relative h-56 md:h-64 w-full">
          {user.banner_image ? (
            <img src={user.banner_image} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-[#0ea5e9]/15 via-transparent to-[#a855f7]/15" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/55 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0f172a]/30 to-[#0f172a]/80" />
        </div>

        {/* Info card overlapping banner */}
        <div className="relative max-w-4xl mx-auto px-4 -mt-24 sm:-mt-28">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#111c33]/90 backdrop-blur-xl border border-[rgba(148,163,184,0.15)] rounded-2xl p-5 sm:p-6 shadow-2xl shadow-black/40"
          >
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
              {/* Avatar with accent ring */}
              <div className="relative flex-shrink-0">
                <div
                  className="w-28 h-28 rounded-2xl p-[3px]"
                  style={{ background: `conic-gradient(from 200deg, ${accent}, #6366f1, ${accent})` }}
                >
                  <div className="w-full h-full rounded-[13px] overflow-hidden bg-[#1e293b] ring-1 ring-white/10">
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl font-bold" style={{ color: accent }}>
                        {user.name?.[0] || 'U'}
                      </div>
                    )}
                  </div>
                </div>
                {visibleBadges.length > 0 && (
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-1 bg-[#0f172a]/95 px-2 py-1 rounded-full border border-[rgba(148,163,184,0.15)] shadow-lg">
                    {visibleBadges.map((b) => (
                      <span key={b.id} title={b.name} className="text-sm" style={{ color: b.color }}><BadgeIcon icon={b.icon} /></span>
                    ))}
                    {extraBadgeCount > 0 && (
                      <span className="text-[9px] font-bold text-[#94a3b8] leading-none self-center">+{extraBadgeCount}</span>
                    )}
                  </div>
                )}
              </div>

              {/* Name / bio / meta */}
              <div className="text-center sm:text-left flex-1 min-w-0">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1.5">
                  <h1
                    className="text-2xl sm:text-3xl font-bold text-[#f8fafc] truncate"
                    style={user.active_name_color
                      ? user.active_name_color.startsWith('linear-gradient')
                        ? { color: 'transparent', backgroundImage: user.active_name_color, WebkitBackgroundClip: 'text', backgroundClip: 'text' }
                        : { color: user.active_name_color }
                      : undefined}
                  >
                    {user.name}
                  </h1>
                  {user.role !== 'user' && (
                    <span className={cn('badge text-xs border', roleBadgeCls[user.role])}>{roleLabels[user.role] || user.role}</span>
                  )}
                </div>

                <p className="text-[#94a3b8] text-sm mb-3">{user.bio || 'No bio yet'}</p>

                {/* Meta chips */}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs text-[#cbd5e1]">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-[rgba(148,163,184,0.15)]">
                    <Calendar className="w-3.5 h-3.5 text-[#94a3b8]" /> Joined {joinedDate}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-[rgba(148,163,184,0.15)]">
                    <Eye className="w-3.5 h-3.5 text-[#94a3b8]" /> {stats.followers || 0} Followers
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-[rgba(148,163,184,0.15)]">
                    <UserCheck className="w-3.5 h-3.5 text-[#94a3b8]" /> {stats.following || 0} Following
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300">
                    <Flame className="w-3.5 h-3.5" /> Level {level}
                  </span>
                </div>
              </div>

              {/* Follow button */}
              {currentUser?.id && currentUser.id !== Number(id) && (
                <div className="flex-shrink-0 sm:self-start">
                  <button
                    onClick={handleFollow}
                    disabled={followLoading || !currentUser}
                    className={cn(
                      'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 shadow-lg',
                      isFollowing
                        ? 'bg-[#1e293b] border border-[rgba(148,163,184,0.2)] text-[#e2e8f0] hover:text-white'
                        : 'bg-gradient-to-r from-[#0ea5e9] to-[#6366f1] hover:opacity-90 text-white shadow-[#0ea5e9]/30'
                    )}
                  >
                    {followLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : isFollowing ? <UserCheck className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                    {isFollowing ? 'Following' : 'Follow'}
                  </button>
                </div>
              )}
            </div>

            {/* XP progress bar */}
            <div className="mt-5 pt-4 border-t border-[rgba(148,163,184,0.12)]">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="inline-flex items-center gap-1.5 font-medium text-[#e2e8f0]">
                  <Trophy className="w-3.5 h-3.5 text-[#fbbf24]" /> {xp.toLocaleString()} XP
                </span>
                <span className="text-[#94a3b8]">{xpInLevel.toLocaleString()} / 1,000 to Level {level + 1}</span>
              </div>
              <div className="h-2 rounded-full bg-[#1e293b] overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${xpPct}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="h-full rounded-full bg-gradient-to-r from-[#0ea5e9] to-[#fbbf24]"
                />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4">
        {/* Referral code (own profile only) */}
        {isOwnProfile && currentUser?.referral_code && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-8"
          >
            <div className="bg-gradient-to-r from-[#0ea5e9]/15 via-[#a855f7]/10 to-[#f59e0b]/15 border border-[rgba(148,163,184,0.15)] rounded-2xl p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-[#f8fafc] flex items-center gap-2 mb-1">
                    <Gift className="w-5 h-5 text-[#0ea5e9]" /> Your Referral Code
                  </h2>
                  <p className="text-[#94a3b8] text-sm">Share this code with friends — they can enter it when creating an account.</p>
                </div>
                <button
                  onClick={handleCopyReferral}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0ea5e9] hover:bg-[#0284c7] text-white rounded-xl font-semibold transition-colors"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span className="font-mono font-bold tracking-wider">{copied ? 'Copied!' : currentUser.referral_code}</span>
                </button>
              </div>
            </div>
          </motion.section>
        )}

        {/* Stats */}
        <section className="mt-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {STAT_CARDS.map((s) => {
              const Icon = s.icon;
              return (
                <motion.div
                  key={s.key}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.05 }}
                  className="group bg-[#1e293b]/60 backdrop-blur border border-[rgba(148,163,184,0.12)] rounded-xl p-4 text-center hover:border-[rgba(148,163,184,0.25)] hover:-translate-y-0.5 transition-all"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2.5"
                    style={{ backgroundColor: s.bg }}
                  >
                    <Icon className="w-5 h-5" style={{ color: s.color }} />
                  </div>
                  <div className="text-2xl font-bold text-[#f8fafc] leading-none">{stats[s.key] ?? 0}</div>
                  <div className="text-xs text-[#94a3b8] mt-1">{s.label}</div>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* Watchlist */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-12"
        >
          <h2 className="text-xl font-bold text-[#f8fafc] mb-4 flex items-center gap-2">
            <ListVideo className="w-5 h-5 text-[#0ea5e9]" /> Recently Added
            {recent_watchlist.length > 0 && <span className="text-sm font-normal text-[#94a3b8]">({recent_watchlist.length})</span>}
          </h2>
          {recent_watchlist.length === 0 ? (
            <div className="bg-[#1e293b]/50 border border-dashed border-[rgba(148,163,184,0.2)] rounded-xl p-8 text-center">
              <Bookmark className="w-8 h-8 text-[#94a3b8]/40 mx-auto mb-2" />
              <p className="text-[#94a3b8] text-sm">No anime in watchlist yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {recent_watchlist.map((anime, i) => {
                const status = STATUS_META[anime.status] || { label: anime.status, cls: 'bg-white/10 text-[#cbd5e1] border-white/20' };
                return (
                  <motion.div
                    key={anime.id}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: Math.min(i * 0.04, 0.3) }}
                  >
                    <Link to={`/anime/${anime.slug}`} className="block group">
                      <div className="card-anime overflow-hidden bg-[#1e293b]/50 border border-[rgba(148,163,184,0.1)] hover:border-[rgba(148,163,184,0.3)] rounded-xl transition-all">
                        <div className="relative aspect-[3/4]">
                          <img src={anime.poster || '/placeholder.jpg'} alt={anime.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                              <Play className="w-4 h-4 text-white fill-white" />
                            </span>
                          </div>
                          <span className={cn('absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-semibold border backdrop-blur', status.cls)}>
                            {status.label}
                          </span>
                        </div>
                        <div className="p-2.5">
                          <h3 className="text-xs font-medium text-[#f8fafc] truncate">{anime.title}</h3>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.section>

        {/* Recent comments */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-12 mb-16"
        >
          <h2 className="text-xl font-bold text-[#f8fafc] mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#0ea5e9]" /> Recent Comments
            {recent_comments.length > 0 && <span className="text-sm font-normal text-[#94a3b8]">({recent_comments.length})</span>}
          </h2>
          {recent_comments.length === 0 ? (
            <div className="bg-[#1e293b]/50 border border-dashed border-[rgba(148,163,184,0.2)] rounded-xl p-8 text-center">
              <MessageSquare className="w-8 h-8 text-[#94a3b8]/40 mx-auto mb-2" />
              <p className="text-[#94a3b8] text-sm">No comments yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recent_comments.map((c) => (
                <div
                  key={c.id}
                  className="group bg-[#1e293b]/60 backdrop-blur border border-[rgba(148,163,184,0.12)] rounded-xl p-4 border-l-2"
                  style={{ borderLeftColor: accent }}
                >
                  <p className="text-[#f8fafc] text-sm line-clamp-2 italic">"{c.content}"</p>
                  <div className="flex items-center gap-2 mt-3">
                    {c.anime_slug ? (
                      <Link to={`/anime/${c.anime_slug}`} className="text-[#0ea5e9] text-xs font-medium hover:underline">
                        {c.anime_title}
                      </Link>
                    ) : (
                      <span className="text-[#94a3b8] text-xs">Anime</span>
                    )}
                    <span className="text-[#64748b] text-xs">
                      · {new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.section>
      </div>
    </div>
  );
}