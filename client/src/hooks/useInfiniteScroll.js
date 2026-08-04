import { useState, useEffect, useRef, useCallback } from 'react';

// useInfiniteScroll: calls a callback when an IntersectionObserver sentinel scrolls into view
export default function useInfiniteScroll(callback, options = {}) {
  const { threshold = 0.1, rootMargin = '100px' } = options;
  const [isLoading, setIsLoading] = useState(false);
  const observerRef = useRef(null);
  const sentinelRef = useRef(null);

  // Triggers the load callback when the sentinel is visible and not already loading
  const handleIntersect = useCallback(
    async (entries) => {
      const [entry] = entries;
      if (entry.isIntersecting && !isLoading) {
        setIsLoading(true);
        try {
          await callback();
        } catch (error) {
          console.error('Infinite scroll callback error:', error);
        } finally {
          setIsLoading(false);
        }
      }
    },
    [callback, isLoading]
  );

  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(handleIntersect, {
      threshold,
      rootMargin,
    });

    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [handleIntersect, threshold, rootMargin]);

  return { observerRef: sentinelRef, isLoading };
}