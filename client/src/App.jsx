import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { AnimatePresence } from 'framer-motion';
import useAuthStore from './store/authStore';
import useThemeStore from './store/themeStore';

import Layout from './components/layout/Layout';
import AdminLayout from './components/layout/AdminLayout';
import CustomCursor from './components/CustomCursor';

import HomePage from './pages/HomePage';
import AnimeDetailPage from './pages/AnimeDetailPage';
import WatchPage from './pages/WatchPage';
import SearchPage from './pages/SearchPage';
import GenrePage from './pages/GenrePage';
import SchedulePage from './pages/SchedulePage';
import ForumPage from './pages/ForumPage';
import ShopPage from './pages/ShopPage';
import RedeemPage from './pages/RedeemPage';
import PremiumPage from './pages/PremiumPage';
import AboutPage from './pages/AboutPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import DashboardPage from './pages/DashboardPage';
import ApiDocsPage from './pages/ApiDocsPage';
import UserProfilePage from './pages/UserProfilePage';
import FaqPage from './pages/FaqPage';
import ContactPage from './pages/ContactPage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import LeaderboardPage from './pages/LeaderboardPage';
import MangaPage from './pages/MangaPage';
import MangaDetailPage from './pages/MangaDetailPage';
import MangaReaderPage from './pages/MangaReaderPage';

import AdminDashboard from './pages/admin/AdminDashboard';
import AdminAnime from './pages/admin/AdminAnime';
import AdminEpisodes from './pages/admin/AdminEpisodes';
import AdminUsers from './pages/admin/AdminUsers';
import AdminComments from './pages/admin/AdminComments';
import AdminReports from './pages/admin/AdminReports';
import AdminAnikotoImport from './pages/admin/AdminAnikotoImport';
import AdminAnikotoBulkImport from './pages/admin/AdminAnikotoBulkImport';
import AdminAnizenImport from './pages/admin/AdminAnizenImport';
import AdminAds from './pages/admin/AdminAds';
import AdminRoles from './pages/admin/AdminRoles';
import AdminRedeem from './pages/admin/AdminRedeem';
import AdminSettings from './pages/admin/AdminSettings';
import AdminAnalytics from './pages/admin/AdminAnalytics';
import AdminApi from './pages/admin/AdminApi';
import AdminBadges from './pages/admin/AdminBadges';
import AdminMessages from './pages/admin/AdminMessages';
import AdminVisitors from './pages/admin/AdminVisitors';
import AdminMangaImport from './pages/admin/AdminMangaImport';
import AdminManga from './pages/admin/AdminManga';

function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-dark">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children || <Outlet />;
}

function AdminRoute() {
  const { user, isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-dark">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!['super_admin', 'content_admin', 'moderator'].includes(user?.role)) {
    return <Navigate to="/" replace />;
  }

  return (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  );
}

function PublicRoute({ children }) {
  const { isAuthenticated } = useAuthStore();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children || <Outlet />;
}

function App() {
  const { initialize } = useAuthStore();
  const { initTheme } = useThemeStore();

  useEffect(() => {
    initialize();
    initTheme();
  }, [initialize]);

  return (
    <Router>
      <div className="min-h-screen bg-[#0f172a] text-[#f8fafc]">
        <CustomCursor />
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1e293b',
              color: '#f8fafc',
              border: '1px solid rgba(148,163,184,0.12)',
              borderRadius: '12px',
            },
            success: {
              iconTheme: { primary: '#22c55e', secondary: '#1e293b' },
            },
            error: {
              iconTheme: { primary: '#ef4444', secondary: '#1e293b' },
            },
          }}
        />

        <AnimatePresence mode="wait">
          <Routes>
            {/* Public Routes */}
            <Route element={<Layout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/anime/:slug" element={<AnimeDetailPage />} />
              <Route path="/watch/:animeSlug/:episodeNumber" element={<WatchPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/genres" element={<GenrePage />} />
              <Route path="/genre/:genreName" element={<GenrePage />} />
              <Route path="/schedule" element={<SchedulePage />} />
              <Route path="/forum" element={<ForumPage />} />
              <Route path="/shop" element={<ShopPage />} />
              <Route path="/redeem" element={<RedeemPage />} />
              <Route path="/premium" element={<PremiumPage />} />
              <Route path="/leaderboard" element={<LeaderboardPage />} />
              <Route path="/manga" element={<MangaPage />} />
              <Route path="/manga/:slug" element={<MangaDetailPage />} />
              <Route path="/manga/:id/read" element={<MangaReaderPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/docs" element={<ApiDocsPage />} />
              <Route path="/user/:id" element={<UserProfilePage />} />
              <Route path="/faq" element={<FaqPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/report" element={<ContactPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
            </Route>

            {/* Auth Routes */}
            <Route element={<PublicRoute />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
            </Route>

            {/* Standalone (always accessible) */}
            <Route path="/verify-email" element={<VerifyEmailPage />} />

            {/* Protected Routes */}
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/dashboard" element={<DashboardPage />} />
              </Route>
            </Route>

            {/* Admin Routes */}
            <Route element={<AdminRoute />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/anime" element={<AdminAnime />} />
              <Route path="/admin/episodes" element={<AdminEpisodes />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/comments" element={<AdminComments />} />
              <Route path="/admin/reports" element={<AdminReports />} />
              <Route path="/admin/import/anikoto" element={<AdminAnikotoImport />} />
              <Route path="/admin/import/anikoto-bulk" element={<AdminAnikotoBulkImport />} />
              <Route path="/admin/import/anizen" element={<AdminAnizenImport />} />
              <Route path="/admin/import/manga" element={<AdminMangaImport />} />
              <Route path="/admin/manga" element={<AdminManga />} />
              <Route path="/admin/ads" element={<AdminAds />} />
              <Route path="/admin/roles" element={<AdminRoles />} />
              <Route path="/admin/redeem" element={<AdminRedeem />} />
              <Route path="/admin/settings" element={<AdminSettings />} />
              <Route path="/admin/analytics" element={<AdminAnalytics />} />
              <Route path="/admin/api" element={<AdminApi />} />
              <Route path="/admin/badges" element={<AdminBadges />} />
              <Route path="/admin/messages" element={<AdminMessages />} />
              <Route path="/admin/visitors" element={<AdminVisitors />} />
            </Route>

            {/* Moderator Routes (uses same admin layout) */}
            <Route element={<AdminRoute />}>
              <Route path="/mod" element={<AdminDashboard />} />
              <Route path="/mod/anime" element={<AdminAnime />} />
              <Route path="/mod/episodes" element={<AdminEpisodes />} />
              <Route path="/mod/import/anikoto" element={<AdminAnikotoImport />} />
              <Route path="/mod/import/anikoto-bulk" element={<AdminAnikotoBulkImport />} />
              <Route path="/mod/import/anizen" element={<AdminAnizenImport />} />
              <Route path="/mod/import/manga" element={<AdminMangaImport />} />
              <Route path="/mod/manga" element={<AdminManga />} />
              <Route path="/mod/comments" element={<AdminComments />} />
              <Route path="/mod/reports" element={<AdminReports />} />
            </Route>

            {/* 404 */}
            <Route path="*" element={
              <Layout>
                <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
                  <h1 className="text-6xl font-bold text-[#0ea5e9] mb-4">404</h1>
                  <p className="text-xl text-[#94a3b8] mb-6">Page not found</p>
                  <a href="/" className="px-6 py-3 bg-[#0ea5e9] hover:bg-[#0284c7] text-white rounded-lg font-medium transition-colors">Go Home</a>
                </div>
              </Layout>
            } />
          </Routes>
        </AnimatePresence>
      </div>
    </Router>
  );
}

export default App;
