import { create } from 'zustand';
import api from '../lib/api';

// authStore: zustand store managing authentication state, token, login/register/logout
const useAuthStore = create((set, get) => ({
  user: null,
  token: localStorage.getItem('token') || null,
  isAuthenticated: !!localStorage.getItem('token'),
  isLoading: false,
  error: null,

  // Logs the user in with email/password and stores the returned token
  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/auth/login', { email, password });
      const data = response.data.data || response.data;
      const { token, user } = data;
      localStorage.setItem('token', token);
      set({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
      return { success: true, user };
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed';
      set({ isLoading: false, error: message });
      return { success: false, message };
    }
  },

  // Registers a new user (optionally with a referral code) and stores the token
  register: async (name, email, password, referralCode) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/auth/register', { name, email, password, referralCode });
      const data = response.data.data || response.data;
      const { token, user } = data;
      localStorage.setItem('token', token);
      set({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
      return { success: true, user, emailVerificationRequired: !!data.email_verification_required };
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed';
      set({ isLoading: false, error: message });
      return { success: false, message };
    }
  },

  // Logs the user out and clears the stored token
  logout: () => {
    localStorage.removeItem('token');
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      error: null,
    });
  },

  // Fetches the current user from the token, clearing session on failure
  fetchUser: async () => {
    const { token } = get();
    if (!token) return;

    set({ isLoading: true });
    try {
      const response = await api.get('/auth/me');
      const resData = response.data;
      // Backend returns { success: true, data: { id, name, email, role, stats, ... } }
      const userData = resData.data || resData;
      set({
        user: userData,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      localStorage.removeItem('token');
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  // Initializes auth from a URL token or a stored token and loads the user
  initialize: () => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    if (urlToken) {
      localStorage.setItem('token', urlToken);
      set({ token: urlToken, isAuthenticated: true });
      window.history.replaceState({}, document.title, window.location.pathname);
      get().fetchUser();
      return;
    }
    const token = localStorage.getItem('token');
    if (token) {
      set({ token, isAuthenticated: true });
      get().fetchUser();
    }
  },

  // Clears the stored auth error
  clearError: () => set({ error: null }),
}));

export default useAuthStore;
