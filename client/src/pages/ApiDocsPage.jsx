import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, Copy, Check, Search, BookOpen, Shield, Zap, Server } from 'lucide-react';

const COLORS = {
  bg: 'bg-[#0a0e1a]',
  card: 'bg-[#0f1629] border border-sky-500/10',
  accent: 'text-sky-400',
  green: 'text-emerald-400',
  yellow: 'text-amber-400',
  red: 'text-rose-400',
  purple: 'text-violet-400',
  blue: 'text-blue-400',
  orange: 'text-orange-400',
  cyan: 'text-cyan-400',
  pink: 'text-pink-400',
  text: 'text-gray-300',
  dim: 'text-gray-500',
  code: 'bg-[#0d1321] border border-sky-500/5',
};

const METHOD_COLORS = {
  GET: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  POST: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  PUT: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  DELETE: 'bg-rose-500/15 text-rose-400 border-rose-500/20',
};

const sections = [
  {
    id: 'auth',
    title: 'Auth',
    icon: Shield,
    endpoints: [
      { method: 'POST', path: '/api/auth/register', auth: 'None', desc: 'Register a new user', body: '{ name: string, email: string, password: string }', success: '201 → { success, data: { user, token } }', errors: '400 (validation/dupe), 403 (disabled)' },
      { method: 'POST', path: '/api/auth/login', auth: 'None', desc: 'Login and receive JWT', body: '{ email: string, password: string }', success: '200 → { success, data: { user, token } }', errors: '400, 401 (bad creds), 403 (banned)' },
      { method: 'POST', path: '/api/auth/logout', auth: 'None', desc: 'Clear auth cookie', success: '200 → { success, message }' },
      { method: 'GET', path: '/api/auth/me', auth: 'Token', desc: 'Get current user profile with stats', success: '200 → { success, data: { ...user, stats } }' },
      { method: 'POST', path: '/api/auth/forgot-password', auth: 'None', desc: 'Request password reset token', body: '{ email: string }', success: '200 → { success, data: { reset_token } }' },
      { method: 'POST', path: '/api/auth/reset-password', auth: 'None', desc: 'Reset password using token', body: '{ token: string, password: string }', success: '200 → { success, message }' },
    ]
  },
  {
    id: 'anime',
    title: 'Anime',
    icon: BookOpen,
    endpoints: [
      { method: 'GET', path: '/api/anime', auth: 'None', desc: 'List anime with filters & pagination', query: 'page, limit, genre, status, sort, search, language, year, season', success: '200 → { success, data: { anime[], pagination } }' },
      { method: 'GET', path: '/api/anime/featured', auth: 'None', desc: 'Get featured anime (top 10 by rating)', success: '200 → { success, data: anime[] }' },
      { method: 'GET', path: '/api/anime/trending', auth: 'None', desc: 'Get trending anime (top 20 by views)', success: '200 → { success, data: anime[] }' },
      { method: 'GET', path: '/api/anime/recent', auth: 'None', desc: 'Get recently updated anime', success: '200 → { success, data: anime[] }' },
      { method: 'GET', path: '/api/anime/genres', auth: 'None', desc: 'Get all unique genres', success: '200 → { success, data: string[] }' },
      { method: 'GET', path: '/api/anime/schedule', auth: 'None', desc: 'Get weekly broadcast schedule', success: '200 → { success, data: { Monday: anime[], ... } }' },
      { method: 'GET', path: '/api/anime/external/recent', auth: 'None', desc: 'Fetch from Anikoto API', query: 'page, per_page', success: '200 → { success, data }' },
      { method: 'GET', path: '/api/anime/external/series/:id', auth: 'None', desc: 'Fetch single anime from Anikoto', success: '200 → { success, data }' },
      { method: 'GET', path: '/api/anime/external/search', auth: 'None', desc: 'Search Anikoto API', query: 'q', success: '200 → { success, data }' },
      { method: 'GET', path: '/api/anime/:slug', auth: 'None', desc: 'Get anime detail by slug (increments views)', success: '200 → { success, data: { ...anime, episodes[], similar[] } }' },
      { method: 'GET', path: '/api/anime/:id/episodes', auth: 'None', desc: 'Get episodes for anime (paginated)', query: 'page, limit', success: '200 → { success, data: { episodes[], pagination } }' },
    ]
  },
  {
    id: 'episodes',
    title: 'Episodes',
    icon: Zap,
    endpoints: [
      { method: 'GET', path: '/api/episodes/:id', auth: 'None', desc: 'Get episode detail with sources & prev/next', success: '200 → { success, data: { ...episode, sources[], prev_episode, next_episode } }' },
    ]
  },
  {
    id: 'user',
    title: 'User',
    icon: Shield,
    endpoints: [
      { method: 'GET', path: '/api/user/profile', auth: 'Token', desc: 'Get user profile with stats & recent activity', success: '200 → { success, data: { ...user, stats, recent_activity[] } }' },
      { method: 'PUT', path: '/api/user/profile', auth: 'Token', desc: 'Update profile fields', body: '{ name?, bio?, avatar? }', success: '200 → { success, data: updatedUser }' },
      { method: 'GET', path: '/api/user/watchlist', auth: 'Token', desc: 'Get user\'s watchlist', query: 'status (watching|completed|plan_to_watch|on_hold|dropped)', success: '200 → { success, data: watchlist[] }' },
      { method: 'POST', path: '/api/user/watchlist', auth: 'Token', desc: 'Add/update anime in watchlist', body: '{ animeId: int, status?: string }', success: '200 → { success, message }' },
      { method: 'DELETE', path: '/api/user/watchlist/:animeId', auth: 'Token', desc: 'Remove anime from watchlist', success: '200 → { success, message }' },
      { method: 'GET', path: '/api/user/history', auth: 'Token', desc: 'Get watch history (paginated)', query: 'page, limit', success: '200 → { success, data: { history[], pagination } }' },
      { method: 'POST', path: '/api/user/history', auth: 'Token', desc: 'Add/update watch history (+XP)', body: '{ animeId, episodeId, progress?, completed? }', success: '200 → { success, message }' },
      { method: 'DELETE', path: '/api/user/history', auth: 'Token', desc: 'Clear all watch history', success: '200 → { success, message }' },
      { method: 'GET', path: '/api/user/achievements', auth: 'Token', desc: 'Get all achievements with unlock status', success: '200 → { success, data: { achievements[], total_xp, unlocked_count, total_count } }' },
      { method: 'GET', path: '/api/user/notifications', auth: 'Token', desc: 'Get user notifications (last 50)', success: '200 → { success, data: { notifications[], unread_count } }' },
      { method: 'PUT', path: '/api/user/notifications/read', auth: 'Token', desc: 'Mark all notifications as read', success: '200 → { success, message }' },
    ]
  },
  {
    id: 'comments',
    title: 'Comments',
    icon: BookOpen,
    endpoints: [
      { method: 'GET', path: '/api/comments', auth: 'None', desc: 'Get comments by episode or anime (paginated)', query: 'episode_id | anime_id, page, limit', success: '200 → { success, data: { comments[], pagination } }' },
      { method: 'POST', path: '/api/comments', auth: 'Token', desc: 'Create comment or reply (+5 XP)', body: '{ content, episodeId?, animeId?, parentId? }', success: '201 → { success, data: { ...comment, xp_earned, new_xp } }' },
      { method: 'PUT', path: '/api/comments/:id', auth: 'Token', desc: 'Edit a comment (owner only)', body: '{ content: string }', success: '200 → { success, data: updatedComment }' },
      { method: 'DELETE', path: '/api/comments/:id', auth: 'Token', desc: 'Delete comment (owner or mod/admin)', success: '200 → { success, message }' },
      { method: 'POST', path: '/api/comments/:id/like', auth: 'Token', desc: 'Like a comment (+1)', success: '200 → { success, data: { likes } }' },
      { method: 'POST', path: '/api/comments/:id/report', auth: 'Token', desc: 'Report a comment', body: '{ reason: string }', success: '200 → { success, message }' },
    ]
  },
  {
    id: 'forum',
    title: 'Forum',
    icon: BookOpen,
    endpoints: [
      { method: 'GET', path: '/api/forum/posts', auth: 'None', desc: 'List forum posts (paginated)', query: 'page, limit, category (general|recommendations|discussion|help), sort (popular|views)', success: '200 → { success, data: { posts[], pagination } }' },
      { method: 'GET', path: '/api/forum/posts/:id', auth: 'None', desc: 'Get post detail with replies', success: '200 → { success, data: { ...post, views, replies[] } }' },
      { method: 'POST', path: '/api/forum/posts', auth: 'Token', desc: 'Create a forum post', body: '{ title, content, category? }', success: '201 → { success, data: newPost }' },
      { method: 'POST', path: '/api/forum/posts/:id/reply', auth: 'Token', desc: 'Reply to a forum post', body: '{ content: string }', success: '201 → { success, data: newReply }' },
      { method: 'POST', path: '/api/forum/posts/:id/like', auth: 'Token', desc: 'Like a forum post', success: '200 → { success, data: { likes } }' },
    ]
  },
  {
    id: 'search',
    title: 'Search',
    icon: Search,
    endpoints: [
      { method: 'GET', path: '/api/search', auth: 'None', desc: 'Full-text search across anime', query: 'q (required), page, limit', success: '200 → { success, data: { anime[], genres[], pagination, query } }' },
    ]
  },
  {
    id: 'shop',
    title: 'Shop',
    icon: Zap,
    endpoints: [
      { method: 'POST', path: '/api/shop/redeem', auth: 'Token', desc: 'Redeem a code (XP/credits/premium)', body: '{ code: string }', success: '200 → { success, message, data: { new_xp } }' },
      { method: 'GET', path: '/api/shop/inventory', auth: 'Token', desc: 'Get user\'s earned items', success: '200 → { success, data: { items[] } }' },
      { method: 'POST', path: '/api/shop/purchase', auth: 'Token', desc: 'Purchase XP pack', body: '{ itemId: "small"|"medium"|"large"|"mega" }', success: '200 → { success, message, data: { xp_added } }' },
      { method: 'GET', path: '/api/shop/frames', auth: 'None', desc: 'Get all active profile frames', success: '200 → { success, data: frames[] }' },
      { method: 'GET', path: '/api/shop/frames/my', auth: 'Token', desc: 'Get user\'s purchased frames', success: '200 → { success, data: { frames[], active_frame_id } }' },
      { method: 'POST', path: '/api/shop/frames/purchase', auth: 'Token', desc: 'Purchase profile frame with XP', body: '{ frame_id: int }', success: '200 → { success, message, data: { new_xp } }' },
      { method: 'POST', path: '/api/shop/frames/activate', auth: 'Token', desc: 'Activate or remove frame', body: '{ frame_id: int|null }', success: '200 → { success, message }' },
      { method: 'POST', path: '/api/shop/purchase-anime', auth: 'Token', desc: 'Unlock premium anime (200 XP)', body: '{ anime_id: int }', success: '200 → { success, message, data: { new_xp } }' },
      { method: 'GET', path: '/api/shop/anime-access/:animeId', auth: 'Token', desc: 'Check premium anime access', success: '200 → { success, data: { has_access: boolean } }' },
      { method: 'GET', path: '/api/shop/xp-info', auth: 'Token', desc: 'Get XP methods & level thresholds', success: '200 → { success, data: { methods[], level_thresholds } }' },
    ]
  },
  {
    id: 'admin',
    title: 'Admin',
    icon: Shield,
    endpoints: [
      { method: 'GET', path: '/api/admin/dashboard', auth: 'Admin', desc: 'Admin dashboard with aggregate stats', success: '200 → { success, data: { stats, recent_users[], recent_anime[], popular_anime[] } }' },
      { method: 'GET', path: '/api/admin/stats', auth: 'Admin', desc: 'Dashboard stats (flat response)', success: '200 → { totalUsers, totalAnime, ... }' },
      { method: 'GET', path: '/api/admin/anime', auth: 'Admin', desc: 'Admin anime list', query: 'page, limit, search, status', success: '200 → { success, data: { anime[], pagination } }' },
      { method: 'POST', path: '/api/admin/anime', auth: 'Admin + manage_anime', desc: 'Create anime entry', body: '{ title, genres?, status?, ... }', success: '201 → { success, data: newAnime }' },
      { method: 'PUT', path: '/api/admin/anime/:id', auth: 'Admin + manage_anime', desc: 'Update anime entry', body: 'partial fields', success: '200 → { success, data: updatedAnime }' },
      { method: 'DELETE', path: '/api/admin/anime/:id', auth: 'Admin + manage_anime', desc: 'Delete anime entry', success: '200 → { success, message }' },
      { method: 'PUT', path: '/api/admin/anime/:id/premium', auth: 'Admin + manage_anime', desc: 'Toggle premium status', body: '{ is_premium: boolean }', success: '200 → { success, message }' },
      { method: 'GET', path: '/api/admin/episodes', auth: 'Admin', desc: 'Admin episode list', query: 'page, limit, anime_id', success: '200 → { success, data: { episodes[], pagination } }' },
      { method: 'POST', path: '/api/admin/episodes', auth: 'Admin + manage_episodes', desc: 'Create episode with sources', body: '{ anime_id, episode_number, title?, ... }', success: '201 → { success, data: newEpisode }' },
      { method: 'PUT', path: '/api/admin/episodes/:id', auth: 'Admin + manage_episodes', desc: 'Update episode', body: 'partial fields + sources', success: '200 → { success, data: updatedEpisode }' },
      { method: 'DELETE', path: '/api/admin/episodes/:id', auth: 'Admin + manage_episodes', desc: 'Delete episode', success: '200 → { success, message }' },
      { method: 'GET', path: '/api/admin/users', auth: 'Admin', desc: 'Admin user list', query: 'page, limit, search, role', success: '200 → { success, data: { users[], pagination } }' },
      { method: 'PUT', path: '/api/admin/users/:id/role', auth: 'Admin + manage_users', desc: 'Change user role', body: '{ role: string }', success: '200 → { success, message }' },
      { method: 'PUT', path: '/api/admin/users/:id/ban', auth: 'Admin + manage_users', desc: 'Toggle ban status', success: '200 → { success, message }' },
      { method: 'GET', path: '/api/admin/comments', auth: 'Admin', desc: 'Admin comment list', query: 'page, limit, status', success: '200 → { success, data: { comments[], pagination } }' },
      { method: 'PUT', path: '/api/admin/comments/:id/status', auth: 'Admin + manage_comments', desc: 'Set comment status', body: '{ status: string }', success: '200 → { success, message }' },
      { method: 'POST', path: '/api/admin/comments/bulk/:action', auth: 'Admin + manage_comments', desc: 'Bulk: approve/flag/remove', body: '{ ids: int[] }', success: '200 → { success, message }' },
      { method: 'GET', path: '/api/admin/reports', auth: 'Admin', desc: 'Admin report list', query: 'page, limit, status', success: '200 → { success, data: { reports[], pagination } }' },
      { method: 'PUT', path: '/api/admin/reports/:id', auth: 'Admin + manage_reports', desc: 'Handle report (dismiss/resolve)', body: '{ status: string }', success: '200 → { success, message }' },
      { method: 'GET', path: '/api/admin/settings', auth: 'Admin', desc: 'Get all site settings', success: '200 → { success, data: { [key]: { value, type } } }' },
      { method: 'PUT', path: '/api/admin/settings', auth: 'Admin + manage_settings', desc: 'Update settings (upsert)', body: '{ [key]: value }', success: '200 → { success, message }' },
      { method: 'GET', path: '/api/admin/settings/ads', auth: 'Admin', desc: 'Get ad settings', success: '200 → { success, data: { [key]: value } }' },
      { method: 'PUT', path: '/api/admin/settings/ads', auth: 'Admin + manage_settings', desc: 'Update ad settings', body: '{ [key]: value }', success: '200 → { success, message }' },
      { method: 'GET', path: '/api/admin/api-tokens', auth: 'Admin', desc: 'List all API tokens', success: '200 → { success, data: tokens[] }' },
      { method: 'POST', path: '/api/admin/api-tokens', auth: 'Admin + manage_tokens', desc: 'Create API token', body: '{ user_id, name, scope }', success: '201 → { success, data: newToken }' },
      { method: 'DELETE', path: '/api/admin/api-tokens/:id', auth: 'Admin + manage_tokens', desc: 'Delete API token', success: '200 → { success, message }' },
      { method: 'GET', path: '/api/admin/redeem-codes', auth: 'Admin', desc: 'List all redeem codes', query: 'page, limit', success: '200 → { success, data: { codes[], pagination } }' },
      { method: 'POST', path: '/api/admin/redeem-codes', auth: 'Admin + manage_codes', desc: 'Generate redeem codes', body: '{ reward_type, reward_amount, count?, code? }', success: '201 → { success, data: { codes[], count } }' },
      { method: 'DELETE', path: '/api/admin/redeem-codes/:id', auth: 'Admin + manage_codes', desc: 'Delete redeem code', success: '200 → { success, message }' },
      { method: 'GET', path: '/api/admin/roles', auth: 'Admin', desc: 'Get role definitions', success: '200 → { success, data: [{ name, description, permissions[] }] }' },
      { method: 'PUT', path: '/api/admin/roles/:role', auth: 'Admin + manage_roles', desc: 'Update role permissions', body: '{ permissions: string[] }', success: '200 → { success, message }' },
      { method: 'POST', path: '/api/admin/frames', auth: 'Admin + manage_settings', desc: 'Create profile frame', body: '{ name, image_url, price_xp, rarity?, border_color? }', success: '201 → { success, data: { id } }' },
      { method: 'DELETE', path: '/api/admin/frames/:id', auth: 'Admin + manage_settings', desc: 'Delete profile frame', success: '200 → { success, message }' },
      { method: 'GET', path: '/api/admin/analytics', auth: 'Admin', desc: 'Get analytics data', query: 'range (7d|30d|90d)', success: '200 → { success, data: { totalUsers, dailyUsers[], topAnime[] } }' },
      { method: 'GET', path: '/api/admin/activities', auth: 'Admin', desc: 'Get activity feed', query: 'limit (default 20)', success: '200 → { success, activities[] }' },
    ]
  },
  {
    id: 'import',
    title: 'Import',
    icon: Zap,
    endpoints: [
      { method: 'GET', path: '/api/import/anikoto/status', auth: 'Admin', desc: 'Check Anikoto API status', success: '200 → { success, online: boolean }' },
      { method: 'GET', path: '/api/import/anikoto/search', auth: 'Admin', desc: 'Search Anikoto API', query: 'q, page', success: '200 → { success, data: { anime[], pagination } }' },
      { method: 'GET', path: '/api/import/anikoto/browse', auth: 'Admin', desc: 'Browse Anikoto API', query: 'q, page, per_page', success: '200 → { success, data: { anime[], pagination } }' },
      { method: 'POST', path: '/api/import/anikoto', auth: 'Admin + add_anime', desc: 'Import anime with episodes', body: '{ anikoto_id, is_premium? }', success: '201 → { success, data: newAnime }' },
    ]
  },
];

// MethodBadge: colored pill showing the HTTP method of an endpoint
function MethodBadge({ method }) {
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-bold border ${METHOD_COLORS[method]} min-w-[60px] text-center`}>
      {method}
    </span>
  );
}

// AuthBadge: pill showing an endpoint's auth requirement, hidden when none required
function AuthBadge({ auth }) {
  if (auth === 'None') return null;
  const is_admin = auth.includes('Admin') || auth.includes('manage');
  return (
    <span className={`px-2 py-0.5 rounded text-xs border ${is_admin ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-sky-500/10 text-sky-400 border-sky-500/20'}`}>
      {auth}
    </span>
  );
}

// EndpointCard: expandable card describing a single API endpoint
function EndpointCard({ ep, index }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Copies the endpoint path to the clipboard
  const copyPath = () => {
    navigator.clipboard.writeText(ep.path);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className={`${COLORS.card} rounded-xl overflow-hidden`}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-4 hover:bg-white/[0.02] transition text-left"
      >
        <MethodBadge method={ep.method} />
        <code className="text-sm text-gray-200 font-mono flex-1 truncate">{ep.path}</code>
        <span className="text-xs text-gray-500 hidden sm:block truncate max-w-[200px]">{ep.desc}</span>
        <AuthBadge auth={ep.auth} />
        <motion.div animate={{ rotate: open ? 90 : 0 }} className="text-gray-500">
          <ChevronRight size={16} />
        </motion.div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3 border-t border-sky-500/5 pt-3">
              <p className="text-sm text-gray-400">{ep.desc}</p>

              <div className="flex items-center gap-2">
                <code className="text-xs bg-sky-500/10 text-sky-300 px-2 py-1 rounded font-mono">{ep.path}</code>
                <button onClick={copyPath} className="text-gray-500 hover:text-sky-400 transition">
                  {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                </button>
              </div>

              {ep.query && (
                <div className={`${COLORS.code} rounded-lg p-3`}>
                  <div className="text-xs text-gray-500 mb-1">Query Parameters</div>
                  <code className="text-xs text-emerald-300">{ep.query}</code>
                </div>
              )}

              {ep.body && (
                <div className={`${COLORS.code} rounded-lg p-3`}>
                  <div className="text-xs text-gray-500 mb-1">Request Body</div>
                  <code className="text-xs text-blue-300 whitespace-pre-wrap">{ep.body}</code>
                </div>
              )}

              <div className={`${COLORS.code} rounded-lg p-3`}>
                <div className="text-xs text-gray-500 mb-1">Response</div>
                <code className="text-xs text-emerald-300 whitespace-pre-wrap">{ep.success}</code>
              </div>

              {ep.errors && (
                <div className={`${COLORS.code} rounded-lg p-3`}>
                  <div className="text-xs text-gray-500 mb-1">Errors</div>
                  <code className="text-xs text-rose-300">{ep.errors}</code>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ApiDocsPage: interactive API documentation with search, collapsible sections, and endpoint details
export default function ApiDocsPage() {
  const [search, setSearch] = useState('');
  const [activeSection, setActiveSection] = useState(null);
  const [expandedAll, setExpandedAll] = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return sections;
    return sections.map(s => ({
      ...s,
      endpoints: s.endpoints.filter(ep =>
        ep.path.toLowerCase().includes(q) ||
        ep.desc.toLowerCase().includes(q) ||
        ep.method.toLowerCase().includes(q)
      )
    })).filter(s => s.endpoints.length > 0);
  }, [search]);

  const totalEndpoints = sections.reduce((acc, s) => acc + s.endpoints.length, 0);

  return (
    <div className={`min-h-screen ${COLORS.bg} pt-24 pb-16`}>
      <div className="max-w-5xl mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center">
              <Server size={24} className="text-white" />
            </div>
            <h1 className="text-4xl font-bold text-white">API Documentation</h1>
          </div>
          <p className="text-gray-400 text-lg">Anizil Backend — {totalEndpoints} endpoints across {sections.length} modules</p>
          <div className="flex items-center justify-center gap-2 mt-3 text-sm text-gray-500">
            <Server size={14} />
            <span>Base URL: <code className="text-sky-400">http://localhost:3001/api</code></span>
          </div>
        </motion.div>

        {/* Quick Info */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Auth', value: 'JWT Token', icon: Shield, color: 'sky' },
            { label: 'Format', value: 'JSON', icon: Zap, color: 'emerald' },
            { label: 'Endpoints', value: totalEndpoints, icon: Server, color: 'violet' },
            { label: 'Modules', value: sections.length, icon: BookOpen, color: 'amber' },
          ].map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className={`${COLORS.card} rounded-xl p-4 text-center`}
            >
              <item.icon size={20} className={`mx-auto mb-2 text-${item.color}-400`} />
              <div className="text-white font-semibold text-sm">{item.value}</div>
              <div className="text-gray-500 text-xs">{item.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-8">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search endpoints... (e.g. /admin, anime, POST)"
            className={`w-full pl-12 pr-4 py-3 ${COLORS.card} rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 transition`}
          />
        </div>

        {/* Sections */}
        <div className="space-y-8">
          {filtered.map((section) => (
            <motion.div
              key={section.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-3"
            >
              <button
                onClick={() => setActiveSection(activeSection === section.id ? null : section.id)}
                className="flex items-center gap-3 w-full text-left group"
              >
                <div className={`w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-400`}>
                  <section.icon size={16} />
                </div>
                <h2 className="text-xl font-bold text-white flex-1">{section.title}</h2>
                <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded-full">{section.endpoints.length}</span>
                <motion.div animate={{ rotate: activeSection === section.id ? 180 : 0 }} className="text-gray-500">
                  <ChevronDown size={18} />
                </motion.div>
              </button>

              <AnimatePresence>
                {(activeSection === section.id || activeSection === null) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden space-y-2"
                  >
                    {section.endpoints.map((ep, i) => (
                      <EndpointCard key={`${section.id}-${i}`} ep={ep} index={i} />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-gray-600 text-xs">
          <p>Anizil API Documentation • {totalEndpoints} endpoints • All responses follow <code className="text-sky-400">{`{ success, data }`}</code> format</p>
        </div>
      </div>
    </div>
  );
}
