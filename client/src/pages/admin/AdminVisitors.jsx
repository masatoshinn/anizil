import { useState, useEffect, useCallback } from 'react';
import { Eye, Loader2, Users, MousePointerClick } from 'lucide-react';
import api from '../../lib/api';
import Pagination from '../../components/common/Pagination';

// Admin page showing a paginated visitor activity log.
export default function AdminVisitors() {
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({ today: 0, total: 0 });

  // Fetches visitor log entries and today's stats.
  const fetchVisitors = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const res = await api.get('/admin/visitors', { params: { page: p, limit: 30 } });
      const data = res.data.data;
      setVisitors(data.visitors || []);
      setStats({ today: data.today || 0, total: data.total || 0 });
      setTotalPages(data.pagination?.pages || 1);
      setPage(p);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVisitors(1);
  }, [fetchVisitors]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <Eye className="w-6 h-6 text-[#0ea5e9]" /> Visitor Log
        </h1>
        <div className="flex gap-3">
          <div className="bg-panel border border-border-custom rounded-xl px-4 py-2 flex items-center gap-2">
            <MousePointerClick className="w-4 h-4 text-[#0ea5e9]" />
            <span className="text-xs text-text-muted">Today</span>
            <span className="text-sm font-bold text-text-primary">{stats.today}</span>
          </div>
          <div className="bg-panel border border-border-custom rounded-xl px-4 py-2 flex items-center gap-2">
            <Users className="w-4 h-4 text-[#0ea5e9]" />
            <span className="text-xs text-text-muted">Total</span>
            <span className="text-sm font-bold text-text-primary">{stats.total}</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 text-[#0ea5e9] animate-spin" />
        </div>
      ) : visitors.length === 0 ? (
        <div className="text-center py-16 text-text-muted">No visits recorded yet</div>
      ) : (
        <>
          <div className="bg-panel border border-border-custom rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-custom text-left">
                    <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase">Page</th>
                    <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase">User</th>
                    <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase">IP Address</th>
                    <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {visitors.map((v) => (
                    <tr key={v.id} className="border-b border-border-custom last:border-0 hover:bg-panel-hover transition-colors">
                      <td className="px-4 py-3">
                        <span className="text-text-primary font-mono text-xs">{v.page}</span>
                      </td>
                      <td className="px-4 py-3 text-text-muted text-xs">{v.user_name || 'Guest'}</td>
                      <td className="px-4 py-3 text-text-muted text-xs font-mono">{v.ip_address || '-'}</td>
                      <td className="px-4 py-3 text-text-muted text-xs">
                        {new Date(v.visited_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {totalPages > 1 && (
            <div className="mt-4">
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={fetchVisitors} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
