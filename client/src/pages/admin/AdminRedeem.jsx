import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { Plus, Trash2, Loader2, Gift, RotateCw, Copy, Check } from 'lucide-react';
import api from '../../lib/api';
import { cn, formatDate } from '../../lib/utils';
import Pagination from '../../components/common/Pagination';
import Skeleton from '../../components/common/Skeleton';

// Admin page to generate and manage redeem codes.
export default function AdminRedeem() {
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({ total: 0, redeemed: 0, pending: 0 });
  const [copiedId, setCopiedId] = useState(null);
  const [error, setError] = useState('');

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm({
    defaultValues: { code: '', rewardType: 'xp', rewardAmount: '', quantity: 1, useCustomCode: false },
  });

  const useCustomCode = watch('useCustomCode');

  // Fetches paginated redeem codes and computes stats.
  const fetchCodes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/redeem-codes', { params: { page, limit: 20 } });
      const data = res.data.data || res.data;
      const codesList = data.codes || data || [];
      setCodes(Array.isArray(codesList) ? codesList : []);
      setTotalPages(data.pagination?.pages || 1);
      const total = data.pagination?.total || codesList.length;
      const redeemed = codesList.filter(c => c.is_redeemed).length;
      setStats({ total, redeemed, pending: total - redeemed });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchCodes(); }, [fetchCodes]);

  // Creates one or more redeem codes via the API.
  const generateCodes = async (data) => {
    setSaving(true);
    setError('');
    try {
      const res = await api.post('/admin/redeem-codes', {
        code: data.useCustomCode ? data.code : undefined,
        reward_type: data.rewardType,
        reward_amount: Number(data.rewardAmount),
        count: Number(data.quantity) || 1,
      });
      reset();
      fetchCodes();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to generate codes';
      setError(msg);
      console.error('Generate codes error:', err);
    } finally {
      setSaving(false);
    }
  };

  // Deletes a redeem code after confirmation.
  const deleteCode = async (id) => {
    if (!confirm('Delete this code?')) return;
    try {
      await api.delete(`/admin/redeem-codes/${id}`);
      fetchCodes();
    } catch (err) {
      console.error(err);
    }
  };

  // Copies a redeem code to the clipboard.
  const copyCode = (code, id) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#f8fafc]">Redeem Codes</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#1e293b] rounded-xl border border-[rgba(148,163,184,0.12)] p-4">
          <div className="text-sm text-[#94a3b8]">Total Codes</div>
          <div className="text-2xl font-bold text-[#f8fafc]">{stats.total}</div>
        </div>
        <div className="bg-[#1e293b] rounded-xl border border-[rgba(148,163,184,0.12)] p-4">
          <div className="text-sm text-[#94a3b8]">Redeemed</div>
          <div className="text-2xl font-bold text-green-400">{stats.redeemed}</div>
        </div>
        <div className="bg-[#1e293b] rounded-xl border border-[rgba(148,163,184,0.12)] p-4">
          <div className="text-sm text-[#94a3b8]">Pending</div>
          <div className="text-2xl font-bold text-yellow-400">{stats.pending}</div>
        </div>
      </div>

      <div className="bg-[#1e293b] rounded-xl border border-[rgba(148,163,184,0.12)] p-6">
        <h2 className="text-lg font-semibold text-[#f8fafc] mb-4">Generate Codes</h2>
        <form onSubmit={handleSubmit(generateCodes)} className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <input type="checkbox" {...register('useCustomCode')} id="customCode" className="w-4 h-4 rounded border-[rgba(148,163,184,0.3)] bg-[#0f172a] text-[#0ea5e9]" />
            <label htmlFor="customCode" className="text-sm text-[#f8fafc]">Use custom code</label>
          </div>

          {useCustomCode && (
            <div>
              <label className="block text-sm text-[#94a3b8] mb-1">Custom Code</label>
              <input {...register('code', useCustomCode ? { required: 'Code is required' } : {})} className="w-full px-4 py-2.5 bg-[#0f172a] border border-[rgba(148,163,184,0.12)] rounded-lg text-[#f8fafc] placeholder-[#94a3b8] text-sm focus:outline-none focus:border-[#0ea5e9] transition-colors" placeholder="MY-CUSTOM-CODE" />
              {errors.code && <p className="text-xs text-red-400 mt-1">{errors.code.message}</p>}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-[#94a3b8] mb-1">Reward Type</label>
              <select {...register('rewardType')} className="w-full px-4 py-2.5 bg-[#0f172a] border border-[rgba(148,163,184,0.12)] rounded-lg text-[#f8fafc] focus:outline-none focus:border-[#0ea5e9] transition-colors">
                <option value="xp">XP</option>
                <option value="premium_days">Premium Days</option>
                <option value="credits">Credits</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-[#94a3b8] mb-1">Amount *</label>
              <input {...register('rewardAmount', { required: true, min: 1 })} type="number" className="w-full px-4 py-2.5 bg-[#0f172a] border border-[rgba(148,163,184,0.12)] rounded-lg text-[#f8fafc] focus:outline-none focus:border-[#0ea5e9] transition-colors" />
            </div>
            <div>
              <label className="block text-sm text-[#94a3b8] mb-1">Quantity</label>
              <input {...register('quantity', { min: 1, max: 100 })} type="number" className="w-full px-4 py-2.5 bg-[#0f172a] border border-[rgba(148,163,184,0.12)] rounded-lg text-[#f8fafc] focus:outline-none focus:border-[#0ea5e9] transition-colors" />
            </div>
          </div>

          <button type="submit" disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-[#0ea5e9] hover:bg-[#0ea5e9]/90 text-white rounded-lg font-medium transition-colors disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gift className="w-4 h-4" />} Generate
          </button>

          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 text-sm mt-2">
              {error}
            </div>
          )}
        </form>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-[#f8fafc] mb-4">All Codes</h2>
        {loading ? (
          <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
        ) : codes.length === 0 ? (
          <div className="text-center py-12 text-[#94a3b8]">No codes generated yet</div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[rgba(148,163,184,0.12)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#0f172a] border-b border-[rgba(148,163,184,0.12)]">
                  <th className="text-left px-4 py-3 text-[#94a3b8] font-medium">Code</th>
                  <th className="text-left px-4 py-3 text-[#94a3b8] font-medium">Reward</th>
                  <th className="text-left px-4 py-3 text-[#94a3b8] font-medium hidden md:table-cell">Status</th>
                  <th className="text-left px-4 py-3 text-[#94a3b8] font-medium hidden lg:table-cell">Redeemed By</th>
                  <th className="text-left px-4 py-3 text-[#94a3b8] font-medium hidden xl:table-cell">Date</th>
                  <th className="text-right px-4 py-3 text-[#94a3b8] font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {codes.map((code) => {
                  const codeId = code.id || code._id;
                  return (
                    <tr key={codeId} className="border-b border-[rgba(148,163,184,0.06)] hover:bg-[#334155]/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[#f8fafc]">{code.code}</span>
                          <button onClick={() => copyCode(code.code, codeId)} className="text-[#94a3b8] hover:text-[#0ea5e9] transition-colors">
                            {copiedId === codeId ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[#f8fafc]">
                        <span className="capitalize">{(code.reward_type || '').replace('_', ' ')}</span>: {code.reward_amount}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className={`px-2 py-0.5 rounded text-xs ${code.is_redeemed ? 'bg-green-500/15 text-green-400' : 'bg-yellow-500/15 text-yellow-400'}`}>
                          {code.is_redeemed ? 'Redeemed' : 'Pending'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#94a3b8] hidden lg:table-cell">{code.redeemed_by_name || '—'}</td>
                      <td className="px-4 py-3 text-[#94a3b8] text-xs hidden xl:table-cell">{formatDate(code.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => deleteCode(codeId)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-[#94a3b8] hover:text-red-400 transition-colors" title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-4">
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      </div>
    </div>
  );
}
