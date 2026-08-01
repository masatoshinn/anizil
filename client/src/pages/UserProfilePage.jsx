import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, MessageSquare, Bookmark, Trophy, CheckCircle, ListVideo, ChevronLeft, Loader2, UserPlus, UserCheck, Gift, Copy, Check } from 'lucide-react';
import api from '../lib/api';
import useSEO from '../hooks/useSEO';
import useAuthStore from '../store/authStore';

const roleLabels = {
  super_admin: 'Super Admin',
  content_admin: 'Content Admin',
  moderator: 'Moderator',
  user: 'Member'
};

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

  return (
    <div className="min-h-screen">
      {/* Header */}
      <section className="relative py-12 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0ea5e9]/10 via-[#0f172a] to-transparent" />
        {user.banner_image && (
          <div className="absolute inset-0">
            <img src={user.banner_image} alt="" className="w-full h-full object-cover opacity-20" />
            <div className="absolute inset-0 bg-gradient-to-b from-[#0f172a]/60 via-[#0f172a]/40 to-[#0f172a]" />
          </div>
        )}
        <div className="relative max-w-4xl mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="relative flex-shrink-0">
              <div className="w-28 h-28 rounded-2xl overflow-hidden border-2 border-[#0ea5e9] shadow-lg shadow-[#0ea5e9]/20">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-[#1e293b] flex items-center justify-center text-4xl font-bold text-[#0ea5e9]">
                    {user.name?.[0] || 'U'}
                  </div>
                )}
              </div>
              {user.badges?.length > 0 && (
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-1 bg-[#0f172a] px-2 py-1 rounded-full border border-[rgba(148,163,184,0.12)]">
                  {user.badges.map((b) => (
                    <span key={b.id} title={b.name} className="text-sm" style={{ color: b.color }}>{b.icon}</span>
                  ))}
                </div>
              )}
            </div>
            <div className="text-center sm:text-left flex-1">
              <div className="flex flex-col sm:flex-row items-center sm:items-center gap-2 mb-1">
                <h1
                  className="text-3xl font-bold text-[#f8fafc]"
                  style={user.active_name_color
                    ? user.active_name_color.startsWith('linear-gradient')
                      ? { color: 'transparent', backgroundImage: user.active_name_color, WebkitBackgroundClip: 'text', backgroundClip: 'text' }
                      : { color: user.active_name_color }
                    : undefined}
                >
                  {user.name}
                </h1>
                {user.role !== 'user' && (
                  <span className="badge badge-primary text-xs">{roleLabels[user.role] || user.role}</span>
                )}
                <span className="badge badge-primary text-xs flex items-center gap-1">
                  <Trophy className="w-3 h-3 text-[#fbbf24]" /> Level {user.level}
                </span>
                {currentUser?.id && currentUser.id !== Number(id) && (
                  <button
                    onClick={handleFollow}
                    disabled={followLoading}
                    className={`ml-0 sm:ml-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
                      isFollowing
                        ? 'bg-[#1e293b] border border-[rgba(148,163,184,0.2)] text-[#94a3b8] hover:text-[#f8fafc]'
                        : 'bg-[#0ea5e9] hover:bg-[#0284c7] text-white'
                    }`}
                  >
                    {isFollowing ? <UserCheck className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
                    {isFollowing ? 'Following' : 'Follow'}
                  </button>
                )}
              </div>
              <p className="text-[#94a3b8] text-sm">{user.bio || 'No bio yet'}</p>
              <div className="flex items-center justify-center sm:justify-start gap-4 mt-2 text-[#94a3b8] text-xs">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Joined {joinedDate}
                </span>
                <span>{stats.followers || 0} Followers</span>
                <span>{stats.following || 0} Following</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Referral code (own profile only) */}
      {isOwnProfile && currentUser?.referral_code && (
        <section className="max-w-4xl mx-auto px-4 mb-8">
          <div className="bg-gradient-to-r from-[#0ea5e9]/10 to-[#f59e0b]/10 border border-[#0ea5e9]/20 rounded-xl p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <h2 className="text-lg font-bold text-[#f8fafc] flex items-center gap-2 mb-1">
                  <Gift className="w-5 h-5 text-[#0ea5e9]" /> Your Referral Code
                </h2>
                <p className="text-[#94a3b8] text-sm">Share this code with friends — they can enter it when creating an account.</p>
              </div>
              <button
                onClick={handleCopyReferral}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0ea5e9] hover:bg-[#0284c7] text-white rounded-lg font-medium transition-colors"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span className="font-mono font-bold tracking-wider">{copied ? 'Copied!' : currentUser.referral_code}</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Stats */}
      <section className="max-w-4xl mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { icon: Bookmark, label: 'Watchlist', value: stats.watchlist },
            { icon: CheckCircle, label: 'Completed', value: stats.completed },
            { icon: MessageSquare, label: 'Comments', value: stats.comments },
            { icon: Trophy, label: 'Achievements', value: stats.achievements },
          ].map((s) => (
            <div key={s.label} className="bg-[#1e293b] border border-[rgba(148,163,184,0.12)] rounded-xl p-4 text-center">
              <s.icon className="w-5 h-5 text-[#0ea5e9] mx-auto mb-2" />
              <div className="text-2xl font-bold text-[#f8fafc]">{s.value}</div>
              <div className="text-xs text-[#94a3b8]">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Watchlist */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-10"
        >
          <h2 className="text-xl font-bold text-[#f8fafc] mb-4 flex items-center gap-2">
            <ListVideo className="w-5 h-5 text-[#0ea5e9]" /> Recently Added
          </h2>
          {recent_watchlist.length === 0 ? (
            <p className="text-[#94a3b8] text-sm">No anime in watchlist yet</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {recent_watchlist.map((anime) => (
                <Link key={anime.id} to={`/anime/${anime.slug}`}>
                  <div className="card-anime overflow-hidden group">
                    <div className="relative aspect-[3/4]">
                      <img src={anime.poster || '/placeholder.jpg'} alt={anime.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    </div>
                    <div className="p-2">
                      <h3 className="text-xs font-medium text-[#f8fafc] truncate">{anime.title}</h3>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </motion.section>

        {/* Recent comments */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="text-xl font-bold text-[#f8fafc] mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#0ea5e9]" /> Recent Comments
          </h2>
          {recent_comments.length === 0 ? (
            <p className="text-[#94a3b8] text-sm">No comments yet</p>
          ) : (
            <div className="space-y-3">
              {recent_comments.map((c) => (
                <div key={c.id} className="bg-[#1e293b] border border-[rgba(148,163,184,0.12)] rounded-xl p-4">
                  <p className="text-[#f8fafc] text-sm line-clamp-2">{c.content}</p>
                  <div className="flex items-center gap-2 mt-2">
                    {c.anime_slug ? (
                      <Link to={`/anime/${c.anime_slug}`} className="text-[#0ea5e9] text-xs hover:underline">
                        {c.anime_title}
                      </Link>
                    ) : (
                      <span className="text-[#94a3b8] text-xs">Anime</span>
                    )}
                    <span className="text-[#94a3b8] text-xs">
                      · {new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.section>
      </section>
    </div>
  );
}
