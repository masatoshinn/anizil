import { create } from 'zustand';
import api from '../lib/api';

const CACHE_KEY = 'anizil_home_cache';
const CACHE_TTL = 300000;

// Reads a cached value from localStorage if it is still within the TTL
function getCached(key) {
  try {
    const raw = localStorage.getItem(`${CACHE_KEY}_${key}`);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) { localStorage.removeItem(`${CACHE_KEY}_${key}`); return null; }
    return data;
  } catch { return null; }
}
// Writes a value to localStorage with a timestamp for the cache
function setCache(key, data) {
  try { localStorage.setItem(`${CACHE_KEY}_${key}`, JSON.stringify({ data, ts: Date.now() })); } catch {}
}

// animeStore: zustand store for anime lists, current anime, episodes, and search
const useAnimeStore = create((set, get) => ({
  animeList: [],
  featured: [],
  trending: [],
  recent: [],
  genres: [],
  currentAnime: null,
  episodes: [],
  searchResults: [],
  pagination: null,

  loadingAnimeList: false,
  loadingFeatured: false,
  loadingTrending: false,
  loadingRecent: false,
  loadingGenres: false,
  loadingCurrentAnime: false,
  loadingEpisodes: false,
  loadingSearch: false,

  error: null,

  // Fetches a paginated anime list with the given filters
  fetchAnimeList: async (params = {}) => {
    set({ loadingAnimeList: true, error: null });
    try {
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append('page', params.page);
      if (params.limit) queryParams.append('limit', params.limit);
      if (params.genre) queryParams.append('genre', params.genre);
      if (params.status) queryParams.append('status', params.status);
      if (params.sort) queryParams.append('sort', params.sort);
      if (params.search) queryParams.append('search', params.search);

      const response = await api.get(`/anime?${queryParams.toString()}`);
      const res = response.data;
      const data = res.data || res;
      set({
        animeList: data.anime || data || [],
        pagination: data.pagination || null,
        loadingAnimeList: false,
      });
    } catch (error) {
      set({ loadingAnimeList: false, error: error.response?.data?.message || 'Failed to fetch anime' });
    }
  },

  // Fetches featured anime, using cache when available
  fetchFeatured: async () => {
    const cached = getCached('featured');
    if (cached) { set({ featured: cached, loadingFeatured: false }); return; }
    set({ loadingFeatured: true, error: null });
    try {
      const response = await api.get('/anime/featured');
      const res = response.data;
      const data = res.data || res;
      const featured = Array.isArray(data) ? data : (data.featured || []);
      setCache('featured', featured);
      set({ featured, loadingFeatured: false });
    } catch (error) {
      set({ featured: [], loadingFeatured: false });
    }
  },

  // Fetches trending anime, using cache when available
  fetchTrending: async () => {
    const cached = getCached('trending');
    if (cached) { set({ trending: cached, loadingTrending: false }); return; }
    set({ loadingTrending: true, error: null });
    try {
      const response = await api.get('/anime/trending');
      const res = response.data;
      const data = res.data || res;
      const trending = Array.isArray(data) ? data : (data.trending || []);
      setCache('trending', trending);
      set({ trending, loadingTrending: false });
    } catch (error) {
      set({ trending: [], loadingTrending: false });
    }
  },

  // Fetches the list of anime genres
  fetchGenres: async () => {
    set({ loadingGenres: true, error: null });
    try {
      const response = await api.get('/anime/genres');
      const res = response.data;
      const data = res.data || res;
      const genres = Array.isArray(data) ? data : (data.genres || []);
      set({ genres, loadingGenres: false });
    } catch (error) {
      set({ genres: [], loadingGenres: false });
    }
  },

  // Fetches a single anime by its slug
  fetchAnimeBySlug: async (slug) => {
    set({ loadingCurrentAnime: true, currentAnime: null, error: null });
    try {
      const response = await api.get(`/anime/${slug}`);
      const res = response.data;
      const data = res.data || res;
      set({ currentAnime: data, loadingCurrentAnime: false });
    } catch (error) {
      set({ loadingCurrentAnime: false, currentAnime: null, error: error.response?.data?.message || 'Failed to fetch anime' });
    }
  },

  // Fetches the episode list for an anime id
  fetchEpisodes: async (animeId) => {
    if (!animeId) { set({ episodes: [] }); return; }
    set({ loadingEpisodes: true, episodes: [], error: null });
    try {
      const response = await api.get(`/anime/${animeId}/episodes`);
      const res = response.data;
      const data = res.data || res;
      const episodes = Array.isArray(data) ? data : (data.episodes || []);
      set({ episodes, loadingEpisodes: false });
    } catch (error) {
      set({ episodes: [], loadingEpisodes: false });
    }
  },

  // Searches anime by query and stores the results
  searchAnime: async (query) => {
    if (!query || query.trim().length === 0) {
      set({ searchResults: [] });
      return;
    }
    set({ loadingSearch: true, error: null });
    try {
      const response = await api.get(`/search?q=${encodeURIComponent(query)}`);
      const res = response.data;
      const data = res.data || res;
      const results = Array.isArray(data) ? data : (data.anime || data.results || []);
      set({ searchResults: results, loadingSearch: false });
    } catch (error) {
      set({ searchResults: [], loadingSearch: false });
    }
  },

  clearCurrentAnime: () => set({ currentAnime: null, episodes: [] }),
  clearSearchResults: () => set({ searchResults: [] }),
  clearError: () => set({ error: null }),

  // Fetches recently updated external anime, using per-page cache when available
  fetchExternalRecent: async (page = 1) => {
    const cacheKey = `recent_${page}`;
    const cached = getCached(cacheKey);
    if (cached) { set({ recent: cached, loadingRecent: false }); return cached; }
    set({ loadingRecent: true, error: null });
    try {
      const response = await api.get(`/anime/external/recent?page=${page}&per_page=20`);
      const res = response.data;
      const data = res.data || res;
      const animeData = data.anime || data || [];
      setCache(cacheKey, animeData);
      set({ recent: animeData, loadingRecent: false });
      return animeData;
    } catch (error) {
      set({ recent: [], loadingRecent: false });
      return [];
    }
  },
}));

export default useAnimeStore;
