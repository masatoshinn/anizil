import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { Plus, Edit, Trash2, BookOpen, ExternalLink, Loader2, ListVideo, PenLine } from 'lucide-react';
import api from '../../lib/api';
import { cn, mangaImage, getStatusColor } from '../../lib/utils';
import Modal from '../../components/common/Modal';
import Skeleton from '../../components/common/Skeleton';
import toast from 'react-hot-toast';

const emptyValues = {
  title: '', author: '', artist: '', description: '', poster: '',
  genres: '', year: '', status: 'ongoing', content_rating: '', demography: '',
};

// Creator page to create, edit, and manage their manga and chapters.
export default function CreatorManga() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [access, setAccess] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [saving, setSaving] = useState(false);

  // chapters
  const [showChapters, setShowChapters] = useState(false);
  const [chaptersManga, setChaptersManga] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [showAddChapter, setShowAddChapter] = useState(false);

  const { register, handleSubmit, reset } = useForm({ defaultValues: emptyValues });

  // Fetches the creator's own manga list.
  const fetchManga = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/creator/manga');
      setList(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch creator manga:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    api.get('/creator/can').then((r) => setAccess(r.data.data?.can))
      .catch(() => setAccess(false));
    fetchManga();
  }, [fetchManga]);

  useEffect(() => {
    if (searchParams.get('create') === '1') {
      openCreate();
      setSearchParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Opens the create-manga form with blank values.
  const openCreate = () => {
    setEditing(null);
    reset(emptyValues);
    setShowForm(true);
  };

  // Opens the edit form pre-filled with manga data.
  const openEdit = (m) => {
    setEditing(m);
    reset({
      title: m.title || '',
      author: m.author || '',
      artist: m.artist || '',
      description: m.description || '',
      poster: m.poster || '',
      genres: typeof m.genres === 'string' ? m.genres : (Array.isArray(m.genres) ? m.genres.join(', ') : ''),
      year: m.year || '',
      status: m.status || 'ongoing',
      content_rating: m.content_rating || '',
      demography: m.demography || '',
    });
    setShowForm(true);
  };

  // Creates or updates manga via the creator API.
  const onSubmit = async (data) => {
    setSaving(true);
    try {
      const payload = {
        title: data.title,
        author: data.author,
        artist: data.artist,
        description: data.description,
        poster: data.poster,
        genres: data.genres,
        year: data.year ? Number(data.year) : null,
        status: data.status,
        content_rating: data.content_rating,
        demography: data.demography,
      };
      if (editing) {
        await api.put(`/creator/manga/${editing.id}`, payload);
        toast.success('Manga updated');
      } else {
        await api.post('/creator/manga', payload);
        toast.success('Manga created');
      }
      setShowForm(false);
      fetchManga();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  // Deletes the selected manga after confirmation.
  const handleDelete = async () => {
    if (!deleting) return;
    setSaving(true);
    try {
      await api.delete(`/creator/manga/${deleting.id}`);
      toast.success('Manga deleted');
      setDeleting(null);
      fetchManga();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    } finally {
      setSaving(false);
    }
  };

  // Loads and opens the chapters modal for a manga.
  const openChapters = async (m) => {
    setChaptersManga(m);
    setShowChapters(true);
    setLoadingChapters(true);
    try {
      const res = await api.get(`/creator/manga/${m.id}/chapters`);
      setChapters(res.data.data || []);
    } catch {
      toast.error('Failed to load chapters');
    } finally {
      setLoadingChapters(false);
    }
  };

  // Adds a new chapter to the selected manga.
  const addChapter = async (data) => {
    if (!chaptersManga) return;
    setSaving(true);
    try {
      const res = await api.post(`/creator/manga/${chaptersManga.id}/chapters`, {
        chapter_number: data.chapter_number,
        title: data.title,
        external_url: data.external_url,
      });
      setChapters(res.data.data || []);
      setShowAddChapter(false);
      toast.success('Chapter added');
      fetchManga();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add chapter');
    } finally {
      setSaving(false);
    }
  };

  // Deletes a chapter from the selected manga.
  const deleteChapter = async (ch) => {
    if (!chaptersManga) return;
    try {
      await api.delete(`/creator/manga/${chaptersManga.id}/chapters/${ch.id}`);
      setChapters(prev => prev.filter(c => c.id !== ch.id));
      toast.success('Chapter deleted');
      fetchManga();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete chapter');
    }
  };

  if (loading) {
    return (
      <div className="space-y-3 max-w-7xl mx-auto px-4 py-8">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
      </div>
    );
  }

  if (!access) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <div className="text-4xl mb-4">🔒</div>
        <h1 className="text-2xl font-bold text-[#f8fafc] mb-2">Creator Studio</h1>
        <p className="text-[#94a3b8]">You need the <strong className="text-[#0ea5e9]">Creator</strong> role to create and manage manga.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#f8fafc] flex items-center gap-2">
            <PenLine className="w-6 h-6 text-[#0ea5e9]" /> Creator Studio
          </h1>
          <p className="text-sm text-[#94a3b8] mt-1">Create and manage your own manga.</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Manga
        </button>
      </div>

      {list.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-[rgba(148,163,184,0.2)] rounded-2xl">
          <BookOpen className="w-10 h-10 mx-auto text-[#334155] mb-3" />
          <p className="text-[#94a3b8]">You haven't created any manga yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {list.map((m) => (
            <motion.div key={m.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="group bg-[#1e293b]/50 border border-[rgba(148,163,184,0.12)] rounded-xl overflow-hidden flex flex-col">
              <div className="relative aspect-[2/3] w-full overflow-hidden bg-[#0f172a]">
                <img
                  src={mangaImage(m.poster) || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.title || 'M')}&background=0ea5e9&color=fff`}
                  alt={m.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <span className={cn('absolute top-2 left-2 badge', getStatusColor(m.status))}>
                  {m.status || 'ongoing'}
                </span>
              </div>
              <div className="p-3 flex flex-col gap-2 flex-1">
                <h3 className="font-semibold text-[#f8fafc] text-sm truncate">{m.title}</h3>
                <div className="text-xs text-[#94a3b8]">
                  {m.chapter_count || 0} chapter{(m.chapter_count || 0) === 1 ? '' : 's'}
                </div>
                <div className="flex items-center gap-1.5 mt-auto">
                  <button onClick={() => openChapters(m)} className="btn-secondary flex-1 !py-1 text-xs flex items-center justify-center gap-1">
                    <ListVideo className="w-3.5 h-3.5" /> Chapters
                  </button>
                  <button onClick={() => openEdit(m)} className="p-1.5 rounded-lg hover:bg-[#0ea5e9]/10 text-[#94a3b8] hover:text-[#0ea5e9] transition-colors" title="Edit">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => setDeleting(m)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-[#94a3b8] hover:text-red-400 transition-colors" title="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create / Edit modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editing ? `Edit ${editing.title}` : 'Create Manga'} size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm text-[#94a3b8] mb-1">Title *</label>
              <input {...register('title')} className="input-dark" placeholder="Manga title" />
            </div>
            <div>
              <label className="block text-sm text-[#94a3b8] mb-1">Author</label>
              <input {...register('author')} className="input-dark" placeholder="Author name" />
            </div>
            <div>
              <label className="block text-sm text-[#94a3b8] mb-1">Artist</label>
              <input {...register('artist')} className="input-dark" placeholder="Artist name" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm text-[#94a3b8] mb-1">Poster URL</label>
              <input {...register('poster')} className="input-dark" placeholder="https://..." />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm text-[#94a3b8] mb-1">Description</label>
              <textarea {...register('description')} rows={4} className="input-dark" placeholder="Synopsis..." />
            </div>
            <div>
              <label className="block text-sm text-[#94a3b8] mb-1">Genres</label>
              <input {...register('genres')} className="input-dark" placeholder="Comma separated" />
            </div>
            <div>
              <label className="block text-sm text-[#94a3b8] mb-1">Status</label>
              <select {...register('status')} className="input-dark">
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
                <option value="hiatus">Hiatus</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-[#94a3b8] mb-1">Content Rating</label>
              <select {...register('content_rating')} className="input-dark">
                <option value="">Select</option>
                <option value="safe">Safe</option>
                <option value="suggestive">Suggestive</option>
                <option value="erotica">Erotica</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-[#94a3b8] mb-1">Demography</label>
                <input {...register('demography')} className="input-dark" placeholder="e.g. shounen" />
              </div>
              <div>
                <label className="block text-sm text-[#94a3b8] mb-1">Year</label>
                <input {...register('year')} type="number" className="input-dark" placeholder="2026" />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} {editing ? 'Save Changes' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete confirm */}
      <Modal isOpen={!!deleting} onClose={() => setDeleting(null)} title="Delete Manga" size="sm">
        <div className="space-y-4">
          <p className="text-[#94a3b8]">
            Delete <strong className="text-[#f8fafc]">{deleting?.title}</strong>? This removes it and all chapters. This cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setDeleting(null)} className="btn-secondary">Cancel</button>
            <button onClick={handleDelete} disabled={saving} className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium transition-colors flex items-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} Delete
            </button>
          </div>
        </div>
      </Modal>

      {/* Chapters modal */}
      <Modal isOpen={showChapters} onClose={() => setShowChapters(false)} title={`Chapters - ${chaptersManga?.title || ''}`} size="lg">
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => { reset({ chapter_number: '', title: '', external_url: '' }); setShowAddChapter(true); }} className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add Chapter
            </button>
          </div>

          {loadingChapters ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}</div>
          ) : chapters.length === 0 ? (
            <p className="text-center text-[#94a3b8] py-8">No chapters yet. Add a chapter with an external link (e.g. PDF, slide deck, or your hosted reader).</p>
          ) : (
            <div className="space-y-2">
              {chapters.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-[rgba(148,163,184,0.12)] bg-[#0f172a]/50">
                  <div className="min-w-0">
                    <div className="text-sm text-[#f8fafc] font-medium truncate">
                      Ch. {c.chapter_number || '?'}{c.title ? ` - ${c.title}` : ''}
                    </div>
                    <a href={c.external_url} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-[#0ea5e9] truncate inline-flex items-center gap-1 hover:underline">
                      <ExternalLink className="w-3 h-3" /> {c.external_url}
                    </a>
                  </div>
                  <button onClick={() => deleteChapter(c)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-[#94a3b8] hover:text-red-400 transition-colors shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* Add chapter modal */}
      <Modal isOpen={showAddChapter} onClose={() => setShowAddChapter(false)} title="Add Chapter" size="md">
        <form onSubmit={handleSubmit(addChapter)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[#94a3b8] mb-1">Chapter Number</label>
              <input {...register('chapter_number')} className="input-dark" placeholder="e.g. 1" />
            </div>
            <div>
              <label className="block text-sm text-[#94a3b8] mb-1">Title</label>
              <input {...register('title')} className="input-dark" placeholder="Optional" />
            </div>
          </div>
          <div>
            <label className="block text-sm text-[#94a3b8] mb-1">External Link *</label>
            <input {...register('external_url')} className="input-dark" placeholder="https://..." />
            <p className="text-xs text-[#64748b] mt-1">Link where readers can access this chapter's content.</p>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowAddChapter(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} Add
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}