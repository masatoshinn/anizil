import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle, XCircle, Loader2, ExternalLink } from 'lucide-react';
import api from '../../lib/api';
import { cn, formatDate, truncate } from '../../lib/utils';
import Pagination from '../../components/common/Pagination';
import Skeleton from '../../components/common/Skeleton';

const statusStyles = {
  pending: 'badge-warning',
  resolved: 'badge-success',
  dismissed: 'bg-gray-500/20 text-gray-400',
};

// Admin page to review and resolve user reports.
export default function AdminReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [acting, setActing] = useState(null);

  // Fetches paginated reports with status filter.
  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (statusFilter) params.status = statusFilter;
      const res = await api.get('/admin/reports', { params });
      setReports(res.data.data.reports || []);
      setTotalPages(res.data.data.pagination.pages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  // Resolves or dismisses a single report.
  const actOnReport = async (id, action) => {
    setActing(id);
    try {
      await api.put(`/admin/reports/${id}`, { status: action === 'dismiss' ? 'dismissed' : 'resolved' });
      fetchReports();
    } catch (err) {
      console.error(err);
    } finally {
      setActing(null);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#f8fafc]">Reports</h1>

      <div className="flex flex-wrap gap-2">
        {['', 'pending', 'resolved', 'dismissed'].map((s) => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              statusFilter === s ? 'bg-[#0ea5e9] text-white' : 'text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#334155]'
            )}
          >
            {s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
      ) : reports.length === 0 ? (
        <div className="text-center py-12 text-[#94a3b8]">No reports found</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[rgba(148,163,184,0.12)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#0f172a] border-b border-[rgba(148,163,184,0.12)]">
                <th className="text-left px-4 py-3 text-[#94a3b8] font-medium">Reporter</th>
                <th className="text-left px-4 py-3 text-[#94a3b8] font-medium">Type</th>
                <th className="text-left px-4 py-3 text-[#94a3b8] font-medium">Reason</th>
                <th className="text-left px-4 py-3 text-[#94a3b8] font-medium hidden md:table-cell">Status</th>
                <th className="text-left px-4 py-3 text-[#94a3b8] font-medium hidden lg:table-cell">Date</th>
                <th className="text-right px-4 py-3 text-[#94a3b8] font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id} className="border-b border-[rgba(148,163,184,0.06)] hover:bg-[#334155]/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <img
                        src={report.reporter?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(report.reporter?.name || 'U')}&background=0ea5e9&color=fff`}
                        alt="" className="w-7 h-7 rounded-full"
                      />
                      <span className="text-[#f8fafc] text-sm">{report.reporter?.name || 'Unknown'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[#f8fafc] text-sm capitalize">{report.type || 'comment'}</td>
                  <td className="px-4 py-3">
                    <span className="text-[#f8fafc] text-sm" title={report.reason}>{truncate(report.reason, 60)}</span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className={cn('badge', statusStyles[report.status] || 'badge-warning')}>{report.status}</span>
                  </td>
                  <td className="px-4 py-3 text-[#94a3b8] text-xs hidden lg:table-cell">{formatDate(report.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {report.status === 'pending' && (
                        <>
                          <button onClick={() => actOnReport(report.id, 'dismiss')} disabled={acting === report.id} className="p-1.5 rounded-lg hover:bg-gray-500/10 text-[#94a3b8] hover:text-gray-400 transition-colors" title="Dismiss">
                            <XCircle className="w-4 h-4" />
                          </button>
                          <button onClick={() => actOnReport(report.id, 'resolve')} disabled={acting === report.id} className="p-1.5 rounded-lg hover:bg-green-500/10 text-[#94a3b8] hover:text-green-400 transition-colors" title="Resolve">
                            {acting === report.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
