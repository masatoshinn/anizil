import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { Search, Edit, Trash2, Star, RefreshCw, Loader2, BookOpen } from 'lucide-react';
import api from '../../lib/api';
import { cn, mangaImage, getStatusColor } from '../../lib/utils';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import Skeleton from '../../components/common/Skeleton';

const defaultValues = {
  title: '', slug: '', author: '', artist: '', description: '',
  genres: '', year: '', status: 'ongoing', content_rating: '', demography: '', is_featured: false,
};

// Admin page to manage manga entries and chapters.
export default function AdminManga() {
  const [mangaList, setMangaList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingManga, setEditingManga] = useState(null);
  const [deletingManga, setDeletingManga] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [refreshing, setRefreshing] = useState(null);
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm({ defaultValues: emptyValues });
  const posterValue = watch('poster');

  // Fetches paginated manga list with search and filters.
  const fetchManga = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const res = await api.get('/manga', { params });
      const d = res.data.data || {};
      setMangaList(d.manga || []);
      setTotalPages(d.pagination?.pages || 1);
    } catch (err) {
      console.error('Failed to fetch manga:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchManga(); }, [fetchManga]);

  const statuses = ['all', 'ongoing', 'completed', 'cancelled', 'hiatus'];

  // Opens the edit modal pre-filled with manga data.
  const openEdit = (m) => {
    setEditingManga(m);
    reset({
      title: m.title || '',
      slug: m.slug || '',
      author: m.author || '',
      artist: m.artist || '',
      description: m.description || '',
      genres: typeof m.genres === 'string' ? m.genres : (Array.isArray(m.genres) ? m.genres.join(', ') : ''),
      year: m.year || '',
      status: m.status || 'ongoing',
      content_rating: m.content_rating || '',
      demography: m.demography || '',
      is_featured: !!m.is_featured,
      poster: m.poster || '',
    });
    setShowEditModal(true);
  };

  // Updates the selected manga via the API.
  const onSubmit = async (data) => {
    if (!editingManga) return;
    setSaving(true);
    try {
      await api.put(`/manga/${editingManga.id}`, {
        title: data.title,
        author: data.author,
        artist: data.artist,
        description: data.description,
        genres: data.genres,
        year: data.year ? Number(data.year) : null,
        status: data.status,
        content_rating: data.content_rating,
        demography: data.demography,
        is_featured: data.is_featured ? 1 : 0,
      });
      setShowEditModal(false);
      fetchManga();
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  // Toggles the featured flag on a manga.
  const toggleFeatured = async (m) => {
    try {
      await api.patch(`/manga/${m.id}/featured`, { is_featured: !m.is_featured });
      fetchManga();
    } catch (err) {
      console.error('Toggle failed:', err);
    }
  };

  // Triggers a chapter refresh from MangaDex.
  const handleRefresh = async (m) => {
    setRefreshing(m.id);
    try {
      await api.post(`/import/manga/${m.id}/refresh`);
      fetchManga();
    } catch (err) {
      console.error('Refresh failed:', err);
    } finally {
      setRefreshing(null);
    }
  };

  // Deletes the selected manga after confirmation.
  const handleDelete = async () => {
    if (!deletingManga) return;
    try {
      await api.delete(`/import/manga/${deletingManga.id}`);
      setShowDeleteModal(false);
      setDeletingManga(null);
      fetchManga();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-[#f8fafc]">Manage Manga</h1>
        <span className="text-sm text-[#94a3b8] flex items-center gap-1.5">
          <BookOpen className="w-4 h-4" /> {mangaList.length} shown
        </span>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
          <input
            type="text"
            placeholder="Search manga..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input-dark pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="input-dark w-full sm:w-44"
        >
          {statuses.map((s) => (
            <option key={s} value={s === 'all' ? '' : s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
        </div>
      ) : mangaList.length === 0 ? (
        <div className="text-center py-12 text-[#94a3b8]">No manga found</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[rgba(148,163,184,0.12)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#0f172a] border-b border-[rgba(148,163,184,0.12)]">
                <th className="text-left px-4 py-3 text-[#94a3b8] font-medium">Manga</th>
                <th className="text-left px-4 py-3 text-[#94a3b8] font-medium hidden md:table-cell">Status</th>
                <th className="text-left px-4 py-3 text-[#94a3b8] font-medium hidden lg:table-cell">Chapters</th>
                <th className="text-left px-4 py-3 text-[#94a3b8] font-medium hidden lg:table-cell">Rating</th>
                <th className="text-left px-4 py-3 text-[#94a3b8] font-medium hidden xl:table-cell">Featured</th>
                <th className="text-right px-4 py-3 text-[#94a3b8] font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {mangaList.map((m) => (
                <tr key={m.id} className="border-b border-[rgba(148,163,184,0.06)] hover:bg-[#334155]/50 transition-colors">
                  <td className="px-4 py-3">
                    <a href={`/manga/${m.slug}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3">
                      <img
                        src={mangaImage(m.poster) || '/placeholder-poster.png'}
                        alt={m.title}
                        className="w-10 h-14 object-cover rounded-lg flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="font-medium text-[#f8fafc] truncate max-w-[220px] hover:text-[#0ea5e9]">{m.title}</div>
                        <div className="text-xs text-[#94a3b8] truncate">{m.author || '—'}</div>
                      </div>
                    </a>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className={cn('badge', getStatusColor(m.status === 'completed' ? 'finished' : m.status))}>{m.status || '—'}</span>
                  </td>
                  <td className="px-4 py-3 text-[#f8fafc] hidden lg:table-cell">{m.chapter_count ?? '—'}</td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {(m.user_rating || m.rating) > 0 ? (
                      <div className="flex items-center gap-1 text-[#f8fafc]">
                        <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" /> {m.user_rating || m.rating}
                      </div>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 hidden xl:table-cell">
                    <button
                      onClick={() => toggleFeatured(m)}
                      className={cn(
                        'px-2.5 py-1 rounded-full text-xs font-semibold transition-colors',
                        m.is_featured ? 'bg-yellow-500/20 text-yellow-300' : 'bg-[#334155]/60 text-[#94a3b8] hover:text-[#f8fafc]'
                      )}
                      title="Toggle featured"
                    >
                      {m.is_featured ? 'Featured' : 'Set'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(m)} className="p-1.5 rounded-lg hover:bg-[#0ea5e9]/10 text-[#94a3b8] hover:text-[#0ea5e9] transition-colors" title="Edit">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleRefresh(m)} disabled={refreshing === m.id} className="p-1.5 rounded-lg hover:bg-[#22c55e]/10 text-[#94a3b8] hover:text-green-400 transition-colors" title="Refresh chapters">
                        {refreshing === m.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                      </button>
                      <button onClick={() => { setDeletingManga(m); setShowDeleteModal(true); }} className="p-1.5 rounded-lg hover:bg-red-500/10 text-[#94a3b8] hover:text-red-400 transition-colors" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />

      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Manga" size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[#94a3b8] mb-1">Title *</label>
              <input {...register('title', { required: 'Title is required' })} className="input-dark" />
              {errors.title && <p className="text-xs text-red-400 mt-1">{errors.title.message}</p>}
            </div>
            <div>
              <label className="block text-sm text-[#94a3b8] mb-1">Slug</label>
              <input {...register('slug')} disabled className="input-dark opacity-60" />
            </div>
            <div>
              <label className="block text-sm text-[#94a3b8] mb-1">Author</label>
              <input {...register('author')} className="input-dark" />
            </div>
            <div>
              <label className="block text-sm text-[#94a3b8] mb-1">Artist</label>
              <input {...register('artist')} className="input-dark" />
            </div>
            <div>
              <label className="block text-sm text-[#94a3b8] mb-1">Genres (comma-separated)</label>
              <input {...register('genres')} className="input-dark" placeholder="Action, Adventure, Drama" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-[#94a3b8] mb-1">Year</label>
                <input {...register('year')} type="number" className="input-dark" />
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
            </div>
            <div>
              <label className="block text-sm text-[#94a3b8] mb-1">Content Rating</label>
              <input {...register('content_rating')} className="input-dark" placeholder="e.g. safe, suggestive" />
            </div>
            <div>
              <label className="block text-sm text-[#94a3b8] mb-1">Demography</label>
              <input {...register('demography')} className="input-dark" placeholder="e.g. shounen, seinen" />
            </div>
          </div>

          <div>
            <label className="block text-sm text-[#94a3b8] mb-1">Description</label>
            <textarea {...register('description')} rows={3} className="input-dark resize-none" />
          </div>

          <div>
            <label className="block text-sm text-[#94a3b8] mb-1">Poster (MangaDex cover URL)</label>
            <input {...register('poster')} disabled className="input-dark opacity-60" />
            {posterValue && <img src={mangaImage(posterValue)} alt="Poster preview" className="mt-2 w-20 h-28 object-cover rounded-lg" />}
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" {...register('is_featured')} className="w-4 h-4 rounded border-[rgba(148,163,184,0.3)] bg-[#0f172a] text-[#0ea5e9]" />
            <span className="text-sm text-[#f8fafc] flex items-center gap-1.5"><Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" /> Featured</span>
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowEditModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Update
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete Manga" size="sm">
        <p className="text-[#94a3b8] mb-4">
          Are you sure you want to delete <strong className="text-[#f8fafc]">{deletingManga?.title}</strong>? This removes all chapters and cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={() => setShowDeleteModal(false)} className="btn-secondary">Cancel</button>
          <button onClick={handleDelete} className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium transition-colors">Delete</button>
        </div>
      </Modal>
    </div>
  );
}