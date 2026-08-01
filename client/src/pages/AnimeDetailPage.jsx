import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Play, Heart, Share2, Star, Calendar, Clock, Monitor, Globe, Building,
  ChevronRight, Grid3X3, List, Lock, ThumbsUp, Flag, Send, Download,
  Crown, Coins, Loader2,
} from 'lucide-react';
import useAnimeStore from '../store/animeStore';
import useAuthStore from '../store/authStore';
import useSettingsStore from '../store/settingsStore';
import AnimeCard from '../components/common/AnimeCard';
import Skeleton from '../components/common/Skeleton';
import GenreTag from '../components/common/GenreTag';
import RatingSection from '../components/common/RatingSection';
import { cn, formatDate, formatNumber, getStatusColor } from '../lib/utils';
import useSEO from '../hooks/useSEO';
import api from '../lib/api';
import toast from 'react-hot-toast';

const fadeIn = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

const FREE_EPISODE_LIMIT = 3;

export default function AnimeDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const {
    currentAnime, episodes, loadingCurrentAnime, loadingEpisodes,
    fetchAnimeBySlug, fetchEpisodes, clearCurrentAnime,
  } = useAnimeStore();
  const { user, isAuthenticated } = useAuthStore();
  const { premiumEnabled, fetched, fetchSettings } = useSettingsStore();
  const isAdmin = user && ['super_admin', 'content_admin', 'moderator'].includes(user.role);

  useSEO({
    title: currentAnime?.title || 'Anime Details',
    description: currentAnime?.synopsis ? `${currentAnime.synopsis.slice(0, 160)}...` : undefined,
    image: currentAnime?.poster || undefined,
  });

  const [episodeView, setEpisodeView] = useState('grid');
  const [episodePage, setEpisodePage] = useState(1);
  const [watchlisted, setWatchlisted] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [hasPremiumAccess, setHasPremiumAccess] = useState(null);
  const [purchasingAnime, setPurchasingAnime] = useState(false);
  const episodesPerPage = 12;

  useEffect(() => {
    fetchAnimeBySlug(slug);
    if (!fetched) fetchSettings();
    return () => clearCurrentAnime();
  }, [slug]);

  useEffect(() => {
    if (currentAnime?.id) {
      if (currentAnime.episodes && Array.isArray(currentAnime.episodes)) {
        useAnimeStore.setState({ episodes: currentAnime.episodes, loadingEpisodes: false });
      } else if (!currentAnime.id.toString().startsWith('ext_')) {
        fetchEpisodes(currentAnime.id);
      }
    }
  }, [currentAnime?.id]);

  useEffect(() => {
    if (currentAnime?.id && !currentAnime.id.toString().startsWith('ext_')) {
      loadComments();
      if (currentAnime.is_premium && isAuthenticated) {
        checkPremiumAccess();
      }
    }
  }, [currentAnime?.id]);

  const checkPremiumAccess = async () => {
    try {
      const res = await api.get(`/shop/anime-access/${currentAnime.id}`);
      setHasPremiumAccess(res.data.data?.has_access || false);
    } catch {
      setHasPremiumAccess(false);
    }
  };

  const handlePurchaseAnime = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setPurchasingAnime(true);
    try {
      const res = await api.post('/shop/purchase-anime', { anime_id: currentAnime.id });
      toast.success(res.data.message || 'Premium anime unlocked! -200 XP');
      setHasPremiumAccess(true);
      if (user) {
        useAuthStore.setState({ user: { ...user, xp: res.data.data?.new_xp || user.xp - 200 } });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to purchase');
    }
    setPurchasingAnime(false);
  };

  const loadComments = async () => {
    try {
      const res = await api.get(`/comments?anime_id=${currentAnime.id}`);
      const data = res.data.data || res.data;
      setComments(Array.isArray(data) ? data : (data.comments || []));
    } catch {}
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || !isAuthenticated) return;
    setCommentLoading(true);
    try {
      const res = await api.post('/comments', {
        content: commentText,
        anime_id: currentAnime.id
      });
      const data = res.data.data || res.data;
      setComments([data, ...comments]);
      setCommentText('');
      toast.success(`Comment posted! +${data.xp_earned || 5} XP`);
    } catch (err) {
      toast.error('Failed to post comment');
    }
    setCommentLoading(false);
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied!');
  };

  const handleAddToWatchlist = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    try {
      await api.post('/user/watchlist', { animeId: currentAnime.id, status: 'watching' });
      setWatchlisted(true);
      toast.success('Added to watchlist! +5 XP');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const handleImport = async () => {
    if (!currentAnime.anikoto_id && !currentAnime.ani_id) return;
    setImporting(true);
    try {
      await api.post('/import/anikoto', { anikoto_id: currentAnime.anikoto_id || currentAnime.ani_id });
      toast.success('Imported! Refreshing...');
      fetchAnimeBySlug(slug);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Import failed');
    }
    setImporting(false);
  };

  const isPremiumLocked = (epNum) => {
    if (!premiumEnabled) return false;
    if (user?.role === 'super_admin' || user?.role === 'content_admin') return false;
    if (user?.premium_until && new Date(user.premium_until) > new Date()) return false;
    if (anime?.is_premium && hasPremiumAccess) return false;
    if (anime?.is_premium && !hasPremiumAccess) return true;
    return epNum > FREE_EPISODE_LIMIT;
  };

  const paginatedEpisodes = episodes.slice(
    (episodePage - 1) * episodesPerPage,
    episodePage * episodesPerPage
  );
  const totalEpisodePages = Math.ceil(episodes.length / episodesPerPage);

  if (loadingCurrentAnime) {
    return (
      <div className="min-h-screen">
        <Skeleton className="h-[400px] w-full" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-8">
            <div className="space-y-4">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
            <Skeleton className="h-64 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!currentAnime) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-text-primary mb-2">Anime not found</h2>
          <p className="text-text-muted mb-4">This anime might not be imported yet.</p>
          <Link to="/" className="text-[#0ea5e9] hover:underline">Go Home</Link>
        </div>
      </div>
    );
  }

  const anime = currentAnime;
  const genres = typeof anime.genres === 'string'
    ? anime.genres.split(',').filter(Boolean).map(g => g.trim())
    : (Array.isArray(anime.genres) ? anime.genres : []);
  const relatedAnime = anime.similar || anime.related || anime.recommendations || [];

  return (
    <div className="min-h-screen">
      {/* Banner */}
      <div className="relative h-[350px] md:h-[450px]">
        <img
          src={anime.banner || anime.background_image || anime.cover || anime.image || anime.poster}
          alt={anime.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/70 to-[#0f172a]/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0f172a]/60 to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-32 relative z-10">
        <motion.nav
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 text-sm text-text-muted mb-6"
        >
          <Link to="/" className="hover:text-primary transition-colors">Home</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-text-primary">{anime.title}</span>
        </motion.nav>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-8">
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.1 } } }}
          >
            <div className="flex flex-col sm:flex-row gap-6 mb-8">
              <motion.img
                variants={fadeIn}
                src={anime.poster || anime.image}
                alt={anime.title}
                className="w-48 sm:w-56 flex-shrink-0 rounded-xl shadow-2xl mx-auto sm:mx-0 object-cover aspect-[3/4]"
              />
              <motion.div variants={fadeIn} className="flex-1 space-y-4">
                <h1 className="text-3xl md:text-4xl font-bold text-text-primary">{anime.title}</h1>

                <div className="flex flex-wrap items-center gap-3">
                  <span className={cn('px-3 py-1 rounded-full text-sm font-medium border', getStatusColor(anime.status))}>
                    {anime.status}
                  </span>
                  {anime.is_premium && premiumEnabled ? (
                    <span className="px-3 py-1 rounded-full text-sm font-medium border bg-yellow-500/15 text-yellow-400 border-yellow-500/30 flex items-center gap-1">
                      <Crown className="w-3.5 h-3.5" /> Premium
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full text-sm font-medium border bg-green-500/15 text-green-400 border-green-500/30">
                      Free
                    </span>
                  )}
                  {anime.release_year && (
                    <span className="text-text-muted text-sm flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" /> {anime.release_year}
                    </span>
                  )}
                  {anime.episode_count > 0 && (
                    <span className="text-text-muted text-sm">{anime.episode_count} Episodes</span>
                  )}
                  {(anime.rating || anime.mal_score) > 0 && (
                    <span className="flex items-center gap-1 text-yellow-400 text-sm">
                      <Star className="w-4 h-4 fill-yellow-400" /> {anime.rating || anime.mal_score}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {genres.map((g, i) => (
                    <GenreTag key={i} genre={typeof g === 'string' ? g : g.name || g} />
                  ))}
                </div>

                <p className="text-text-muted leading-relaxed text-sm">
                  {anime.description || anime.synopsis || 'No description available.'}
                </p>
              </motion.div>
            </div>

            {/* Episodes Section */}
            <motion.section variants={fadeIn} className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-text-primary">
                  Episodes {episodes.length > 0 && <span className="text-text-muted text-sm font-normal">({episodes.length})</span>}
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEpisodeView('grid')}
                    className={cn(
                      'p-2 rounded-lg transition-colors border border-border-custom',
                      episodeView === 'grid' ? 'bg-primary text-white' : 'bg-panel text-text-muted hover:text-text-primary'
                    )}
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setEpisodeView('list')}
                    className={cn(
                      'p-2 rounded-lg transition-colors border border-border-custom',
                      episodeView === 'list' ? 'bg-primary text-white' : 'bg-panel text-text-muted hover:text-text-primary'
                    )}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {loadingEpisodes ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 rounded-lg" />
                  ))}
                </div>
              ) : episodes.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-text-muted mb-4">No episodes available yet</p>
                  {anime.ani_id && (
                    <button
                      onClick={handleImport}
                      disabled={importing}
                      className="inline-flex items-center gap-2 px-6 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                      {importing ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Importing...</>
                      ) : (
                        <><Download className="w-4 h-4" /> Import from Anikoto</>
                      )}
                    </button>
                  )}
                </div>
              ) : episodeView === 'grid' ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {paginatedEpisodes.map((ep, i) => {
                    const epNum = ep.episode_number || ep.number || i + 1;
                    const locked = isPremiumLocked(epNum);
                    return (
                      <Link
                        key={ep.id || i}
                        to={locked ? '/premium' : `/watch/${slug}/${epNum}`}
                        className={cn(
                          'relative p-3 rounded-lg border text-center font-medium transition-all group',
                          locked
                            ? 'bg-panel border-border-custom text-text-muted cursor-not-allowed'
                            : 'bg-panel border-border-custom hover:bg-panel-hover hover:border-[#0ea5e9]/50 text-text-primary'
                        )}
                      >
                        {locked && <Lock className="absolute top-2 right-2 w-3 h-3 text-text-muted" />}
                        <span className="text-sm">EP {epNum}</span>
                        {ep.title && <p className="text-xs text-text-muted mt-1 truncate">{ep.title}</p>}
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-2">
                  {paginatedEpisodes.map((ep, i) => {
                    const epNum = ep.episode_number || ep.number || i + 1;
                    const locked = isPremiumLocked(epNum);
                    return (
                      <Link
                        key={ep.id || i}
                        to={locked ? '/premium' : `/watch/${slug}/${epNum}`}
                        className={cn(
                          'flex items-center gap-4 p-3 rounded-lg border transition-all',
                          locked
                            ? 'bg-panel border-border-custom cursor-not-allowed'
                            : 'bg-panel border-border-custom hover:bg-panel-hover hover:border-[#0ea5e9]/50'
                        )}
                      >
                        <div className="w-8 h-8 rounded bg-bg flex items-center justify-center text-sm text-text-muted font-medium">
                          {epNum}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-text-primary text-sm font-medium truncate">
                            {ep.title || `Episode ${epNum}`}
                          </p>
                        </div>
                        {locked ? (
                          <Lock className="w-4 h-4 text-text-muted" />
                        ) : (
                          <Play className="w-4 h-4 text-text-muted group-hover:text-primary" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}

              {totalEpisodePages > 1 && (
                <div className="flex justify-center gap-2 mt-4">
                  {Array.from({ length: totalEpisodePages }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setEpisodePage(i + 1)}
                      className={cn(
                        'w-8 h-8 rounded-lg text-sm font-medium transition-colors border border-border-custom',
                        episodePage === i + 1
                          ? 'bg-primary text-white'
                          : 'bg-panel text-text-muted hover:text-text-primary hover:bg-panel-hover'
                      )}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              )}
            </motion.section>

            {/* Ratings & Reviews */}
            {!anime.id.toString().startsWith('ext_') && (
              <motion.section variants={fadeIn}>
                <RatingSection contentType="anime" contentId={anime.id} />
              </motion.section>
            )}

            {/* Comments */}
            <motion.section variants={fadeIn}>
              <h2 className="text-xl font-bold text-text-primary mb-4">Comments</h2>

              {isAuthenticated ? (
                <form onSubmit={handleSubmitComment} className="flex gap-3 mb-6">
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Write a comment..."
                    className="flex-1 bg-panel border border-border-custom rounded-lg px-4 py-2.5 text-text-primary placeholder-[#94a3b8] focus:outline-none focus:border-[#0ea5e9]/50 text-sm"
                  />
                  <button
                    type="submit"
                    disabled={!commentText.trim() || commentLoading}
                    className="px-4 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                <p className="text-text-muted text-sm mb-6">
                  <Link to="/login" className="text-[#0ea5e9] hover:underline">Login</Link> to comment
                </p>
              )}

              <div className="space-y-4">
                {comments.length === 0 && (
                  <p className="text-text-muted text-center py-4">No comments yet. Be the first!</p>
                )}
                {comments.map((comment) => (
                  <div key={comment.id || comment._id} className="bg-panel border border-border-custom rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="relative flex-shrink-0">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold overflow-hidden"
                          style={{
                            background: comment.user_avatar ? 'transparent' : `${comment.frame_color || '#0ea5e9'}20`,
                            color: comment.frame_color || '#0ea5e9',
                            border: `1.5px solid ${comment.frame_color || '#0ea5e9'}`,
                            boxShadow: comment.frame_color ? `0 0 6px ${comment.frame_color}50` : 'none',
                          }}
                        >
                          {comment.user_avatar ? (
                            <img src={comment.user_avatar} alt="" className="w-full h-full object-cover" />
                          ) : (
                            (comment.user_name || 'U')[0].toUpperCase()
                          )}
                        </div>
                        {comment.frame_name && (
                          <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border border-[#0f172a] overflow-hidden bg-[#1e293b] flex items-center justify-center"
                            style={{ boxShadow: `0 0 6px ${comment.frame_color || '#0ea5e9'}80` }}>
                            {comment.frame_image ? (
                              <img src={comment.frame_image} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full" style={{ backgroundColor: comment.frame_color || '#0ea5e9' }} />
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {comment.user_id ? (
                            <Link
                              to={`/user/${comment.user_id}`}
                              className="text-text-primary text-sm font-medium hover:text-primary transition-colors"
                              style={comment.user_name_color
                                ? comment.user_name_color.startsWith('linear-gradient')
                                  ? { color: 'transparent', backgroundImage: comment.user_name_color, WebkitBackgroundClip: 'text', backgroundClip: 'text' }
                                  : { color: comment.user_name_color }
                                : undefined}
                            >
                              {comment.user_name || 'Anonymous'}
                            </Link>
                          ) : (
                            <span
                              className="text-text-primary text-sm font-medium"
                              style={comment.user_name_color
                                ? comment.user_name_color.startsWith('linear-gradient')
                                  ? { color: 'transparent', backgroundImage: comment.user_name_color, WebkitBackgroundClip: 'text', backgroundClip: 'text' }
                                  : { color: comment.user_name_color }
                                : undefined}
                            >
                              {comment.user_name || 'Anonymous'}
                            </span>
                          )}
                          {/* Show first 3 badges inline */}
                          {comment.badges && comment.badges.length > 0 && (
                            <div className="flex items-center gap-0.5">
                              {comment.badges.slice(0, 3).map((badge) => {
                                const isVerified = badge.is_verified || badge.name === 'Verified';
                                return isVerified ? (
                                  <span key={badge.id} className="inline-flex items-center justify-center w-4 h-4 rounded-full"
                                    style={{ backgroundColor: badge.color }}
                                    title={`Verified: ${badge.name}`}>
                                    <span className="text-[9px] text-white font-bold">✓</span>
                                  </span>
                                ) : (
                                  <span key={badge.id} className="text-[11px]" title={badge.name}>{badge.icon}</span>
                                );
                              })}
                              {comment.badges.length > 3 && (
                                <span className="text-[9px] text-[#94a3b8]">+{comment.badges.length - 3}</span>
                              )}
                            </div>
                          )}
                          <span className="text-text-muted text-xs">{formatDate(comment.created_at || comment.createdAt)}</span>
                        </div>
                        <p className="text-text-muted text-sm">{comment.content || comment.text}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.section>
          </motion.div>

          {/* Right Column - Sidebar */}
          <motion.aside
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.1, delayChildren: 0.2 } } }}
            className="space-y-4"
          >
            <motion.div variants={fadeIn} className="bg-panel border border-border-custom rounded-xl p-5 space-y-4 sticky top-24">
              {anime.is_premium && premiumEnabled && !hasPremiumAccess ? (
                <button
                  onClick={handlePurchaseAnime}
                  disabled={purchasingAnime}
                  className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-500/90 hover:to-yellow-600/90 text-white py-3 rounded-lg font-semibold transition-all shadow-lg shadow-yellow-500/25 disabled:opacity-50"
                >
                  {purchasingAnime ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <><Coins className="w-5 h-5" /> Unlock for 200 XP</>
                  )}
                </button>
              ) : (
                <Link
                  to={`/watch/${slug}/1`}
                  className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-[#0ea5e9]/70 text-white py-3 rounded-lg font-semibold transition-all shadow-lg shadow-[#0ea5e9]/25"
                >
                  <Play className="w-5 h-5" /> Watch Now
                </Link>
              )}

              {!anime.imported && anime.imported !== undefined && isAdmin && (
                <button
                  onClick={handleImport}
                  disabled={importing}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-lg font-medium bg-primary hover:bg-primary-hover text-white transition-colors"
                >
                  {importing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                  {importing ? 'Importing...' : 'Import to Database'}
                </button>
              )}

              {anime.imported !== false && (
              <button
                onClick={handleAddToWatchlist}
                className={cn(
                  'flex items-center justify-center gap-2 w-full py-3 rounded-lg font-medium transition-all border border-border-custom',
                  watchlisted ? 'bg-danger/10 text-danger border-danger/30' : 'bg-panel hover:bg-panel-hover text-text-primary'
                )}
              >
                <Heart className={cn('w-5 h-5', watchlisted && 'fill-current')} />
                {watchlisted ? 'In Watchlist' : 'Add to Watchlist'}
              </button>
              )}

              <button
                onClick={handleShare}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-lg font-medium bg-panel hover:bg-panel-hover text-text-primary transition-colors border border-border-custom"
              >
                <Share2 className="w-5 h-5" /> Share
              </button>

              <div className="border-t border-border-custom pt-4 space-y-3">
                <h3 className="text-sm font-semibold text-text-primary">Information</h3>
                {anime.release_year && (
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">Year</span>
                    <span className="text-text-primary">{anime.release_year}</span>
                  </div>
                )}
                {anime.season && (
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">Season</span>
                    <span className="text-text-primary">{anime.season}</span>
                  </div>
                )}
                {anime.duration && (
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">Duration</span>
                    <span className="text-text-primary">{anime.duration}</span>
                  </div>
                )}
                {anime.language && (
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">Language</span>
                    <span className="text-text-primary">{anime.language}</span>
                  </div>
                )}
                {anime.studio && (
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">Studio</span>
                    <span className="text-text-primary">{anime.studio}</span>
                  </div>
                )}
                {anime.views > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">Views</span>
                    <span className="text-text-primary">{formatNumber(anime.views)}</span>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.aside>
        </div>

        {/* Related Anime */}
        {relatedAnime.length > 0 && (
          <motion.section
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={{ show: { transition: { staggerChildren: 0.05 } } }}
            className="mt-12 mb-16"
          >
            <h2 className="text-xl font-bold text-text-primary mb-6">Related Anime</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {relatedAnime.slice(0, 5).map((a, i) => (
                <motion.div key={a.id || a.slug || i} variants={fadeIn}>
                  <AnimeCard anime={a} />
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}
      </div>
    </div>
  );
}
