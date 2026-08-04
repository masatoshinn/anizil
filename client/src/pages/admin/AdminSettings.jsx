import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Save, Loader2, Settings, Palette, ToggleLeft, ToggleRight, Megaphone, Crown, LogIn } from 'lucide-react';
import api from '../../lib/api';
import { cn } from '../../lib/utils';
import useThemeStore from '../../store/themeStore';

const tabs = [
  { key: 'general', label: 'General', icon: Settings },
  { key: 'theme', label: 'Theme', icon: Palette },
  { key: 'features', label: 'Features', icon: ToggleLeft },
  { key: 'announcement', label: 'Announcement', icon: Megaphone },
  { key: 'premium', label: 'Premium', icon: Crown },
  { key: 'oauth', label: 'OAuth', icon: LogIn },
];

// Persists website settings to the server.
function saveSettings(data) {
  return api.put('/admin/settings', data);
}

// Admin page to edit general, theme, feature, and premium settings.
export default function AdminSettings() {
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const generalForm = useForm({
    defaultValues: { site_name: '', site_title: '', logo_url: '', favicon_url: '', description: '', keywords: '' },
  });
  const themeForm = useForm({
    defaultValues: { dark_mode: true, primary_color: '#0ea5e9' },
  });
  const featuresForm = useForm({
    defaultValues: { registration_enabled: true, forum_enabled: true, shop_enabled: true, maintenance_mode: false },
  });
  const announcementForm = useForm({
    defaultValues: { announcement_enabled: false, announcement_text: '' },
  });
  const premiumForm = useForm({
    defaultValues: { premium_enabled: false, free_episodes_count: 3, plan1_price: '', plan2_price: '', plan3_price: '' },
  });
  const oauthForm = useForm({
    defaultValues: { google_client_id: '', google_client_secret: '', google_redirect_url: '' },
  });

  useEffect(() => {
    // Loads all site settings and populates each form.
    const fetchSettings = async () => {
      try {
        const res = await api.get('/admin/settings');
        const d = res.data.data;
        generalForm.reset({
          site_name: d.site_name?.value || '',
          site_title: d.site_title?.value || '',
          logo_url: d.logo_url?.value || '',
          favicon_url: d.favicon_url?.value || '',
          description: d.description?.value || '',
          keywords: d.keywords?.value || '',
        });
        themeForm.reset({
          dark_mode: d.dark_mode?.value ?? true,
          primary_color: d.primary_color?.value || '#0ea5e9',
        });
        featuresForm.reset({
          registration_enabled: d.registration_enabled?.value ?? true,
          forum_enabled: d.forum_enabled?.value ?? true,
          shop_enabled: d.shop_enabled?.value ?? true,
          maintenance_mode: d.maintenance_mode?.value ?? false,
        });
        announcementForm.reset({
          announcement_enabled: d.announcement_enabled?.value ?? false,
          announcement_text: d.announcement_text?.value || '',
        });
        premiumForm.reset({
          premium_enabled: d.premium_enabled?.value ?? false,
          free_episodes_count: d.free_episodes_count?.value ?? 3,
          plan1_price: d.plan1_price?.value || '',
          plan2_price: d.plan2_price?.value || '',
          plan3_price: d.plan3_price?.value || '',
        });
        oauthForm.reset({
          google_client_id: d.google_client_id?.value || '',
          google_client_secret: d.google_client_secret?.value || '',
          google_redirect_url: d.google_redirect_url?.value || '',
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  // Saves the given settings section to the server.
  const saveSection = async (section, data) => {
    setSaving(true);
    try {
      await saveSettings(data);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center py-12 text-[#94a3b8]">Loading settings...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#f8fafc]">Website Settings</h1>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                activeTab === tab.key ? 'bg-[#0ea5e9] text-white' : 'text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#334155]'
              )}
            >
              <Icon className="w-4 h-4" /> {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'general' && (
        <form onSubmit={generalForm.handleSubmit((d) => saveSection('general', d))} className="bg-[#1e293b] rounded-xl border border-[rgba(148,163,184,0.12)] p-6 space-y-4">
          <h2 className="text-lg font-semibold text-[#f8fafc]">General Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[#94a3b8] mb-1">Site Name</label>
              <input {...generalForm.register('site_name')} className="input-dark" />
            </div>
            <div>
              <label className="block text-sm text-[#94a3b8] mb-1">Site Title</label>
              <input {...generalForm.register('site_title')} className="input-dark" />
            </div>
            <div>
              <label className="block text-sm text-[#94a3b8] mb-1">Logo URL</label>
              <input {...generalForm.register('logo_url')} className="input-dark" />
              {generalForm.watch('logo_url') && <img src={generalForm.watch('logo_url')} alt="Logo" className="mt-2 h-10" />}
            </div>
            <div>
              <label className="block text-sm text-[#94a3b8] mb-1">Favicon URL</label>
              <input {...generalForm.register('favicon_url')} className="input-dark" />
            </div>
          </div>
          <div>
            <label className="block text-sm text-[#94a3b8] mb-1">Description</label>
            <textarea {...generalForm.register('description')} rows={3} className="input-dark resize-none" />
          </div>
          <div>
            <label className="block text-sm text-[#94a3b8] mb-1">Keywords (comma-separated)</label>
            <input {...generalForm.register('keywords')} className="input-dark" />
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
            </button>
          </div>
        </form>
      )}

      {activeTab === 'theme' && (
        <form onSubmit={themeForm.handleSubmit((d) => saveSection('theme', d))} className="bg-[#1e293b] rounded-xl border border-[rgba(148,163,184,0.12)] p-6 space-y-4">
          <h2 className="text-lg font-semibold text-[#f8fafc]">Theme Settings</h2>
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#f8fafc]">Default Dark Mode</span>
            <button type="button" onClick={() => {
              const next = !themeForm.watch('dark_mode');
              themeForm.setValue('dark_mode', next);
              useThemeStore.getState().setTheme(next ? 'dark' : 'light');
            }} className={themeForm.watch('dark_mode') ? 'text-green-400' : 'text-[#94a3b8]'}>
              {themeForm.watch('dark_mode') ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
            </button>
          </div>
          <div>
            <label className="block text-sm text-[#94a3b8] mb-1">Primary Accent Color</label>
            <div className="flex items-center gap-3">
              <input type="color" {...themeForm.register('primary_color')} className="w-10 h-10 rounded-lg border-none cursor-pointer" />
              <input {...themeForm.register('primary_color')} className="input-dark flex-1" />
            </div>
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
            </button>
          </div>
        </form>
      )}

      {activeTab === 'features' && (
        <form onSubmit={featuresForm.handleSubmit((d) => saveSection('features', d))} className="bg-[#1e293b] rounded-xl border border-[rgba(148,163,184,0.12)] p-6 space-y-4">
          <h2 className="text-lg font-semibold text-[#f8fafc]">Feature Toggles</h2>
          {[
            { name: 'registration_enabled', label: 'User Registration', desc: 'Allow new users to register' },
            { name: 'forum_enabled', label: 'Forum', desc: 'Enable community forum' },
            { name: 'shop_enabled', label: 'Shop', desc: 'Enable the shop page' },
            { name: 'maintenance_mode', label: 'Maintenance Mode', desc: 'Block public access to the site' },
          ].map((feature) => (
            <div key={feature.name} className="flex items-center justify-between py-2 border-b border-[rgba(148,163,184,0.06)] last:border-0">
              <div>
                <div className="text-sm text-[#f8fafc]">{feature.label}</div>
                <div className="text-xs text-[#94a3b8]">{feature.desc}</div>
              </div>
              <button type="button" onClick={() => featuresForm.setValue(feature.name, !featuresForm.watch(feature.name))} className={featuresForm.watch(feature.name) ? 'text-green-400' : 'text-[#94a3b8]'}>
                {featuresForm.watch(feature.name) ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
              </button>
            </div>
          ))}
          <div className="flex justify-end">
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
            </button>
          </div>
        </form>
      )}

      {activeTab === 'announcement' && (
        <form onSubmit={announcementForm.handleSubmit((d) => saveSection('announcement', d))} className="bg-[#1e293b] rounded-xl border border-[rgba(148,163,184,0.12)] p-6 space-y-4">
          <h2 className="text-lg font-semibold text-[#f8fafc]">Announcement</h2>
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#f8fafc]">Show Announcement Bar</span>
            <button type="button" onClick={() => announcementForm.setValue('announcement_enabled', !announcementForm.watch('announcement_enabled'))} className={announcementForm.watch('announcement_enabled') ? 'text-green-400' : 'text-[#94a3b8]'}>
              {announcementForm.watch('announcement_enabled') ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
            </button>
          </div>
          <div>
            <label className="block text-sm text-[#94a3b8] mb-1">Announcement Text</label>
            <textarea {...announcementForm.register('announcement_text')} rows={3} className="input-dark resize-none" placeholder="Enter announcement message..." />
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
            </button>
          </div>
        </form>
      )}

      {activeTab === 'premium' && (
        <form onSubmit={premiumForm.handleSubmit((d) => saveSection('premium', d))} className="bg-[#1e293b] rounded-xl border border-[rgba(148,163,184,0.12)] p-6 space-y-4">
          <h2 className="text-lg font-semibold text-[#f8fafc]">Premium Settings</h2>

          <div className="flex items-center justify-between py-2">
            <div>
              <div className="text-sm text-[#f8fafc]">Premium Feature</div>
              <div className="text-xs text-[#94a3b8]">Enable/disable premium subscription system</div>
            </div>
            <button type="button" onClick={() => premiumForm.setValue('premium_enabled', !premiumForm.watch('premium_enabled'))} className={premiumForm.watch('premium_enabled') ? 'text-green-400' : 'text-[#94a3b8]'}>
              {premiumForm.watch('premium_enabled') ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
            </button>
          </div>

          <div>
            <label className="block text-sm text-[#94a3b8] mb-1">Free Episodes Count (before premium wall)</label>
            <input {...premiumForm.register('free_episodes_count')} type="number" min="0" className="input-dark" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-[#94a3b8] mb-1">Monthly Plan Price ($)</label>
              <input {...premiumForm.register('plan1_price')} type="number" step="0.01" className="input-dark" />
            </div>
            <div>
              <label className="block text-sm text-[#94a3b8] mb-1">Quarterly Plan Price ($)</label>
              <input {...premiumForm.register('plan2_price')} type="number" step="0.01" className="input-dark" />
            </div>
            <div>
              <label className="block text-sm text-[#94a3b8] mb-1">Yearly Plan Price ($)</label>
              <input {...premiumForm.register('plan3_price')} type="number" step="0.01" className="input-dark" />
            </div>
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
            </button>
          </div>
        </form>
      )}

      {activeTab === 'oauth' && (
        <div className="space-y-6">
          <form onSubmit={oauthForm.handleSubmit((d) => saveSection('oauth', d))} className="bg-[#1e293b] rounded-xl border border-[rgba(148,163,184,0.12)] p-6 space-y-4">
            <h2 className="text-lg font-semibold text-[#f8fafc]">Google OAuth Configuration</h2>
            <div>
              <label className="block text-sm text-[#94a3b8] mb-1">Google Client ID</label>
              <input {...oauthForm.register('google_client_id')} className="input-dark" placeholder="123456789-xxxxx.apps.googleusercontent.com" />
            </div>
            <div>
              <label className="block text-sm text-[#94a3b8] mb-1">Google Client Secret</label>
              <input {...oauthForm.register('google_client_secret')} type="password" className="input-dark" placeholder="GOCSPX-xxxxxxxxxxxx" />
            </div>
            <div>
              <label className="block text-sm text-[#94a3b8] mb-1">Redirect URL</label>
              <input {...oauthForm.register('google_redirect_url')} className="input-dark" placeholder="https://yourdomain.com/api/auth/google/callback" />
            </div>
            <div className="flex justify-end">
              <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
              </button>
            </div>
          </form>

          <div className="bg-[#1e293b] rounded-xl border border-[rgba(148,163,184,0.12)] p-6 space-y-3">
            <h3 className="text-md font-semibold text-[#f8fafc]">Google OAuth Setup Instructions</h3>
            <ol className="list-decimal list-inside text-sm text-[#94a3b8] space-y-2">
              <li>Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-[#0ea5e9] hover:underline">Google Cloud Console</a></li>
              <li>Create a new project or select an existing one</li>
              <li>Go to <strong>APIs &amp; Services &gt; Credentials</strong></li>
              <li>Click <strong>Create Credentials &gt; OAuth Client ID</strong></li>
              <li>Set Application type to <strong>Web Application</strong></li>
              <li>Add <strong>Authorized redirect URIs</strong>: <code className="text-[#f8fafc] bg-[#0f172a] px-1 rounded">{oauthForm.watch('google_redirect_url') || 'https://yourdomain.com/api/auth/google/callback'}</code></li>
              <li>Copy the <strong>Client ID</strong> and <strong>Client Secret</strong> and paste them above</li>
              <li>Also set these in your <code className="text-[#f8fafc] bg-[#0f172a] px-1 rounded">.env</code> file:
                <pre className="mt-2 bg-[#0f172a] p-3 rounded-lg text-xs">
                  {`GOOGLE_CLIENT_ID=your_client_id_here\nGOOGLE_CLIENT_SECRET=your_client_secret_here\nGOOGLE_CALLBACK_URL=https://yourdomain.com/api/auth/google/callback`}
                </pre>
              </li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
