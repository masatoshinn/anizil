import { useState, useEffect } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import useAuthStore from '../../store/authStore';
import {
  LayoutDashboard,
  Film,
  ListVideo,
  Upload,
  Layers,
  GitBranch,
  MessageSquare,
  AlertTriangle,
  Users,
  Megaphone,
  Shield,
  Gift,
  Settings,
  BarChart3,
  Plug,
  Mail,
  Eye,
  Bell,
  ChevronLeft,
  Menu,
  ArrowLeft,
  LogOut,
  X,
  BookOpen,
  LibraryBig,
} from 'lucide-react';

const sidebarItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin', permission: null },
  { icon: Film, label: 'Anime', path: '/admin/anime', permission: 'manage_anime' },
  { icon: ListVideo, label: 'Episodes', path: '/admin/episodes', permission: 'manage_episodes' },
  { icon: Upload, label: 'Anikoto Import', path: '/admin/import/anikoto', permission: 'manage_anime' },
  { icon: Layers, label: 'Anikoto Bulk Import', path: '/admin/import/anikoto-bulk', permission: 'manage_anime' },
  { icon: GitBranch, label: 'Anizen Import', path: '/admin/import/anizen', permission: 'manage_anime' },
  { icon: BookOpen, label: 'Manga Import', path: '/admin/import/manga', permission: 'manage_anime' },
  { icon: LibraryBig, label: 'Manage Manga', path: '/admin/manga', permission: 'manage_anime' },
  { icon: MessageSquare, label: 'Comments', path: '/admin/comments', permission: 'manage_comments' },
  { icon: AlertTriangle, label: 'Reports', path: '/admin/reports', permission: 'manage_reports' },
  { icon: Users, label: 'User Management', path: '/admin/users', permission: 'manage_users' },
  { icon: Shield, label: 'Badges', path: '/admin/badges', permission: 'manage_users' },
  { icon: Megaphone, label: 'Ad Management', path: '/admin/ads', permission: 'manage_settings' },
  { icon: Shield, label: 'Role Management', path: '/admin/roles', permission: 'manage_roles' },
  { icon: Gift, label: 'Redeem Codes', path: '/admin/redeem', permission: 'manage_codes' },
  { icon: Settings, label: 'Settings', path: '/admin/settings', permission: 'manage_settings' },
  { icon: BarChart3, label: 'Analytics', path: '/admin/analytics', permission: 'manage_settings' },
  { icon: Mail, label: 'Contact Messages', path: '/admin/messages', permission: 'manage_comments' },
  { icon: Eye, label: 'Visitor Log', path: '/admin/visitors', permission: null },
  { icon: Bell, label: 'Notifications', path: '/admin/notifications', permission: 'manage_users' },
  { icon: Plug, label: 'API Management', path: '/admin/api', permission: 'manage_tokens' },
];

// Admin shell with collapsible sidebar, top bar, and main content.
export default function AdminLayout({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  // Checks whether a user can access the given permission.
  const hasPermission = (permission) => {
    if (!permission) return true;
    if (user?.role === 'super_admin') return true;
    return user?.permissions?.includes(permission);
  };

  const visibleItems = sidebarItems.filter((item) => hasPermission(item.permission));

  const sidebarWidth = collapsed ? 'w-16' : 'w-[260px]';

  return (
    <div className="min-h-screen bg-dark flex">
      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col ${sidebarWidth} fixed top-0 left-0 h-full glass-strong border-r border-border transition-all duration-300 z-40`}
      >
        <div
          className={`h-16 flex items-center border-b border-border ${
            collapsed ? 'justify-center px-2' : 'px-4 justify-between'
          }`}
        >
          {!collapsed && (
            <Link
              to="/"
              className="text-lg font-bold bg-gradient-to-r from-primary to-sky-400 bg-clip-text text-transparent"
            >
              Anizil
            </Link>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg hover:bg-surface transition-colors"
          >
            <ChevronLeft
              className={`w-4 h-4 text-muted transition-transform duration-300 ${
                collapsed ? 'rotate-180' : ''
              }`}
            />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/admin'}
                title={item.label}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg text-sm font-medium transition-colors mb-0.5 ${
                    collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5'
                  } ${
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted hover:bg-surface hover:text-text'
                  }`
                }
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>
      </aside>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed top-0 left-0 h-full w-[260px] bg-panel border-r border-border z-[70] flex flex-col"
            >
              <div className="h-16 flex items-center justify-between px-4 border-b border-border">
                <Link
                  to="/"
                  className="text-lg font-bold bg-gradient-to-r from-primary to-sky-400 bg-clip-text text-transparent"
                >
                  Anizil
                </Link>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-surface transition-colors"
                >
                  <X className="w-5 h-5 text-muted" />
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto py-3 px-2">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={item.path === '/admin'}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-0.5 ${
                          isActive
                            ? 'bg-primary/10 text-primary'
                            : 'text-muted hover:bg-surface hover:text-text'
                        }`
                      }
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </NavLink>
                  );
                })}
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-h-screen lg:ml-[260px] transition-all duration-300">
        {/* Top bar */}
        <header className="h-16 glass-strong border-b border-border flex items-center justify-between px-4 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-panel transition-colors"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="w-5 h-5 text-text" />
            </button>
            <Link
              to="/"
              className="hidden sm:flex items-center gap-1.5 text-sm text-muted hover:text-text transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Site
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted hidden sm:block">{user?.name}</span>
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-medium overflow-hidden">
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                user?.name?.[0] || 'A'
              )}
            </div>
            <button
              onClick={() => { logout(); navigate('/'); }}
              title="Logout"
              className="p-2 rounded-lg hover:bg-surface text-muted hover:text-text transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
