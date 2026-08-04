import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import {
  Search, Plus, Trash2, Link2, Globe, Server, ToggleLeft, ToggleRight,
  Loader2, ChevronDown, ChevronRight, Download, ExternalLink
} from 'lucide-react';
import api from '../../lib/api';
import { cn } from '../../lib/utils';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import Skeleton from '../../components/common/Skeleton';

// Admin page to manage episodes and their video sources.
export default function AdminEpisodes() {
  const [animeSearch, setAnimeSearch] = useState('');
  const [animeResults, setAnimeResults] = useState([]);
  const [searchingAnime, setSearchingAnime] = useState(false);
  const [selectedAnime, setSelectedAnime] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [showAddEpModal, setShowAddEpModal] = useState(false);
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [editingEpisode, setEditingEpisode] = useState(null);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [saving, setSaving] = useState(false);

  const epForm = useForm({ defaultValues: { episodeNumber: '', title: '', description: '', thumbnail: '' } });
  const sourceForm = useForm({ defaultValues: { language: 'sub', server: 'MegaPlay', url: '', embed_link: '', type: 'embed' } });
  const bulkForm = useForm({ defaultValues: { anilistId: '', count: '' } });

  // Debounced search for anime to attach episodes to.
  const searchAnime = useCallback(async (query) => {
    if (!query || query.length < 2) { setAnimeResults([]); return; }
    setSearchingAnime(true);
    try {
      const res = await api.get('/admin/anime', { params: { search: query, limit: 10 } });
      const data = res.data.data || res.data;
      setAnimeResults(data.anime || data.animes || []);
    } catch (err) {
      console.error(err);
    } finally {
      setSearchingAnime(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => searchAnime(animeSearch), 300);
    return () => clearTimeout(t);
  }, [animeSearch, searchAnime]);

  // Loads episodes for the selected anime.
  const selectAnime = async (anime) => {
    const animeId = anime.id || anime._id;
    const animeWithId = { ...anime, id: animeId };
    setSelectedAnime(animeWithId);
    setAnimeResults([]);
    setAnimeSearch('');
    setLoadingEpisodes(true);
    try {
      const res = await api.get('/admin/episodes', { params: { anime_id: animeId, limit: 100 } });
      const data = res.data.data || res.data;
      setEpisodes(data.episodes || data || []);
    } catch (err) {
      console.error(err);
      setEpisodes([]);
    } finally {
      setLoadingEpisodes(false);
    }
  };

  // Creates a new episode for the selected anime.
  const addEpisode = async (data) => {
    if (!selectedAnime) return;
    setSaving(true);
    try {
      await api.post('/admin/episodes', {
        anime_id: selectedAnime.id,
        episode_number: parseInt(data.episodeNumber),
        title: data.title || `Episode ${data.episodeNumber}`,
        description: data.description || '',
        thumbnail: data.thumbnail || '',
      });
      setShowAddEpModal(false);
      epForm.reset();
      selectAnime(selectedAnime);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // Opens the add-video-source modal for an episode.
  const openSourceModal = (episode) => {
    setEditingEpisode(episode);
    sourceForm.reset({ 
      language: 'sub', 
      server: 'MegaPlay', 
      url: '', 
      embed_link: '', 
      type: 'embed' 
    });
    setShowSourceModal(true);
  };

  // Adds a video source link to the episode.
  const addSource = async (data) => {
    if (!editingEpisode) return;
    setSaving(true);
    try {
      const epId = editingEpisode.id || editingEpisode._id;
      const animeId = selectedAnime.id || selectedAnime._id;
      await api.put(`/admin/episodes/${epId}`, {
        sources: [{
          language: data.language,
          server_name: data.server,
          video_url: data.url,
          embed_link: data.embed_link || null,
          source_type: data.type
        }]
      });
      setShowSourceModal(false);
      sourceForm.reset();
      selectAnime(selectedAnime);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // Deletes an episode after user confirmation.
  const deleteEpisode = async (episode) => {
    const epId = episode.id || episode._id;
    if (!confirm('Delete this episode?')) return;
    try {
      await api.delete(`/admin/episodes/${epId}`);
      selectAnime(selectedAnime);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#f8fafc]">Manage Episodes</h1>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
          <input
            type="text"
            placeholder="Search anime to manage episodes..."
            value={animeSearch}
            onChange={(e) => setAnimeSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[#1e293b] border border-[rgba(148,163,184,0.12)] rounded-lg text-[#f8fafc] placeholder-[#94a3b8] text-sm focus:outline-none focus:border-[#0ea5e9] transition-colors"
          />
          {searchingAnime && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8] animate-spin" />}
          {animeResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-[#1e293b] border border-[rgba(148,163,184,0.12)] rounded-lg shadow-xl z-10 max-h-60 overflow-y-auto">
              {animeResults.map((a) => {
                const aid = a.id || a._id;
                return (
                  <button key={aid} onClick={() => selectAnime(a)} className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-[#334155] transition-colors text-left">
                    <img src={a.poster || a.image || 'https://via.placeholder.com/32x44?text=EP'} alt="" className="w-8 h-11 object-cover rounded" />
                    <div>
                      <span className="text-[#f8fafc] text-sm block">{a.title}</span>
                      <span className="text-[#94a3b8] text-xs">{a.episode_count || 0} episodes</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {selectedAnime && (
        <div className="bg-[#1e293b] rounded-xl border border-[rgba(148,163,184,0.12)] p-4 flex items-center gap-4">
          <img src={selectedAnime.poster || selectedAnime.image || 'https://via.placeholder.com/48x64?text=EP'} alt="" className="w-12 h-16 object-cover rounded-lg" />
          <div>
            <h3 className="font-semibold text-[#f8fafc]">{selectedAnime.title}</h3>
            <p className="text-sm text-[#94a3b8]">{episodes.length} episodes loaded</p>
          </div>
          <button onClick={() => { setShowAddEpModal(true); epForm.reset(); }} className="ml-auto flex items-center gap-2 px-4 py-2 bg-[#0ea5e9] hover:bg-[#0284c7] text-white rounded-lg font-medium text-sm transition-colors">
            <Plus className="w-4 h-4" /> Add Episode
          </button>
        </div>
      )}

      {selectedAnime && (
        loadingEpisodes ? (
          <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}</div>
        ) : episodes.length === 0 ? (
          <div className="text-center py-12 text-[#94a3b8]">No episodes found. Add episodes manually or use Anikoto Import.</div>
        ) : (
          <div className="space-y-3">
            {episodes.map((ep) => {
              const epId = ep.id || ep._id;
              const sources = ep.sources || [];
              return (
                <div key={epId} className="bg-[#1e293b] rounded-xl border border-[rgba(148,163,184,0.12)] overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-mono text-[#0ea5e9] min-w-[60px]">EP {ep.episode_number}</span>
                      <div>
                        <div className="text-[#f8fafc] font-medium">{ep.title || `Episode ${ep.episode_number}`}</div>
                        <div className="text-xs text-[#94a3b8]">{sources.length} sources</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => openSourceModal(ep)} className="flex items-center gap-1 px-3 py-1.5 bg-[#0ea5e9]/15 text-[#0ea5e9] rounded-lg text-xs font-medium hover:bg-[#0ea5e9]/25 transition-colors">
                        <Plus className="w-3 h-3" /> Source
                      </button>
                      <button onClick={() => deleteEpisode(ep)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-[#94a3b8] hover:text-red-400 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {sources.length > 0 && (
                    <div className="border-t border-[rgba(148,163,184,0.06)] px-4 py-2">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-[#94a3b8]">
                            <th className="text-left py-1 font-medium">Lang</th>
                            <th className="text-left py-1 font-medium">Server/Embed</th>
                            <th className="text-left py-1 font-medium hidden md:table-cell">Type</th>
                            <th className="text-left py-1 font-medium hidden lg:table-cell">Video URL</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sources.map((src) => (
                            <tr key={src.id || src._id} className="border-t border-[rgba(148,163,184,0.04)]">
                              <td className="py-1.5"><span className="px-2 py-0.5 rounded bg-[#0ea5e9]/15 text-[#0ea5e9] text-xs">{src.language}</span></td>
                              <td className="py-1.5 text-[#f8fafc]">{src.embed_link || src.server_name}</td>
                              <td className="py-1.5 text-[#94a3b8] hidden md:table-cell">{src.source_type}</td>
                              <td className="py-1.5 text-[#94a3b8] truncate max-w-[200px] hidden lg:table-cell">{src.video_url}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}

      <Modal isOpen={showAddEpModal} onClose={() => setShowAddEpModal(false)} title="Add Episode" size="md">
        <form onSubmit={epForm.handleSubmit(addEpisode)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[#94a3b8] mb-1">Episode Number *</label>
              <input {...epForm.register('episodeNumber', { required: true })} type="number" className="w-full px-4 py-2.5 bg-[#0f172a] border border-[rgba(148,163,184,0.12)] rounded-lg text-[#f8fafc] focus:outline-none focus:border-[#0ea5e9] transition-colors" />
            </div>
            <div>
              <label className="block text-sm text-[#94a3b8] mb-1">Title</label>
              <input {...epForm.register('title')} className="w-full px-4 py-2.5 bg-[#0f172a] border border-[rgba(148,163,184,0.12)] rounded-lg text-[#f8fafc] focus:outline-none focus:border-[#0ea5e9] transition-colors" />
            </div>
          </div>
          <div>
            <label className="block text-sm text-[#94a3b8] mb-1">Description</label>
            <textarea {...epForm.register('description')} rows={2} className="w-full px-4 py-2.5 bg-[#0f172a] border border-[rgba(148,163,184,0.12)] rounded-lg text-[#f8fafc] focus:outline-none focus:border-[#0ea5e9] transition-colors resize-none" />
          </div>
          <div>
            <label className="block text-sm text-[#94a3b8] mb-1">Thumbnail URL</label>
            <input {...epForm.register('thumbnail')} className="w-full px-4 py-2.5 bg-[#0f172a] border border-[rgba(148,163,184,0.12)] rounded-lg text-[#f8fafc] focus:outline-none focus:border-[#0ea5e9] transition-colors" />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowAddEpModal(false)} className="px-4 py-2.5 bg-[#1e293b] hover:bg-[#334155] text-[#f8fafc] rounded-lg font-medium transition-colors border border-[rgba(148,163,184,0.12)]">Cancel</button>
            <button type="submit" disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-[#0ea5e9] hover:bg-[#0ea5e9]/90 text-white rounded-lg font-medium transition-colors disabled:opacity-50">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} Add Episode
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showSourceModal} onClose={() => setShowSourceModal(false)} title="Add Video Source" size="md">
        <form onSubmit={sourceForm.handleSubmit(addSource)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[#94a3b8] mb-1">Language</label>
              <select {...sourceForm.register('language')} className="w-full px-4 py-2.5 bg-[#0f172a] border border-[rgba(148,163,184,0.12)] rounded-lg text-[#f8fafc] focus:outline-none focus:border-[#0ea5e9] transition-colors">
                <option value="sub">SUB</option>
                <option value="dub">DUB</option>
                <option value="hindi">HINDI</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-[#94a3b8] mb-1">Server</label>
              <select {...sourceForm.register('server')} className="w-full px-4 py-2.5 bg-[#0f172a] border border-[rgba(148,163,184,0.12)] rounded-lg text-[#f8fafc] focus:outline-none focus:border-[#0ea5e9] transition-colors">
                <option value="MegaPlay">MegaPlay</option>
                <option value="Streamtape">Streamtape</option>
                <option value="Vidcloud">Vidcloud</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm text-[#94a3b8] mb-1">Video URL *</label>
            <input {...sourceForm.register('url', { required: true })} className="w-full px-4 py-2.5 bg-[#0f172a] border border-[rgba(148,163,184,0.12)] rounded-lg text-[#f8fafc] placeholder-[#94a3b8] focus:outline-none focus:border-[#0ea5e9] transition-colors" placeholder="https://megaplay.buzz/stream/ani/..." />
          </div>
          <div>
            <label className="block text-sm text-[#94a3b8] mb-1">Source Type</label>
            <select {...sourceForm.register('type')} className="w-full px-4 py-2.5 bg-[#0f172a] border border-[rgba(148,163,184,0.12)] rounded-lg text-[#f8fafc] focus:outline-none focus:border-[#0ea5e9] transition-colors">
              <option value="embed">Embed (iframe)</option>
              <option value="url">Direct URL</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-[#94a3b8] mb-1">Embed Link (optional)</label>
            <input {...sourceForm.register('embed_link')} className="w-full px-4 py-2.5 bg-[#0f172a] border border-[rgba(148,163,184,0.12)] rounded-lg text-[#f8fafc] placeholder-[#94a3b8] focus:outline-none focus:border-[#0ea5e9] transition-colors" placeholder="https://megaplay.buzz/embed/..." />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowSourceModal(false)} className="px-4 py-2.5 bg-[#1e293b] hover:bg-[#334155] text-[#f8fafc] rounded-lg font-medium transition-colors border border-[rgba(148,163,184,0.12)]">Cancel</button>
            <button type="submit" disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-[#0ea5e9] hover:bg-[#0ea5e9]/90 text-white rounded-lg font-medium transition-colors disabled:opacity-50">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} Add Source
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
