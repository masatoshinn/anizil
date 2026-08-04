import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import {
  Search, Plus, Edit, Trash2, Eye, Star, Calendar,
  Image as ImageIcon, ChevronDown, Loader2
} from 'lucide-react';
import api from '../../lib/api';
import { cn, formatDate, getStatusColor } from '../../lib/utils';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import Skeleton from '../../components/common/Skeleton';

const defaultAnimeValues = {
  title: '', slug: '', series: '', season: '', description: '',
  poster: '', banner: '', genres: '', studio: '', rating: '',
  malScore: '', year: '', duration: '', language: 'sub',
  status: 'upcoming', broadcastDay: '', broadcastTime: '',
  featured: false, premium: false,
};

// Converts a title into a URL-friendly slug.
function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// Admin page to list, create, edit, and delete anime.
export default function AdminAnime() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [animeList, setAnimeList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingAnime, setEditingAnime] = useState(null);
  const [deletingAnime, setDeletingAnime] = useState(null);
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm({
    defaultValues: defaultAnimeValues,
  });

  const titleValue = watch('title');
  const posterValue = watch('poster');
  const bannerValue = watch('banner');

  useEffect(() => {
    if (searchParams.get('add') === 'true') {
      setShowAddModal(true);
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  // Fetches paginated anime list with search and status filters.
  const fetchAnime = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const res = await api.get('/admin/anime', { params });
      const d = res.data.data || res.data;
      setAnimeList(d.anime || d.animes || []);
      setTotalPages(d.pagination?.pages || d.totalPages || 1);
    } catch (err) {
      console.error('Failed to fetch anime:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchAnime(); }, [fetchAnime]);

  useEffect(() => {
    if (titleValue && !editingAnime) {
      setValue('slug', slugify(titleValue));
    }
  }, [titleValue, editingAnime, setValue]);

  // Opens the add-anime modal with blank form values.
  const openAddModal = () => {
    setEditingAnime(null);
    reset(defaultAnimeValues);
    setShowAddModal(true);
  };

  // Opens the edit modal pre-filled with anime data.
  const openEditModal = (anime) => {
    setEditingAnime(anime);
    reset({
      title: anime.title || '',
      slug: anime.slug || '',
      series: anime.series || '',
      season: anime.season || '',
      description: anime.description || '',
      poster: anime.poster || anime.image || '',
      banner: anime.banner || '',
      genres: Array.isArray(anime.genres) ? anime.genres.join(', ') : (anime.genres || ''),
      studio: anime.studio || '',
      rating: anime.rating || '',
      malScore: anime.malScore || anime.mal_score || '',
      year: anime.year || anime.releaseYear || '',
      duration: anime.duration || '',
      language: anime.language || 'sub',
      status: anime.status || 'upcoming',
      broadcastDay: anime.broadcastDay || '',
      broadcastTime: anime.broadcastTime || '',
      featured: anime.featured || false,
      premium: anime.premium || false,
    });
    setShowAddModal(true);
  };

  // Creates or updates an anime via the admin API.
  const onSubmit = async (data) => {
    setSaving(true);
    try {
      const payload = {
        ...data,
        genres: data.genres.split(',').map(g => g.trim()).filter(Boolean),
        rating: data.rating ? Number(data.rating) : undefined,
        malScore: data.malScore ? Number(data.malScore) : undefined,
        year: data.year ? Number(data.year) : undefined,
      };

      const snakePayload = {
        title: payload.title,
        slug: payload.slug,
        series_title: payload.series,
        season: payload.season,
        description: payload.description,
        poster: payload.poster,
        banner: payload.banner,
        genres: payload.genres,
        studio: payload.studio,
        rating: payload.rating,
        mal_score: payload.malScore,
        release_year: payload.year,
        duration: payload.duration,
        language: payload.language,
        status: payload.status,
        broadcast_day: payload.broadcastDay,
        broadcast_time: payload.broadcastTime,
        is_featured: payload.featured,
        is_premium: payload.premium,
      };

      if (editingAnime) {
        await api.put(`/admin/anime/${editingAnime.id}`, snakePayload);
      } else {
        await api.post('/admin/anime', snakePayload);
      }
      setShowAddModal(false);
      fetchAnime();
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  // Deletes the selected anime after confirmation.
  const handleDelete = async () => {
    if (!deletingAnime) return;
    try {
      await api.delete(`/admin/anime/${deletingAnime.id}`);
      setShowDeleteModal(false);
      setDeletingAnime(null);
      fetchAnime();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const statuses = ['all', 'ongoing', 'finished', 'upcoming', 'hiatus'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-[#f8fafc]">Manage Anime</h1>
        <button onClick={openAddModal} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Anime
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
          <input
            type="text"
            placeholder="Search anime..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input-dark pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="input-dark w-full sm:w-40"
        >
          {statuses.map((s) => (
            <option key={s} value={s === 'all' ? '' : s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      ) : animeList.length === 0 ? (
        <div className="text-center py-12 text-[#94a3b8]">No anime found</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[rgba(148,163,184,0.12)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#0f172a] border-b border-[rgba(148,163,184,0.12)]">
                <th className="text-left px-4 py-3 text-[#94a3b8] font-medium">Anime</th>
                <th className="text-left px-4 py-3 text-[#94a3b8] font-medium hidden md:table-cell">Status</th>
                <th className="text-left px-4 py-3 text-[#94a3b8] font-medium hidden lg:table-cell">Episodes</th>
                <th className="text-left px-4 py-3 text-[#94a3b8] font-medium hidden lg:table-cell">Rating</th>
                <th className="text-left px-4 py-3 text-[#94a3b8] font-medium hidden xl:table-cell">Year</th>
                <th className="text-right px-4 py-3 text-[#94a3b8] font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {animeList.map((anime) => (
                <tr key={anime.id} className="border-b border-[rgba(148,163,184,0.06)] hover:bg-[#334155]/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={anime.poster || anime.image || '/placeholder.jpg'}
                        alt={anime.title}
                        className="w-10 h-14 object-cover rounded-lg flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="font-medium text-[#f8fafc] truncate max-w-[200px]">{anime.title}</div>
                        <div className="text-xs text-[#94a3b8]">{anime.studio || '—'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className={cn('badge', getStatusColor(anime.status))}>{anime.status}</span>
                  </td>
                  <td className="px-4 py-3 text-[#f8fafc] hidden lg:table-cell">{anime.episodeCount ?? anime.episodes ?? '—'}</td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <div className="flex items-center gap-1 text-[#f8fafc]">
                      <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                      {anime.rating || anime.malScore || '—'}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[#94a3b8] hidden xl:table-cell">{anime.year || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEditModal(anime)} className="p-1.5 rounded-lg hover:bg-[#0ea5e9]/10 text-[#94a3b8] hover:text-[#0ea5e9] transition-colors">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => { setDeletingAnime(anime); setShowDeleteModal(true); }} className="p-1.5 rounded-lg hover:bg-red-500/10 text-[#94a3b8] hover:text-red-400 transition-colors">
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

      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title={editingAnime ? 'Edit Anime' : 'Add Anime'} size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[#94a3b8] mb-1">Title *</label>
              <input {...register('title', { required: 'Title is required' })} className="input-dark" />
              {errors.title && <p className="text-xs text-red-400 mt-1">{errors.title.message}</p>}
            </div>
            <div>
              <label className="block text-sm text-[#94a3b8] mb-1">Slug</label>
              <input {...register('slug')} className="input-dark" />
            </div>
            <div>
              <label className="block text-sm text-[#94a3b8] mb-1">Series Title</label>
              <input {...register('series')} className="input-dark" />
            </div>
            <div>
              <label className="block text-sm text-[#94a3b8] mb-1">Season</label>
              <input {...register('season')} className="input-dark" placeholder="e.g. Season 1" />
            </div>
          </div>

          <div>
            <label className="block text-sm text-[#94a3b8] mb-1">Description</label>
            <textarea {...register('description')} rows={3} className="input-dark resize-none" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[#94a3b8] mb-1">Poster URL</label>
              <input {...register('poster')} className="input-dark" />
              {posterValue && <img src={posterValue} alt="Poster preview" className="mt-2 w-20 h-28 object-cover rounded-lg" />}
            </div>
            <div>
              <label className="block text-sm text-[#94a3b8] mb-1">Banner URL</label>
              <input {...register('banner')} className="input-dark" />
              {bannerValue && <img src={bannerValue} alt="Banner preview" className="mt-2 w-full h-20 object-cover rounded-lg" />}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[#94a3b8] mb-1">Genres (comma-separated)</label>
              <input {...register('genres')} className="input-dark" placeholder="Action, Comedy, Drama" />
            </div>
            <div>
              <label className="block text-sm text-[#94a3b8] mb-1">Studio</label>
              <input {...register('studio')} className="input-dark" />
            </div>
            <div>
              <label className="block text-sm text-[#94a3b8] mb-1">Rating</label>
              <input {...register('rating')} type="number" step="0.1" min="0" max="10" className="input-dark" />
            </div>
            <div>
              <label className="block text-sm text-[#94a3b8] mb-1">MAL Score</label>
              <input {...register('malScore')} type="number" step="0.1" min="0" max="10" className="input-dark" />
            </div>
            <div>
              <label className="block text-sm text-[#94a3b8] mb-1">Release Year</label>
              <input {...register('year')} type="number" className="input-dark" />
            </div>
            <div>
              <label className="block text-sm text-[#94a3b8] mb-1">Duration (min)</label>
              <input {...register('duration')} className="input-dark" placeholder="e.g. 24" />
            </div>
            <div>
              <label className="block text-sm text-[#94a3b8] mb-1">Language</label>
              <select {...register('language')} className="input-dark">
                <option value="sub">SUB</option>
                <option value="dub">DUB</option>
                <option value="both">Both</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-[#94a3b8] mb-1">Status</label>
              <select {...register('status')} className="input-dark">
                <option value="upcoming">Upcoming</option>
                <option value="ongoing">Ongoing</option>
                <option value="finished">Finished</option>
                <option value="hiatus">Hiatus</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-[#94a3b8] mb-1">Broadcast Day</label>
              <input {...register('broadcastDay')} className="input-dark" placeholder="e.g. Monday" />
            </div>
            <div>
              <label className="block text-sm text-[#94a3b8] mb-1">Broadcast Time</label>
              <input {...register('broadcastTime')} className="input-dark" placeholder="e.g. 17:00 JST" />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" {...register('featured')} className="w-4 h-4 rounded border-[rgba(148,163,184,0.3)] bg-[#0f172a] text-[#0ea5e9] focus:ring-[#0ea5e9]" />
              <span className="text-sm text-[#f8fafc]">Featured</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" {...register('premium')} className="w-4 h-4 rounded border-[rgba(148,163,184,0.3)] bg-[#0f172a] text-[#0ea5e9] focus:ring-[#0ea5e9]" />
              <span className="text-sm text-[#f8fafc]">Premium</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingAnime ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete Anime" size="sm">
        <p className="text-[#94a3b8] mb-4">
          Are you sure you want to delete <strong className="text-[#f8fafc]">{deletingAnime?.title}</strong>? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={() => setShowDeleteModal(false)} className="btn-secondary">Cancel</button>
          <button onClick={handleDelete} className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium transition-colors">
            Delete
          </button>
        </div>
      </Modal>
    </div>
  );
}
