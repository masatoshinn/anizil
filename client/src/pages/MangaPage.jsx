import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, ChevronRight, Search } from 'lucide-react';
import api from '../lib/api';
import MangaCard from '../components/common/MangaCard';
import Skeleton from '../components/common/Skeleton';
import Pagination from '../components/common/Pagination';
import useSEO from '../hooks/useSEO';
import { cn } from '../lib/utils';

const fadeIn = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };
const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } };

const SORTS = [
  { value: 'newest', label: 'Newest' },
  { value: 'rating', label: 'Top Rated' },
  { value: 'views', label: 'Most Popular' },
  { value: 'title', label: 'A-Z' },
];

// MangaPage: browse and search manga with sort, genre filters, and pagination
export default function MangaPage() {
  useSEO({ title: 'Manga & Light Novels', description: 'Read manga and light novels online for free. Browse the latest chapters, top rated series and more.' });

  const [manga, setManga] = useState([]);
  const [genres, setGenres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState('newest');
  const [search, setSearch] = useState('');
  const [activeGenre, setActiveGenre] = useState('');

  useEffect(() => {
    api.get('/manga/genres').then((res) => setGenres(res.data.data || [])).catch(() => {});
  }, []);

  // Fetches a page of manga with the current sort, genre, and search filters
  const fetchManga = useCallback(async (p, opts = {}) => {
    setLoading(true);
    try {
      const res = await api.get('/manga', {
        params: {
          page: p,
          limit: 24,
          sort: opts.sortBy ?? sortBy,
          genre: (opts.activeGenre ?? activeGenre) || undefined,
          search: (opts.search ?? search) || undefined,
        },
      });
      const data = res.data.data || {};
      setManga(data.manga || []);
      setTotalPages(data.pagination?.pages || 1);
      setTotal(data.pagination?.total || 0);
    } catch {
      setManga([]);
    }
    setLoading(false);
  }, [sortBy, activeGenre, search]);

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      fetchManga(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search, fetchManga]);

  useEffect(() => {
    fetchManga(page);
  }, [page, sortBy, activeGenre, fetchManga]);

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.nav
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 text-sm text-text-muted mb-6"
        >
          <Link to="/" className="hover:text-primary transition-colors">Home</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-text-primary">Manga</span>
        </motion.nav>

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-text-primary">Manga & Light Novels</h1>
              {total > 0 && <p className="text-text-muted text-sm mt-0.5">{total} series</p>}
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search manga..."
                className="w-full bg-panel border border-border-custom rounded-lg pl-10 pr-4 py-2 text-text-primary placeholder-[#94a3b8] focus:outline-none focus:border-[#0ea5e9]/50 text-sm"
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-panel border border-border-custom rounded-lg px-4 py-2 text-text-primary text-sm focus:outline-none focus:border-[#0ea5e9]/50"
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </motion.div>

        {/* Genre filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 -mx-4 px-4">
          <button
            onClick={() => setActiveGenre('')}
            className={cn(
              'flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border transition-colors',
              activeGenre === ''
                ? 'bg-primary text-white border-primary'
                : 'bg-panel text-text-muted border-border-custom hover:text-text-primary'
            )}
          >
            All
          </button>
          {genres.map((g) => (
            <button
              key={g}
              onClick={() => setActiveGenre(g)}
              className={cn(
                'flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border transition-colors',
                activeGenre === g
                  ? 'bg-primary text-white border-primary'
                  : 'bg-panel text-text-muted border-border-custom hover:text-text-primary'
              )}
            >
              {g}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 15 }).map((_, i) => (
              <Skeleton key={i} className="h-[280px] rounded-xl" />
            ))}
          </div>
        ) : manga.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen className="w-16 h-16 text-text-muted/30 mx-auto mb-4" />
            <h3 className="text-text-primary text-xl font-semibold mb-2">No manga found</h3>
            <p className="text-text-muted">
              {search || activeGenre ? 'Try a different search or filter' : 'Import manga from the admin panel to get started'}
            </p>
          </div>
        ) : (
          <>
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
            >
              {manga.map((m, i) => (
                <motion.div key={m.id || m.slug || i} variants={fadeIn}>
                  <MangaCard manga={m} />
                </motion.div>
              ))}
            </motion.div>

            {totalPages > 1 && (
              <div className="mt-8">
                <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
