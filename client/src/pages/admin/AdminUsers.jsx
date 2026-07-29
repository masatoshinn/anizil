import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { Search, Shield, Ban, Eye, ChevronDown, Loader2, UserX, UserCheck, Award, X } from 'lucide-react';
import api from '../../lib/api';
import { cn, formatDate } from '../../lib/utils';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import Skeleton from '../../components/common/Skeleton';
import toast from 'react-hot-toast';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [saving, setSaving] = useState(false);

  // Badge state
  const [allBadges, setAllBadges] = useState([]);
  const [userBadges, setUserBadges] = useState([]);
  const [loadingBadges, setLoadingBadges] = useState(false);

  const { register, handleSubmit, reset } = useForm();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;
      const res = await api.get('/admin/users', { params });
      setUsers(res.data.data.users || []);
      setTotalPages(res.data.data.pagination.pages || 1);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const openRoleModal = (user) => {
    setSelectedUser(user);
    reset({ role: user.role || 'user' });
    setShowRoleModal(true);
  };

  const openBanModal = (user) => {
    setSelectedUser(user);
    setShowBanModal(true);
  };

  const openBadgeModal = async (user) => {
    setSelectedUser(user);
    setShowBadgeModal(true);
    setLoadingBadges(true);
    try {
      const [badgesRes, userBadgesRes] = await Promise.all([
        api.get('/admin/badges'),
        api.get(`/admin/users/${user.id}/badges`)
      ]);
      setAllBadges(badgesRes.data.data || []);
      setUserBadges(userBadgesRes.data.data || []);
    } catch { toast.error('Failed to load badges'); }
    setLoadingBadges(false);
  };

  const handleAssignBadge = async (badgeId) => {
    try {
      await api.post(`/admin/users/${selectedUser.id}/badges`, { badge_id: badgeId });
      toast.success('Badge assigned!');
      const res = await api.get(`/admin/users/${selectedUser.id}/badges`);
      setUserBadges(res.data.data || []);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleRemoveBadge = async (badgeId) => {
    try {
      await api.delete(`/admin/users/${selectedUser.id}/badges/${badgeId}`);
      toast.success('Badge removed');
      setUserBadges(prev => prev.filter(b => b.id !== badgeId));
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const changeRole = async (data) => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      await api.put(`/admin/users/${selectedUser.id}/role`, { role: data.role });
      setShowRoleModal(false);
      fetchUsers();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const toggleBan = async () => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      await api.put(`/admin/users/${selectedUser.id}/ban`);
      setShowBanModal(false);
      fetchUsers();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const roleColors = {
    super_admin: 'badge-danger',
    content_admin: 'badge-warning',
    moderator: 'badge-warning',
    user: 'badge-success',
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#f8fafc]">Manage Users</h1>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input-dark pl-10"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          className="input-dark w-full sm:w-40"
        >
          <option value="">All Roles</option>
          <option value="super_admin">Super Admin</option>
          <option value="content_admin">Content Admin</option>
          <option value="moderator">Moderator</option>
          <option value="user">User</option>
        </select>
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
      ) : users.length === 0 ? (
        <div className="text-center py-12 text-[#94a3b8]">No users found</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[rgba(148,163,184,0.12)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#0f172a] border-b border-[rgba(148,163,184,0.12)]">
                <th className="text-left px-4 py-3 text-[#94a3b8] font-medium">User</th>
                <th className="text-left px-4 py-3 text-[#94a3b8] font-medium hidden md:table-cell">Role</th>
                <th className="text-left px-4 py-3 text-[#94a3b8] font-medium hidden lg:table-cell">Status</th>
                <th className="text-left px-4 py-3 text-[#94a3b8] font-medium hidden lg:table-cell">XP</th>
                <th className="text-left px-4 py-3 text-[#94a3b8] font-medium hidden xl:table-cell">Joined</th>
                <th className="text-right px-4 py-3 text-[#94a3b8] font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-[rgba(148,163,184,0.06)] hover:bg-[#334155]/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={user.avatar || user.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=0ea5e9&color=fff`}
                        alt=""
                        className="w-9 h-9 rounded-full object-cover"
                      />
                      <div className="min-w-0">
                        <div className="font-medium text-[#f8fafc] truncate">{user.name}</div>
                        <div className="text-xs text-[#94a3b8] truncate">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className={cn('badge', roleColors[user.role] || 'badge-success')}>
                      {user.role || 'user'}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {user.is_banned ? (
                      <span className="badge badge-danger">Banned</span>
                    ) : (
                      <span className="badge badge-success">Active</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[#f8fafc] hidden lg:table-cell">{user.xp ?? 0}</td>
                  <td className="px-4 py-3 text-[#94a3b8] hidden xl:table-cell">{formatDate(user.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openBadgeModal(user)} className="p-1.5 rounded-lg hover:bg-yellow-500/10 text-[#94a3b8] hover:text-yellow-400 transition-colors" title="Manage badges">
                        <Award className="w-4 h-4" />
                      </button>
                      <button onClick={() => openRoleModal(user)} className="p-1.5 rounded-lg hover:bg-[#0ea5e9]/10 text-[#94a3b8] hover:text-[#0ea5e9] transition-colors" title="Change role">
                        <Shield className="w-4 h-4" />
                      </button>
                      <button onClick={() => openBanModal(user)} className={cn('p-1.5 rounded-lg transition-colors', user.is_banned ? 'hover:bg-green-500/10 text-green-400' : 'hover:bg-red-500/10 text-[#94a3b8] hover:text-red-400')} title={user.is_banned ? 'Unban' : 'Ban'}>
                        {user.is_banned ? <UserCheck className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
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

      <Modal isOpen={showRoleModal} onClose={() => setShowRoleModal(false)} title="Change Role" size="sm">
        <form onSubmit={handleSubmit(changeRole)} className="space-y-4">
          <p className="text-sm text-[#94a3b8]">
            Change role for <strong className="text-[#f8fafc]">{selectedUser?.name}</strong>
          </p>
          <div>
            <label className="block text-sm text-[#94a3b8] mb-1">New Role</label>
            <select {...register('role')} className="input-dark">
              <option value="user">User</option>
              <option value="moderator">Moderator</option>
              <option value="content_admin">Content Admin</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowRoleModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showBanModal} onClose={() => setShowBanModal(false)} title={selectedUser?.is_banned ? 'Unban User' : 'Ban User'} size="sm">
        <div className="space-y-4">
          <p className="text-[#94a3b8]">
            {selectedUser?.is_banned
              ? <>Unban <strong className="text-[#f8fafc]">{selectedUser?.name}</strong>? They will regain access.</>
              : <>Ban <strong className="text-[#f8fafc]">{selectedUser?.name}</strong>? They will lose access to the platform.</>
            }
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowBanModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={toggleBan} disabled={saving} className={cn('px-4 py-2 rounded-lg font-medium text-white flex items-center gap-2', selectedUser?.is_banned ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600')}>
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {selectedUser?.is_banned ? 'Unban' : 'Ban'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Badge Management Modal */}
      <Modal isOpen={showBadgeModal} onClose={() => setShowBadgeModal(false)} title={`Badges - ${selectedUser?.name || ''}`} size="lg">
        {loadingBadges ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Current badges */}
            <div>
              <h4 className="text-sm font-medium text-[#f8fafc] mb-3">Current Badges ({userBadges.length})</h4>
              {userBadges.length === 0 ? (
                <p className="text-sm text-[#94a3b8]">No badges assigned yet</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {userBadges.map((badge) => (
                    <div key={badge.id}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm"
                      style={{ borderColor: `${badge.color}40`, backgroundColor: `${badge.color}10` }}>
                      <span>{badge.icon}</span>
                      <span className="text-[#f8fafc]">{badge.name}</span>
                      <button onClick={() => handleRemoveBadge(badge.id)}
                        className="text-[#94a3b8] hover:text-red-400 transition-colors ml-1">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Available badges to assign */}
            <div>
              <h4 className="text-sm font-medium text-[#f8fafc] mb-3">Available Badges</h4>
              <div className="flex flex-wrap gap-2">
                {allBadges.filter(b => !userBadges.some(ub => ub.id === b.id)).map((badge) => (
                  <button key={badge.id} onClick={() => handleAssignBadge(badge.id)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition-all hover:scale-105"
                    style={{ borderColor: `${badge.color}30`, backgroundColor: `${badge.color}08` }}>
                    <span>{badge.icon}</span>
                    <span className="text-[#94a3b8]">{badge.name}</span>
                  </button>
                ))}
                {allBadges.filter(b => !userBadges.some(ub => ub.id === b.id)).length === 0 && (
                  <p className="text-sm text-[#94a3b8]">User has all available badges</p>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
