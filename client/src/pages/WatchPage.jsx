import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Play, MessageSquare, Info, Keyboard, List, Crown, Coins, Loader2, Lock } from 'lucide-react';
import useAnimeStore from '../store/animeStore';
import useAuthStore from '../store/authStore';
import useSettingsStore from '../store/settingsStore';
import VideoPlayer from '../components/common/VideoPlayer';
import Skeleton from '../components/common/Skeleton';
import CommentsSection from '../components/common/CommentsSection';
import useSEO from '../hooks/useSEO';
import api from '../lib/api';
import toast from 'react-hot-toast';

export default function WatchPage() {
  const { animeSlug, episodeNumber } = useParams();
  const navigate = useNavigate();
  const { currentAnime, episodes, fetchAnimeBySlug, fetchEpisodes, loadingCurrentAnime } = useAnimeStore();
  const { premiumEnabled, adsEnabled, adVideoUrl, vastTagUrl, adSkipSeconds, fetched, fetchSettings } = useSettingsStore();
  const { user, isAuthenticated } = useAuthStore();

  useSEO({
    title: currentAnime?.title ? `Watch ${currentAnime.title} Episode ${episodeNumber}` : 'Watch Anime',
    description: currentAnime?.synopsis ? `Watch ${currentAnime.title} Episode ${episodeNumber} online in HD. ${currentAnime.synopsis.slice(0, 120)}...` : undefined,
    image: currentAnime?.poster || undefined,
  });

  const [server, setServer] = useState('sub');
  const [showSidebar, setShowSidebar] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [episodeSources, setEpisodeSources] = useState([]);
  const [episodeData, setEpisodeData] = useState(null);
  const [hasPremiumAccess, setHasPremiumAccess] = useState(null);
  const [purchasingAnime, setPurchasingAnime] = useState(false);

  const epNum = parseInt(episodeNumber, 10);

  useEffect(() => {
    fetchAnimeBySlug(animeSlug);
    if (!fetched) fetchSettings();
  }, [animeSlug]);

  useEffect(() => {
    if (currentAnime?.id) {
      const isExt = currentAnime.id.toString().startsWith('ext_');
      if (!isExt) {
        fetchEpisodes(currentAnime.id);
      } else if (currentAnime.episodes && Array.isArray(currentAnime.episodes)) {
        useAnimeStore.setState({ episodes: currentAnime.episodes, loadingEpisodes: false });
      }
      if (currentAnime.is_premium && !isExt) {
        checkPremiumAccess();
      } else {
        setHasPremiumAccess(true);
      }
    }
  }, [currentAnime?.id]);

  const checkPremiumAccess = async () => {
    if (!isAuthenticated) {
      setHasPremiumAccess(false);
      return;
    }
    try {
      const res = await api.get(`/shop/anime-access/${currentAnime.id}`);
      setHasPremiumAccess(res.data.data?.has_access || false);
    } catch {
      setHasPremiumAccess(false);
    }
  };

  const handlePurchaseAnime = async () => {
    setPurchasingAnime(true);
    try {
      const res = await api.post('/shop/purchase-anime', { anime_id: currentAnime.id });
      toast.success(res.data.message || 'Unlocked!');
      setHasPremiumAccess(true);
      const { user } = useAuthStore.getState();
      if (user) {
        useAuthStore.setState({ user: { ...user, xp: res.data.data?.new_xp || user.xp - 200 } });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
    setPurchasingAnime(false);
  };

  useEffect(() => {
    if (currentAnime?.id && epNum) {
      loadEpisodeSource();
    }
  }, [currentAnime?.id, epNum]);

  useEffect(() => {
    if (isAuthenticated && currentAnime?.id && epNum) {
      saveWatchProgress();
    }
  }, [currentAnime?.id, epNum]);

  const loadEpisodeSource = async () => {
    try {
      const ep = episodes.find(e => (e.episode_number || e.number) === epNum);
      if (!ep) {
        // If no episode found in DB, generate megaPlay.buzz URL directly
        if (currentAnime?.anilist_id) {
          const anilistId = currentAnime.anilist_id;
          const generatedSources = [
            { language: 'sub', server_name: 'MegaPlay', video_url: `https://megaplay.buzz/stream/ani/${anilistId}/${epNum}/sub`, source_type: 'embed' },
          ];
          if (currentAnime.language === 'dub' || currentAnime.language === 'both') {
            generatedSources.push({ language: 'dub', server_name: 'MegaPlay', video_url: `https://megaplay.buzz/stream/ani/${anilistId}/${epNum}/dub`, source_type: 'embed' });
          }
          setEpisodeSources(generatedSources);
        }
        return;
      }
      // External episodes have sources directly
      if (ep.sources && Array.isArray(ep.sources)) {
        setEpisodeData(ep);
        setEpisodeSources(ep.sources);
        return;
      }
      const res = await api.get(`/episodes/${ep.id}`);
      const data = res.data.data || res.data;
      setEpisodeData(data);
      setEpisodeSources(data.sources || []);

      // If no sources in DB, try to generate megaPlay.buzz URL
      if ((!data.sources || data.sources.length === 0) && currentAnime?.anilist_id) {
        const anilistId = currentAnime.anilist_id;
        const generatedSources = [
          { language: 'sub', server_name: 'MegaPlay', video_url: `https://megaplay.buzz/stream/ani/${anilistId}/${epNum}/sub`, source_type: 'embed' },
        ];
        if (currentAnime.language === 'dub' || currentAnime.language === 'both') {
          generatedSources.push({ language: 'dub', server_name: 'MegaPlay', video_url: `https://megaplay.buzz/stream/ani/${anilistId}/${epNum}/dub`, source_type: 'embed' });
        }
        setEpisodeSources(generatedSources);
      }
    } catch (err) {
      console.error('Failed to load episode source:', err);
      // Fallback to megaPlay.buzz
      if (currentAnime?.anilist_id) {
        const anilistId = currentAnime.anilist_id;
        setEpisodeSources([
          { language: 'sub', server_name: 'MegaPlay', video_url: `https://megaplay.buzz/stream/ani/${anilistId}/${epNum}/sub`, source_type: 'embed' },
        ]);
      }
    }
  };

  const saveWatchProgress = async () => {
    try {
      const ep = episodes.find(e => (e.episode_number || e.number) === epNum);
      if (ep) {
        await api.post('/user/history', {
          animeId: currentAnime.id,
          episodeId: ep.id,
          progress: 0
        });
      }
    } catch {}
  };

  const goNext = () => {
    navigate(`/watch/${animeSlug}/${epNum + 1}`);
  };

  const goPrev = () => {
    if (epNum > 1) {
      navigate(`/watch/${animeSlug}/${epNum - 1}`);
    }
  };

  const toggleFullscreen = () => {
    const iframe = document.querySelector('iframe');
    if (iframe?.requestFullscreen) iframe.requestFullscreen();
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      switch (e.key) {
        case 'ArrowLeft': goPrev(); break;
        case 'ArrowRight': goNext(); break;
        case 'f': toggleFullscreen(); break;
        case '?': setShowShortcuts(s => !s); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [epNum]);

  // Get available servers from sources
  const availableLanguages = [...new Set(episodeSources.map(s => s.language))];
  const currentSource = episodeSources.find(s => s.language === server) || episodeSources[0];
  const videoSrc = currentSource?.video_url || '';
  const sourceType = /\.(m3u8)(\?|$)/i.test(videoSrc)
    ? 'hls'
    : /\.(mp4|webm|ogg)(\?|$)/i.test(videoSrc)
      ? 'file'
      : 'embed';

  // Auto-select first available server if current is not available
  useEffect(() => {
    if (episodeSources.length > 0 && !episodeSources.find(s => s.language === server)) {
      setServer(episodeSources[0].language);
    }
  }, [episodeSources]);

  if (loadingCurrentAnime) {
    return (
      <div className="min-h-screen">
        <Skeleton className="h-[56vw] max-h-[70vh] w-full" />
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-full" />
        </div>
      </div>
    );
  }

  if (!currentAnime) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-text-primary mb-2">Anime not found</h2>
          <Link to="/" className="text-[#0ea5e9] hover:underline">Go Home</Link>
        </div>
      </div>
    );
  }

  const isPremiumLocked = premiumEnabled && currentAnime.is_premium && !hasPremiumAccess;

  // Free users see ads (unless ads disabled or user is premium subscriber)
  const isUserPremium = user?.premium_until && new Date(user.premium_until) > new Date();
  const showAds = adsEnabled && !isUserPremium && !isPremiumLocked;

  return (
    <div className="min-h-screen bg-bg">
      {/* Video Player */}
      <div className="relative w-full bg-black">
        <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
          {isPremiumLocked ? (
            <div className="absolute inset-0 flex items-center justify-center bg-bg">
              <div className="text-center px-4">
                <div className="w-20 h-20 rounded-full bg-yellow-500/15 flex items-center justify-center mx-auto mb-4">
                  <Crown className="w-10 h-10 text-yellow-400" />
                </div>
                <h2 className="text-2xl font-bold text-text-primary mb-2">Premium Anime</h2>
                <p className="text-text-muted mb-6 max-w-md mx-auto">
                  This anime requires premium access. Unlock it for 200 XP or subscribe to premium.
                </p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={handlePurchaseAnime}
                    disabled={purchasingAnime || !isAuthenticated}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-500/90 hover:to-yellow-600/90 text-white rounded-lg font-semibold transition-all shadow-lg shadow-yellow-500/25 disabled:opacity-50"
                  >
                    {purchasingAnime ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <><Coins className="w-5 h-5" /> Unlock for 200 XP</>
                    )}
                  </button>
                  {!isAuthenticated && (
                    <Link to="/login" className="px-6 py-3 bg-panel text-text-primary rounded-lg font-medium border border-border-custom hover:bg-panel-hover transition-colors">
                      Login
                    </Link>
                  )}
                </div>
                <Link to={`/anime/${animeSlug}`} className="inline-flex items-center gap-1 mt-4 text-sm text-text-muted hover:text-text-primary transition-colors">
                  Back to details
                </Link>
              </div>
            </div>
          ) : videoSrc ? (
            <VideoPlayer
              src={videoSrc}
              type={sourceType}
              poster={currentAnime.poster}
              title={`${currentAnime.title} - Episode ${epNum}`}
              showAds={showAds}
              adConfig={{ videoUrl: adVideoUrl, vastTagUrl, skipSeconds: adSkipSeconds }}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-bg">
              <div className="text-center">
                <Play className="w-16 h-16 text-text-muted mx-auto mb-4" />
                <p className="text-text-muted text-lg">Video not available</p>
                <p className="text-[#64748b] text-sm mt-2">No sources found for this episode</p>
              </div>
            </div>
          )}
        </div>

        {/* Keyboard Shortcuts Tooltip */}
        {showShortcuts && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-panel border border-border-custom rounded-lg p-4 shadow-xl z-20"
          >
            <h4 className="text-text-primary text-sm font-semibold mb-2">Keyboard Shortcuts</h4>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between gap-6">
                <span className="text-text-muted">Previous Episode</span>
                <kbd className="bg-bg px-1.5 py-0.5 rounded text-text-primary">←</kbd>
              </div>
              <div className="flex justify-between gap-6">
                <span className="text-text-muted">Next Episode</span>
                <kbd className="bg-bg px-1.5 py-0.5 rounded text-text-primary">→</kbd>
              </div>
              <div className="flex justify-between gap-6">
                <span className="text-text-muted">Fullscreen</span>
                <kbd className="bg-bg px-1.5 py-0.5 rounded text-text-primary">F</kbd>
              </div>
            </div>
          </motion.div>
        )}

        {/* Server Switcher */}
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-text-muted text-sm mr-2">Server:</span>
            {availableLanguages.length > 0 ? availableLanguages.map(lang => (
              <button
                key={lang}
                onClick={() => setServer(lang)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  server === lang
                    ? 'bg-[#0ea5e9] text-white'
                    : 'bg-panel text-text-muted hover:bg-panel-hover hover:text-text-primary'
                } border border-border-custom`}
              >
                {lang.toUpperCase()}
              </button>
            )) : (
              <button className="px-4 py-1.5 rounded-lg text-sm font-medium bg-[#0ea5e9] text-white">
                SUB
              </button>
            )}
            <button
              onClick={() => setShowShortcuts(s => !s)}
              className="p-1.5 rounded-lg bg-panel text-text-muted hover:bg-panel-hover border border-border-custom"
              title="Keyboard Shortcuts"
            >
              <Keyboard className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main Content */}
          <div className="flex-1">
            {/* Episode Navigation */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={goPrev}
                disabled={epNum <= 1}
                className="flex items-center gap-1 px-4 py-2 rounded-lg bg-panel text-text-muted hover:bg-panel-hover hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors border border-border-custom"
              >
                <ChevronLeft className="w-4 h-4" /> Prev
              </button>
              <span className="text-text-primary font-semibold">
                Episode {epNum} of {episodes.length || '?'}
              </span>
              <button
                onClick={goNext}
                disabled={epNum >= episodes.length}
                className="flex items-center gap-1 px-4 py-2 rounded-lg bg-panel text-text-muted hover:bg-panel-hover hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors border border-border-custom"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Anime Info */}
            <div className="bg-panel rounded-xl border border-border-custom p-4 mb-6">
              <div className="flex items-start gap-4">
                <img
                  src={currentAnime.poster}
                  alt={currentAnime.title}
                  className="w-20 h-28 object-cover rounded-lg flex-shrink-0"
                />
                <div>
                  <h1 className="text-xl font-bold text-text-primary mb-1">{currentAnime.title}</h1>
                  <p className="text-text-muted text-sm line-clamp-2">{currentAnime.description}</p>
                </div>
              </div>
            </div>

            {/* Comments */}
            <CommentsSection
              animeId={currentAnime.id}
              episodeId={episodes.find(e => (e.episode_number || e.number) === epNum)?.id}
            />
          </div>

          {/* Episode Sidebar */}
          <div className="lg:w-80">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="lg:hidden w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-panel text-text-primary mb-4 border border-border-custom"
            >
              <List className="w-4 h-4" /> Episode List
            </button>

            <div className={`${showSidebar ? 'block' : 'hidden'} lg:block`}>
              <h3 className="text-lg font-semibold text-text-primary mb-3 flex items-center gap-2">
                <List className="w-5 h-5 text-[#0ea5e9]" /> Episodes
              </h3>
              <div className="space-y-1 max-h-[500px] overflow-y-auto pr-1">
                {episodes.map((ep) => {
                  const isActive = ep.episode_number === epNum;
                  return (
                    <Link
                      key={ep.id}
                      to={`/watch/${animeSlug}/${ep.episode_number}`}
                      onClick={() => setShowSidebar(false)}
                      className={`flex items-center gap-3 p-2.5 rounded-lg text-sm transition-colors ${
                        isActive
                          ? 'bg-[#0ea5e9]/15 text-[#0ea5e9] border border-[#0ea5e9]/30'
                          : 'text-text-muted hover:bg-panel-hover hover:text-text-primary border border-transparent'
                      }`}
                    >
                      <span className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold ${
                        isActive ? 'bg-[#0ea5e9] text-white' : 'bg-bg text-text-muted'
                      }`}>
                        {ep.episode_number}
                      </span>
                      <span className="truncate flex-1">{ep.title || `Episode ${ep.episode_number}`}</span>
                      {isActive && <Play className="w-4 h-4 flex-shrink-0" />}
                    </Link>
                  );
                })}
                {episodes.length === 0 && (
                  <p className="text-text-muted text-sm text-center py-4">No episodes available</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
