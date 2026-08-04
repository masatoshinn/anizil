import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bell, CheckCheck, Loader2, MessageSquare, Award, Mail, UserPlus, Sparkles, Trophy, ChevronRight } from 'lucide-react';
import useAuthStore from '../store/authStore';
import useSEO from '../hooks/useSEO';
import Skeleton from '../components/common/Skeleton';
import api from '../lib/api';
import { timeAgo, cn } from '../lib/utils';

const TYPE_ICONS = {
  comment_reply: { icon: MessageSquare, color: '#0ea5e9' },
  forum_reply: { icon: MessageSquare, color: '#a855f7' },
  badge: { icon: Award, color: '#fbbf24' },
  achievement: { icon: Trophy, color: '#facc15' },
  follow: { icon: UserPlus, color: '#22c55e' },
  admin: { icon: Mail, color: '#ef4444' },
  general: { icon: Sparkles, color: '#0ea5e9' },
};

// NotificationsPage: full-page list of the user's notifications with type icons and mark-as-read
export default function NotificationsPage() {
  useSEO({ title: 'Notifications', description: 'Your Anizil notifications' });
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    loadNotifications();
  }, [isAuthenticated]);

  // Fetches the latest notifications from the API
  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/user/notifications');
      setNotifications(res.data.data?.notifications || []);
      if (res.data.data?.unread_count > 0 && user) {
        useAuthStore.setState({ user: { ...user, stats: { ...(user.stats || {}), unread_notifications: res.data.data.unread_count } } });
      }
    } catch {}
    setLoading(false);
  }, [user]);

  // Marks all notifications as read
  const markAllRead = async () => {
    setMarking(true);
    try {
      await api.put('/user/notifications/read');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
      if (user) {
        useAuthStore.setState({ user: { ...user, stats: { ...(user.stats || {}), unread_notifications: 0 } } });
      }
    } catch {}
    setMarking(false);
  };

  // Opens a notification, navigating to its link when available
  const openNotification = (n) => {
    if (n.link) {
      navigate(n.link);
    } else {
      navigate('/dashboard');
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const typeKeys = Object.keys(TYPE_ICONS);
  const filtered = filter === 'all' ? notifications : notifications.filter((n) => n.type === filter);

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8"
        >
          <div>
            <h1 className="text-3xl font-bold text-[#f8fafc] flex items-center gap-3">
              <Bell className="w-7 h-7 text-[#0ea5e9]" /> Notifications
            </h1>
            <p className="text-[#94a3b8] text-sm mt-1">
              {unreadCount > 0 ? `${unreadCount} unread` : 'You are all caught up'}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              disabled={marking}
              className="flex items-center gap-2 px-4 py-2 bg-[#0ea5e9]/10 text-[#0ea5e9] hover:bg-[#0ea5e9]/20 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {marking ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCheck className="w-4 h-4" />}
              Mark all read
            </button>
          )}
        </motion.div>

        {/* Type filter */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setFilter('all')}
            className={cn(
              'flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all border',
              filter === 'all'
                ? 'bg-[#0ea5e9] text-white border-[#0ea5e9]'
                : 'bg-[#1e293b] text-[#94a3b8] hover:text-[#f8fafc] border-[rgba(148,163,184,0.12)]'
            )}
          >
            All
          </button>
          {typeKeys.map((key) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={cn(
                'flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all border capitalize',
                filter === key
                  ? 'bg-[#0ea5e9] text-white border-[#0ea5e9]'
                  : 'bg-[#1e293b] text-[#94a3b8] hover:text-[#f8fafc] border-[rgba(148,163,184,0.12)]'
              )}
            >
              {key.replace('_', ' ')}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Bell className="w-16 h-16 text-[#94a3b8]/30 mx-auto mb-4" />
            <h3 className="text-[#f8fafc] text-xl font-semibold mb-2">No notifications</h3>
            <p className="text-[#94a3b8]">You will see notifications here when something happens</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((n) => {
              const typeMeta = TYPE_ICONS[n.type] || TYPE_ICONS.general;
              const TypeIcon = typeMeta.icon;
              return (
                <motion.button
                  key={n.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => openNotification(n)}
                  className={cn(
                    'w-full text-left flex items-start gap-3 p-4 rounded-xl border transition-colors',
                    !n.is_read
                      ? 'bg-[#0ea5e9]/5 border-[#0ea5e9]/20'
                      : 'bg-[#1e293b] border-[rgba(148,163,184,0.12)] hover:bg-[#334155]'
                  )}
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: `${typeMeta.color}20`, color: typeMeta.color }}
                  >
                    <TypeIcon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn('text-sm truncate', !n.is_read ? 'text-[#f8fafc] font-semibold' : 'text-[#f8fafc]')}>
                        {n.title}
                      </p>
                      {!n.is_read && <span className="w-2 h-2 rounded-full bg-[#0ea5e9] flex-shrink-0" />}
                    </div>
                    <p className="text-sm text-[#94a3b8] line-clamp-2 mt-0.5">{n.content}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-[11px] text-[#64748b]">{timeAgo(n.created_at)}</span>
                      {n.link && <ChevronRight className="w-3.5 h-3.5 text-[#64748b]" />}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
