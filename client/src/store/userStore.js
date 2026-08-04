import { create } from 'zustand';
import api from '../lib/api';

// Extracts the relevant payload array/object from a normalized API response
function extractData(response) {
  const res = response.data;
  return res.data || res.watchlist || res.history || res.notifications || res.achievements || res.profile || res;
}

// userStore: zustand store for the user's profile, watchlist, history, notifications, and achievements
const useUserStore = create((set) => ({
  profile: null,
  watchlist: [],
  history: [],
  notifications: [],
  achievements: [],

  loadingProfile: false,
  loadingWatchlist: false,
  loadingHistory: false,
  loadingNotifications: false,
  loadingAchievements: false,

  error: null,

  // Fetches the current user's profile
  fetchProfile: async () => {
    set({ loadingProfile: true, error: null });
    try {
      const response = await api.get('/user/profile');
      set({ profile: extractData(response), loadingProfile: false });
    } catch (error) {
      set({ loadingProfile: false, error: error.response?.data?.message || 'Failed to fetch profile' });
    }
  },

  // Fetches the user's watchlist
  fetchWatchlist: async () => {
    set({ loadingWatchlist: true, error: null });
    try {
      const response = await api.get('/user/watchlist');
      set({ watchlist: extractData(response), loadingWatchlist: false });
    } catch (error) {
      set({ loadingWatchlist: false, error: error.response?.data?.message || 'Failed to fetch watchlist' });
    }
  },

  // Adds or updates an anime in the user's watchlist
  addToWatchlist: async (animeId, status = 'watching') => {
    try {
      const response = await api.post('/user/watchlist', { animeId, status });
      return { success: true };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Failed' };
    }
  },

  // Removes an anime from the user's watchlist
  removeFromWatchlist: async (animeId) => {
    try {
      await api.delete(`/user/watchlist/${animeId}`);
      return { success: true };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Failed' };
    }
  },

  // Fetches the user's watch history
  fetchHistory: async () => {
    set({ loadingHistory: true, error: null });
    try {
      const response = await api.get('/user/history');
      set({ history: extractData(response), loadingHistory: false });
    } catch (error) {
      set({ loadingHistory: false, error: error.response?.data?.message || 'Failed to fetch history' });
    }
  },

  // Records or updates watch history progress for an episode
  addToHistory: async (animeId, episodeId, progress = 0) => {
    try {
      await api.post('/user/history', { animeId, episodeId, progress });
      return { success: true };
    } catch (error) {
      return { success: false };
    }
  },

  // Clears the user's entire watch history
  clearHistory: async () => {
    try {
      await api.delete('/user/history');
      set({ history: [] });
      return { success: true };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Failed' };
    }
  },

  // Fetches the user's notifications
  fetchNotifications: async () => {
    set({ loadingNotifications: true, error: null });
    try {
      const response = await api.get('/user/notifications');
      set({ notifications: extractData(response), loadingNotifications: false });
    } catch (error) {
      set({ loadingNotifications: false, error: error.response?.data?.message || 'Failed' });
    }
  },

  // Marks all user notifications as read
  markNotificationsRead: async () => {
    try {
      await api.put('/user/notifications/read');
      set((state) => ({
        notifications: Array.isArray(state.notifications)
          ? state.notifications.map((n) => ({ ...n, is_read: 1 }))
          : [],
      }));
      return { success: true };
    } catch (error) {
      return { success: false };
    }
  },

  // Fetches the user's achievements
  fetchAchievements: async () => {
    set({ loadingAchievements: true, error: null });
    try {
      const response = await api.get('/user/achievements');
      set({ achievements: extractData(response), loadingAchievements: false });
    } catch (error) {
      set({ loadingAchievements: false, error: error.response?.data?.message || 'Failed to fetch achievements' });
    }
  },

  // Clears the stored error state
  clearError: () => set({ error: null }),
}));

export default useUserStore;
