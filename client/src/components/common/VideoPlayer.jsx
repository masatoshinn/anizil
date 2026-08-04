import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  Loader2, AlertCircle, SkipForward, RotateCcw, Gauge,
} from 'lucide-react';

// Formats a seconds value into a m:ss time string.
function formatTime(s) {
  if (!s || isNaN(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

// Lightweight VAST XML parser: returns the best MP4 media file URL
async function resolveVast(vastUrl) {
  try {
    const res = await fetch(vastUrl, { mode: 'cors' });
    if (!res.ok) throw new Error('VAST fetch failed');
    const text = await res.text();
    const xml = new DOMParser().parseFromString(text, 'application/xml');
    const mediaFiles = Array.from(xml.querySelectorAll('MediaFile'))
      .map((m) => (m.textContent || '').trim())
      .filter(Boolean);
    // Prefer mp4
    const mp4 = mediaFiles.find((u) => /\.mp4(\?|$)/i.test(u)) || mediaFiles[0];
    return mp4 || null;
  } catch {
    return null;
  }
}

// Custom video player with ads, controls, shortcuts and embed fallback.
export default function VideoPlayer({ src, type = 'file', poster, title, showAds = false, adConfig, onEnded }) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [rate, setRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSpeed, setShowSpeed] = useState(false);

  // Ad state
  const [adSrc, setAdSrc] = useState(null);
  const [adMode, setAdMode] = useState(false);
  const [adCountdown, setAdCountdown] = useState(0);
  const [adSkippable, setAdSkippable] = useState(false);

  const isEmbed = type === 'embed' || (!src) || (src && /\/(embed|stream)\b/i.test(src) && !/\.(mp4|webm|ogg|m3u8)(\?|$)/i.test(src));

  // Resolve ad before content (free users only)
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    setAdMode(false);
    setAdSrc(null);

    if (showAds && adConfig) {
      const run = async () => {
        let resolved = adConfig.videoUrl || null;
        if (adConfig.vastTagUrl && !resolved) {
          resolved = await resolveVast(adConfig.vastTagUrl);
        }
        if (!cancelled && resolved) {
          setAdSrc(resolved);
          setAdMode(true);
          setAdCountdown(adConfig.skipSeconds || 5);
          setAdSkippable(false);
        }
      };
      run();
    }
    return () => { cancelled = true; };
  }, [src, showAds, adConfig]);

  // Ad countdown
  useEffect(() => {
    if (!adMode) return;
    if (adCountdown <= 0) {
      setAdSkippable(true);
      return;
    }
    const t = setTimeout(() => setAdCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [adMode, adCountdown]);

  const activeSrc = adMode ? adSrc : src;
  const isAdPlaying = adMode && playing;

  // Control helpers
  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  }, []);

  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    setCurrentTime(v.currentTime);
    if (v.duration) setDuration(v.duration);
  };

  const handleSeek = (e) => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    v.currentTime = parseFloat(e.target.value);
    setCurrentTime(v.currentTime);
  };

  const handleVolume = (e) => {
    const v = videoRef.current;
    if (!v) return;
    const val = parseFloat(e.target.value);
    v.volume = val;
    v.muted = val === 0;
    setVolume(val);
    setMuted(val === 0);
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  const changeRate = (r) => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = r;
    setRate(r);
    setShowSpeed(false);
  };

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen?.();
  }, []);

  const skipAd = () => {
    if (!adSkippable) return;
    setAdMode(false);
    setAdSrc(null);
  };

  // Sync playing state + fullscreen
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onLoaded = () => { setLoading(false); setError(false); };
    const onErr = () => { setLoading(false); setError(true); };
    v.addEventListener('play', onPlay);
    v.addEventListener('pause', onPause);
    v.addEventListener('loadedmetadata', onLoaded);
    v.addEventListener('canplay', onLoaded);
    v.addEventListener('error', onErr);
    v.addEventListener('timeupdate', handleTimeUpdate);
    v.addEventListener('ended', () => {
      if (adMode) { skipAd(); }
      else if (onEnded) onEnded();
    });
    return () => {
      v.removeEventListener('play', onPlay);
      v.removeEventListener('pause', onPause);
      v.removeEventListener('loadedmetadata', onLoaded);
      v.removeEventListener('canplay', onLoaded);
      v.removeEventListener('error', onErr);
      v.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [adMode, onEnded]);

  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      switch (e.code) {
        case 'Space': e.preventDefault(); togglePlay(); break;
        case 'ArrowLeft': {
          const v = videoRef.current; if (v) { v.currentTime = Math.max(0, v.currentTime - 5); } break;
        }
        case 'ArrowRight': {
          const v = videoRef.current; if (v) { v.currentTime = Math.min(v.duration || 0, v.currentTime + 5); } break;
        }
        case 'KeyF': e.preventDefault(); toggleFullscreen(); break;
        case 'KeyM': toggleMute(); break;
        default: break;
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [togglePlay, toggleFullscreen]);

  // When switching from ad to content, ensure content loads
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (!adMode) {
      setLoading(true);
      v.load();
      v.play().catch(() => {});
    }
  }, [adMode]);

  // Embed fallback (iframe) — can't use native controls
  if (isEmbed) {
    return (
      <div className="relative w-full bg-black rounded-xl overflow-hidden">
        <div className="relative pb-[56.25%]">
          {loading && !error && (
            <div className="absolute inset-0 flex items-center justify-center bg-panel">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-panel gap-2">
              <AlertCircle className="w-10 h-10 text-danger" />
              <p className="text-sm text-muted">Failed to load video</p>
            </div>
          )}
          <iframe
            key={src}
            src={src}
            title={title || 'Video'}
            className={`absolute inset-0 w-full h-full border-0 ${loading ? 'opacity-0' : 'opacity-100'}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            onLoad={() => setLoading(false)}
          />
        </div>
      </div>
    );
  }

  const progress = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className="relative w-full bg-black rounded-xl overflow-hidden group select-none"
    >
      <video
        ref={videoRef}
        src={activeSrc}
        poster={poster}
        className="w-full aspect-video bg-black"
        playsInline
        onClick={togglePlay}
      />

      {/* Loading */}
      {loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 gap-2">
          <AlertCircle className="w-10 h-10 text-danger" />
          <p className="text-sm text-muted">Failed to load video</p>
        </div>
      )}

      {/* Ad overlay badge */}
      {adMode && (
        <div className="absolute top-3 left-3 z-20 flex items-center gap-2 px-2.5 py-1 rounded-md bg-black/70 text-white text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          Advertisement
        </div>
      )}

      {/* Skip ad button */}
      {adMode && (
        <button
          onClick={skipAd}
          disabled={!adSkippable}
          className={`absolute bottom-20 right-3 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            adSkippable
              ? 'bg-white text-black hover:bg-gray-200 cursor-pointer'
              : 'bg-black/60 text-white/70 cursor-not-allowed'
          }`}
        >
          <SkipForward className="w-4 h-4" />
          {adSkippable ? 'Skip Ad' : `Skip in ${adCountdown}s`}
        </button>
      )}

      {/* Center play button when paused */}
      {!playing && !loading && !error && !adMode && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/30 z-10"
        >
          <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
            <Play className="w-7 h-7 text-black ml-1" fill="currentColor" />
          </div>
        </button>
      )}

      {/* Controls bar */}
      <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/80 to-transparent px-3 pb-2 pt-8 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Progress */}
        <input
          type="range"
          min={0}
          max={duration || 0}
          step="0.1"
          value={currentTime}
          onChange={handleSeek}
          className="w-full accent-[var(--primary)] cursor-pointer"
          style={{
            background: `linear-gradient(to right, var(--primary) ${progress}%, rgba(255,255,255,0.25) ${progress}%)`,
            height: '4px', borderRadius: '9999px', appearance: 'none',
          }}
        />

        <div className="flex items-center gap-3 mt-1 text-white">
          <button onClick={togglePlay} className="hover:text-primary transition-colors">
            {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </button>

          <button onClick={toggleMute} className="hover:text-primary transition-colors">
            {muted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step="0.05"
            value={muted ? 0 : volume}
            onChange={handleVolume}
            className="w-20 accent-[var(--primary)] cursor-pointer"
          />

          <span className="text-xs tabular-nums text-white/80">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          <div className="relative ml-auto flex items-center gap-3">
            <button
              onClick={() => setShowSpeed((s) => !s)}
              className="hover:text-primary transition-colors flex items-center gap-1 text-xs"
            >
              <Gauge className="w-4 h-4" /> {rate}x
            </button>
            {showSpeed && (
              <div className="absolute bottom-9 right-0 bg-panel border border-border-custom rounded-lg p-1 shadow-xl flex flex-col min-w-[64px]">
                {[0.5, 1, 1.25, 1.5, 2].map((r) => (
                  <button
                    key={r}
                    onClick={() => changeRate(r)}
                    className={`px-3 py-1.5 text-sm rounded text-left hover:bg-panel-hover transition-colors ${rate === r ? 'text-primary' : 'text-text-muted'}`}
                  >
                    {r}x
                  </button>
                ))}
              </div>
            )}

            <button onClick={toggleFullscreen} className="hover:text-primary transition-colors">
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
