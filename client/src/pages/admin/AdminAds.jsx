import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Save, Eye, Loader2, ToggleLeft, ToggleRight, Film, Skull } from 'lucide-react';
import api from '../../lib/api';
import { cn } from '../../lib/utils';

const defaultValues = {
  enabled: false,
  publisherTagId: '',
  zoneHomepage: '',
  zoneBelowPlayer: '',
  zoneSidebar: '',
  zoneStickyBottom: '',
  // VAST / video-player ad pre-roll
  vastTagUrl: '',
  videoUrl: '',
  skipSeconds: 5,
};

// Admin page to configure HilltopAds and video ad settings.
export default function AdminAds() {
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const { register, handleSubmit, watch, setValue, reset } = useForm({ defaultValues });

  const enabled = watch('enabled');
  const zoneHomepage = watch('zoneHomepage');
  const zoneBelowPlayer = watch('zoneBelowPlayer');
  const zoneSidebar = watch('zoneSidebar');
  const zoneStickyBottom = watch('zoneStickyBottom');
  const vastTagUrl = watch('vastTagUrl');
  const videoUrl = watch('videoUrl');

  useEffect(() => {
    // Loads current ad settings and populates the form.
    const fetchSettings = async () => {
      try {
        const res = await api.get('/admin/settings/ads');
        const d = res.data?.data || res.data;
        reset({
          enabled: d.ad_enabled ?? d.enabled ?? false,
          publisherTagId: d.ad_publisherTagId || d.publisherTagId || '',
          zoneHomepage: d.ad_zoneHomepage || d.zoneHomepage || '',
          zoneBelowPlayer: d.ad_zoneBelowPlayer || d.zoneBelowPlayer || '',
          zoneSidebar: d.ad_zoneSidebar || d.zoneSidebar || '',
          zoneStickyBottom: d.ad_zoneStickyBottom || d.zoneStickyBottom || '',
          vastTagUrl: d.ad_vastTagUrl || d.vastTagUrl || '',
          videoUrl: d.ad_videoUrl || d.videoUrl || '',
          skipSeconds: parseInt(d.ad_skipSeconds || d.skipSeconds) || 5,
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [reset]);

  // Saves the configured ad settings to the server.
  const onSave = async (data) => {
    setSaving(true);
    try {
      await api.put('/admin/settings/ads', data);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const zones = [
    { name: 'zoneHomepage', label: 'Homepage Hero', size: '728x90', value: zoneHomepage },
    { name: 'zoneBelowPlayer', label: 'Watch Below Player', size: '728x90', value: zoneBelowPlayer },
    { name: 'zoneSidebar', label: 'Watch Sidebar', size: '300x250', value: zoneSidebar },
    { name: 'zoneStickyBottom', label: 'Sticky Bottom', size: 'Full Width', value: zoneStickyBottom },
  ];

  if (loading) return <div className="text-center py-12 text-muted">Loading settings...</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-text-primary">HilltopAds Settings</h1>

      <form onSubmit={handleSubmit(onSave)} className="space-y-6">
        <div className="bg-panel rounded-xl border border-border-custom p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-text-primary">HilltopAds</h2>
              <p className="text-sm text-muted">Enable or disable ads across the site</p>
            </div>
            <button
              type="button"
              onClick={() => setValue('enabled', !enabled)}
              className={cn('transition-colors', enabled ? 'text-green-400' : 'text-muted')}
            >
              {enabled ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
            </button>
          </div>

          <div>
            <label className="block text-sm text-muted mb-1">Publisher Tag ID</label>
            <input {...register('publisherTagId')} className="input-dark" placeholder="Enter your HilltopAds publisher tag ID" />
          </div>
        </div>

        <div className="bg-panel rounded-xl border border-border-custom p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Zone IDs</h2>
          <div className="space-y-4">
            {zones.map((zone) => (
              <div key={zone.name} className="flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="flex-1">
                  <label className="block text-sm text-text-primary mb-1">{zone.label} <span className="text-muted">({zone.size})</span></label>
                  <input {...register(zone.name)} className="input-dark" placeholder={`Zone ID for ${zone.label}`} />
                </div>
                {zone.value && (
                  <button
                    type="button"
                    onClick={() => window.open(`https://hilltopads.com/zone/${zone.value}`, '_blank')}
                    className="self-end p-2 rounded-lg hover:bg-panel-hover text-muted hover:text-primary transition-colors"
                    title="Preview zone"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* VAST / Video Player Ad Pre-roll */}
        <div className="bg-panel rounded-xl border border-border-custom p-6">
          <div className="flex items-center gap-2 mb-1">
            <Film className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-text-primary">Video Player Ads (VAST / Pre-roll)</h2>
          </div>
          <p className="text-sm text-muted mb-4">
            Show an advertisement before the video plays. Free-tier users only — premium users stay ad-free.
            Provide either a VAST tag URL or a direct video file.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-text-primary mb-1">VAST Tag URL</label>
              <input {...register('vastTagUrl')} className="input-dark" placeholder="https://ads.example.com/vast.xml" />
              <p className="text-xs text-muted mt-1">VAST XML is fetched and the MP4 media file is played as a pre-roll.</p>
            </div>

            <div>
              <label className="block text-sm text-text-primary mb-1">Direct Ad Video URL (MP4)</label>
              <input {...register('videoUrl')} className="input-dark" placeholder="https://cdn.example.com/ad.mp4" />
              <p className="text-xs text-muted mt-1">Used directly if no VAST tag is provided (most reliable).</p>
            </div>

            <div className="flex items-center gap-3">
              <label className="block text-sm text-text-primary mb-1">Skip after (seconds)</label>
              <input
                type="number"
                min={0}
                {...register('skipSeconds', { valueAsNumber: true })}
                className="input-dark w-28"
              />
            </div>
          </div>
        </div>

        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-sm text-blue-300">
          Note: Premium users will see an ad-free experience. Ads are only shown to free-tier users.
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Settings
          </button>
        </div>
      </form>
    </div>
  );
}
