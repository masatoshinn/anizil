import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users, Film, MessageSquare, AlertTriangle, Plus,
  Download, BarChart3, Activity, TrendingUp, ArrowUpRight
} from 'lucide-react';
import api from '../../lib/api';
import { cn, formatNumber, timeAgo } from '../../lib/utils';
import Skeleton from '../../components/common/Skeleton';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

// Animates counting up to the target value for display.
function AnimatedCounter({ value, duration = 1.5 }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (value === null || value === undefined) return;
    let start = 0;
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

const activityIcons = {
  user_joined: Users,
  anime_added: Film,
  comment: MessageSquare,
  report: AlertTriangle,
  default: Activity,
};

// Admin dashboard showing stats, activity feed, and quick actions.
export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetches admin stats and recent activity in parallel.
    const fetchDashboard = async () => {
      try {
        const [statsRes, activityRes] = await Promise.allSettled([
          api.get('/admin/stats'),
          api.get('/admin/activities?limit=10'),
        ]);
        if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
        if (activityRes.status === 'fulfilled') setActivities(activityRes.value.data.activities || []);
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  const statCards = [
    { label: 'Total Users', value: stats?.totalUsers ?? 0, icon: Users, color: 'from-blue-500 to-blue-600', link: '/admin/users' },
    { label: 'Total Anime', value: stats?.totalAnime ?? 0, icon: Film, color: 'from-purple-500 to-purple-600', link: '/admin/anime' },
    { label: 'Total Episodes', value: stats?.totalEpisodes ?? 0, icon: BarChart3, color: 'from-cyan-500 to-cyan-600', link: '/admin/episodes' },
    { label: 'Total Comments', value: stats?.totalComments ?? 0, icon: MessageSquare, color: 'from-green-500 to-green-600', link: '/admin/comments' },
    { label: 'Pending Reports', value: stats?.pendingReports ?? 0, icon: AlertTriangle, color: 'from-orange-500 to-red-500', link: '/admin/reports' },
  ];

  const quickActions = [
    { label: 'Add Anime', icon: Plus, link: '/admin/anime?add=true', color: 'bg-primary/10 text-primary hover:bg-primary/20' },
    { label: 'Import Anime', icon: Download, link: '/admin/import/anikoto', color: 'bg-purple-500/10 text-purple-400 hover:bg-purple-500/20' },
    { label: 'Manage Users', icon: Users, link: '/admin/users', color: 'bg-green-500/10 text-green-400 hover:bg-green-500/20' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#f8fafc]">Dashboard</h1>
        <div className="flex items-center gap-2 text-sm text-[#94a3b8]">
          <TrendingUp className="w-4 h-4" />
          <span>Overview</span>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4"
        >
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <motion.div key={card.label} variants={item}>
                <Link
                  to={card.link}
                  className="block p-5 rounded-xl bg-[#1e293b] border border-[rgba(148,163,184,0.12)] hover:border-[#0ea5e9]/30 transition-all group"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className={cn('w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center', card.color)}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-[#94a3b8] opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="text-2xl font-bold text-[#f8fafc]">
                    <AnimatedCounter value={card.value} />
                  </div>
                  <div className="text-sm text-[#94a3b8] mt-1">{card.label}</div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-[#1e293b] rounded-xl border border-[rgba(148,163,184,0.12)] p-6">
            <h2 className="text-lg font-semibold text-[#f8fafc] mb-4">Recent Activity</h2>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 rounded-lg" />
                ))}
              </div>
            ) : activities.length === 0 ? (
              <p className="text-[#94a3b8] text-sm">No recent activities</p>
            ) : (
              <div className="space-y-3">
                {activities.map((act, i) => {
                  const Icon = activityIcons[act.type] || activityIcons.default;
                  return (
                    <div key={act.id || i} className="flex items-center gap-3 p-3 rounded-lg hover:bg-[#334155] transition-colors">
                      <div className="w-8 h-8 rounded-full bg-[#0f172a] flex items-center justify-center flex-shrink-0">
                        <Icon className="w-4 h-4 text-[#94a3b8]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[#f8fafc] truncate">{act.message || act.description}</p>
                        {act.user && (
                          <p className="text-xs text-[#94a3b8]">by {act.user.name || act.user}</p>
                        )}
                      </div>
                      <span className="text-xs text-[#94a3b8] flex-shrink-0">{timeAgo(act.createdAt)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-[#1e293b] rounded-xl border border-[rgba(148,163,184,0.12)] p-6">
            <h2 className="text-lg font-semibold text-[#f8fafc] mb-4">Quick Actions</h2>
            <div className="space-y-3">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={action.label}
                    to={action.link}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg transition-colors',
                      action.color
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{action.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="bg-[#1e293b] rounded-xl border border-[rgba(148,163,184,0.12)] p-6">
            <h2 className="text-lg font-semibold text-[#f8fafc] mb-3">System Status</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#94a3b8]">Server</span>
                <span className="badge badge-success">Online</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#94a3b8]">Database</span>
                <span className="badge badge-success">Connected</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#94a3b8]">API</span>
                <span className="badge badge-success">Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
