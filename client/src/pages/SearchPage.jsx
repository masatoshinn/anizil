import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, X, SlidersHorizontal, TrendingUp } from 'lucide-react';
import useAnimeStore from '../store/animeStore';
import AnimeCard from '../components/common/AnimeCard';
import Skeleton from '../components/common/Skeleton';
import Pagination from '../components/common/Pagination';
import useDebounce from '../hooks/useDebounce';
import useSEO from '../hooks/useSEO';
import { cn } from '../lib/utils';

const HISTORY_KEY = 'anizil_search_history';
const MAX_HISTORY = 8;

const GENRES = [
  'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror', 'Mystery',
  'Romance', 'Sci-Fi', 'Slice of Life', 'Sports', 'Supernatural', 'Thriller',
];
const STATUSES = ['Airing', 'Finished', 'Upcoming'];
const SORTS = [
  { value: 'popular', label: 'Popular' },
  { value: 'newest', label: 'Newest' },
  { value: 'rating', label: 'Rating' },
  { value: 'az', label: 'A-Z' },
];
const YEARS = Array.from({ length: 15 }, (_, i) => 2026 - i);

const fadeIn = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

// SearchPage: debounced anime search with genre/status/year filters, history, and sorting
export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { searchResults, loadingSearch, searchAnime } = useAnimeStore();

  useSEO({
    title: searchParams.get('q') ? `Search: ${searchParams.get('q')}` : 'Search Anime',
    description: 'Search for anime by title, genre, status or year on Anizil.',
  });

  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [showFilters, setShowFilters] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);
  const [page, setPage] = useState(1);

  // Filters
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [sortBy, setSortBy] = useState('popular');

  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    if (debouncedQuery.trim()) {
      searchAnime(debouncedQuery);
      saveToHistory(debouncedQuery.trim());
      setSearchParams({ q: debouncedQuery.trim() });
    }
  }, [debouncedQuery]);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q && q !== query) {
      setQuery(q);
    }
  }, [searchParams]);

  // Loads the user's recent search history from localStorage
  const loadHistory = () => {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (stored) setSearchHistory(JSON.parse(stored));
    } catch {}
  };

  // Adds a search term to history, deduped and capped in localStorage
  const saveToHistory = (term) => {
    setSearchHistory((prev) => {
      const updated = [term, ...prev.filter((h) => h !== term)].slice(0, MAX_HISTORY);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  // Clears all saved search history from localStorage and state
  const clearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem(HISTORY_KEY);
  };

  // Toggles a genre in the selected genre filter list
  const toggleGenre = (genre) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  };

  // Resets all search filters back to their defaults
  const clearFilters = () => {
    setSelectedGenres([]);
    setSelectedStatus('');
    setSelectedYear('');
    setSortBy('popular');
  };

  const filteredResults = searchResults.filter((anime) => {
    if (selectedGenres.length > 0) {
      const rawGenres = anime.genres;
      const animeGenres = (Array.isArray(rawGenres) ? rawGenres : String(rawGenres || '').split(','))
        .map((g) => (typeof g === 'string' ? g.trim() : g.name || g))
        .filter(Boolean);
      if (!selectedGenres.some((g) => animeGenres.includes(g))) return false;
    }
    if (selectedStatus && anime.status?.toLowerCase() !== selectedStatus.toLowerCase()) return false;
    if (selectedYear && anime.year !== parseInt(selectedYear)) return false;
    return true;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'newest': return new Date(b.aired || b.createdAt) - new Date(a.aired || a.createdAt);
      case 'rating': return (b.rating || 0) - (a.rating || 0);
      case 'az': return (a.title || '').localeCompare(b.title || '');
      default: return (b.popularity || b.views || 0) - (a.popularity || a.views || 0);
    }
  });

  const hasActiveFilters = selectedGenres.length > 0 || selectedStatus || selectedYear || sortBy !== 'popular';

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Search Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-[#f8fafc] mb-6">Search Anime</h1>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94a3b8]" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for anime..."
              className="w-full bg-[#1e293b] border border-[rgba(148,163,184,0.12)] rounded-xl pl-12 pr-12 py-4 text-[#f8fafc] placeholder-[#94a3b8] focus:outline-none focus:border-[#0ea5e9]/50 text-lg transition-colors"
            />
            {query && (
              <button
                onClick={() => { setQuery(''); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#f8fafc] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Search History */}
          {!query && searchHistory.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[#94a3b8] text-sm">Recent Searches</span>
                <button onClick={clearHistory} className="text-[#94a3b8] hover:text-[#ef4444] text-xs transition-colors">
                  Clear All
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {searchHistory.map((term) => (
                  <button
                    key={term}
                    onClick={() => setQuery(term)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1e293b] hover:bg-[#334155] text-[#94a3b8] hover:text-[#f8fafc] text-sm rounded-lg border border-[rgba(148,163,184,0.12)] transition-colors"
                  >
                    <TrendingUp className="w-3 h-3" />
                    {term}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Filter Sidebar/Drawer */}
          <div className={cn(
            'lg:w-64 flex-shrink-0',
            showFilters ? 'block' : 'hidden lg:block'
          )}>
            <div className="bg-[#1e293b] border border-[rgba(148,163,184,0.12)] rounded-xl p-5 sticky top-24">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[#f8fafc] font-semibold">Filters</h3>
                {hasActiveFilters && (
                  <button onClick={clearFilters} className="text-[#0ea5e9] text-xs hover:underline">
                    Clear All
                  </button>
                )}
              </div>

              {/* Genre Filter */}
              <div className="mb-5">
                <h4 className="text-[#94a3b8] text-xs font-medium uppercase tracking-wider mb-2">Genre</h4>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {GENRES.map((g) => (
                    <label key={g} className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={selectedGenres.includes(g)}
                        onChange={() => toggleGenre(g)}
                        className="w-4 h-4 rounded border-[rgba(148,163,184,0.12)] bg-[#0f172a] text-[#0ea5e9] focus:ring-[#0ea5e9]/50"
                      />
                      <span className="text-[#94a3b8] text-sm group-hover:text-[#f8fafc] transition-colors">{g}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Status Filter */}
              <div className="mb-5">
                <h4 className="text-[#94a3b8] text-xs font-medium uppercase tracking-wider mb-2">Status</h4>
                <div className="space-y-1.5">
                  {STATUSES.map((s) => (
                    <label key={s} className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="radio"
                        name="status"
                        checked={selectedStatus === s}
                        onChange={() => setSelectedStatus(selectedStatus === s ? '' : s)}
                        className="w-4 h-4 border-[rgba(148,163,184,0.12)] bg-[#0f172a] text-[#0ea5e9] focus:ring-[#0ea5e9]/50"
                      />
                      <span className="text-[#94a3b8] text-sm group-hover:text-[#f8fafc] transition-colors">{s}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Year Filter */}
              <div className="mb-5">
                <h4 className="text-[#94a3b8] text-xs font-medium uppercase tracking-wider mb-2">Year</h4>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full bg-[#0f172a] border border-[rgba(148,163,184,0.12)] rounded-lg px-3 py-2 text-[#f8fafc] text-sm focus:outline-none focus:border-[#0ea5e9]/50"
                >
                  <option value="">All Years</option>
                  {YEARS.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              {/* Sort */}
              <div>
                <h4 className="text-[#94a3b8] text-xs font-medium uppercase tracking-wider mb-2">Sort By</h4>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full bg-[#0f172a] border border-[rgba(148,163,184,0.12)] rounded-lg px-3 py-2 text-[#f8fafc] text-sm focus:outline-none focus:border-[#0ea5e9]/50"
                >
                  {SORTS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="flex-1 min-w-0">
            {/* Mobile Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 mb-4 px-4 py-2 bg-[#1e293b] hover:bg-[#334155] text-[#f8fafc] rounded-lg text-sm font-medium border border-[rgba(148,163,184,0.12)] lg:hidden transition-colors"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters {hasActiveFilters && <span className="bg-[#0ea5e9] text-white text-xs px-1.5 rounded-full">Active</span>}
            </button>

            {loadingSearch ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 gap-4">
                {Array.from({ length: 9 }).map((_, i) => (
                  <Skeleton key={i} className="h-[280px] rounded-xl" />
                ))}
              </div>
            ) : query && filteredResults.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-20"
              >
                <Search className="w-16 h-16 text-[#94a3b8]/30 mx-auto mb-4" />
                <h3 className="text-[#f8fafc] text-xl font-semibold mb-2">No results found</h3>
                <p className="text-[#94a3b8]">Try different keywords or adjust filters</p>
              </motion.div>
            ) : (
              <>
                {query && (
                  <p className="text-[#94a3b8] text-sm mb-4">
                    Found {filteredResults.length} result{filteredResults.length !== 1 ? 's' : ''} for "{query}"
                  </p>
                )}
                <motion.div
                  variants={fadeIn}
                  initial="hidden"
                  animate="show"
                  className="grid grid-cols-2 sm:grid-cols-3 gap-4"
                >
                  {filteredResults.map((anime, i) => (
                    <motion.div key={anime._id || anime.slug || i} variants={fadeIn} className="relative">
                      {anime.imported === false && (
                        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 px-2 py-0.5 rounded-full bg-[#f59e0b]/90 text-[10px] font-bold text-black">
                          External
                        </div>
                      )}
                      <AnimeCard anime={anime} />
                    </motion.div>
                  ))}
                </motion.div>

                {filteredResults.length > 24 && (
                  <div className="mt-8">
                    <Pagination
                      currentPage={page}
                      totalPages={Math.ceil(filteredResults.length / 24)}
                      onPageChange={setPage}
                    />
                  </div>
                )}
              </>
            )}

            {!query && !loadingSearch && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-20"
              >
                <Search className="w-16 h-16 text-[#94a3b8]/30 mx-auto mb-4" />
                <h3 className="text-[#f8fafc] text-xl font-semibold mb-2">Search for anime</h3>
                <p className="text-[#94a3b8]">Type to search from thousands of anime titles</p>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
