import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Search, Download, Check, Loader2, Globe, Mic } from 'lucide-react';
import api from '../../lib/api';
import { cn } from '../../lib/utils';
import Pagination from '../../components/common/Pagination';
import Skeleton from '../../components/common/Skeleton';

// Admin page to search and import anime from Anizen.
export default function AdminAnizenImport() {
  const [spotlight, setSpotlight] = useState([]);
  const [loadingSpotlight, setLoadingSpotlight] = useState(true);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [importing, setImporting] = useState(null);
  const [imported, setImported] = useState(new Set());
  const [selectedIds, setSelectedIds] = useState(new Set());

  useEffect(() => {
    // Fetches spotlight anime from the Anizen home feed.
    const fetchSpotlight = async () => {
      try {
        const res = await api.get('/import/anizen/home');
        const apiData = res.data.data || res.data;
        setSpotlight(apiData.results?.spotlights || apiData.results?.trending || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingSpotlight(false);
      }
    };
    fetchSpotlight();
  }, []);

  // Searches Anizen for anime matching a query.
  const fetchResults = useCallback(async (query, p = 1) => {
    if (!query) return;
    setLoading(true);
    try {
      const res = await api.get('/import/anizen/search', { params: { q: query, page: p } });
      const apiData = res.data.data || res.data;
      setResults(apiData.results || apiData.data || []);
      setTotalPages(res.data.totalPages || 1);
      setPage(p);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => { if (search) fetchResults(search, 1); }, 400);
    return () => clearTimeout(t);
  }, [search, fetchResults]);

  // Imports a single Anizen anime into the site.
  const importSingle = async (item) => {
    const id = item.id || item._id;
    setImporting(id);
    try {
      await api.post('/import/anizen', { anizen_id: id, data: item });
      setImported((prev) => new Set([...prev, id]));
    } catch (err) {
      console.error(err);
    } finally {
      setImporting(null);
    }
  };

  // Imports all selected, not-yet-imported anime.
  const importSelected = async () => {
    const all = [...spotlight, ...results];
    const toImport = all.filter((r) => selectedIds.has(r.id || r._id) && !imported.has(r.id || r._id));
    for (const item of toImport) {
      await importSingle(item);
    }
    setSelectedIds(new Set());
  };

  // Toggles an anime in the selection set.
  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Card component displaying an importable Anizen anime.
  const AnimeCard = ({ item }) => {
    const id = item.id || item._id;
    const isImported = imported.has(id);
    return (
      <div className="card-anime overflow-hidden group">
        <div className="relative aspect-[3/4]">
          <img src={item.image || item.poster || '/placeholder.jpg'} alt={item.title} className="w-full h-full object-cover" />
          {isImported && (
            <div className="absolute top-2 right-2 badge badge-success flex items-center gap-1">
              <Check className="w-3 h-3" /> Imported
            </div>
          )}
          <div className="absolute top-2 left-2 flex gap-1.5">
            {item.hasSub && <span className="badge badge-primary text-[10px]"><Mic className="w-2.5 h-2.5 mr-0.5" />SUB</span>}
            {item.hasDub && <span className="badge badge-warning text-[10px]"><Globe className="w-2.5 h-2.5 mr-0.5" />DUB</span>}
          </div>
          <button
            onClick={() => toggleSelect(id)}
            className={cn(
              'absolute bottom-2 left-2 w-6 h-6 rounded border-2 flex items-center justify-center transition-colors',
              selectedIds.has(id) ? 'bg-[#0ea5e9] border-[#0ea5e9] text-white' : 'border-white/50 text-white/70 hover:border-white'
            )}
          >
            {selectedIds.has(id) && <Check className="w-3.5 h-3.5" />}
          </button>
        </div>
        <div className="p-3">
          <h3 className="text-sm font-medium text-[#f8fafc] truncate">{item.title}</h3>
          <p className="text-xs text-[#94a3b8] mt-1">{item.year || item.type || ''}</p>
          <button
            onClick={() => importSingle(item)}
            disabled={isImported || importing === id}
            className={cn(
              'mt-3 w-full py-1.5 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 transition-colors',
              isImported
                ? 'bg-green-500/10 text-green-400 cursor-not-allowed'
                : 'bg-[#0ea5e9] hover:bg-[#0ea5e9]/80 text-white'
            )}
          >
            {importing === id ? <Loader2 className="w-4 h-4 animate-spin" /> : isImported ? <><Check className="w-4 h-4" /> Imported</> : <><Download className="w-4 h-4" /> Import</>}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-[#f8fafc]">Anizen Import</h1>
        {selectedIds.size > 0 && (
          <button onClick={importSelected} className="btn-primary flex items-center gap-2">
            <Download className="w-4 h-4" /> Import Selected ({selectedIds.size})
          </button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
        <input
          type="text"
          placeholder="Search Anizen..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-dark pl-10"
        />
      </div>

      {!search && (
        <section>
          <h2 className="text-lg font-semibold text-[#f8fafc] mb-4">Spotlight</h2>
          {loadingSpotlight ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[300px] rounded-xl" />)}
            </div>
          ) : spotlight.length === 0 ? (
            <p className="text-[#94a3b8] text-sm">No spotlight anime available</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {spotlight.map((item) => <AnimeCard key={item.id || item._id} item={item} />)}
            </div>
          )}
        </section>
      )}

      {search && (
        <section>
          <h2 className="text-lg font-semibold text-[#f8fafc] mb-4">Search Results</h2>
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-[300px] rounded-xl" />)}
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-12 text-[#94a3b8]">No results found</div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {results.map((item) => <AnimeCard key={item.id || item._id} item={item} />)}
              </div>
              <div className="mt-4">
                <Pagination currentPage={page} totalPages={totalPages} onPageChange={(p) => fetchResults(search, p)} />
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
