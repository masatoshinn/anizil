import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Search, Download, Check, Loader2, Wifi, WifiOff, BookOpen } from 'lucide-react';
import api from '../../lib/api';
import { cn, mangaImage } from '../../lib/utils';
import Pagination from '../../components/common/Pagination';
import Skeleton from '../../components/common/Skeleton';

// Admin page to search and import manga from MangaDex.
export default function AdminMangaImport() {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [importing, setImporting] = useState(null);
  const [imported, setImported] = useState(new Set());
  const [apiOnline, setApiOnline] = useState(null);
  const [importLog, setImportLog] = useState([]);

  useEffect(() => {
    api.get('/import/manga/status')
      .then(() => setApiOnline(true))
      .catch(() => setApiOnline(false));
  }, []);

  // Searches MangaDex for manga matching a query.
  const fetchResults = useCallback(async (query, p = 1) => {
    if (!query) return;
    setLoading(true);
    try {
      const res = await api.get('/import/manga/search', { params: { q: query, page: p } });
      const data = res.data.data || {};
      setResults(data.manga || []);
      setTotalPages(data.totalPages || 1);
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

  // Imports a single MangaDex manga into the site.
  const importSingle = async (item) => {
    setImporting(item.id);
    try {
      const res = await api.post('/import/manga', { mangadex_id: item.id });
      setImported((prev) => new Set([...prev, item.id]));
      setImportLog((prev) => [{ text: `Imported: ${item.title} (${res.data.data.title || ''})`, time: new Date().toISOString(), type: 'success' }, ...prev].slice(0, 50));
    } catch (err) {
      setImportLog((prev) => [{ text: `Failed: ${item.title} - ${err.response?.data?.message || err.message}`, time: new Date().toISOString(), type: 'error' }, ...prev].slice(0, 50));
    } finally {
      setImporting(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#f8fafc]">Manga Import (MangaDex)</h1>
        <div className="flex items-center gap-2">
          {apiOnline === null ? (
            <Loader2 className="w-4 h-4 text-[#94a3b8] animate-spin" />
          ) : apiOnline ? (
            <div className="flex items-center gap-2 text-sm text-green-400"><Wifi className="w-4 h-4" /> MangaDex Online</div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-red-400"><WifiOff className="w-4 h-4" /> MangaDex Offline</div>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
          <input
            type="text"
            placeholder="Search MangaDex (e.g. one piece, naruto, berserk)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-dark pl-10"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-[280px] rounded-xl" />)}
        </div>
      ) : results.length === 0 ? (
        <div className="text-center py-12 text-[#94a3b8]">{search ? 'No results found' : 'Search MangaDex to import manga & light novels'}</div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {results.map((item) => {
              const isImported = imported.has(item.id) || item.imported;
              return (
                <div key={item.id} className="card-anime overflow-hidden group">
                  <div className="relative aspect-[3/4]">
                    <img src={mangaImage(item.poster) || '/placeholder-poster.png'} alt={item.title} className="w-full h-full object-cover" />
                    {isImported && (
                      <div className="absolute top-2 right-2 badge badge-success flex items-center gap-1">
                        <Check className="w-3 h-3" /> Imported
                      </div>
                    )}
                    {item.year && (
                      <div className="absolute top-2 left-2 badge badge-primary text-[10px]">{item.year}</div>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="text-sm font-medium text-[#f8fafc] truncate">{item.title}</h3>
                    <p className="text-xs text-[#94a3b8] mt-1">{item.author || item.status || ''}</p>
                    <button
                      onClick={() => importSingle(item)}
                      disabled={isImported || importing === item.id}
                      className={cn(
                        'mt-3 w-full py-1.5 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 transition-colors',
                        isImported
                          ? 'bg-green-500/10 text-green-400 cursor-not-allowed'
                          : 'bg-[#0ea5e9] hover:bg-[#0ea5e9]/80 text-white'
                      )}
                    >
                      {importing === item.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : isImported ? (
                        <><Check className="w-4 h-4" /> Imported</>
                      ) : (
                        <><Download className="w-4 h-4" /> Import</>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          {totalPages > 1 && (
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={(p) => fetchResults(search, p)} />
          )}
        </>
      )}

      {importLog.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#1e293b] rounded-xl border border-[rgba(148,163,184,0.12)] p-4"
        >
          <h3 className="text-sm font-semibold text-[#f8fafc] mb-3 flex items-center gap-2">
            <BookOpen className="w-4 h-4" /> Import Log
          </h3>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {importLog.map((log, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className="text-[#94a3b8]">{new Date(log.time).toLocaleTimeString()}</span>
                <span className={log.type === 'success' ? 'text-green-400' : 'text-red-400'}>{log.text}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
