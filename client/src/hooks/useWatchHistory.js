import { useEffect, useRef, useCallback } from 'react';
import useUserStore from '../store/userStore';

// useWatchHistory: tracks video playback progress and saves it throttled to watch history
export default function useWatchHistory(animeId, episodeId) {
  const addToHistory = useUserStore((s) => s.addToHistory);
  const lastSavedRef = useRef(0);
  const intervalRef = useRef(null);

  // Saves progress to history, throttled to at most once every 30 seconds
  const saveProgress = useCallback(
    async (progress) => {
      if (!animeId || !episodeId) return;

      const now = Date.now();
      if (now - lastSavedRef.current < 30000) return;

      lastSavedRef.current = now;
      await addToHistory(animeId, episodeId, Math.min(Math.round(progress), 100));
    },
    [animeId, episodeId, addToHistory]
  );

  // Converts playback time to a percentage and decides when to save progress
  const handleTimeUpdate = useCallback(
    (currentTime, duration) => {
      if (!duration) return;
      const progress = (currentTime / duration) * 100;

      if (progress >= 90) {
        saveProgress(100);
      } else if (progress - (lastSavedRef.current || 0) >= 5) {
        saveProgress(progress);
      }
    },
    [saveProgress]
  );

  // Attaches timeupdate/ended listeners to a video element and returns cleanup
  const startTracking = useCallback(
    (videoElement) => {
      if (!videoElement) return;

      const onTimeUpdate = () => {
        handleTimeUpdate(videoElement.currentTime, videoElement.duration);
      };

      const onEnded = () => {
        saveProgress(100);
      };

      videoElement.addEventListener('timeupdate', onTimeUpdate);
      videoElement.addEventListener('ended', onEnded);

      return () => {
        videoElement.removeEventListener('timeupdate', onTimeUpdate);
        videoElement.removeEventListener('ended', onEnded);
      };
    },
    [handleTimeUpdate, saveProgress]
  );

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return { saveProgress, startTracking };
}