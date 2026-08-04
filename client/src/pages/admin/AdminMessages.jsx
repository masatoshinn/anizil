import { useState, useEffect, useCallback } from 'react';
import { Mail, Trash2, Loader2, Inbox, CheckCheck, AlertCircle } from 'lucide-react';
import api from '../../lib/api';
import Pagination from '../../components/common/Pagination';
import toast from 'react-hot-toast';

const CATEGORY_LABELS = {
  general: 'General',
  report: 'Report',
  bug: 'Bug',
  suggestion: 'Suggestion',
  copyright: 'Copyright',
};

const STATUS_STYLES = {
  new: 'bg-[#0ea5e9]/15 text-[#0ea5e9]',
  read: 'bg-[#94a3b8]/15 text-[#94a3b8]',
  resolved: 'bg-[#22c55e]/15 text-[#22c55e]',
};

// Admin page to review and manage contact messages.
export default function AdminMessages() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [expanded, setExpanded] = useState(null);

  // Fetches paginated messages filtered by status.
  const fetchMessages = useCallback(async (p = 1, status = statusFilter) => {
    setLoading(true);
    try {
      const res = await api.get('/admin/messages', {
        params: { page: p, limit: 20, status: status || undefined },
      });
      const data = res.data.data;
      setMessages(data.messages || []);
      setTotalPages(data.pagination?.pages || 1);
      setPage(p);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchMessages(1, statusFilter);
  }, [statusFilter, fetchMessages]);

  // Updates a message's status via the API.
  const updateStatus = async (id, status) => {
    try {
      await api.put(`/admin/messages/${id}`, { status });
      toast.success('Status updated');
      fetchMessages(page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    }
  };

  // Deletes a message after confirmation.
  const deleteMessage = async (id) => {
    if (!window.confirm('Delete this message?')) return;
    try {
      await api.delete(`/admin/messages/${id}`);
      toast.success('Message deleted');
      fetchMessages(page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <Mail className="w-6 h-6 text-[#0ea5e9]" /> Contact Messages
        </h1>
        <div className="flex gap-2">
          {['', 'new', 'read', 'resolved'].map((s) => (
            <button
              key={s || 'all'}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                statusFilter === s
                  ? 'bg-[#0ea5e9] text-white border-[#0ea5e9]'
                  : 'bg-panel text-text-muted border-border-custom hover:text-text-primary'
              }`}
            >
              {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 text-[#0ea5e9] animate-spin" />
        </div>
      ) : messages.length === 0 ? (
        <div className="text-center py-16 text-text-muted flex flex-col items-center gap-2">
          <Inbox className="w-10 h-10 opacity-50" />
          <p className="text-sm">No messages found</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {messages.map((msg) => (
              <div key={msg.id} className="bg-panel border border-border-custom rounded-xl p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 border border-border-custom">
                      {msg.user_avatar ? (
                        <img src={msg.user_avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-[#1e293b] flex items-center justify-center text-xs font-bold text-[#0ea5e9]">
                          {(msg.name || '?')[0].toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">{msg.name}</p>
                      <p className="text-xs text-text-muted truncate">{msg.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="badge badge-primary text-[10px]">{CATEGORY_LABELS[msg.category] || msg.category}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_STYLES[msg.status] || STATUS_STYLES.new}`}>
                      {msg.status}
                    </span>
                  </div>
                </div>

                <p className="text-sm text-text-muted mt-3">{msg.subject || 'No subject'}</p>

                <div className="mt-2">
                  {expanded === msg.id ? (
                    <p className="text-sm text-text-primary bg-[#0f172a] rounded-lg p-3 whitespace-pre-wrap">{msg.message}</p>
                  ) : (
                    <p className="text-sm text-text-muted line-clamp-2">{msg.message}</p>
                  )}
                </div>

                <div className="flex items-center justify-between mt-4">
                  <p className="text-xs text-text-muted">
                    {new Date(msg.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setExpanded(expanded === msg.id ? null : msg.id)}
                      className="px-3 py-1.5 rounded-lg text-xs bg-[#0f172a] text-text-muted hover:text-text-primary border border-border-custom transition-colors"
                    >
                      {expanded === msg.id ? 'Collapse' : 'View'}
                    </button>
                    {msg.status !== 'resolved' && (
                      <button
                        onClick={() => updateStatus(msg.id, 'resolved')}
                        className="px-3 py-1.5 rounded-lg text-xs bg-[#22c55e]/15 text-[#22c55e] hover:bg-[#22c55e]/25 transition-colors"
                      >
                        <CheckCheck className="w-3.5 h-3.5 inline mr-1" />Resolve
                      </button>
                    )}
                    <button
                      onClick={() => updateStatus(msg.id, 'read')}
                      className="px-3 py-1.5 rounded-lg text-xs bg-[#0ea5e9]/15 text-[#0ea5e9] hover:bg-[#0ea5e9]/25 transition-colors"
                    >
                      Mark Read
                    </button>
                    <button
                      onClick={() => deleteMessage(msg.id)}
                      className="p-1.5 rounded-lg text-[#ef4444] hover:bg-[#ef4444]/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="mt-4">
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={(p) => fetchMessages(p)} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
