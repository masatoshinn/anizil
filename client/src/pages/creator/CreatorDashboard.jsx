import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BookOpen, Plus, ListVideo, TrendingUp, Eye, Star, PenLine, ArrowRight,
} from 'lucide-react';
import api from '../../lib/api';
import { cn, formatNumber, mangaImage, getStatusColor } from '../../lib/utils';
import Skeleton from '../../components/common/Skeleton';
import toast from 'react-hot-toast';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

// Animates counting up to the target value for display.
function AnimatedCounter({ value, duration = 1.2 }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (value === null || value === undefined) return;
    const end = typeof value === 'number' ? value : parseInt(value) || 0;
    const startTime = Date.now();
    const dur = duration * 1000;

    const step = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / dur, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * end));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [value, duration]);

  return <span>{formatNumber(count)}</span>;
}

// Creator dashboard summarizing the user's manga performance.
export default function CreatorDashboard() {
  const navigate = useNavigate();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [access, setAccess] = useState(false);

  useEffect(() => {
    api.get('/creator/can').then((r) => setAccess(r.data.data?.can)).catch(() => setAccess(false));
    api.get('/creator/manga')
      .then((r) => setList(r.data.data || []))
      .catch((err) => toast.error(err.response?.data?.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-9 w-72" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!access) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <div className="text-4xl mb-4">🔒</div>
        <h1 className="text-2xl font-bold text-[#f8fafc] mb-2">Creator Dashboard</h1>
        <p className="text-[#94a3b8]">You need the <strong className="text-[#0ea5e9]">Creator</strong> role to access the creator dashboard.</p>
      </div>
    );
  }

  const totalChapters = list.reduce((s, m) => s + (Number(m.chapter_count) || 0), 0);
  const totalViews = list.reduce((s, m) => s + (Number(m.views) || 0), 0);
  const rated = list.filter((m) => (Number(m.user_rating) || Number(m.rating) || 0) > 0);
  const avgRating = rated.length
    ? (rated.reduce((s, m) => s + (Number(m.user_rating) || Number(m.rating) || 0), 0) / rated.length).toFixed(1)
    : '0.0';

  const statCards = [
    { label: 'Manga', value: list.length, icon: BookOpen, color: 'from-blue-500 to-blue-600' },
    { label: 'Chapters', value: totalChapters, icon: ListVideo, color: 'from-purple-500 to-purple-600' },
    { label: 'Total Views', value: totalViews, icon: Eye, color: 'from-cyan-500 to-cyan-600' },
    { label: 'Avg Rating', value: avgRating, icon: Star, color: 'from-yellow-500 to-amber-500' },
  ];

  const topManga = [...list].sort((a, b) => (Number(b.views) || 0) - (Number(a.views) || 0)).slice(0, 4);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#f8fafc] flex items-center gap-2">
            <PenLine className="w-6 h-6 text-[#0ea5e9]" /> Creator Dashboard
          </h1>
          <p className="text-sm text-[#94a3b8] mt-1">Track your manga's performance and manage your content.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/creator/manga" className="btn-secondary flex items-center gap-2">
            <ListVideo className="w-4 h-4" /> Manage Manga
          </Link>
          <button onClick={() => navigate('/creator/manga?create=1')} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Manga
          </button>
        </div>
      </div>

      <motion.div variants={container} initial="hidden" animate="show"
        className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <motion.div key={card.label} variants={item}
              className="p-5 rounded-xl bg-[#1e293b] border border-[rgba(148,163,184,0.12)]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-[#94a3b8]">{card.label}</span>
                <span className={cn('w-9 h-9 rounded-lg bg-gradient-to-br text-white flex items-center justify-center', card.color)}>
                  <Icon className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-bold text-[#f8fafc]">
                <AnimatedCounter value={card.value} />
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#f8fafc] flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#0ea5e9]" /> Top Manga
          </h2>
          <Link to="/creator/manga" className="text-sm text-[#0ea5e9] hover:underline inline-flex items-center gap-1">
            View all <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {list.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-[rgba(148,163,184,0.2)] rounded-2xl">
            <BookOpen className="w-10 h-10 mx-auto text-[#334155] mb-3" />
            <p className="text-[#94a3b8] mb-4">You haven't created any manga yet.</p>
            <button onClick={() => navigate('/creator/manga?create=1')} className="btn-primary inline-flex items-center gap-2">
              <Plus className="w-4 h-4" /> Create your first manga
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {topManga.map((m) => (
              <motion.div key={m.id} variants={item}
                className="bg-[#1e293b]/50 border border-[rgba(148,163,184,0.12)] rounded-xl overflow-hidden flex flex-col">
                <Link to={`/manga/${m.slug}`} className="relative aspect-[2/3] w-full overflow-hidden bg-[#0f172a]">
                  <img
                    src={mangaImage(m.poster) || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.title || 'M')}&background=0ea5e9&color=fff`}
                    alt={m.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <span className={cn('absolute top-2 left-2 badge', getStatusColor(m.status))}>
                    {m.status || 'ongoing'}
                  </span>
                </Link>
                <div className="p-3 flex flex-col gap-2 flex-1">
                  <Link to={`/manga/${m.slug}`} className="font-semibold text-[#f8fafc] text-sm truncate hover:text-[#0ea5e9] transition-colors">
                    {m.title}
                  </Link>
                  <div className="flex items-center gap-3 text-xs text-[#94a3b8]">
                    <span className="inline-flex items-center gap-1"><ListVideo className="w-3.5 h-3.5" /> {m.chapter_count || 0}</span>
                    <span className="inline-flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> {formatNumber(m.views || 0)}</span>
                    <span className="inline-flex items-center gap-1 text-yellow-400"><Star className="w-3.5 h-3.5 fill-yellow-400" /> {m.user_rating || m.rating || '0'}</span>
                  </div>
                  <Link to="/creator/manga" className="text-xs text-[#0ea5e9] mt-auto inline-flex items-center gap-1 hover:underline">
                    Manage <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}