import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { Download, Play, Square, Loader2, Search, Check, AlertCircle } from 'lucide-react';
import api from '../../lib/api';
import { cn } from '../../lib/utils';
import Skeleton from '../../components/common/Skeleton';

// Admin page to bulk import many Anikoto anime pages.
export default function AdminAnikotoBulkImport() {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState({ imported: 0, failed: 0 });
  const [stopFlag, setStopFlag] = useState(false);
  const logsRef = useRef(null);
  const abortRef = useRef(false);

  const [browseResults, setBrowseResults] = useState([]);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [browsePage, setBrowsePage] = useState(1);
  const [importingId, setImportingId] = useState(null);

  const { register, handleSubmit, watch } = useForm({ defaultValues: { pageCount: 5 } });
  const pageCount = watch('pageCount');

  const quickForm = useForm({ defaultValues: { pageCount: 5 } });

  useEffect(() => {
    if (logsRef.current) logsRef.current.scrollTop = 0;
  }, [logs]);

  // Prepends a timestamped entry to the import log.
  const addLog = (text, type = 'info') => {
    setLogs((prev) => [{ text, time: new Date().toLocaleTimeString(), type }, ...prev].slice(0, 200));
  };

  // Imports a given number of pages, logging each result.
  const startBulkImport = async (data) => {
    setRunning(true);
    setStopFlag(false);
    abortRef.current = false;
    setProgress(0);
    setSummary({ imported: 0, failed: 0 });
    setLogs([]);

    const count = Math.min(Math.max(parseInt(data.pageCount) || 5, 1), 50);
    addLog(`Starting bulk import: ${count} pages`, 'info');

    let imported = 0;
    let failed = 0;

    for (let i = 1; i <= count; i++) {
      if (abortRef.current) {
        addLog('Import stopped by user', 'warning');
        break;
      }

      try {
        const res = await api.get('/import/anikoto/browse', { params: { page: i } });
        const apiData = res.data.data || res.data;
        const items = apiData.data?.anime || apiData.anime || apiData.results || [];
        addLog(`Page ${i}: found ${items.length} anime`, 'info');

        for (const item of items) {
          if (abortRef.current) break;
          try {
            await api.post('/import/anikoto', { anikoto_id: item.id || item._id, data: item });
            imported++;
            addLog(`Imported: ${item.title}`, 'success');
          } catch {
            failed++;
            addLog(`Failed: ${item.title}`, 'error');
          }
        }
      } catch {
        addLog(`Error fetching page ${i}`, 'error');
        failed++;
      }

      setProgress(Math.round((i / count) * 100));
      setSummary({ imported, failed });
    }

    addLog(`Done! Imported: ${imported}, Failed: ${failed}`, 'info');
    setRunning(false);
  };

  // Signals the running import to stop.
  const stopImport = () => {
    abortRef.current = true;
    setStopFlag(true);
  };

  // Loads a single Anikoto page for manual browsing.
  const browsePageLoad = async (pageNum) => {
    setBrowseLoading(true);
    try {
      const res = await api.get('/import/anikoto/browse', { params: { page: pageNum } });
      const apiData = res.data.data || res.data;
      setBrowseResults(apiData.data?.anime || apiData.anime || apiData.results || []);
      setBrowsePage(pageNum);
    } catch (err) {
      console.error(err);
    } finally {
      setBrowseLoading(false);
    }
  };

  // Imports a single browsed anime item.
  const importBrowseItem = async (item) => {
    setImportingId(item.id || item._id);
    try {
      await api.post('/import/anikoto', { anikoto_id: item.id || item._id, data: item });
      addLog(`Imported: ${item.title}`, 'success');
    } catch {
      addLog(`Failed: ${item.title}`, 'error');
    } finally {
      setImportingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#f8fafc]">Bulk Import from Anikoto</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#1e293b] rounded-xl border border-[rgba(148,163,184,0.12)] p-6">
          <h2 className="text-lg font-semibold text-[#f8fafc] mb-4">Quick Import</h2>
          <form onSubmit={handleSubmit(startBulkImport)} className="space-y-4">
            <div>
              <label className="block text-sm text-[#94a3b8] mb-1">Page Count (1-50)</label>
              <input {...register('pageCount', { min: 1, max: 50 })} type="number" className="input-dark" disabled={running} />
            </div>
            <div className="flex gap-3">
              {running ? (
                <button type="button" onClick={stopImport} className="px-6 py-2.5 rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium flex items-center gap-2 transition-colors">
                  <Square className="w-4 h-4" /> Stop
                </button>
              ) : (
                <button type="submit" className="btn-primary flex items-center gap-2">
                  <Play className="w-4 h-4" /> Start Import
                </button>
              )}
            </div>
          </form>

          {running && (
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-[#94a3b8]">Progress</span>
                <span className="text-[#f8fafc]">{progress}%</span>
              </div>
              <div className="w-full h-2 bg-[#0f172a] rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-[#0ea5e9] to-[#06b6d4] rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          )}

          <div className="mt-4 flex gap-4 text-sm">
            <div className="flex items-center gap-1.5"><Check className="w-4 h-4 text-green-400" /><span className="text-[#94a3b8]">Imported:</span><span className="text-[#f8fafc] font-medium">{summary.imported}</span></div>
            <div className="flex items-center gap-1.5"><AlertCircle className="w-4 h-4 text-red-400" /><span className="text-[#94a3b8]">Failed:</span><span className="text-[#f8fafc] font-medium">{summary.failed}</span></div>
          </div>
        </div>

        <div className="bg-[#1e293b] rounded-xl border border-[rgba(148,163,184,0.12)] p-6">
          <h2 className="text-lg font-semibold text-[#f8fafc] mb-3">Real-time Log</h2>
          <div ref={logsRef} className="h-[280px] overflow-y-auto bg-[#0f172a] rounded-lg p-3 font-mono text-xs space-y-1">
            {logs.length === 0 ? (
              <p className="text-[#94a3b8]">No logs yet...</p>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="flex gap-2">
                  <span className="text-[#94a3b8] flex-shrink-0">{log.time}</span>
                  <span className={cn(
                    log.type === 'success' ? 'text-green-400' : log.type === 'error' ? 'text-red-400' : log.type === 'warning' ? 'text-yellow-400' : 'text-[#94a3b8]'
                  )}>{log.text}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="bg-[#1e293b] rounded-xl border border-[rgba(148,163,184,0.12)] p-6">
        <h2 className="text-lg font-semibold text-[#f8fafc] mb-4">Browse & Import</h2>
        <div className="flex items-center gap-3 mb-4">
          <input type="number" value={browsePage} onChange={(e) => setBrowsePage(parseInt(e.target.value) || 1)} className="input-dark w-24" min="1" />
          <button onClick={() => browsePageLoad(browsePage)} disabled={browseLoading} className="btn-secondary flex items-center gap-2">
            {browseLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Load Page
          </button>
        </div>

        {browseLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-[240px] rounded-xl" />)}
          </div>
        ) : browseResults.length === 0 ? (
          <div className="text-center py-8 text-[#94a3b8]">Load a page to browse anime</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {browseResults.map((item) => {
              const id = item.id || item._id;
              return (
                <div key={id} className="card-anime overflow-hidden">
                  <img src={item.image || item.poster || '/placeholder.jpg'} alt={item.title} className="w-full aspect-[3/4] object-cover" />
                  <div className="p-3">
                    <h3 className="text-sm font-medium text-[#f8fafc] truncate">{item.title}</h3>
                    <button
                      onClick={() => importBrowseItem(item)}
                      disabled={importingId === id}
                      className="mt-2 w-full py-1.5 rounded-lg text-sm font-medium bg-[#0ea5e9] hover:bg-[#0ea5e9]/80 text-white flex items-center justify-center gap-1.5 transition-colors"
                    >
                      {importingId === id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                      Import
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
