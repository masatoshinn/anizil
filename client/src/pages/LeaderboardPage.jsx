import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trophy, Crown, Loader2 } from 'lucide-react';
import api from '../lib/api';
import { glowNameClass } from '../lib/utils';
import useSEO from '../hooks/useSEO';
import Pagination from '../components/common/Pagination';
import BadgeIcon from '../components/common/BadgeIcon';

const MEDALS = [
  { color: 'text-[#ffd700]', bg: 'bg-[#ffd700]/15', border: 'border-[#ffd700]/40' },
  { color: 'text-[#c0c0c0]', bg: 'bg-[#c0c0c0]/15', border: 'border-[#c0c0c0]/40' },
  { color: 'text-[#cd7f32]', bg: 'bg-[#cd7f32]/15', border: 'border-[#cd7f32]/40' },
];

const PERIODS = [
  { value: 'all', label: 'All Time' },
  { value: 'monthly', label: 'This Month' },
  { value: 'weekly', label: 'This Week' },
];

// LeaderboardPage: top users ranked by XP with all-time, monthly, and weekly periods
export default function LeaderboardPage() {
  useSEO({ title: 'Leaderboard', description: 'Top fans on Anizil ranked by XP and achievements. See who leads the community.' });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Fetches the leaderboard page for the selected period
  const fetchLeaderboard = useCallback(async (p = 1, per = period) => {
    setLoading(true);
    try {
      const res = await api.get('/user/leaderboard', {
        params: { period: per, page: p, limit: 20 },
      });
      const data = res.data.data;
      setUsers(data.users || []);
      setTotalPages(data.pagination?.pages || 1);
      setPage(p);
    } catch (err) {
      console.error(err);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchLeaderboard(1, period);
  }, [period, fetchLeaderboard]);

  const startRank = (page - 1) * 20;

  return (
    <div className="min-h-screen">
      <section className="relative py-12 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#f59e0b]/10 via-[#0f172a] to-transparent" />
        <div className="relative max-w-3xl mx-auto px-4 text-center">
          <Trophy className="w-12 h-12 text-[#fbbf24] mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-[#f8fafc] mb-3">XP Leaderboard</h1>
          <p className="text-[#94a3b8]">Top fans ranked by XP and achievements</p>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 pb-16">
        {/* Period filter */}
        <div className="flex justify-center gap-2 mb-8">
          {PERIODS.map((per) => (
            <button
              key={per.value}
              onClick={() => setPeriod(per.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
                period === per.value
                  ? 'bg-[#f59e0b]/15 text-[#fbbf24] border-[#f59e0b]/40'
                  : 'bg-panel text-text-muted border-border-custom hover:text-text-primary'
              }`}
            >
              {per.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 text-[#fbbf24] animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-16 text-text-muted">No users yet</div>
        ) : (
          <>
            <div className="space-y-3">
              {users.map((user, index) => {
                const rank = startRank + index + 1;
                const isTop3 = rank <= 3;
                const medal = isTop3 ? MEDALS[rank - 1] : null;
                return (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className={`flex items-center gap-4 bg-panel rounded-xl p-4 border transition-colors ${
                      isTop3 ? `${medal.border} ${medal.bg}` : 'border-border-custom'
                    }`}
                  >
                    <div className={`w-8 flex-shrink-0 text-center font-bold text-lg ${isTop3 ? medal.color : 'text-text-muted'}`}>
                      {rank === 1 ? <Crown className="w-6 h-6 mx-auto text-[#ffd700]" /> : `#${rank}`}
                    </div>
                    <Link
                      to={`/user/${user.id}`}
                      className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0 border-2"
                      style={{ borderColor: user.active_frame_id ? '#f59e0b' : 'transparent' }}
                    >
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-[#1e293b] flex items-center justify-center font-bold text-[#fbbf24]">
                          {(user.name || 'U')[0].toUpperCase()}
                        </div>
                      )}
                    </Link>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Link to={`/user/${user.id}`} className={`text-text-primary font-medium text-sm truncate hover:text-[#0ea5e9] transition-colors ${glowNameClass(user.role)}`}>
                          {user.name}
                        </Link>
                        {user.badges && user.badges.slice(0, 3).map((b) => (
                          <span key={b.id} className="text-sm" style={{ color: b.color }} title={b.name}><BadgeIcon icon={b.icon} /></span>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-[#fbbf24] font-medium">Level {user.level}</span>
                        <div className="h-1 flex-1 max-w-[200px] bg-[#0f172a] rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-[#f59e0b] to-[#fbbf24] rounded-full" style={{ width: `${Math.min(100, (user.xp % 1000) / 10)}%` }} />
                        </div>
                        <span className="text-xs text-text-muted">{user.xp.toLocaleString()} XP</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
            {totalPages > 1 && (
              <div className="mt-6">
                <Pagination currentPage={page} totalPages={totalPages} onPageChange={(p) => fetchLeaderboard(p)} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
