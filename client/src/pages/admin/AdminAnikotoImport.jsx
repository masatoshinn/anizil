import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Search, Download, Check, Loader2, Wifi, WifiOff, Crown, Unlock } from 'lucide-react';
import api from '../../lib/api';
import { cn } from '../../lib/utils';
import Pagination from '../../components/common/Pagination';
import Skeleton from '../../components/common/Skeleton';

// Admin page to search and import anime from Anikoto.
export default function AdminAnikotoImport() {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [importing, setImporting] = useState(null);
  const [imported, setImported] = useState(new Set());
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [apiOnline, setApiOnline] = useState(null);
  const [importLog, setImportLog] = useState([]);
  const [importMode, setImportMode] = useState('free'); // 'free' or 'premium'
  const [showModeConfirm, setShowModeConfirm] = useState(null); // holds item to import

  useEffect(() => {
    // Checks whether the Anikoto import API is online.
    const checkApi = async () => {
      try {
        await api.get('/import/anikoto/status');
        setApiOnline(true);
      } catch {
        setApiOnline(false);
      }
    };
    checkApi();
  }, []);

  // Searches Anikoto for anime matching a query.
  const fetchResults = useCallback(async (query, p = 1) => {
    if (!query) return;
    setLoading(true);
    try {
      const res = await api.get('/import/anikoto/search', { params: { q: query, page: p } });
      const apiData = res.data.data || res.data;
      setResults(apiData.data?.anime || apiData.anime || apiData.results || []);
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

  // Imports a single anime as free or premium.
  const importSingle = async (item, premium = false) => {
    setImporting(item.id || item._id);
    try {
      await api.post('/import/anikoto', { anikoto_id: item.id || item._id, is_premium: premium });
      setImported((prev) => new Set([...prev, item.id || item._id]));
      setImportLog((prev) => [{ text: `Imported: ${item.title} ${premium ? '(Premium)' : '(Free)'}`, time: new Date().toISOString(), type: 'success' }, ...prev].slice(0, 50));
    } catch (err) {
      setImportLog((prev) => [{ text: `Failed: ${item.title} - ${err.response?.data?.message || err.message}`, time: new Date().toISOString(), type: 'error' }, ...prev].slice(0, 50));
    } finally {
      setImporting(null);
      setShowModeConfirm(null);
    }
  };

  // Opens the import mode confirmation for an item.
  const handleImportClick = (item) => {
    setShowModeConfirm(item);
  };

  // Runs the pending import in the chosen mode.
  const confirmImport = (premium) => {
    if (showModeConfirm) {
      importSingle(showModeConfirm, premium);
    }
  };

  // Imports all selected, not-yet-imported anime.
  const importSelected = async () => {
    const toImport = results.filter((r) => selectedIds.has(r.id || r._id) && !imported.has(r.id || r._id));
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#f8fafc]">Anikoto Import</h1>
        <div className="flex items-center gap-2">
          {apiOnline === null ? (
            <Loader2 className="w-4 h-4 text-[#94a3b8] animate-spin" />
          ) : apiOnline ? (
            <div className="flex items-center gap-2 text-sm text-green-400"><Wifi className="w-4 h-4" /> API Online</div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-red-400"><WifiOff className="w-4 h-4" /> API Offline</div>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
          <input
            type="text"
            placeholder="Search Anikoto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-dark pl-10"
          />
        </div>
        <div className="flex items-center gap-2 bg-[#1e293b] rounded-lg border border-[rgba(148,163,184,0.12)] p-1">
          <button
            onClick={() => setImportMode('free')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors',
              importMode === 'free' ? 'bg-green-500/15 text-green-400' : 'text-[#94a3b8] hover:text-[#f8fafc]'
            )}
          >
            <Unlock className="w-3.5 h-3.5" /> Free
          </button>
          <button
            onClick={() => setImportMode('premium')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors',
              importMode === 'premium' ? 'bg-yellow-500/15 text-yellow-400' : 'text-[#94a3b8] hover:text-[#f8fafc]'
            )}
          >
            <Crown className="w-3.5 h-3.5" /> Premium
          </button>
        </div>
        {selectedIds.size > 0 && (
          <button onClick={() => importSelected()} className="btn-primary flex items-center gap-2">
            <Download className="w-4 h-4" /> Import Selected ({selectedIds.size}) as {importMode === 'premium' ? 'Premium' : 'Free'}
          </button>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-[280px] rounded-xl" />)}
        </div>
      ) : results.length === 0 ? (
        <div className="text-center py-12 text-[#94a3b8]">{search ? 'No results found' : 'Search for anime to import'}</div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {results.map((item) => {
              const id = item.id || item._id;
              const isImported = imported.has(id);
              return (
                <div key={id} className="card-anime overflow-hidden group">
                  <div className="relative aspect-[3/4]">
                    <img src={item.image || item.poster || '/placeholder.jpg'} alt={item.title} className="w-full h-full object-cover" />
                    {isImported && (
                      <div className="absolute top-2 right-2 badge badge-success flex items-center gap-1">
                        <Check className="w-3 h-3" /> Imported
                      </div>
                    )}
                    <button
                      onClick={() => toggleSelect(id)}
                      className={cn(
                        'absolute top-2 left-2 w-6 h-6 rounded border-2 flex items-center justify-center transition-colors',
                        selectedIds.has(id) ? 'bg-[#0ea5e9] border-[#0ea5e9] text-white' : 'border-white/50 text-white/70 hover:border-white'
                      )}
                    >
                      {selectedIds.has(id) && <Check className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="p-3">
                    <h3 className="text-sm font-medium text-[#f8fafc] truncate">{item.title}</h3>
                    <p className="text-xs text-[#94a3b8] mt-1">{item.year || item.season || ''}</p>
                    <button
                      onClick={() => handleImportClick(item)}
                      disabled={isImported || importing === id}
                      className={cn(
                        'mt-3 w-full py-1.5 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 transition-colors',
                        isImported
                          ? 'bg-green-500/10 text-green-400 cursor-not-allowed'
                          : 'bg-[#0ea5e9] hover:bg-[#0ea5e9]/80 text-white'
                      )}
                    >
                      {importing === id ? (
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
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={(p) => fetchResults(search, p)} />
        </>
      )}

      {importLog.length > 0 && (
        <div className="bg-[#1e293b] rounded-xl border border-[rgba(148,163,184,0.12)] p-4">
          <h3 className="text-sm font-semibold text-[#f8fafc] mb-3">Import Log</h3>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {importLog.map((log, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className="text-[#94a3b8]">{new Date(log.time).toLocaleTimeString()}</span>
                <span className={log.type === 'success' ? 'text-green-400' : 'text-red-400'}>{log.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Import Mode Confirmation Modal */}
      {showModeConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowModeConfirm(null)}>
          <div className="bg-[#1e293b] border border-[rgba(148,163,184,0.12)] rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-[#f8fafc] mb-1">Import: {showModeConfirm.title}</h3>
            <p className="text-sm text-[#94a3b8] mb-6">Choose how to import this anime:</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => confirmImport(false)}
                disabled={importing === (showModeConfirm.id || showModeConfirm._id)}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-green-500/20 bg-green-500/5 hover:bg-green-500/10 transition-colors"
              >
                <Unlock className="w-8 h-8 text-green-400" />
                <span className="text-sm font-semibold text-green-400">Free</span>
                <span className="text-xs text-[#94a3b8] text-center">Everyone can watch</span>
              </button>
              <button
                onClick={() => confirmImport(true)}
                disabled={importing === (showModeConfirm.id || showModeConfirm._id)}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-yellow-500/20 bg-yellow-500/5 hover:bg-yellow-500/10 transition-colors"
              >
                <Crown className="w-8 h-8 text-yellow-400" />
                <span className="text-sm font-semibold text-yellow-400">Premium</span>
                <span className="text-xs text-[#94a3b8] text-center">200 XP to unlock</span>
              </button>
            </div>
            <button
              onClick={() => setShowModeConfirm(null)}
              className="mt-4 w-full py-2 text-sm text-[#94a3b8] hover:text-[#f8fafc] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
