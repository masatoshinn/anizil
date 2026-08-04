import { create } from 'zustand';
import api from '../lib/api';

// settingsStore: zustand store holding site settings (premium, ads, free episodes)
const useSettingsStore = create((set) => ({
  premiumEnabled: true,
  adsEnabled: false,
  freeEpisodesCount: 3,
  forumEnabled: true,
  // Ad / VAST config
  adVideoUrl: '',
  vastTagUrl: '',
  adSkipSeconds: 5,
  loading: false,
  fetched: false,

  // Fetches premium/ad settings and ad video/VAST config from the admin settings endpoints
  fetchSettings: async () => {
    set({ loading: true });
    try {
      const res = await api.get('/admin/settings');
      const d = res.data.data || {};
      const patch = {
        premiumEnabled: d.premium_enabled?.value !== '0' && d.premium_enabled?.value !== false,
        adsEnabled: d.ads_enabled?.value === '1' || d.ads_enabled?.value === true,
        freeEpisodesCount: parseInt(d.free_episodes_count?.value) || 3,
        forumEnabled: d.forum_enabled?.value === undefined ? true : d.forum_enabled?.value !== '0' && d.forum_enabled?.value !== false,
        fetched: true,
        loading: false,
      };
      set(patch);
    } catch {
      set({ loading: false, fetched: true });
    }

    // Ad-specific settings (kept under ad_ prefix by backend)
    try {
      const adRes = await api.get('/admin/settings/ads');
      const ad = adRes.data?.data || adRes.data || {};
      set({
        adVideoUrl: ad.ad_videoUrl || ad.videoUrl || '',
        vastTagUrl: ad.ad_vastTagUrl || ad.vastTagUrl || '',
        adSkipSeconds: parseInt(ad.ad_skipSeconds || ad.skipSeconds) || 5,
      });
    } catch {}
  },
}));

export default useSettingsStore;
