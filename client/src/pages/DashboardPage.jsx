import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, List, History, Crown, Settings, User, Trophy,
  Play, Star, Clock, Eye, Timer, Zap, Trash2, X, ChevronDown,
  Save, Lock, Check, Award, BookOpen, Flame, TrendingUp,
  AlertTriangle, ExternalLink, Moon, Sun, Globe, Shield, Mail, Frame,
} from 'lucide-react';
import useAuthStore from '../store/authStore';
import useUserStore from '../store/userStore';
import useAnimeStore from '../store/animeStore';
import useSettingsStore from '../store/settingsStore';
import useThemeStore from '../store/themeStore';
import AnimeCard from '../components/common/AnimeCard';
import Modal from '../components/common/Modal';
import Skeleton from '../components/common/Skeleton';
import api from '../lib/api';
import { cn, formatDate, timeAgo, formatNumber } from '../lib/utils';

const TABS = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'list', label: 'My List', icon: List },
  { id: 'history', label: 'History', icon: History },
  { id: 'premium', label: 'Premium', icon: Crown },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'achievements', label: 'Achievements', icon: Trophy },
];

const WATCHLIST_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'watching', label: 'Watching' },
  { id: 'completed', label: 'Completed' },
  { id: 'plan_to_watch', label: 'Plan to Watch' },
  { id: 'on_hold', label: 'On Hold' },
  { id: 'dropped', label: 'Dropped' },
];

const STATUS_OPTIONS = [
  { value: 'watching', label: 'Watching' },
  { value: 'completed', label: 'Completed' },
  { value: 'plan_to_watch', label: 'Plan to Watch' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'dropped', label: 'Dropped' },
];

const PLAN_FEATURES = {
  free: ['720p streaming', '3 concurrent streams', 'Ad-supported', 'Basic recommendations'],
  monthly: ['1080p streaming', '5 concurrent streams', 'Ad-free experience', 'Priority recommendations', '100 XP bonus/month'],
  quarterly: ['1080p streaming', '5 concurrent streams', 'Ad-free experience', 'Priority recommendations', '350 XP bonus/quarter', 'Exclusive badges'],
  yearly: ['4K streaming', '10 concurrent streams', 'Ad-free experience', 'AI recommendations', '1500 XP bonus/year', 'Exclusive badges', 'Early access to new features'],
};

const ACHIEVEMENT_DEFINITIONS = [
  { id: 'first_watch', name: 'First Steps', description: 'Watch your first episode', icon: 'Play', target: 1 },
  { id: 'watch_10', name: 'Getting Hooked', description: 'Watch 10 episodes', icon: 'Eye', target: 10 },
  { id: 'watch_50', name: 'Anime Enthusiast', description: 'Watch 50 episodes', icon: 'BookOpen', target: 50 },
  { id: 'watch_100', name: 'Century Club', description: 'Watch 100 episodes', icon: 'Award', target: 100 },
  { id: 'watch_500', name: 'Anime Legend', description: 'Watch 500 episodes', icon: 'Trophy', target: 500 },
  { id: 'complete_1', name: 'Completionist', description: 'Complete your first anime', icon: 'Check', target: 1 },
  { id: 'complete_10', name: 'Series Finisher', description: 'Complete 10 anime', icon: 'Award', target: 10 },
  { id: 'complete_25', name: 'Marathon Runner', description: 'Complete 25 anime', icon: 'Flame', target: 25 },
  { id: 'list_5', name: 'Curator', description: 'Add 5 anime to your list', icon: 'List', target: 5 },
  { id: 'list_20', name: 'Collector', description: 'Add 20 anime to your list', icon: 'Star', target: 20 },
  { id: 'streak_7', name: 'Weekly Warrior', description: 'Watch anime 7 days in a row', icon: 'Flame', target: 7 },
  { id: 'streak_30', name: 'Monthly Master', description: 'Watch anime 30 days in a row', icon: 'Crown', target: 30 },
  { id: 'early_adopter', name: 'Early Adopter', description: 'Join during the beta period', icon: 'Zap', target: 1 },
  { id: 'premium_member', name: 'VIP Access', description: 'Subscribe to Premium', icon: 'Crown', target: 1 },
  { id: 'night_owl', name: 'Night Owl', description: 'Watch anime after midnight', icon: 'Moon', target: 1 },
  { id: 'genre_master', name: 'Genre Explorer', description: 'Watch anime from 10 different genres', icon: 'Globe', target: 10 },
];

const ICON_MAP = { Play, Eye, BookOpen, Award, Trophy, Check, Flame, List, Star, Crown, Zap, Moon, Globe };

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export default function DashboardPage() {
  const { user, isAuthenticated } = useAuthStore();
  const { premiumEnabled, fetched, fetchSettings } = useSettingsStore();
  const {
    profile, watchlist, history, notifications, achievements,
    loadingProfile, loadingWatchlist, loadingHistory, loadingAchievements,
    fetchProfile, fetchWatchlist, addToWatchlist, removeFromWatchlist,
    fetchHistory, clearHistory, fetchNotifications, markNotificationsRead,
    fetchAchievements,
  } = useUserStore();
  const { trending, fetchTrending } = useAnimeStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const visibleTabs = fetched && !premiumEnabled
    ? TABS.filter(t => t.id !== 'premium')
    : TABS;

  const [activeTab, setActiveTab] = useState(() => {
    const initialTab = searchParams.get('tab') || 'home';
    return (fetched && !premiumEnabled && initialTab === 'premium') ? 'home' : initialTab;
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) setActiveTab(tab);
  }, [searchParams]);

  useEffect(() => {
    if (!isAuthenticated) { navigate('/login'); return; }
    fetchProfile();
    fetchWatchlist();
    fetchHistory();
    fetchNotifications();
    fetchAchievements();
    fetchTrending();
    if (!fetched) fetchSettings();
  }, [isAuthenticated]);

  useEffect(() => {
    const handleClick = () => setMobileMenuOpen(false);
    if (mobileMenuOpen) document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [mobileMenuOpen]);

  const activeTabData = visibleTabs.find((t) => t.id === activeTab);

  return (
    <div className="min-h-screen bg-[#0f172a]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <div className="hidden md:flex items-center gap-1 p-1 bg-[#1e293b] rounded-xl border border-[rgba(148,163,184,0.12)]">
            {visibleTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={cn('flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                    activeTab === tab.id ? 'bg-[#0ea5e9] text-white shadow-lg shadow-[#0ea5e9]/25' : 'text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#334155]'
                  )}>
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
          <div className="md:hidden relative">
            <button onClick={(e) => { e.stopPropagation(); setMobileMenuOpen(!mobileMenuOpen); }}
              className="w-full flex items-center justify-between px-4 py-3 bg-[#1e293b] rounded-xl border border-[rgba(148,163,184,0.12)] text-[#f8fafc]">
              <div className="flex items-center gap-2">
                {activeTabData && <activeTabData.icon className="w-4 h-4 text-[#0ea5e9]" />}
                <span className="font-medium">{activeTabData?.label}</span>
              </div>
              <ChevronDown className={cn('w-4 h-4 text-[#94a3b8] transition-transform', mobileMenuOpen && 'rotate-180')} />
            </button>
            <AnimatePresence>
              {mobileMenuOpen && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  className="absolute z-50 top-full left-0 right-0 mt-2 p-1 bg-[#1e293b] rounded-xl border border-[rgba(148,163,184,0.12)] shadow-xl">
                  {visibleTabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button key={tab.id} onClick={() => { setActiveTab(tab.id); setMobileMenuOpen(false); }}
                        className={cn('w-full flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors',
                          activeTab === tab.id ? 'bg-[#0ea5e9]/20 text-[#0ea5e9]' : 'text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#334155]')}>
                        <Icon className="w-4 h-4" />
                        {tab.label}
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.2 }}>
            {activeTab === 'home' && <HomeTab profile={profile} user={user} watchlist={watchlist} history={history} trending={trending} />}
            {activeTab === 'list' && <MyListTab watchlist={watchlist} loadingWatchlist={loadingWatchlist} addToWatchlist={addToWatchlist} removeFromWatchlist={removeFromWatchlist} />}
            {activeTab === 'history' && <HistoryTab history={history} loadingHistory={loadingHistory} clearHistory={clearHistory} />}
            {activeTab === 'premium' && <PremiumTab user={user} profile={profile} />}
            {activeTab === 'settings' && <SettingsTab profile={profile} user={user} fetchProfile={fetchProfile} />}
            {activeTab === 'profile' && <ProfileTab profile={profile} user={user} achievements={achievements} fetchProfile={fetchProfile} />}
            {activeTab === 'achievements' && <AchievementsTab achievements={achievements} loadingAchievements={loadingAchievements} history={history} watchlist={watchlist} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, description, actionLabel, actionTo }) {
  return (
    <div className="text-center py-16">
      <Icon className="w-12 h-12 text-[#94a3b8] mx-auto mb-4 opacity-50" />
      <h3 className="text-lg font-semibold text-[#f8fafc] mb-2">{title}</h3>
      <p className="text-[#94a3b8] mb-6">{description}</p>
      {actionLabel && actionTo && (
        <Link to={actionTo}
          className="inline-flex items-center gap-2 bg-[#0ea5e9] hover:bg-[#0ea5e9]/90 text-white px-6 py-2.5 rounded-lg font-medium transition-colors">
          {actionLabel}
        </Link>
      )}
    </div>
  );
}

function HomeTab({ profile, user, watchlist, history, trending }) {
  const continueWatching = (history || []).filter((h) => h.progress != null && h.progress < 100).slice(0, 6);
  const recentActivity = (history || []).slice(0, 8);

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0ea5e9]/20 via-[#1e293b] to-[#0f172a] border border-[rgba(148,163,184,0.12)] p-6 sm:p-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#0ea5e9]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[#0ea5e9]/20 border-2 border-[#0ea5e9] flex items-center justify-center overflow-hidden flex-shrink-0">
            {profile?.avatar || user?.avatar ? (
              <img src={profile?.avatar || user?.avatar} alt="" className="w-full h-full object-cover" />
            ) : (<User className="w-8 h-8 text-[#0ea5e9]" />)}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#f8fafc] mb-1">
              Welcome back, {profile?.name || user?.name || 'Anime Fan'}!
            </h1>
            <p className="text-[#94a3b8]">
              {watchlist?.length > 0 ? `You have ${watchlist.length} anime in your list. Keep watching!` : 'Start building your watchlist today!'}
            </p>
          </div>
        </div>
      </motion.div>

      {continueWatching.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-4">
            <Play className="w-5 h-5 text-[#0ea5e9]" />
            <h2 className="text-xl font-bold text-[#f8fafc]">Continue Watching</h2>
          </div>
          <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {continueWatching.map((entry, i) => (
              <motion.div key={entry._id || i} variants={item}><ContinueWatchingCard entry={entry} /></motion.div>
            ))}
          </motion.div>
        </section>
      )}

      {trending?.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="w-5 h-5 text-orange-500" />
            <h2 className="text-xl font-bold text-[#f8fafc]">Recommended for You</h2>
          </div>
          <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {trending.slice(0, 10).map((anime, i) => (
              <motion.div key={anime._id || anime.slug || i} variants={item}><AnimeCard anime={anime} /></motion.div>
            ))}
          </motion.div>
        </section>
      )}

      {recentActivity.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-4">
            <Clock className="w-5 h-5 text-[#94a3b8]" />
            <h2 className="text-xl font-bold text-[#f8fafc]">Recent Activity</h2>
          </div>
          <div className="bg-[#1e293b] rounded-xl border border-[rgba(148,163,184,0.12)] divide-y divide-[rgba(148,163,184,0.12)]">
            {recentActivity.map((entry, i) => (
              <div key={entry._id || i} className="flex items-center gap-3 p-3 sm:p-4">
                <div className="w-16 h-10 rounded-lg bg-[#0f172a] overflow-hidden flex-shrink-0">
                  {entry.anime?.poster || entry.poster ? (
                    <img src={entry.anime?.poster || entry.poster} alt="" className="w-full h-full object-cover" />
                  ) : (<div className="w-full h-full flex items-center justify-center"><Play className="w-4 h-4 text-[#94a3b8]" /></div>)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#f8fafc] font-medium truncate">{entry.anime?.title || entry.title || 'Unknown Anime'}</p>
                  <p className="text-xs text-[#94a3b8]">Episode {entry.episodeNumber || entry.episode || '?'}{entry.progress != null ? ` \u2014 ${entry.progress}%` : ''}</p>
                </div>
                <span className="text-xs text-[#94a3b8] flex-shrink-0">{timeAgo(entry.watchedAt || entry.updatedAt || entry.createdAt)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {continueWatching.length === 0 && recentActivity.length === 0 && trending?.length === 0 && (
        <EmptyState icon={Play} title="Your dashboard is empty" description="Start watching anime to see your progress here." actionLabel="Explore Anime" actionTo="/" />
      )}
    </div>
  );
}

function ContinueWatchingCard({ entry }) {
  const anime = entry.anime || entry;
  const progress = entry.progress || 0;
  return (
    <Link to={`/anime/${anime.slug || anime._id}`}
      className="flex items-center gap-3 p-3 bg-[#1e293b] hover:bg-[#334155] rounded-xl border border-[rgba(148,163,184,0.12)] transition-colors group">
      <div className="w-20 h-12 rounded-lg bg-[#0f172a] overflow-hidden flex-shrink-0 relative">
        {anime.poster ? (<img src={anime.poster} alt="" className="w-full h-full object-cover" />) : (
          <div className="w-full h-full flex items-center justify-center"><Play className="w-5 h-5 text-[#94a3b8]" /></div>)}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
          <Play className="w-5 h-5 text-white" fill="currentColor" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#f8fafc] truncate">{anime.title || 'Unknown'}</p>
        <p className="text-xs text-[#94a3b8] mb-1.5">Ep {entry.episodeNumber || entry.episode || '?'}</p>
        <div className="w-full bg-[#0f172a] rounded-full h-1.5">
          <div className="bg-[#0ea5e9] h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-[10px] text-[#94a3b8] mt-1">{progress}%</p>
      </div>
    </Link>
  );
}

function MyListTab({ watchlist, loadingWatchlist, addToWatchlist, removeFromWatchlist }) {
  const [activeFilter, setActiveFilter] = useState('all');
  const [statusDropdown, setStatusDropdown] = useState(null);

  const filteredList = activeFilter === 'all'
    ? watchlist || []
    : (watchlist || []).filter((item) => (item.status || item.watchStatus) === activeFilter);

  const handleStatusChange = async (animeId, newStatus) => {
    await addToWatchlist(animeId, newStatus);
    setStatusDropdown(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[#f8fafc]">My List</h2>
        <span className="text-sm text-[#94a3b8]">{watchlist?.length || 0} anime</span>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
        {WATCHLIST_FILTERS.map((filter) => {
          const count = filter.id === 'all' ? watchlist?.length || 0
            : (watchlist || []).filter((item) => (item.status || item.watchStatus) === filter.id).length;
          return (
            <button key={filter.id} onClick={() => setActiveFilter(filter.id)}
              className={cn('flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                activeFilter === filter.id ? 'bg-[#0ea5e9] text-white'
                  : 'bg-[#1e293b] text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#334155] border border-[rgba(148,163,184,0.12)]')}>
              {filter.label}
              <span className={cn('text-xs px-1.5 py-0.5 rounded-full', activeFilter === filter.id ? 'bg-white/20' : 'bg-[#0f172a]')}>{count}</span>
            </button>
          );
        })}
      </div>

      {loadingWatchlist ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} type="anime-card" />)}
        </div>
      ) : filteredList.length > 0 ? (
        <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredList.map((entry, i) => {
            const anime = entry.anime || entry;
            const animeId = anime._id || anime.id || entry.animeId;
            const currentStatus = entry.status || entry.watchStatus || 'watching';
            return (
              <motion.div key={animeId || i} variants={item} className="relative group">
                <AnimeCard anime={anime} />
                <div className="absolute top-2 left-2 right-2 flex items-start justify-between opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <div className="relative">
                    <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setStatusDropdown(statusDropdown === animeId ? null : animeId); }}
                      className="px-2 py-1 text-[10px] font-semibold rounded-md bg-[#0ea5e9] text-white capitalize">
                      {currentStatus.replace(/_/g, ' ')}
                    </button>
                    <AnimatePresence>
                      {statusDropdown === animeId && (
                        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                          className="absolute top-full left-0 mt-1 p-1 bg-[#1e293b] rounded-lg border border-[rgba(148,163,184,0.12)] shadow-xl z-20 min-w-[140px]"
                          onClick={(e) => e.preventDefault()}>
                          {STATUS_OPTIONS.map((opt) => (
                            <button key={opt.value} onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleStatusChange(animeId, opt.value); }}
                              className={cn('w-full text-left px-3 py-1.5 text-xs rounded-md transition-colors',
                                currentStatus === opt.value ? 'bg-[#0ea5e9]/20 text-[#0ea5e9]' : 'text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#334155]')}>
                              {opt.label}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeFromWatchlist(animeId); }}
                    className="p-1 rounded-md bg-red-500/80 hover:bg-red-500 text-white transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      ) : (
        <EmptyState icon={List} title={`No ${activeFilter === 'all' ? '' : activeFilter.replace(/_/g, ' ') + ' '}anime`}
          description="Add anime to your list to track your progress." actionLabel="Explore Anime" actionTo="/" />
      )}
    </div>
  );
}

function HistoryTab({ history, loadingHistory, clearHistory }) {
  const [showClearModal, setShowClearModal] = useState(false);
  const [page, setPage] = useState(1);
  const perPage = 20;

  const sortedHistory = [...(history || [])].sort(
    (a, b) => new Date(b.watchedAt || b.updatedAt || b.createdAt) - new Date(a.watchedAt || a.updatedAt || a.createdAt)
  );
  const totalPages = Math.ceil(sortedHistory.length / perPage);
  const paginatedHistory = sortedHistory.slice((page - 1) * perPage, page * perPage);

  const handleClearHistory = async () => { await clearHistory(); setShowClearModal(false); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[#f8fafc]">Watch History</h2>
        {sortedHistory.length > 0 && (
          <button onClick={() => setShowClearModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors">
            <Trash2 className="w-4 h-4" /> Clear History
          </button>
        )}
      </div>

      {loadingHistory ? (
        <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : paginatedHistory.length > 0 ? (
        <>
          <div className="space-y-2">
            {paginatedHistory.map((entry, i) => {
              const anime = entry.anime || entry;
              const progress = entry.progress || 0;
              return (
                <motion.div key={entry._id || i} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-[#1e293b] rounded-xl border border-[rgba(148,163,184,0.12)] hover:bg-[#334155] transition-colors">
                  <div className="w-20 h-12 sm:w-24 sm:h-14 rounded-lg bg-[#0f172a] overflow-hidden flex-shrink-0">
                    {anime.poster ? (<img src={anime.poster} alt="" className="w-full h-full object-cover" />) : (
                      <div className="w-full h-full flex items-center justify-center"><Play className="w-5 h-5 text-[#94a3b8]" /></div>)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link to={`/anime/${anime.slug || anime._id}`}
                      className="text-sm font-medium text-[#f8fafc] hover:text-[#0ea5e9] transition-colors truncate block">
                      {anime.title || 'Unknown Anime'}
                    </Link>
                    <p className="text-xs text-[#94a3b8]">Episode {entry.episodeNumber || entry.episode || '?'}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex-1 max-w-[120px] bg-[#0f172a] rounded-full h-1.5">
                        <div className={cn('h-1.5 rounded-full transition-all', progress >= 100 ? 'bg-green-500' : 'bg-[#0ea5e9]')}
                          style={{ width: `${progress}%` }} />
                      </div>
                      <span className="text-[10px] text-[#94a3b8]">{progress}%</span>
                    </div>
                  </div>
                  <span className="text-xs text-[#94a3b8] flex-shrink-0 hidden sm:block">
                    {timeAgo(entry.watchedAt || entry.updatedAt || entry.createdAt)}
                  </span>
                </motion.div>
              );
            })}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1 pt-4">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1.5 text-sm rounded-lg text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#334155] disabled:opacity-30 disabled:cursor-not-allowed transition-colors">Prev</button>
              <span className="px-3 py-1.5 text-sm text-[#94a3b8]">Page {page} of {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-3 py-1.5 text-sm rounded-lg text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#334155] disabled:opacity-30 disabled:cursor-not-allowed transition-colors">Next</button>
            </div>
          )}
        </>
      ) : (
        <EmptyState icon={History} title="No watch history" description="Episodes you watch will appear here." actionLabel="Start Watching" actionTo="/" />
      )}

      <Modal isOpen={showClearModal} onClose={() => setShowClearModal(false)} title="Clear Watch History" size="sm">
        <div className="text-center">
          <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-7 h-7 text-red-400" />
          </div>
          <p className="text-[#f8fafc] mb-2">Are you sure you want to clear your entire watch history?</p>
          <p className="text-sm text-[#94a3b8] mb-6">This action cannot be undone.</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => setShowClearModal(false)}
              className="px-5 py-2.5 text-sm font-medium text-[#94a3b8] bg-[#0f172a] hover:bg-[#334155] rounded-lg transition-colors border border-[rgba(148,163,184,0.12)]">Cancel</button>
            <button onClick={handleClearHistory}
              className="px-5 py-2.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors">Clear History</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function PremiumTab({ user, profile }) {
  const { premiumEnabled, fetched, fetchSettings } = useSettingsStore();
  useEffect(() => { if (!fetched) fetchSettings(); }, []);

  if (fetched && !premiumEnabled) {
    return (
      <div className="space-y-8">
        <h2 className="text-2xl font-bold text-[#f8fafc]">Premium</h2>
        <div className="bg-[#1e293b] rounded-2xl border border-[rgba(148,163,184,0.12)] p-6 text-center">
          <Crown className="w-10 h-10 text-[#94a3b8] mx-auto mb-3 opacity-50" />
          <p className="text-sm text-[#94a3b8]">Premium is currently disabled by the site administrator.</p>
        </div>
      </div>
    );
  }

  const isPremium = user?.isPremium || user?.premium || profile?.isPremium;
  const expiryDate = user?.premiumExpiry || profile?.premiumExpiry;
  const xpBalance = user?.xp || profile?.xp || 0;

  const plans = [
    { id: 'monthly', name: 'Monthly', price: '$4.99', period: '/month', color: '#0ea5e9', popular: false },
    { id: 'quarterly', name: 'Quarterly', price: '$12.99', period: '/3 months', color: '#a855f7', popular: true },
    { id: 'yearly', name: 'Yearly', price: '$39.99', period: '/year', color: '#22c55e', popular: false, savings: 'Save 33%' },
  ];

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-[#f8fafc]">Premium</h2>

      {isPremium ? (
        <div className="bg-gradient-to-br from-[#a855f7]/20 via-[#1e293b] to-[#0f172a] rounded-2xl border border-[rgba(168,85,247,0.3)] p-6">
          <div className="flex items-center gap-3 mb-4">
            <Crown className="w-6 h-6 text-yellow-400" />
            <h3 className="text-lg font-bold text-[#f8fafc]">Premium Active</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#0f172a]/50 rounded-xl p-4">
              <p className="text-xs text-[#94a3b8] mb-1">Plan</p>
              <p className="text-[#f8fafc] font-semibold capitalize">{user?.premiumPlan || 'Premium'}</p>
            </div>
            <div className="bg-[#0f172a]/50 rounded-xl p-4">
              <p className="text-xs text-[#94a3b8] mb-1">Expires</p>
              <p className="text-[#f8fafc] font-semibold">{formatDate(expiryDate)}</p>
            </div>
            <div className="bg-[#0f172a]/50 rounded-xl p-4">
              <p className="text-xs text-[#94a3b8] mb-1">XP Balance</p>
              <p className="text-[#f8fafc] font-semibold flex items-center gap-1">
                <Zap className="w-4 h-4 text-yellow-400" /> {formatNumber(xpBalance)}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#1e293b] rounded-2xl border border-[rgba(148,163,184,0.12)] p-6 text-center">
          <Crown className="w-10 h-10 text-[#94a3b8] mx-auto mb-3 opacity-50" />
          <h3 className="text-lg font-semibold text-[#f8fafc] mb-1">Free Plan</h3>
          <p className="text-sm text-[#94a3b8]">Upgrade for an ad-free experience and exclusive perks.</p>
        </div>
      )}

      <div className="bg-[#1e293b] rounded-xl border border-[rgba(148,163,184,0.12)] p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            <h3 className="font-semibold text-[#f8fafc]">XP Balance</h3>
          </div>
          <span className="text-2xl font-bold text-yellow-400">{formatNumber(xpBalance)}</span>
        </div>
        <div className="w-full bg-[#0f172a] rounded-full h-2">
          <div className="bg-gradient-to-r from-yellow-400 to-orange-500 h-2 rounded-full"
            style={{ width: `${Math.min((xpBalance % 1000) / 10, 100)}%` }} />
        </div>
        <p className="text-xs text-[#94a3b8] mt-2">{1000 - (xpBalance % 1000)} XP to next reward</p>
      </div>

      <div>
        <h3 className="text-lg font-bold text-[#f8fafc] mb-4">Choose a Plan</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <motion.div key={plan.id} whileHover={{ y: -4 }}
              className={cn('relative bg-[#1e293b] rounded-2xl border p-6 transition-colors',
                plan.popular ? 'border-[#a855f7] shadow-lg shadow-[#a855f7]/10' : 'border-[rgba(148,163,184,0.12)] hover:border-[rgba(148,163,184,0.25)]')}>
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-[#a855f7] text-white text-xs font-bold rounded-full">MOST POPULAR</div>
              )}
              {plan.savings && (
                <div className="absolute -top-3 right-4 px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full">{plan.savings}</div>
              )}
              <h4 className="text-lg font-bold text-[#f8fafc] mb-2">{plan.name}</h4>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-3xl font-bold" style={{ color: plan.color }}>{plan.price}</span>
                <span className="text-sm text-[#94a3b8]">{plan.period}</span>
              </div>
              <ul className="space-y-2 mb-6">
                {PLAN_FEATURES[plan.id].map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[#94a3b8]">
                    <Check className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: plan.color }} />
                    {feature}
                  </li>
                ))}
              </ul>
              <button className={cn('w-full py-2.5 rounded-lg font-medium transition-colors text-sm',
                plan.popular ? 'bg-[#a855f7] hover:bg-[#a855f7]/90 text-white'
                  : 'bg-[#0f172a] hover:bg-[#334155] text-[#f8fafc] border border-[rgba(148,163,184,0.12)]')}>
                {isPremium ? 'Current Plan' : 'Upgrade'}
              </button>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="bg-[#1e293b] rounded-xl border border-[rgba(148,163,184,0.12)] p-5">
        <h4 className="font-semibold text-[#f8fafc] mb-3">Free Plan Includes</h4>
        <ul className="space-y-2">
          {PLAN_FEATURES.free.map((feature, i) => (
            <li key={i} className="flex items-center gap-2 text-sm text-[#94a3b8]">
              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
              {feature}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function SettingsTab({ profile, user, fetchProfile }) {
  const [formData, setFormData] = useState({ name: '', avatar: '', bio: '', language: 'en' });
  const { theme, toggleTheme } = useThemeStore();
  const [password, setPassword] = useState({ current: '', new: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        avatar: profile.avatar || '',
        bio: profile.bio || '',
        language: profile.language || 'en',
      });
    }
  }, [profile]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveMessage('');
    try {
      await api.put('/user/profile', formData);
      setSaveMessage('Profile saved successfully!');
      fetchProfile();
      setTimeout(() => setSaveMessage(''), 3000);
    } catch {
      setSaveMessage('Failed to save profile. Please try again.');
    }
    setSaving(false);
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (password.new !== password.confirm) {
      setPasswordMessage('New passwords do not match.');
      return;
    }
    if (password.new.length < 6) {
      setPasswordMessage('Password must be at least 6 characters.');
      return;
    }
    setPasswordSaving(true);
    setPasswordMessage('');
    try {
      await api.put('/user/password', { currentPassword: password.current, newPassword: password.new });
      setPasswordMessage('Password changed successfully!');
      setPassword({ current: '', new: '', confirm: '' });
      setTimeout(() => setPasswordMessage(''), 3000);
    } catch (err) {
      setPasswordMessage(err.response?.data?.message || 'Failed to change password.');
    }
    setPasswordSaving(false);
  };

  const handleThemeToggle = () => {
    toggleTheme();
  };

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-[#f8fafc]">Settings</h2>

      <form onSubmit={handleSave} className="bg-[#1e293b] rounded-2xl border border-[rgba(148,163,184,0.12)] p-6 space-y-6">
        <h3 className="text-lg font-semibold text-[#f8fafc]">Profile</h3>

        <div className="flex flex-col sm:flex-row items-start gap-6">
          <div className="flex-shrink-0">
            <div className="w-24 h-24 rounded-full bg-[#0f172a] border-2 border-[rgba(148,163,184,0.12)] overflow-hidden flex items-center justify-center">
              {formData.avatar ? (
                <img src={formData.avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User className="w-10 h-10 text-[#94a3b8]" />
              )}
            </div>
          </div>
          <div className="flex-1 w-full space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#94a3b8] mb-1.5">Name</label>
              <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2.5 bg-[#0f172a] border border-[rgba(148,163,184,0.12)] rounded-lg text-[#f8fafc] placeholder-[#94a3b8] focus:outline-none focus:border-[#0ea5e9] transition-colors"
                placeholder="Your name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#94a3b8] mb-1.5">Avatar URL</label>
              <input type="url" value={formData.avatar} onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                className="w-full px-4 py-2.5 bg-[#0f172a] border border-[rgba(148,163,184,0.12)] rounded-lg text-[#f8fafc] placeholder-[#94a3b8] focus:outline-none focus:border-[#0ea5e9] transition-colors"
                placeholder="https://example.com/avatar.jpg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#94a3b8] mb-1.5">Bio</label>
              <textarea value={formData.bio} onChange={(e) => setFormData({ ...formData, bio: e.target.value })} rows={3}
                className="w-full px-4 py-2.5 bg-[#0f172a] border border-[rgba(148,163,184,0.12)] rounded-lg text-[#f8fafc] placeholder-[#94a3b8] focus:outline-none focus:border-[#0ea5e9] transition-colors resize-none"
                placeholder="Tell us about yourself..." />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[#94a3b8] mb-1.5">Language</label>
            <select value={formData.language} onChange={(e) => setFormData({ ...formData, language: e.target.value })}
              className="w-full px-4 py-2.5 bg-[#0f172a] border border-[rgba(148,163,184,0.12)] rounded-lg text-[#f8fafc] focus:outline-none focus:border-[#0ea5e9] transition-colors">
              <option value="en">English</option>
              <option value="ja">Japanese</option>
              <option value="es">Spanish</option>
              <option value="pt">Portuguese</option>
              <option value="ko">Korean</option>
              <option value="zh">Chinese</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#94a3b8] mb-1.5">Theme</label>
            <button type="button" onClick={handleThemeToggle}
              className="flex items-center gap-3 w-full px-4 py-2.5 bg-[#0f172a] border border-[rgba(148,163,184,0.12)] rounded-lg text-[#f8fafc] hover:border-[#0ea5e9] transition-colors">
              {theme === 'dark' ? <Moon className="w-4 h-4 text-[#0ea5e9]" /> : <Sun className="w-4 h-4 text-yellow-400" />}
              <span className="capitalize">{theme} Mode</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#0ea5e9] hover:bg-[#0ea5e9]/90 text-white rounded-lg font-medium transition-colors disabled:opacity-50">
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          {saveMessage && (
            <span className={cn('text-sm', saveMessage.includes('success') ? 'text-green-400' : 'text-red-400')}>{saveMessage}</span>
          )}
        </div>
      </form>

      <form onSubmit={handlePasswordChange} className="bg-[#1e293b] rounded-2xl border border-[rgba(148,163,184,0.12)] p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-[#94a3b8]" />
          <h3 className="text-lg font-semibold text-[#f8fafc]">Change Password</h3>
        </div>
        <div>
          <label className="block text-sm font-medium text-[#94a3b8] mb-1.5">Current Password</label>
          <input type="password" value={password.current} onChange={(e) => setPassword({ ...password, current: e.target.value })}
            className="w-full px-4 py-2.5 bg-[#0f172a] border border-[rgba(148,163,184,0.12)] rounded-lg text-[#f8fafc] placeholder-[#94a3b8] focus:outline-none focus:border-[#0ea5e9] transition-colors"
            placeholder="Enter current password" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[#94a3b8] mb-1.5">New Password</label>
            <input type="password" value={password.new} onChange={(e) => setPassword({ ...password, new: e.target.value })}
              className="w-full px-4 py-2.5 bg-[#0f172a] border border-[rgba(148,163,184,0.12)] rounded-lg text-[#f8fafc] placeholder-[#94a3b8] focus:outline-none focus:border-[#0ea5e9] transition-colors"
              placeholder="Enter new password" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#94a3b8] mb-1.5">Confirm New Password</label>
            <input type="password" value={password.confirm} onChange={(e) => setPassword({ ...password, confirm: e.target.value })}
              className="w-full px-4 py-2.5 bg-[#0f172a] border border-[rgba(148,163,184,0.12)] rounded-lg text-[#f8fafc] placeholder-[#94a3b8] focus:outline-none focus:border-[#0ea5e9] transition-colors"
              placeholder="Confirm new password" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button type="submit" disabled={passwordSaving}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#1e293b] hover:bg-[#334155] text-[#f8fafc] rounded-lg font-medium transition-colors border border-[rgba(148,163,184,0.12)] disabled:opacity-50">
            <Lock className="w-4 h-4" />
            {passwordSaving ? 'Changing...' : 'Change Password'}
          </button>
          {passwordMessage && (
            <span className={cn('text-sm', passwordMessage.includes('success') ? 'text-green-400' : 'text-red-400')}>{passwordMessage}</span>
          )}
        </div>
      </form>
    </div>
  );
}

function ProfileTab({ profile, user, achievements, fetchProfile }) {
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({ name: '', avatar: '', bio: '', language: 'en' });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [myFrames, setMyFrames] = useState([]);
  const [activeFrameId, setActiveFrameId] = useState(null);
  const [frameMsg, setFrameMsg] = useState('');
  const [loadingFrames, setLoadingFrames] = useState(false);

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        avatar: profile.avatar || '',
        bio: profile.bio || '',
        language: profile.language || 'en',
      });
    }
  }, [profile]);

  useEffect(() => {
    loadMyFrames();
  }, []);

  const loadMyFrames = async () => {
    setLoadingFrames(true);
    try {
      const res = await api.get('/shop/frames/my');
      const data = res.data.data || {};
      setMyFrames(data.frames || []);
      setActiveFrameId(data.active_frame_id || null);
    } catch {}
    setLoadingFrames(false);
  };

  const handleActivateFrame = async (frameId) => {
    setFrameMsg('');
    try {
      await api.post('/shop/frames/activate', { frame_id: frameId });
      setActiveFrameId(frameId);
      setFrameMsg('Frame updated!');
      setTimeout(() => setFrameMsg(''), 2000);
    } catch (err) {
      setFrameMsg(err.response?.data?.message || 'Failed');
    }
  };

  const handleRemoveFrame = async () => {
    setFrameMsg('');
    try {
      await api.post('/shop/frames/activate', { frame_id: null });
      setActiveFrameId(null);
      setFrameMsg('Frame removed!');
      setTimeout(() => setFrameMsg(''), 2000);
    } catch (err) {
      setFrameMsg(err.response?.data?.message || 'Failed');
    }
  };

  const activeFrame = myFrames.find(f => f.frame_id === activeFrameId);

  const totalAnimeWatched = profile?.animeWatched || profile?.stats?.animeWatched || 0;
  const totalEpisodesWatched = profile?.episodesWatched || profile?.stats?.episodesWatched || 0;
  const hoursSpent = Math.round(totalEpisodesWatched * 0.35 * 10) / 10;
  const xp = user?.xp || profile?.xp || 0;
  const level = Math.min(100, Math.floor(xp / 1000) + 1);
  const xpInLevel = xp % 1000;
  const xpProgress = (xpInLevel / 1000) * 100;
  const achievementsCount = achievements?.length || 0;

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveMsg('');
    try {
      await api.put('/user/profile', formData);
      setSaveMsg('Profile saved!');
      setEditing(false);
      fetchProfile();
      setTimeout(() => setSaveMsg(''), 3000);
    } catch {
      setSaveMsg('Failed to save. Please try again.');
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[#f8fafc]">Profile</h2>
        <button onClick={() => { setEditing(!editing); setSaveMsg(''); }}
          className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-colors border border-[rgba(148,163,184,0.12)] text-[#94a3b8] hover:text-[#f8fafc] hover:border-[#0ea5e9]/50">
          {editing ? <X className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {editing ? 'Cancel' : 'Edit Profile'}
        </button>
      </div>

      <div className="bg-[#1e293b] rounded-2xl border border-[rgba(148,163,184,0.12)] p-6">
        {editing ? (
          <form onSubmit={handleSaveProfile} className="space-y-5">
            <div className="flex flex-col sm:flex-row items-start gap-6">
              <div className="flex-shrink-0">
                <div className="w-24 h-24 rounded-full bg-[#0f172a] border-2 border-[rgba(148,163,184,0.12)] overflow-hidden flex items-center justify-center">
                  {formData.avatar ? (
                    <img src={formData.avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-10 h-10 text-[#94a3b8]" />
                  )}
                </div>
              </div>
              <div className="flex-1 w-full space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#94a3b8] mb-1.5">Name</label>
                  <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#0f172a] border border-[rgba(148,163,184,0.12)] rounded-lg text-[#f8fafc] placeholder-[#94a3b8] focus:outline-none focus:border-[#0ea5e9] transition-colors"
                    placeholder="Your name" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#94a3b8] mb-1.5">Avatar URL</label>
                  <input type="url" value={formData.avatar} onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#0f172a] border border-[rgba(148,163,184,0.12)] rounded-lg text-[#f8fafc] placeholder-[#94a3b8] focus:outline-none focus:border-[#0ea5e9] transition-colors"
                    placeholder="https://example.com/avatar.jpg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#94a3b8] mb-1.5">Bio</label>
                  <textarea value={formData.bio} onChange={(e) => setFormData({ ...formData, bio: e.target.value })} rows={3}
                    className="w-full px-4 py-2.5 bg-[#0f172a] border border-[rgba(148,163,184,0.12)] rounded-lg text-[#f8fafc] placeholder-[#94a3b8] focus:outline-none focus:border-[#0ea5e9] transition-colors resize-none"
                    placeholder="Tell us about yourself..." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#94a3b8] mb-1.5">Language</label>
                  <select value={formData.language} onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#0f172a] border border-[rgba(148,163,184,0.12)] rounded-lg text-[#f8fafc] focus:outline-none focus:border-[#0ea5e9] transition-colors">
                    <option value="en">English</option>
                    <option value="ja">Japanese</option>
                    <option value="es">Spanish</option>
                    <option value="pt">Portuguese</option>
                    <option value="ko">Korean</option>
                    <option value="zh">Chinese</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button type="submit" disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#0ea5e9] hover:bg-[#0ea5e9]/90 text-white rounded-lg font-medium transition-colors disabled:opacity-50">
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              {saveMsg && (
                <span className={cn('text-sm', saveMsg.includes('success') || saveMsg === 'Profile saved!' ? 'text-green-400' : 'text-red-400')}>{saveMsg}</span>
              )}
            </div>
          </form>
        ) : (
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="flex-shrink-0 relative">
                <div className="w-24 h-24 rounded-full border-3 flex items-center justify-center overflow-hidden transition-all duration-500"
                  style={{
                    borderColor: activeFrame?.border_color || '#0ea5e9',
                    boxShadow: activeFrame ? `0 0 12px 3px ${activeFrame.border_color}60, 0 0 30px 6px ${activeFrame.border_color}30, inset 0 0 8px ${activeFrame.border_color}40` : '0 0 8px 2px rgba(14,165,233,0.3)',
                  }}
                >
                  {profile?.avatar || user?.avatar ? (
                    <img src={profile?.avatar || user?.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-12 h-12 text-[#0ea5e9]" />
                  )}
                </div>
                {/* Frame badge overlay */}
                {activeFrame && (
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full border-2 border-[#0f172a] overflow-hidden bg-[#1e293b] flex items-center justify-center"
                    style={{ boxShadow: `0 0 8px ${activeFrame.border_color}80` }}>
                    {activeFrame.image_url ? (
                      <img src={activeFrame.image_url} alt={activeFrame.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full" style={{ backgroundColor: activeFrame.border_color }} />
                    )}
                  </div>
                )}
                {/* Multiple badges row at bottom of avatar */}
                {(user?.badges?.length > 0) && (
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-0.5 bg-[#0f172a]/80 px-1.5 py-0.5 rounded-full backdrop-blur-sm">
                    {user.badges.slice(0, 4).map((badge) => (
                      <span key={badge.id} className="text-[10px]" title={`${badge.name}${badge.description ? ': ' + badge.description : ''}`}>
                        {badge.icon}
                      </span>
                    ))}
                    {user.badges.length > 4 && (
                      <span className="text-[9px] text-[#94a3b8]">+{user.badges.length - 4}</span>
                    )}
                  </div>
                )}
              </div>
            <div className="text-center sm:text-left flex-1">
              <div className="flex items-center gap-2 justify-center sm:justify-start flex-wrap">
                <h3 className="text-xl font-bold text-[#f8fafc]">{profile?.name || user?.name || 'Anime Fan'}</h3>
                {(() => {
                  const roleBadges = {
                    super_admin: { label: 'Super Admin', color: 'bg-purple-500/15 text-purple-400 border-purple-500/30', icon: '👑' },
                    content_admin: { label: 'Content Admin', color: 'bg-[#0ea5e9]/15 text-[#0ea5e9] border-[#0ea5e9]/30', icon: '📝' },
                    moderator: { label: 'Moderator', color: 'bg-green-500/15 text-green-400 border-green-500/30', icon: '🛡️' },
                  };
                  const role = user?.role || profile?.role;
                  const badge = roleBadges[role];
                  if (!badge) return null;
                  return (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${badge.color}`}>
                      {badge.icon} {badge.label}
                    </span>
                  );
                })()}
                {achievements?.length > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-500/15 text-yellow-400 border border-yellow-500/30">
                    🏆 {achievements.length} Badges
                  </span>
                )}
              </div>
              <p className="text-sm text-[#94a3b8]">
                Joined {formatDate(profile?.createdAt || user?.createdAt)}
              </p>
              {profile?.email && <p className="text-sm text-[#94a3b8] mt-0.5">{profile.email}</p>}
              {profile?.bio && <p className="text-sm text-[#94a3b8] mt-1">{profile.bio}</p>}
            </div>
          </div>
        )}
      </div>

      {/* Profile Frame Selector */}
      {myFrames.length > 0 && (
        <div className="bg-[#1e293b] rounded-2xl border border-[rgba(148,163,184,0.12)] p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-[#f8fafc] flex items-center gap-2">
              <Frame className="w-5 h-5 text-[#0ea5e9]" /> Profile Frame
            </h3>
            {activeFrameId && (
              <button onClick={handleRemoveFrame} className="text-xs text-[#94a3b8] hover:text-red-400 transition-colors">
                Remove Frame
              </button>
            )}
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {myFrames.map((f) => (
              <button
                key={f.frame_id}
                onClick={() => handleActivateFrame(f.frame_id)}
                className={cn(
                  'flex flex-col items-center gap-2 p-3 rounded-xl border transition-all',
                  activeFrameId === f.frame_id
                    ? 'border-[#0ea5e9] bg-[#0ea5e9]/10'
                    : 'border-[rgba(148,163,184,0.12)] bg-[#0f172a] hover:border-[rgba(148,163,184,0.3)]'
                )}
              >
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 flex items-center justify-center"
                  style={{
                    borderColor: activeFrameId === f.frame_id ? f.border_color : f.border_color,
                    boxShadow: activeFrameId === f.frame_id ? `0 0 10px ${f.border_color}60` : 'none',
                  }}>
                  {f.image_url ? (
                    <img src={f.image_url} alt={f.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-6 h-6 rounded-full" style={{ backgroundColor: f.border_color }} />
                  )}
                </div>
                <span className="text-xs text-[#f8fafc] font-medium truncate w-full text-center">{f.name}</span>
                {activeFrameId === f.frame_id && (
                  <span className="text-[10px] text-[#0ea5e9] font-bold">ACTIVE</span>
                )}
              </button>
            ))}
          </div>
          {frameMsg && <p className="text-sm text-[#0ea5e9] mt-3">{frameMsg}</p>}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={Eye} label="Anime Watched" value={formatNumber(totalAnimeWatched)} color="#0ea5e9" />
        <StatCard icon={Play} label="Episodes" value={formatNumber(totalEpisodesWatched)} color="#22c55e" />
        <StatCard icon={Timer} label="Hours Spent" value={formatNumber(hoursSpent)} color="#a855f7" />
        <StatCard icon={Trophy} label="Achievements" value={achievementsCount} color="#facc15" />
      </div>

      <div className="bg-[#1e293b] rounded-2xl border border-[rgba(148,163,184,0.12)] p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#0ea5e9] to-[#a855f7] flex items-center justify-center">
              <span className="text-lg font-bold text-white">{level}</span>
            </div>
            <div>
              <h4 className="font-semibold text-[#f8fafc]">Level {level}</h4>
              <p className="text-xs text-[#94a3b8]">{formatNumber(xp)} total XP</p>
            </div>
          </div>
          {level < 100 && (
            <span className="text-sm text-[#94a3b8]">{1000 - xpInLevel} XP to Level {level + 1}</span>
          )}
        </div>
        <div className="w-full bg-[#0f172a] rounded-full h-3">
          <motion.div initial={{ width: 0 }} animate={{ width: `${xpProgress}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="bg-gradient-to-r from-[#0ea5e9] to-[#a855f7] h-3 rounded-full" />
        </div>
        <div className="flex justify-between mt-2 text-xs text-[#94a3b8]">
          <span>Level {level}</span>
          <span>Level {level < 100 ? level + 1 : 100}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#1e293b] rounded-xl border border-[rgba(148,163,184,0.12)] p-5">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            <span className="font-semibold text-[#f8fafc]">XP Balance</span>
          </div>
          <p className="text-2xl font-bold text-yellow-400">{formatNumber(xp)}</p>
        </div>
        <div className="bg-[#1e293b] rounded-xl border border-[rgba(148,163,184,0.12)] p-5">
          <div className="flex items-center gap-2 mb-2">
            <Flame className="w-5 h-5 text-orange-500" />
            <span className="font-semibold text-[#f8fafc]">Watch Streak</span>
          </div>
          <p className="text-2xl font-bold text-orange-500">{profile?.watchStreak || 0} days</p>
        </div>
        <div className="bg-[#1e293b] rounded-xl border border-[rgba(148,163,184,0.12)] p-5">
          <div className="flex items-center gap-2 mb-2">
            <Award className="w-5 h-5 text-[#0ea5e9]" />
            <span className="font-semibold text-[#f8fafc]">Badges Earned</span>
          </div>
          <p className="text-2xl font-bold text-[#0ea5e9]">{achievementsCount}</p>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-[#1e293b] rounded-xl border border-[rgba(148,163,184,0.12)] p-4 text-center">
      <Icon className="w-6 h-6 mx-auto mb-2" style={{ color }} />
      <p className="text-xl font-bold text-[#f8fafc]">{value}</p>
      <p className="text-xs text-[#94a3b8] mt-1">{label}</p>
    </div>
  );
}

function AchievementsTab({ achievements, loadingAchievements, history, watchlist }) {
  const totalEpisodes = (history || []).length;
  const totalList = (watchlist || []).length;
  const completedCount = (watchlist || []).filter((w) => (w.status || w.watchStatus) === 'completed').length;

  const earnedIds = new Set((achievements || []).map((a) => a.id || a.achievementId));

  const computedProgress = (def) => {
    switch (def.id) {
      case 'first_watch': return Math.min(totalEpisodes, def.target);
      case 'watch_10': return Math.min(totalEpisodes, def.target);
      case 'watch_50': return Math.min(totalEpisodes, def.target);
      case 'watch_100': return Math.min(totalEpisodes, def.target);
      case 'watch_500': return Math.min(totalEpisodes, def.target);
      case 'complete_1': return Math.min(completedCount, def.target);
      case 'complete_10': return Math.min(completedCount, def.target);
      case 'complete_25': return Math.min(completedCount, def.target);
      case 'list_5': return Math.min(totalList, def.target);
      case 'list_20': return Math.min(totalList, def.target);
      default: return 0;
    }
  };

  const earnedCount = ACHIEVEMENT_DEFINITIONS.filter((def) => earnedIds.has(def.id)).length;
  const totalProgress = ACHIEVEMENT_DEFINITIONS.reduce((sum, def) => {
    const progress = computedProgress(def);
    return sum + (progress >= def.target ? 1 : progress / def.target);
  }, 0);
  const overallPercent = Math.round((totalProgress / ACHIEVEMENT_DEFINITIONS.length) * 100);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[#f8fafc]">Achievements</h2>
        <span className="text-sm text-[#94a3b8]">{earnedCount} / {ACHIEVEMENT_DEFINITIONS.length} unlocked</span>
      </div>

      <div className="bg-[#1e293b] rounded-xl border border-[rgba(148,163,184,0.12)] p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-[#94a3b8]">Overall Progress</span>
          <span className="text-sm font-bold text-[#0ea5e9]">{overallPercent}%</span>
        </div>
        <div className="w-full bg-[#0f172a] rounded-full h-2.5">
          <motion.div initial={{ width: 0 }} animate={{ width: `${overallPercent}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="bg-gradient-to-r from-[#0ea5e9] to-[#22c55e] h-2.5 rounded-full" />
        </div>
      </div>

      {loadingAchievements ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      ) : (
        <motion.div variants={container} initial="hidden" animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ACHIEVEMENT_DEFINITIONS.map((def) => {
            const IconComp = ICON_MAP[def.icon] || Award;
            const earned = earnedIds.has(def.id);
            const progress = computedProgress(def);
            const percent = Math.min(100, (progress / def.target) * 100);
            const earnedData = (achievements || []).find((a) => (a.id || a.achievementId) === def.id);

            return (
              <motion.div key={def.id} variants={item}
                className={cn('rounded-xl border p-5 transition-colors',
                  earned ? 'bg-[#1e293b] border-[#0ea5e9]/30 shadow-lg shadow-[#0ea5e9]/5' : 'bg-[#1e293b]/60 border-[rgba(148,163,184,0.12)] opacity-70')}>
                <div className="flex items-start gap-3 mb-3">
                  <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                    earned ? 'bg-[#0ea5e9]/20' : 'bg-[#0f172a]')}>
                    <IconComp className={cn('w-5 h-5', earned ? 'text-[#0ea5e9]' : 'text-[#94a3b8]')} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className={cn('font-semibold text-sm', earned ? 'text-[#f8fafc]' : 'text-[#94a3b8]')}>{def.name}</h4>
                    <p className="text-xs text-[#94a3b8]">{def.description}</p>
                  </div>
                  {earned && <Check className="w-5 h-5 text-green-500 flex-shrink-0" />}
                </div>

                <div className="w-full bg-[#0f172a] rounded-full h-1.5 mb-2">
                  <div className={cn('h-1.5 rounded-full transition-all', earned ? 'bg-green-500' : 'bg-[#0ea5e9]')}
                    style={{ width: `${percent}%` }} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[#94a3b8]">{progress} / {def.target}</span>
                  {earned && earnedData?.unlockedAt && (
                    <span className="text-[10px] text-[#94a3b8]">{timeAgo(earnedData.unlockedAt)}</span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
