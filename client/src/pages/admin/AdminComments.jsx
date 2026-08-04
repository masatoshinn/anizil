import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Check, Flag, Trash2, MessageSquare, Loader2, Square, CheckSquare } from 'lucide-react';
import api from '../../lib/api';
import { cn, formatDate, truncate } from '../../lib/utils';
import Pagination from '../../components/common/Pagination';
import Skeleton from '../../components/common/Skeleton';

const tabs = [
  { key: '', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'flagged', label: 'Flagged' },
  { key: 'removed', label: 'Removed' },
];

const statusStyles = {
  pending: 'badge-warning',
  approved: 'badge-success',
  flagged: 'badge-danger',
  removed: 'bg-gray-500/20 text-gray-400',
};

// Admin page to moderate user comments by status.
export default function AdminComments() {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [acting, setActing] = useState(null);

  // Fetches paginated comments filtered by status tab.
  const fetchComments = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (activeTab) params.status = activeTab;
      const res = await api.get('/admin/comments', { params });
      setComments(res.data.data.comments || []);
      setTotalPages(res.data.data.pagination.pages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, activeTab]);

  useEffect(() => { fetchComments(); }, [fetchComments]);

  // Toggles a comment in the selection set.
  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Selects or clears all visible comments.
  const toggleAll = () => {
    if (selectedIds.size === comments.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(comments.map((c) => c.id)));
    }
  };

  // Changes a single comment's approval status.
  const actOnComment = async (id, action) => {
    setActing(id);
    try {
      await api.put(`/admin/comments/${id}/status`, { status: action === 'approve' ? 'approved' : action === 'flag' ? 'flagged' : 'removed' });
      fetchComments();
    } catch (err) {
      console.error(err);
    } finally {
      setActing(null);
    }
  };

  // Applies an action to all selected comments.
  const bulkAction = async (action) => {
    if (selectedIds.size === 0) return;
    try {
      await api.post(`/admin/comments/bulk/${action}`, { ids: Array.from(selectedIds) });
      setSelectedIds(new Set());
      fetchComments();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#f8fafc]">Manage Comments</h1>

      <div className="flex flex-wrap gap-2 border-b border-[rgba(148,163,184,0.12)] pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setPage(1); setSelectedIds(new Set()); }}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              activeTab === tab.key
                ? 'bg-[#0ea5e9] text-white'
                : 'text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#334155]'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-[#0ea5e9]/10 border border-[#0ea5e9]/20">
          <span className="text-sm text-[#f8fafc]">{selectedIds.size} selected</span>
          <button onClick={() => bulkAction('approve')} className="text-xs px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors">Approve</button>
          <button onClick={() => bulkAction('flag')} className="text-xs px-3 py-1.5 rounded-lg bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 transition-colors">Flag</button>
          <button onClick={() => bulkAction('remove')} className="text-xs px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors">Remove</button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
      ) : comments.length === 0 ? (
        <div className="text-center py-12 text-[#94a3b8]">No comments found</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[rgba(148,163,184,0.12)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#0f172a] border-b border-[rgba(148,163,184,0.12)]">
                <th className="px-4 py-3 w-10">
                  <button onClick={toggleAll} className="text-[#94a3b8] hover:text-[#f8fafc]">
                    {selectedIds.size === comments.length && comments.length > 0 ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                  </button>
                </th>
                <th className="text-left px-4 py-3 text-[#94a3b8] font-medium">User</th>
                <th className="text-left px-4 py-3 text-[#94a3b8] font-medium">Content</th>
                <th className="text-left px-4 py-3 text-[#94a3b8] font-medium hidden md:table-cell">Anime / Episode</th>
                <th className="text-left px-4 py-3 text-[#94a3b8] font-medium hidden lg:table-cell">Status</th>
                <th className="text-left px-4 py-3 text-[#94a3b8] font-medium hidden xl:table-cell">Date</th>
                <th className="text-right px-4 py-3 text-[#94a3b8] font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {comments.map((comment) => (
                <tr key={comment.id} className="border-b border-[rgba(148,163,184,0.06)] hover:bg-[#334155]/50 transition-colors">
                  <td className="px-4 py-3">
                    <button onClick={() => toggleSelect(comment.id)} className="text-[#94a3b8] hover:text-[#f8fafc]">
                      {selectedIds.has(comment.id) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <img
                        src={comment.user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.user?.name || 'U')}&background=0ea5e9&color=fff`}
                        alt="" className="w-7 h-7 rounded-full"
                      />
                      <span className="text-[#f8fafc] text-sm">{comment.user?.name || 'Unknown'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[#f8fafc] text-sm" title={comment.content}>{truncate(comment.content, 80)}</span>
                  </td>
                  <td className="px-4 py-3 text-[#94a3b8] text-sm hidden md:table-cell">
                    {comment.anime?.title || comment.episode?.title || '—'}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className={cn('badge', statusStyles[comment.status] || 'badge-success')}>{comment.status}</span>
                  </td>
                  <td className="px-4 py-3 text-[#94a3b8] text-xs hidden xl:table-cell">{formatDate(comment.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {comment.status !== 'approved' && (
                        <button onClick={() => actOnComment(comment.id, 'approve')} disabled={acting === comment.id} className="p-1.5 rounded-lg hover:bg-green-500/10 text-[#94a3b8] hover:text-green-400 transition-colors" title="Approve">
                          {acting === comment.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        </button>
                      )}
                      {comment.status !== 'flagged' && (
                        <button onClick={() => actOnComment(comment.id, 'flag')} disabled={acting === comment.id} className="p-1.5 rounded-lg hover:bg-yellow-500/10 text-[#94a3b8] hover:text-yellow-400 transition-colors" title="Flag">
                          <Flag className="w-4 h-4" />
                        </button>
                      )}
                      {comment.status !== 'removed' && (
                        <button onClick={() => actOnComment(comment.id, 'remove')} disabled={acting === comment.id} className="p-1.5 rounded-lg hover:bg-red-500/10 text-[#94a3b8] hover:text-red-400 transition-colors" title="Remove">
                          <Trash2 className="w-4 h-4" />
                        </button>
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
