import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { Plus, Edit, Shield, Loader2, Check } from 'lucide-react';
import api from '../../lib/api';
import { cn } from '../../lib/utils';
import Modal from '../../components/common/Modal';
import Skeleton from '../../components/common/Skeleton';

const ALL_PERMISSIONS = [
  { key: 'manage_users', label: 'Manage Users' },
  { key: 'manage_anime', label: 'Manage Anime' },
  { key: 'manage_episodes', label: 'Manage Episodes' },
  { key: 'manage_comments', label: 'Manage Comments' },
  { key: 'manage_reports', label: 'Manage Reports' },
  { key: 'manage_tokens', label: 'Manage Tokens' },
  { key: 'manage_codes', label: 'Manage Codes' },
  { key: 'manage_settings', label: 'Manage Settings' },
  { key: 'manage_roles', label: 'Manage Roles' },
];

const roleIcons = {
  admin: 'Shield',
  moderator: 'Gavel',
  premium: 'Crown',
  user: 'User',
};

// Admin page to create and edit user roles with permissions.
export default function AdminRoles() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, watch, reset, setValue, formState: { errors } } = useForm({
    defaultValues: { name: '', icon: 'Shield', permissions: [] },
  });

  const iconName = watch('icon');
  const selectedPerms = watch('permissions');

  // Fetches the list of all user roles.
  const fetchRoles = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/roles');
      setRoles(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRoles(); }, []);

  // Opens the create-role modal with empty form.
  const openAddModal = () => {
    setEditingRole(null);
    reset({ name: '', icon: 'Shield', permissions: [] });
    setShowModal(true);
  };

  // Opens the edit-role modal pre-filled with role data.
  const openEditModal = (role) => {
    setEditingRole(role);
    reset({
      name: role.name || '',
      icon: role.icon || 'Shield',
      permissions: role.permissions || [],
    });
    setShowModal(true);
  };

  // Toggles a permission on the current role form.
  const togglePermission = (key) => {
    const current = selectedPerms || [];
    const next = current.includes(key) ? current.filter((p) => p !== key) : [...current, key];
    setValue('permissions', next, { shouldValidate: true });
  };

  // Saves the role via the admin API.
  const onSubmit = async (data) => {
    setSaving(true);
    try {
      if (editingRole) {
        await api.put(`/admin/roles/${editingRole.name}`, data);
      }
      setShowModal(false);
      fetchRoles();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#f8fafc]">Role Management</h1>
        <button onClick={openAddModal} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Create Role
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map((role) => (
            <div key={role.name} className="bg-[#1e293b] rounded-xl border border-[rgba(148,163,184,0.12)] p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg bg-[#0ea5e9]/10 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-[#0ea5e9]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#f8fafc]">{role.name}</h3>
                    <p className="text-xs text-[#94a3b8]">{(role.permissions || []).length} permissions</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEditModal(role)} className="p-1.5 rounded-lg hover:bg-[#0ea5e9]/10 text-[#94a3b8] hover:text-[#0ea5e9] transition-colors">
                    <Edit className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {(role.permissions || []).slice(0, 5).map((p) => (
                  <span key={p} className="text-[10px] px-2 py-0.5 rounded-full bg-[#0f172a] text-[#94a3b8]">{p}</span>
                ))}
                {(role.permissions || []).length > 5 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#0f172a] text-[#94a3b8]">+{(role.permissions || []).length - 5} more</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingRole ? 'Edit Role' : 'Create Role'} size="md">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[#94a3b8] mb-1">Role Name *</label>
              <input {...register('name', { required: 'Name is required' })} className="input-dark" />
              {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="block text-sm text-[#94a3b8] mb-1">Badge Icon</label>
              <div className="flex items-center gap-2">
                <input {...register('icon')} className="input-dark" placeholder="Shield" />
                <div className="w-10 h-10 rounded-lg bg-[#0f172a] flex items-center justify-center flex-shrink-0">
                  <Shield className="w-5 h-5 text-[#0ea5e9]" />
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm text-[#94a3b8] mb-2">Permissions</label>
            <div className="grid grid-cols-2 gap-2">
              {ALL_PERMISSIONS.map((perm) => {
                const checked = (selectedPerms || []).includes(perm.key);
                return (
                  <button
                    key={perm.key}
                    type="button"
                    onClick={() => togglePermission(perm.key)}
                    className={cn(
                      'flex items-center gap-2 p-2.5 rounded-lg border text-sm text-left transition-colors',
                      checked
                        ? 'bg-[#0ea5e9]/10 border-[#0ea5e9]/30 text-[#f8fafc]'
                        : 'border-[rgba(148,163,184,0.12)] text-[#94a3b8] hover:bg-[#334155]'
                    )}
                  >
                    <div className={cn('w-4 h-4 rounded border flex items-center justify-center flex-shrink-0', checked ? 'bg-[#0ea5e9] border-[#0ea5e9]' : 'border-[rgba(148,163,184,0.3)]')}>
                      {checked && <Check className="w-3 h-3 text-white" />}
                    </div>
                    {perm.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingRole ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
