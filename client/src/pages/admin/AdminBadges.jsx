import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Shield, Loader2, Check, X, Edit, Trash2, Users } from 'lucide-react';
import api from '../../lib/api';
import { cn } from '../../lib/utils';
import Modal from '../../components/common/Modal';
import Skeleton from '../../components/common/Skeleton';
import BadgeIcon from '../../components/common/BadgeIcon';
import toast from 'react-hot-toast';

// Admin page to create, edit, and delete badges.
export default function AdminBadges() {
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', icon: '⭐', color: '#0ea5e9', description: '', is_verified: false });

  useEffect(() => { loadBadges(); }, []);

  // Fetches all badges from the server.
  const loadBadges = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/badges');
      setBadges(res.data.data || []);
    } catch { toast.error('Failed to load badges'); }
    setLoading(false);
  };

  // Opens the create-badge modal with defaults.
  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', icon: '⭐', color: '#0ea5e9', description: '', is_verified: false });
    setShowModal(true);
  };

  // Opens the edit modal pre-filled with badge data.
  const openEdit = (badge) => {
    setEditing(badge);
    setForm({ name: badge.name, icon: badge.icon, color: badge.color, description: badge.description || '', is_verified: !!badge.is_verified });
    setShowModal(true);
  };

  // Creates or updates a badge from the form.
  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.icon.trim()) { toast.error('Name and icon required'); return; }
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/admin/badges/${editing.id}`, form);
        toast.success('Badge updated!');
      } else {
        await api.post('/admin/badges', form);
        toast.success('Badge created!');
      }
      setShowModal(false);
      loadBadges();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    setSaving(false);
  };

  // Deletes a badge after confirmation.
  const handleDelete = async (badge) => {
    if (!confirm(`Delete "${badge.name}" badge?`)) return;
    try {
      await api.delete(`/admin/badges/${badge.id}`);
      toast.success('Badge deleted');
      loadBadges();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#f8fafc] flex items-center gap-2">
          <Shield className="w-6 h-6 text-[#0ea5e9]" /> Badges Management
        </h1>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-[#0ea5e9] hover:bg-[#0ea5e9]/90 text-white rounded-lg font-medium transition-colors text-sm">
          <Plus className="w-4 h-4" /> New Badge
        </button>
      </div>

      <div className="bg-[#1e293b] rounded-2xl border border-[rgba(148,163,184,0.12)] overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
          </div>
        ) : badges.length === 0 ? (
          <div className="p-12 text-center">
            <Shield className="w-12 h-12 text-[#94a3b8] mx-auto mb-3 opacity-50" />
            <p className="text-[#94a3b8]">No badges created yet</p>
          </div>
        ) : (
          <div className="divide-y divide-[rgba(148,163,184,0.06)]">
            {badges.map((badge) => (
              <div key={badge.id} className="flex items-center gap-4 p-4 hover:bg-[#334155]/30 transition-colors">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                  style={{ backgroundColor: `${badge.color}20` }}>
                  <BadgeIcon icon={badge.icon} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[#f8fafc]">{badge.name}</span>
                    {badge.is_verified ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold text-white"
                        style={{ backgroundColor: badge.color }}>
                        ✓ Verified
                      </span>
                    ) : null}
                  </div>
                  {badge.description && (
                    <p className="text-xs text-[#94a3b8] mt-0.5">{badge.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => openEdit(badge)}
                    className="p-2 rounded-lg text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#334155] transition-colors">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(badge)}
                    className="p-2 rounded-lg text-[#94a3b8] hover:text-red-400 hover:bg-red-500/10 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)}
        title={editing ? 'Edit Badge' : 'Create Badge'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#94a3b8] mb-1.5">Badge Icon</label>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-lg flex items-center justify-center text-xl flex-shrink-0"
                style={{ backgroundColor: `${form.color}20`, color: form.color }}>
                <BadgeIcon icon={form.icon} />
              </div>
              <input type="text" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })}
                className="flex-1 px-4 py-2.5 bg-[#0f172a] border border-[rgba(148,163,184,0.12)] rounded-lg text-[#f8fafc] focus:outline-none focus:border-[#0ea5e9] transition-colors"
                placeholder="fa-solid fa-crown or emoji" />
            </div>
            <p className="text-xs text-[#94a3b8] mt-1.5">FontAwesome icon name (e.g. <code className="text-[#0ea5e9]">fa-solid fa-crown</code>, <code className="text-[#0ea5e9]">fas fa-user</code>) renders the FA icon. Emoji also works.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#94a3b8] mb-1.5">Badge Name</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-2.5 bg-[#0f172a] border border-[rgba(148,163,184,0.12)] rounded-lg text-[#f8fafc] focus:outline-none focus:border-[#0ea5e9] transition-colors"
              placeholder="e.g. Verified" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#94a3b8] mb-1.5">Color</label>
            <div className="flex gap-3 items-center">
              <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })}
                className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border border-[rgba(148,163,184,0.12)]" />
              <input type="text" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })}
                className="flex-1 px-4 py-2.5 bg-[#0f172a] border border-[rgba(148,163,184,0.12)] rounded-lg text-[#f8fafc] focus:outline-none focus:border-[#0ea5e9] transition-colors"
                placeholder="#0ea5e9" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#94a3b8] mb-1.5">Description</label>
            <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-4 py-2.5 bg-[#0f172a] border border-[rgba(148,163,184,0.12)] rounded-lg text-[#f8fafc] focus:outline-none focus:border-[#0ea5e9] transition-colors"
              placeholder="What this badge represents" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_verified} onChange={(e) => setForm({ ...form, is_verified: e.target.checked })}
              className="w-4 h-4 rounded border-[rgba(148,163,184,0.3)] bg-[#0f172a] text-[#0ea5e9] focus:ring-[#0ea5e9]" />
            <span className="text-sm text-[#f8fafc]">Verified badge (green checkmark style)</span>
          </label>
          <div className="flex items-center gap-3 pt-2">
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#0ea5e9] hover:bg-[#0ea5e9]/90 text-white rounded-lg font-medium transition-colors disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {saving ? 'Saving...' : editing ? 'Update Badge' : 'Create Badge'}
            </button>
            <button type="button" onClick={() => setShowModal(false)}
              className="px-4 py-2.5 text-sm text-[#94a3b8] hover:text-[#f8fafc] transition-colors">Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}