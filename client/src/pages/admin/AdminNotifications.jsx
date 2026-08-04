import { useState } from 'react';
import { Bell, Send, Loader2, Users, Shield, User, CheckCircle2 } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { cn } from '../../lib/utils';

const NOTIF_TYPES = ['general', 'admin', 'achievement', 'badge', 'follow', 'comment_reply', 'forum_reply'];
const ROLES = ['super_admin', 'content_admin', 'moderator', 'creator', 'user'];

// AdminNotifications: lets admins send notifications to a user, a role, or everyone
export default function AdminNotifications() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState('general');
  const [link, setLink] = useState('');
  const [target, setTarget] = useState('all');
  const [role, setRole] = useState('user');
  const [userQuery, setUserQuery] = useState('');
  const [userResults, setUserResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState(false);

  // Searches the user list to pick a recipient
  const searchUsers = async (e) => {
    e.preventDefault();
    if (!userQuery.trim()) return;
    setSearching(true);
    try {
      const res = await api.get(`/admin/users?search=${encodeURIComponent(userQuery.trim())}&limit=10`);
      setUserResults(res.data.data?.users || res.data.users || []);
    } catch {}
    setSearching(false);
  };

  // Sends the notification with the chosen recipient target
  const handleSend = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setSending(true);
    try {
      const payload = { title: title.trim(), content: content.trim(), type, link: link.trim() };
      if (target === 'user' && selectedUser) payload.userId = selectedUser.id;
      else if (target === 'role') payload.role = role;
      const res = await api.post('/admin/notifications/send', payload);
      toast.success(res.data?.message || 'Notification sent');
      setTitle('');
      setContent('');
      setLink('');
      setSelectedUser(null);
      setUserQuery('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send notification');
    }
    setSending(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">Send Notification</h2>
          <p className="text-sm text-text-muted mt-1">Broadcast an announcement to your users</p>
        </div>
        <Bell className="w-6 h-6 text-primary" />
      </div>

      <form onSubmit={handleSend} className="bg-panel border border-border-custom rounded-2xl p-6 space-y-5 max-w-2xl">
        <div>
          <label className="block text-sm text-text-muted mb-1">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. New Episode Alert"
            className="w-full bg-bg-dark border border-border-custom rounded-lg px-4 py-2.5 text-text-primary placeholder-text-muted text-sm focus:outline-none focus:border-primary/50"
          />
        </div>

        <div>
          <label className="block text-sm text-text-muted mb-1">Content</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write the notification message..."
            rows={4}
            className="w-full bg-bg-dark border border-border-custom rounded-lg px-4 py-2.5 text-text-primary placeholder-text-muted text-sm focus:outline-none focus:border-primary/50 resize-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-text-muted mb-1">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full bg-bg-dark border border-border-custom rounded-lg px-4 py-2.5 text-text-primary text-sm focus:outline-none focus:border-primary/50"
            >
              {NOTIF_TYPES.map((t) => (
                <option key={t} value={t}>{t.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-text-muted mb-1">Link (optional)</label>
            <input
              type="text"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="/anime/slug"
              className="w-full bg-bg-dark border border-border-custom rounded-lg px-4 py-2.5 text-text-primary placeholder-text-muted text-sm focus:outline-none focus:border-primary/50"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-text-muted mb-2">Recipients</label>
          <div className="flex gap-2 flex-wrap">
            <button type="button" onClick={() => setTarget('all')} className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors',
              target === 'all' ? 'bg-primary/15 text-primary border-primary/40' : 'bg-bg-dark text-text-muted border-border-custom hover:text-text-primary'
            )}>
              <Users className="w-4 h-4" /> All Users
            </button>
            <button type="button" onClick={() => setTarget('role')} className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors',
              target === 'role' ? 'bg-primary/15 text-primary border-primary/40' : 'bg-bg-dark text-text-muted border-border-custom hover:text-text-primary'
            )}>
              <Shield className="w-4 h-4" /> By Role
            </button>
            <button type="button" onClick={() => setTarget('user')} className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors',
              target === 'user' ? 'bg-primary/15 text-primary border-primary/40' : 'bg-bg-dark text-text-muted border-border-custom hover:text-text-primary'
            )}>
              <User className="w-4 h-4" /> Specific User
            </button>
          </div>

          {target === 'role' && (
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="mt-3 w-full sm:w-64 bg-bg-dark border border-border-custom rounded-lg px-4 py-2.5 text-text-primary text-sm focus:outline-none focus:border-primary/50"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          )}

          {target === 'user' && (
            <div className="mt-3">
              <form onSubmit={searchUsers} className="flex gap-2">
                <input
                  type="text"
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                  placeholder="Search user by name..."
                  className="flex-1 bg-bg-dark border border-border-custom rounded-lg px-4 py-2.5 text-text-primary placeholder-text-muted text-sm focus:outline-none focus:border-primary/50"
                />
                <button
                  type="button"
                  onClick={searchUsers}
                  disabled={searching || !userQuery.trim()}
                  className="px-4 py-2.5 bg-bg-dark border border-border-custom rounded-lg text-sm text-text-muted hover:text-text-primary transition-colors disabled:opacity-50"
                >
                  {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
                </button>
              </form>

              {userResults.length > 0 && (
                <div className="mt-3 bg-bg-dark border border-border-custom rounded-lg divide-y divide-border-custom max-h-56 overflow-y-auto">
                  {userResults.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => { setSelectedUser(u); setUserResults([]); setUserQuery(u.name); }}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors',
                        selectedUser?.id === u.id ? 'bg-primary/10 text-primary' : 'text-text-muted hover:bg-panel-hover'
                      )}
                    >
                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold overflow-hidden">
                        {u.avatar ? <img src={u.avatar} alt="" className="w-full h-full object-cover" /> : (u.name || 'U')[0]}
                      </div>
                      <span className="text-text-primary">{u.name}</span>
                      <span className="text-text-muted text-xs ml-auto">{u.role}</span>
                    </button>
                  ))}
                </div>
              )}

              {selectedUser && (
                <div className="mt-3 flex items-center gap-2 text-sm text-success">
                  <CheckCircle2 className="w-4 h-4" />
                  Sending to <span className="font-medium text-text-primary">{selectedUser.name}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={sending || !title.trim() || !content.trim() || (target === 'user' && !selectedUser)}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Send Notification
        </button>
      </form>
    </div>
  );
}
