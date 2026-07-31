import { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Menu,
  X,
  User,
  LogOut,
  Heart,
  History,
  LayoutDashboard,
  ChevronDown,
  Crown,
  Shield,
  Sparkles,
  Eye,
  Bell,
  CheckCheck,
  Loader2,
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import useSettingsStore from '../../store/settingsStore';
import api from '../../lib/api';

const baseLinks = [
  { label: 'Home', path: '/' },
  { label: 'Genre', path: '/genres' },
  { label: 'Schedule', path: '/schedule' },
  { label: 'Forum', path: '/forum' },
  { label: 'Shop', path: '/shop' },
  { label: 'Leaderboard', path: '/leaderboard' },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeFrame, setActiveFrame] = useState(null);
  const userRef = useRef(null);
  const notifRef = useRef(null);
  const navigate = useNavigate();

  const { user, isAuthenticated, logout } = useAuthStore();
  const { premiumEnabled, fetched, fetchSettings } = useSettingsStore();
  const isLoggedIn = isAuthenticated && user;

  useEffect(() => {
    if (!fetched) fetchSettings();
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      loadActiveFrame();
    }
  }, [isLoggedIn]);

  const loadActiveFrame = async () => {
    try {
      const res = await api.get('/shop/frames/my');
      const data = res.data.data || {};
      const frameId = data.active_frame_id;
      if (frameId) {
        const frame = (data.frames || []).find(f => f.frame_id === frameId);
        setActiveFrame(frame || null);
      } else {
        setActiveFrame(null);
      }
    } catch {
      setActiveFrame(null);
    }
  };

  const loadNotifications = async () => {
    setNotifLoading(true);
    try {
      const res = await api.get('/user/notifications');
      setNotifications(res.data.data?.notifications || []);
    } catch {
      setNotifications([]);
    }
    setNotifLoading(false);
  };

  const markAllRead = async () => {
    try {
      await api.put('/user/notifications/read');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
      if (user) {
        useAuthStore.setState({ user: { ...user, stats: { ...(user.stats || {}), unread_notifications: 0 } } });
      }
    } catch {}
  };

  useEffect(() => {
    if (isLoggedIn) loadNotifications();
  }, [isLoggedIn]);

  const navLinks = fetched && !premiumEnabled
    ? baseLinks
    : [...baseLinks, { label: 'Premium', path: '/premium' }];

  const isAdmin = user && ['super_admin', 'content_admin', 'moderator'].includes(user.role);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const handleClick = (e) => {
      if (userRef.current && !userRef.current.contains(e.target)) {
        setUserOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const handleLogout = () => {
    logout();
    setUserOpen(false);
    setMobileOpen(false);
    navigate('/');
  };

  const linkClass = ({ isActive }) =>
    `relative text-sm font-medium transition-colors duration-200 ${
      isActive ? 'text-primary' : 'text-text-muted hover:text-text-primary'
    }`;

  return (
    <>
      <nav
        className={`fixed top-0 inset-x-0 z-50 h-16 transition-all duration-300 ${
          scrolled ? 'glass-strong shadow-lg' : 'glass'
        }`}
      >
        <div className="max-w-7xl mx-auto h-full flex items-center justify-between px-4">
          {/* Left: Logo + Mobile toggle */}
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-panel transition-colors"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5 text-text-primary" />
            </button>
            <Link to="/" className="flex items-center gap-1 select-none">
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-sky-400 bg-clip-text text-transparent">
                Anizil
              </span>
            </Link>
          </div>

          {/* Center: Nav links (desktop) */}
          <div className="hidden lg:flex items-center gap-6">
            {navLinks.map((link) => (
              <NavLink key={link.path} to={link.path} className={linkClass}>
                {({ isActive }) => (
                  <span className="relative">
                    {link.label}
                    {isActive && (
                      <motion.span
                        layoutId="nav-underline"
                        className="absolute -bottom-1 left-0 right-0 h-0.5 bg-primary rounded-full"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                  </span>
                )}
              </NavLink>
            ))}
          </div>

          {/* Right: Search + Auth */}
          <div className="flex items-center gap-2">
            <Link
              to="/search"
              className="p-2 rounded-lg hover:bg-panel transition-colors"
              aria-label="Search"
            >
              <Search className="w-5 h-5 text-text-muted" />
            </Link>

            {isLoggedIn && (
              <div ref={notifRef} className="relative">
                <button
                  onClick={() => { setNotifOpen(!notifOpen); if (!notifOpen) loadNotifications(); }}
                  className="relative p-2 rounded-lg hover:bg-panel transition-colors"
                  aria-label="Notifications"
                >
                  <Bell className="w-5 h-5 text-text-muted" />
                  {user?.stats?.unread_notifications > 0 && (
                    <span className="absolute top-1 right-1 min-w-[16px] h-4 px-0.5 rounded-full bg-[#ef4444] text-white text-[9px] font-bold flex items-center justify-center">
                      {user.stats.unread_notifications > 9 ? '9+' : user.stats.unread_notifications}
                    </span>
                  )}
                </button>

                <AnimatePresence>
                  {notifOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      className="absolute right-0 mt-2 w-80 bg-panel border border-border-custom rounded-xl shadow-2xl overflow-hidden z-50"
                    >
                      <div className="flex items-center justify-between px-4 py-3 border-b border-border-custom">
                        <span className="text-sm font-semibold text-text-primary">Notifications</span>
                        {user?.stats?.unread_notifications > 0 && (
                          <button onClick={markAllRead} className="flex items-center gap-1 text-xs text-[#0ea5e9] hover:underline">
                            <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                          </button>
                        )}
                      </div>
                      <div className="max-h-[320px] overflow-y-auto">
                        {notifLoading ? (
                          <div className="flex justify-center py-6">
                            <Loader2 className="w-6 h-6 text-[#0ea5e9] animate-spin" />
                          </div>
                        ) : notifications.length === 0 ? (
                          <p className="text-center text-sm text-text-muted py-6">No notifications yet</p>
                        ) : (
                          notifications.map((n) => (
                            <button
                              key={n.id}
                              onClick={() => { setNotifOpen(false); navigate('/dashboard'); }}
                              className={`w-full text-left px-4 py-3 hover:bg-panel-hover transition-colors ${!n.is_read ? 'bg-[#0ea5e9]/5' : ''}`}
                            >
                              <p className={`text-sm ${!n.is_read ? 'text-text-primary font-medium' : 'text-text-muted'}`}>{n.title}</p>
                              <p className="text-xs text-text-muted line-clamp-2 mt-0.5">{n.content}</p>
                              <p className="text-[10px] text-text-muted mt-1">{new Date(n.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                            </button>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {isLoggedIn ? (
              <div ref={userRef} className="relative">
                <button
                  onClick={() => setUserOpen(!userOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-panel transition-colors"
                >
                  <div className="relative group">
                    <div className="w-7 h-7 rounded-full overflow-hidden"
                      style={{
                        border: activeFrame ? `2px solid ${activeFrame.border_color}` : '2px solid transparent',
                        boxShadow: activeFrame ? `0 0 8px ${activeFrame.border_color}60` : 'none',
                      }}
                    >
                      <img
                        src={user?.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user?.name || 'User') + '&background=0ea5e9&color=fff'}
                        alt="avatar"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {/* Badges stack on avatar */}
                    {user?.badges && user.badges.length > 0 && (
                      <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 flex gap-0.5">
                        {user.badges.slice(0, 3).map((badge) => (
                          <span
                            key={badge.id}
                            className="text-[9px] leading-none drop-shadow-lg"
                            title={badge.name}
                          >
                            {badge.icon}
                          </span>
                        ))}
                        {user.badges.length > 3 && (
                          <span className="text-[8px] text-[#94a3b8] leading-none">+{user.badges.length - 3}</span>
                        )}
                      </div>
                    )}
                    {user?.role && user.role !== 'user' && !user?.badges?.some(b => b.is_verified) && (
                      <span className="absolute -top-1 -right-1 text-[8px] leading-none">
                        {user.role === 'super_admin' ? '👑' : user.role === 'content_admin' ? '📝' : '🛡️'}
                      </span>
                    )}
                  </div>
                  <span className="hidden sm:block text-sm text-text-primary max-w-[100px] truncate">
                    {user?.name || 'User'}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-text-muted transition-transform duration-200 ${
                      userOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                <AnimatePresence>
                  {userOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.96 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 w-52 glass-strong rounded-xl border border-border-custom shadow-xl overflow-hidden"
                    >
                      <div className="px-4 py-3 border-b border-border-custom">
                        <p className="text-sm font-medium text-text-primary truncate">
                          {user?.name}
                        </p>
                        <p className="text-xs text-text-muted truncate">{user?.email}</p>
                        {user?.badges && user.badges.length > 0 && (
                          <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                            {user.badges.slice(0, 5).map((badge) => (
                              <span key={badge.id}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium"
                                style={{ backgroundColor: `${badge.color}20`, color: badge.color }}
                                title={badge.description || badge.name}
                              >
                                {badge.icon} {badge.name}
                              </span>
                            ))}
                            {user.badges.length > 5 && (
                              <span className="text-[10px] text-[#94a3b8]">+{user.badges.length - 5}</span>
                            )}
                          </div>
                        )}
                        {isAdmin && (
                          <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-xs bg-primary/15 text-primary font-medium">
                            <Shield className="w-3 h-3" />
                            {user.role === 'super_admin' ? 'Super Admin' : user.role === 'content_admin' ? 'Content Admin' : 'Moderator'}
                          </span>
                        )}
                      </div>
                      <div className="py-1">
                        <DropdownLink
                          icon={<LayoutDashboard className="w-4 h-4" />}
                          label="Dashboard"
                          onClick={() => { navigate('/dashboard'); setUserOpen(false); }}
                        />
                        <DropdownLink
                          icon={<User className="w-4 h-4" />}
                          label="My Profile"
                          onClick={() => { navigate('/dashboard?tab=profile'); setUserOpen(false); }}
                        />
                        <DropdownLink
                          icon={<Eye className="w-4 h-4" />}
                          label="Public Profile"
                          onClick={() => { navigate(`/user/${user?.id}`); setUserOpen(false); }}
                        />
                        <DropdownLink
                          icon={<Heart className="w-4 h-4" />}
                          label="Watchlist"
                          onClick={() => { navigate('/dashboard?tab=list'); setUserOpen(false); }}
                        />
                        <DropdownLink
                          icon={<History className="w-4 h-4" />}
                          label="History"
                          onClick={() => { navigate('/dashboard?tab=history'); setUserOpen(false); }}
                        />
                        {isAdmin && (
                          <DropdownLink
                            icon={<Crown className="w-4 h-4 text-warning" />}
                            label="Admin Panel"
                            onClick={() => { navigate('/admin'); setUserOpen(false); }}
                          />
                        )}
                      </div>
                      <div className="border-t border-border-custom py-1">
                        <DropdownLink
                          icon={<LogOut className="w-4 h-4 text-danger" />}
                          label="Logout"
                          danger
                          onClick={handleLogout}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Link to="/login" className="btn-secondary text-sm px-3 py-1.5">
                  Login
                </Link>
                <Link to="/register" className="btn-primary text-sm px-3 py-1.5">
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile drawer */}
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
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed top-0 left-0 bottom-0 w-72 bg-panel border-r border-border-custom z-[70] flex flex-col"
            >
              <div className="flex items-center justify-between px-4 h-16 border-b border-border-custom">
                <Link
                  to="/"
                  className="text-xl font-bold bg-gradient-to-r from-primary to-sky-400 bg-clip-text text-transparent"
                  onClick={() => setMobileOpen(false)}
                >
                  Anizil
                </Link>
                <button
                  className="p-2 rounded-lg hover:bg-panel-hover transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  <X className="w-5 h-5 text-text-primary" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto py-4 px-3">
                <div className="flex flex-col gap-1">
                  {navLinks.map((link) => (
                    <NavLink
                      key={link.path}
                      to={link.path}
                      onClick={() => setMobileOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-primary/10 text-primary'
                            : 'text-text-muted hover:bg-panel-hover hover:text-text-primary'
                        }`
                      }
                    >
                      {link.label}
                    </NavLink>
                  ))}
                </div>
                <div className="mt-6 border-t border-border-custom pt-4">
                  {isLoggedIn ? (
                    <div className="flex flex-col gap-1">
                      <div className="px-3 py-2 mb-2">
                        <p className="text-sm font-medium text-text-primary">{user?.name}</p>
                        <p className="text-xs text-text-muted">{user?.email}</p>
                      </div>
                      <DropdownLink
                        icon={<LayoutDashboard className="w-4 h-4" />}
                        label="Dashboard"
                        onClick={() => { navigate('/dashboard'); setMobileOpen(false); }}
                      />
                      <DropdownLink
                        icon={<User className="w-4 h-4" />}
                        label="My Profile"
                        onClick={() => { navigate('/dashboard?tab=profile'); setMobileOpen(false); }}
                      />
                      {isAdmin && (
                        <DropdownLink
                          icon={<Crown className="w-4 h-4 text-warning" />}
                          label="Admin Panel"
                          onClick={() => { navigate('/admin'); setMobileOpen(false); }}
                        />
                      )}
                      <button
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-danger hover:bg-danger/10 transition-colors mt-2"
                        onClick={handleLogout}
                      >
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <Link
                        to="/login"
                        className="btn-secondary text-sm text-center"
                        onClick={() => setMobileOpen(false)}
                      >
                        Login
                      </Link>
                      <Link
                        to="/register"
                        className="btn-primary text-sm text-center"
                        onClick={() => setMobileOpen(false)}
                      >
                        Register
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function DropdownLink({ icon, label, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 w-full px-4 py-2 text-sm transition-colors text-left ${
        danger
          ? 'text-danger hover:bg-danger/10'
          : 'text-text-muted hover:bg-panel-hover hover:text-text-primary'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
