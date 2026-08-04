import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { Plus, Trash2, Copy, Eye, EyeOff, ExternalLink, Loader2, Key } from 'lucide-react';
import api from '../../lib/api';
import useAuthStore from '../../store/authStore';
import { cn, formatDate } from '../../lib/utils';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import Skeleton from '../../components/common/Skeleton';

// Admin page to create, revoke, and copy API tokens.
export default function AdminApi() {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [revealedTokens, setRevealedTokens] = useState(new Set());
  const user = useAuthStore((s) => s.user);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: { name: '', scope: 'read' },
  });

  // Fetches paginated API tokens for the admin.
  const fetchTokens = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/api-tokens', { params: { page, limit: 20 } });
      setTokens(res.data.data || []);
      setTotalPages(res.data.totalPages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchTokens(); }, [fetchTokens]);

  // Creates a new API token for the current user.
  const createToken = async (data) => {
    setSaving(true);
    try {
      await api.post('/admin/api-tokens', { ...data, user_id: user._id });
      setShowCreateModal(false);
      reset();
      fetchTokens();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // Revokes an API token after confirmation.
  const deleteToken = async (id) => {
    if (!confirm('Revoke this API token?')) return;
    try {
      await api.delete(`/admin/api-tokens/${id}`);
      fetchTokens();
    } catch (err) {
      console.error(err);
    }
  };

  // Toggles visibility of a token in the list.
  const toggleReveal = (id) => {
    setRevealedTokens((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Copies a token string to the clipboard.
  const copyToken = (token) => {
    navigator.clipboard.writeText(token);
  };

  const scopeStyles = {
    read: 'badge-primary',
    write: 'badge-warning',
    admin: 'badge-danger',
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-[#f8fafc]">API Tokens</h1>
        <div className="flex gap-3">
          <a href="/api/docs" target="_blank" rel="noopener noreferrer" className="btn-secondary flex items-center gap-2">
            <ExternalLink className="w-4 h-4" /> API Docs
          </a>
          <button onClick={() => { reset(); setShowCreateModal(true); }} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Create Token
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
      ) : tokens.length === 0 ? (
        <div className="text-center py-12 text-[#94a3b8]">No API tokens yet. Create one to get started.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[rgba(148,163,184,0.12)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#0f172a] border-b border-[rgba(148,163,184,0.12)]">
                <th className="text-left px-4 py-3 text-[#94a3b8] font-medium">Name</th>
                <th className="text-left px-4 py-3 text-[#94a3b8] font-medium">Token</th>
                <th className="text-left px-4 py-3 text-[#94a3b8] font-medium hidden md:table-cell">Scope</th>
                <th className="text-left px-4 py-3 text-[#94a3b8] font-medium hidden lg:table-cell">Status</th>
                <th className="text-left px-4 py-3 text-[#94a3b8] font-medium hidden xl:table-cell">Last Used</th>
                <th className="text-left px-4 py-3 text-[#94a3b8] font-medium hidden xl:table-cell">Created</th>
                <th className="text-right px-4 py-3 text-[#94a3b8] font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tokens.map((tok) => (
                <tr key={tok._id} className="border-b border-[rgba(148,163,184,0.06)] hover:bg-[#334155]/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Key className="w-4 h-4 text-[#94a3b8]" />
                      <span className="text-[#f8fafc] font-medium">{tok.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 font-mono text-xs">
                      <span className="text-[#94a3b8] truncate max-w-[160px]">
                        {revealedTokens.has(tok._id) ? tok.token : '••••••••••••••••••••'}
                      </span>
                      <button onClick={() => toggleReveal(tok._id)} className="text-[#94a3b8] hover:text-[#f8fafc] transition-colors">
                        {revealedTokens.has(tok._id) ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => copyToken(tok.token)} className="text-[#94a3b8] hover:text-[#0ea5e9] transition-colors">
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className={cn('badge', scopeStyles[tok.scope] || 'badge-primary')}>{tok.scope}</span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {tok.revoked ? (
                      <span className="badge badge-danger">Revoked</span>
                    ) : (
                      <span className="badge badge-success">Active</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[#94a3b8] text-xs hidden xl:table-cell">{tok.lastUsed ? formatDate(tok.lastUsed) : 'Never'}</td>
                  <td className="px-4 py-3 text-[#94a3b8] text-xs hidden xl:table-cell">{formatDate(tok.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end">
                      <button onClick={() => deleteToken(tok._id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-[#94a3b8] hover:text-red-400 transition-colors" title="Revoke">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />

      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create API Token" size="md">
        <form onSubmit={handleSubmit(createToken)} className="space-y-4">
          <div>
            <label className="block text-sm text-[#94a3b8] mb-1">Token Name *</label>
            <input {...register('name', { required: 'Name is required' })} className="input-dark" placeholder="e.g. My Integration" />
            {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="block text-sm text-[#94a3b8] mb-1">Scope</label>
            <select {...register('scope')} className="input-dark">
              <option value="read">Read - Read-only access</option>
              <option value="write">Write - Create and update</option>
              <option value="admin">Admin - Full access</option>
            </select>
          </div>
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-sm text-yellow-300">
            Save your token after creation. It will not be shown again.
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} Create
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
