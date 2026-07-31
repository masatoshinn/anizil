import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, Tag } from 'lucide-react';
import useAnimeStore from '../store/animeStore';
import AnimeCard from '../components/common/AnimeCard';
import Skeleton from '../components/common/Skeleton';
import Pagination from '../components/common/Pagination';
import useSEO from '../hooks/useSEO';
import { cn } from '../lib/utils';

const fadeIn = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };
const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } };

const SORTS = [
  { value: 'popular', label: 'Most Popular' },
  { value: 'newest', label: 'Newest' },
  { value: 'rating', label: 'Top Rated' },
  { value: 'az', label: 'A-Z' },
];

export default function GenrePage() {
  const { genreName } = useParams();
  const {
    animeList, genres, pagination, loadingAnimeList, loadingGenres,
    fetchAnimeList, fetchGenres,
  } = useAnimeStore();

  useSEO({
    title: genreName ? `${decodeURIComponent(genreName)} Anime` : 'Browse by Genre',
    description: genreName ? `Watch ${decodeURIComponent(genreName)} anime online in HD. Explore popular, top rated and newest ${decodeURIComponent(genreName)} titles.` : 'Browse all anime genres on Anizil.',
  });

  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('popular');

  // All genres page
  if (!genreName) {
    useEffect(() => {
      fetchGenres();
    }, []);

    return (
      <div className="min-h-screen py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-2 text-sm text-[#94a3b8] mb-6">
              <Link to="/" className="hover:text-[#0ea5e9] transition-colors">Home</Link>
              <ChevronRight className="w-3 h-3" />
              <span className="text-[#f8fafc]">Genres</span>
            </div>
            <h1 className="text-3xl font-bold text-[#f8fafc] mb-8">Browse by Genre</h1>
          </motion.div>

          {loadingGenres ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {Array.from({ length: 20 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>
          ) : (
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
            >
              {genres.map((genre, i) => {
                const name = typeof genre === 'string' ? genre : genre.name;
                const count = genre.count || 0;
                return (
                  <motion.div key={name || i} variants={fadeIn}>
                    <Link
                      to={`/genre/${encodeURIComponent(name)}`}
                      className="block p-5 bg-[#1e293b] hover:bg-[#334155] rounded-xl border border-[rgba(148,163,184,0.12)] transition-all group hover:border-[#0ea5e9]/30"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <Tag className="w-5 h-5 text-[#0ea5e9]" />
                        <span className="text-[#f8fafc] font-semibold group-hover:text-[#0ea5e9] transition-colors">
                          {name}
                        </span>
                      </div>
                      {count > 0 && (
                        <span className="text-xs text-[#94a3b8] bg-[#0f172a] px-2 py-0.5 rounded-full">
                          {count} anime
                        </span>
                      )}
                    </Link>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>
      </div>
    );
  }

  // Single genre page
  useEffect(() => {
    setPage(1);
  }, [genreName, sortBy]);

  useEffect(() => {
    fetchAnimeList({ genre: genreName, page, limit: 24, sort: sortBy });
  }, [genreName, page, sortBy]);

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <motion.nav
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 text-sm text-[#94a3b8] mb-6"
        >
          <Link to="/" className="hover:text-[#0ea5e9] transition-colors">Home</Link>
          <ChevronRight className="w-3 h-3" />
          <Link to="/genres" className="hover:text-[#0ea5e9] transition-colors">Genres</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-[#f8fafc]">{genreName}</span>
        </motion.nav>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#f8fafc]">{genreName}</h1>
            {pagination?.total && (
              <p className="text-[#94a3b8] text-sm mt-1">{pagination.total} anime found</p>
            )}
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-[#1e293b] border border-[rgba(148,163,184,0.12)] rounded-lg px-4 py-2 text-[#f8fafc] text-sm focus:outline-none focus:border-[#0ea5e9]/50"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        {loadingAnimeList ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-[280px] rounded-xl" />
            ))}
          </div>
        ) : animeList.length === 0 ? (
          <div className="text-center py-20">
            <Tag className="w-16 h-16 text-[#94a3b8]/30 mx-auto mb-4" />
            <h3 className="text-[#f8fafc] text-xl font-semibold mb-2">No anime in this genre</h3>
            <p className="text-[#94a3b8]">Check back later for new additions</p>
          </div>
        ) : (
          <>
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"
            >
              {animeList.map((anime, i) => (
                <motion.div key={anime._id || anime.slug || i} variants={fadeIn}>
                  <AnimeCard anime={anime} />
                </motion.div>
              ))}
            </motion.div>

            {pagination?.totalPages > 1 && (
              <div className="mt-8">
                <Pagination
                  currentPage={page}
                  totalPages={pagination.totalPages}
                  onPageChange={setPage}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
