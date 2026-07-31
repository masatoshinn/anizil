import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Flame, Clock, Play, Plus, Sparkles, Download, Check, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import useAnimeStore from '../store/animeStore';
import useAuthStore from '../store/authStore';
import AnimeCard from '../components/common/AnimeCard';
import Skeleton from '../components/common/Skeleton';
import GenreTag from '../components/common/GenreTag';
import AnnouncementBar from '../components/common/AnnouncementBar';
import useSEO from '../hooks/useSEO';
import api from '../lib/api';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function HomePage() {
  useSEO({
    title: 'Home',
    description: 'Watch anime online free in HD. Stream the latest episodes, track your watchlist, earn XP and join the community.',
  });
  const {
    featured, trending, recent, genres,
    loadingFeatured, loadingTrending, loadingRecent, loadingGenres,
    fetchFeatured, fetchTrending, fetchGenres, fetchAnimeList, fetchExternalRecent,
  } = useAnimeStore();
  const { user } = useAuthStore();

  const [heroIndex, setHeroIndex] = useState(0);
  const [page, setPage] = useState(1);
  const [allAnime, setAllAnime] = useState([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [importingId, setImportingId] = useState(null);
  const [importedIds, setImportedIds] = useState(new Set());

  const trendingRef = useRef(null);
  const recentRef = useRef(null);
  const genresRef = useRef(null);
  const [recentLoaded, setRecentLoaded] = useState(false);
  const [genresLoaded, setGenresLoaded] = useState(false);

  const isAdmin = user && ['super_admin', 'content_admin', 'moderator'].includes(user.role);

  useEffect(() => {
    fetchFeatured();
    fetchTrending();
  }, []);

  useEffect(() => {
    if (recentLoaded) fetchExternalRecent();
  }, [recentLoaded]);

  useEffect(() => {
    if (genresLoaded) fetchGenres();
  }, [genresLoaded]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (entry.target === recentRef.current && !recentLoaded) setRecentLoaded(true);
            if (entry.target === genresRef.current && !genresLoaded) setGenresLoaded(true);
          }
        });
      },
      { rootMargin: '300px' }
    );
    if (recentRef.current) observer.observe(recentRef.current);
    if (genresRef.current) observer.observe(genresRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (recent && recent.length > 0) {
      const imported = recent.filter(a => a.imported).map(a => a.anikoto_id || a.id);
      setImportedIds(new Set(imported));
      setAllAnime(recent);

      if (featured.length === 0) {
        const featuredFromRecent = [...recent]
          .sort((a, b) => (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0))
          .slice(0, 5)
          .map(a => ({
            ...a,
            banner: a.banner || a.background_image || a.poster,
            cover: a.poster,
            image: a.poster,
            slug: a.slug || `anikoto-${a.id}`,
            genres: typeof a.genres === 'string'
              ? a.genres.split(',').filter(Boolean)
              : (a.genres || []),
          }));
        useAnimeStore.setState({ featured: featuredFromRecent });
      }
      if (trending.length === 0) {
        const trendingFromRecent = recent.slice(0, 20).map(a => ({
          ...a,
          slug: a.slug || `anikoto-${a.id}`,
          image: a.poster,
          genres: typeof a.genres === 'string'
            ? a.genres.split(',').filter(Boolean)
            : (a.genres || []),
        }));
        useAnimeStore.setState({ trending: trendingFromRecent });
      }
    }
  }, [recent]);

  useEffect(() => {
    if (featured.length > 1) {
      const interval = setInterval(() => {
        setHeroIndex((prev) => (prev + 1) % featured.length);
      }, 6000);
      return () => clearInterval(interval);
    }
  }, [featured.length]);

  const handleLoadMore = async () => {
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const response = await api.get(`/anime/external/recent?page=${nextPage}&per_page=20`);
      const res = response.data;
      const data = res.data || res;
      const newAnime = data.anime || [];
      if (newAnime.length > 0) {
        setAllAnime(prev => [...prev, ...newAnime]);
        setPage(nextPage);
      }
    } catch (err) {
      console.error(err);
    }
    setLoadingMore(false);
  };

  const scrollTrending = (dir) => {
    if (trendingRef.current) {
      trendingRef.current.scrollBy({ left: dir * 400, behavior: 'smooth' });
    }
  };

  const handleImport = async (anime) => {
    const id = anime.anikoto_id || anime.id;
    setImportingId(id);
    try {
      await api.post('/import/anikoto', { anikoto_id: id });
      setImportedIds(prev => new Set([...prev, id]));
      toast.success(`Imported: ${anime.title}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Import failed');
    } finally {
      setImportingId(null);
    }
  };

  const heroAnime = featured[heroIndex];

  return (
    <div className="min-h-screen">
      <AnnouncementBar />

      {/* Hero Section */}
      <section className="relative h-[70vh] min-h-[500px] overflow-hidden">
        {loadingFeatured && loadingRecent ? (
          <Skeleton className="absolute inset-0" />
        ) : heroAnime ? (
          <>
            {featured.map((anime, i) => (
              <motion.div
                key={anime.id || anime.slug || i}
                initial={false}
                animate={{ opacity: i === heroIndex ? 1 : 0 }}
                transition={{ duration: 1 }}
                className="absolute inset-0"
              >
                <img
                  src={anime.banner || anime.poster || anime.background_image}
                  alt={anime.title}
                  className="w-full h-full object-cover"
                />
              </motion.div>
            ))}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/60 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0f172a]/80 to-transparent" />

            <div className="absolute inset-0 flex items-end pb-20">
              <motion.div
                key={heroIndex}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-5 h-5 text-yellow-400" />
                  <span className="text-yellow-400 text-sm font-medium uppercase tracking-wider">Featured</span>
                </div>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#f8fafc] mb-4 max-w-3xl">
                  {heroAnime.title}
                </h1>
                <p className="text-[#94a3b8] text-lg max-w-2xl mb-4 line-clamp-2">
                  {heroAnime.description || heroAnime.synopsis}
                </p>
                <div className="flex flex-wrap gap-2 mb-6">
                  {(heroAnime.genres || []).slice(0, 5).map((g) => (
                    <GenreTag key={typeof g === 'string' ? g : g?.name} genre={typeof g === 'string' ? g : g?.name} />
                  ))}
                </div>
                <div className="flex gap-4">
                  <Link
                    to={heroAnime.imported ? `/anime/${heroAnime.slug}` : '#'}
                    onClick={(e) => {
                      if (!heroAnime.imported) {
                        e.preventDefault();
                        handleImport(heroAnime);
                      }
                    }}
                    className="flex items-center gap-2 bg-gradient-to-r from-[#0ea5e9] to-[#0ea5e9]/80 hover:from-[#0ea5e9]/90 hover:to-[#0ea5e9]/70 text-white px-8 py-3 rounded-lg font-semibold transition-all shadow-lg shadow-[#0ea5e9]/25"
                  >
                    {heroAnime.imported ? (
                      <><Play className="w-5 h-5" /> Watch Now</>
                    ) : (
                      <><Download className="w-5 h-5" /> Import & Watch</>
                    )}
                  </Link>
                </div>
              </motion.div>
            </div>

            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
              {featured.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setHeroIndex(i)}
                  className={`h-1 rounded-full transition-all ${
                    i === heroIndex ? 'w-8 bg-[#0ea5e9]' : 'w-2 bg-[#94a3b8]/40'
                  }`}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#0ea5e9]/20 to-[#0f172a] flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-5xl font-bold text-[#f8fafc] mb-4">Welcome to Anizil</h1>
              <p className="text-[#94a3b8] text-xl mb-8">Stream your favorite anime for free</p>
              <Link
                to="/search"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-[#0ea5e9] to-[#0ea5e9]/80 text-white px-8 py-3 rounded-lg font-semibold transition-all shadow-lg shadow-[#0ea5e9]/25"
              >
                <Sparkles className="w-5 h-5" /> Explore Anime
              </Link>
            </div>
          </div>
        )}
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        {/* Trending Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Flame className="w-6 h-6 text-orange-500" />
              <h2 className="text-2xl font-bold text-[#f8fafc]">Trending Now</h2>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => scrollTrending(-1)}
                className="p-2 rounded-lg bg-[#1e293b] hover:bg-[#334155] text-[#94a3b8] hover:text-[#f8fafc] transition-colors border border-[rgba(148,163,184,0.12)]"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => scrollTrending(1)}
                className="p-2 rounded-lg bg-[#1e293b] hover:bg-[#334155] text-[#94a3b8] hover:text-[#f8fafc] transition-colors border border-[rgba(148,163,184,0.12)]"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {loadingTrending ? (
            <div className="flex gap-4 overflow-hidden">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="flex-shrink-0 w-[200px] h-[280px] rounded-xl" />
              ))}
            </div>
          ) : (
            <div
              ref={trendingRef}
              className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide scroll-smooth"
              style={{ scrollbarWidth: 'none' }}
            >
              {trending.map((anime, i) => (
                <motion.div
                  key={anime.id || anime.slug || i}
                  variants={item}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true }}
                  className="flex-shrink-0 w-[200px]"
                >
                  <AnimeCard anime={anime} />
                </motion.div>
              ))}
            </div>
          )}
        </section>

        {/* Recently Updated - from Anikoto API */}
        <section ref={recentRef}>
          <div className="flex items-center gap-3 mb-6">
            <Clock className="w-6 h-6 text-[#0ea5e9]" />
            <h2 className="text-2xl font-bold text-[#f8fafc]">Recently Updated</h2>
            <span className="text-xs text-[#94a3b8] bg-[#1e293b] px-2 py-1 rounded-full">via Anikoto</span>
          </div>

          {loadingRecent && allAnime.length === 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <Skeleton key={i} className="h-[280px] rounded-xl" />
              ))}
            </div>
          ) : allAnime.length === 0 ? (
            <div className="text-center py-12 text-[#94a3b8]">
              <p>No anime found. Check your connection and try again.</p>
            </div>
          ) : (
            <motion.div
              variants={container}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
            >
              {allAnime.map((anime, i) => {
                const animeId = anime.anikoto_id || anime.id;
                const isImported = anime.imported || importedIds.has(animeId);
                const animeSlug = anime.slug || `anikoto-${animeId}`;
                return (
                  <motion.div key={animeId || i} variants={item} className="relative group">
                    <Link to={`/anime/${animeSlug}`}>
                      <div className="bg-[#1e293b] border border-[rgba(148,163,184,0.12)] rounded-xl overflow-hidden hover:scale-[1.02] transition-all">
                        <div className="relative aspect-[3/4]">
                          <img
                            src={anime.poster || anime.image || anime.thumbnail || 'https://via.placeholder.com/300x400?text=No+Image'}
                            alt={anime.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                          {anime.episodes && (
                            <span className="absolute top-2 right-2 bg-[#0ea5e9] text-white text-xs font-bold px-2 py-0.5 rounded-full">
                              EP {anime.episodes}
                            </span>
                          )}
                        </div>
                        <div className="p-3">
                          <h3 className="text-sm font-semibold text-[#f8fafc] line-clamp-2 mb-2">{anime.title}</h3>
                          <div className="flex flex-wrap gap-1 mb-2">
                            {(typeof anime.genres === 'string' ? anime.genres.split(',').slice(0, 2) : Array.isArray(anime.genres) ? anime.genres.slice(0, 2) : []).map((g, gi) => (
                              <span key={gi} className="text-[10px] px-1.5 py-0.5 rounded bg-[#0ea5e9]/15 text-[#0ea5e9]">{typeof g === 'string' ? g.trim() : g}</span>
                            ))}
                          </div>
                          {isAdmin && (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (!isImported) handleImport(anime);
                              }}
                              disabled={isImported || importingId === animeId}
                              className={`w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                isImported
                                  ? 'bg-[#22c55e]/15 text-[#22c55e] cursor-default'
                                  : importingId === animeId
                                  ? 'bg-[#0ea5e9]/15 text-[#0ea5e9] cursor-wait'
                                  : 'bg-[#0ea5e9] hover:bg-[#0284c7] text-white'
                              }`}
                            >
                              {isImported ? (
                                <><Check className="w-3.5 h-3.5" /> Imported</>
                              ) : importingId === animeId ? (
                                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Importing...</>
                              ) : (
                                <><Download className="w-3.5 h-3.5" /> Import</>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </motion.div>
          )}

          <div className="flex justify-center mt-8">
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="px-8 py-3 bg-[#1e293b] hover:bg-[#334155] text-[#f8fafc] rounded-lg font-medium transition-colors border border-[rgba(148,163,184,0.12)] disabled:opacity-50"
            >
              {loadingMore ? 'Loading...' : 'Load More'}
            </button>
          </div>
        </section>

        {/* Genres Section */}
        <section ref={genresRef}>
          <h2 className="text-2xl font-bold text-[#f8fafc] mb-6">Browse by Genre</h2>
          {loadingGenres ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {Array.from({ length: 12 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-lg" />
              ))}
            </div>
          ) : (
            <motion.div
              variants={container}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3"
            >
              {genres.map((genre, i) => {
                const name = typeof genre === 'string' ? genre : genre.name;
                return (
                  <motion.div key={name || i} variants={item}>
                    <Link
                      to={`/genre/${encodeURIComponent(name)}`}
                      className="flex items-center justify-between p-3 bg-[#1e293b] hover:bg-[#334155] rounded-lg border border-[rgba(148,163,184,0.12)] transition-colors group"
                    >
                      <span className="text-[#f8fafc] font-medium group-hover:text-[#0ea5e9] transition-colors">
                        {name}
                      </span>
                      {genre.count != null && (
                        <span className="text-xs text-[#94a3b8] bg-[#0f172a] px-2 py-0.5 rounded-full">
                          {genre.count}
                        </span>
                      )}
                    </Link>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </section>
      </div>


    </div>
  );
}
