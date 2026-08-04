import { useEffect } from 'react';

const SITE_NAME = 'Anizil';

// Upserts a meta tag (by attr/key) in the document head
function setMeta(attr, key, value) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', value);
}

// useSEO: syncs the document title and meta tags (description, OG, Twitter) for a page
export default function useSEO({ title, description, image, type = 'website' } = {}) {
  useEffect(() => {
    const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} - Anime Streaming Portal`;
    document.title = fullTitle;
    setMeta('name', 'description', description || 'Watch anime online free in HD. Stream the latest episodes, track your watchlist, earn XP and join the community.');
    setMeta('property', 'og:title', fullTitle);
    setMeta('property', 'og:description', description || 'Watch anime online free in HD.');
    setMeta('property', 'og:type', type);
    setMeta('property', 'og:image', image || '/icon-512.png');
    setMeta('name', 'twitter:card', 'summary_large_image');
  }, [title, description, image, type]);
}
