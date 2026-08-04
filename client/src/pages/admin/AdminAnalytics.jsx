import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Calendar, TrendingUp, Eye, Users } from 'lucide-react';
import api from '../../lib/api';
import { cn, formatNumber } from '../../lib/utils';
import Skeleton from '../../components/common/Skeleton';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

// Admin page showing site analytics for a selected date range.
export default function AdminAnalytics() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7d');

  // Fetches analytics stats for the current date range.
  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/analytics', { params: { range: dateRange } });
      setStats(res.data?.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  const statCards = [
    { label: 'Total Users', value: stats?.totalUsers ?? 0, icon: Users, color: 'from-blue-500 to-blue-600' },
    { label: 'Total Anime', value: stats?.totalAnime ?? 0, icon: TrendingUp, color: 'from-green-500 to-green-600' },
    { label: 'Total Views', value: stats?.totalViews ?? 0, icon: Eye, color: 'from-purple-500 to-purple-600' },
  ];

  const topAnime = stats?.topAnime || [];
  const maxViews = Math.max(...topAnime.map((a) => a.views || 0), 1);
  const dailyUsers = stats?.dailyUsers || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-[#f8fafc]">Analytics</h1>
        <div className="flex gap-2">
          {[
            { key: '24h', label: '24h' },
            { key: '7d', label: '7 Days' },
            { key: '30d', label: '30 Days' },
            { key: '90d', label: '90 Days' },
          ].map((range) => (
            <button
              key={range.key}
              onClick={() => setDateRange(range.key)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                dateRange === range.key ? 'bg-[#0ea5e9] text-white' : 'text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#334155]'
              )}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : (
          <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <motion.div key={card.label} variants={item} className="bg-[#1e293b] rounded-xl border border-[rgba(148,163,184,0.12)] p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className={cn('w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center', card.color)}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-[#f8fafc]">{formatNumber(card.value)}</div>
                <div className="text-sm text-[#94a3b8]">{card.label}</div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#1e293b] rounded-xl border border-[rgba(148,163,184,0.12)] p-6">
          <h2 className="text-lg font-semibold text-[#f8fafc] mb-4">Top Anime</h2>
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 rounded-lg" />)}</div>
          ) : topAnime.length === 0 ? (
            <p className="text-[#94a3b8] text-sm">No data available</p>
          ) : (
            <div className="space-y-3">
              {topAnime.map((anime, i) => (
                <div key={anime.id || i} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-[#f8fafc] truncate">{anime.title}</div>
                    <div className="mt-1 w-full h-2 bg-[#0f172a] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#0ea5e9] to-[#06b6d4] rounded-full"
                        style={{ width: `${((anime.views || 0) / maxViews) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm text-[#94a3b8] flex-shrink-0 w-16 text-right">{formatNumber(anime.views)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-[#1e293b] rounded-xl border border-[rgba(148,163,184,0.12)] p-6">
          <h2 className="text-lg font-semibold text-[#f8fafc] mb-4">Daily Users</h2>
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 rounded-lg" />)}</div>
          ) : dailyUsers.length === 0 ? (
            <p className="text-[#94a3b8] text-sm">No data available</p>
          ) : (
            <div className="space-y-3">
              {dailyUsers.map((day, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-[rgba(148,163,184,0.06)] last:border-0">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#94a3b8]" />
                    <span className="text-sm text-[#f8fafc]">{day.date}</span>
                  </div>
                  <span className="text-sm text-[#94a3b8]">{formatNumber(day.count)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
