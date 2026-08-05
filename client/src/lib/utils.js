// Formats a date into a long US locale string
export function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// Formats a number with B/M/K suffixes for large values
export function formatNumber(num) {
  if (num === null || num === undefined) return '0';
  if (num >= 1_000_000_000) {
    return (num / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
  }
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num.toString();
}

// Returns a human-readable relative time string for a date
export function timeAgo(date) {
  if (!date) return '';
  const now = new Date();
  const past = new Date(date);
  const seconds = Math.floor((now - past) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  }
  if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  }
  if (seconds < 604800) {
    const days = Math.floor(seconds / 86400);
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  }
  if (seconds < 2_592_000) {
    const weeks = Math.floor(seconds / 604800);
    return `${weeks} week${weeks !== 1 ? 's' : ''} ago`;
  }
  if (seconds < 31_536_000) {
    const months = Math.floor(seconds / 2_592_000);
    return `${months} month${months !== 1 ? 's' : ''} ago`;
  }
  const years = Math.floor(seconds / 31_536_000);
  return `${years} year${years !== 1 ? 's' : ''} ago`;
}

// Joins truthy class names into a single string
export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

// Truncates a string to the given length, appending an ellipsis
export function truncate(str, len = 50) {
  if (!str) return '';
  if (str.length <= len) return str;
  return str.slice(0, len).trimEnd() + '...';
}

const MANGA_IMAGE_SUFFIXES = ['mangadex.org', 'mangadex.network', 'mangadex.net', 'blazefast.co'];

// Route MangaDex-hosted images through our backend proxy so covers/pages
// always load (avoids MangaDex hotlink / Referer blocking). Matched by
// suffix so uploads.mangadex.network, api.mangadex.org, etc. all work.
export function mangaImage(url) {
  if (!url) return '';
  try {
    const u = new URL(url);
    if (MANGA_IMAGE_SUFFIXES.some((s) => u.hostname === s || u.hostname.endsWith('.' + s))) {
      return `/api/manga/image?url=${encodeURIComponent(url)}`;
    }
  } catch {
    /* ignore invalid urls */
  }
  return url;
}

// Maps an anime/manga status to Tailwind color classes for status badges
export function getStatusColor(status) {
  const colors = {
    airing: 'bg-green-500/20 text-green-400 border-green-500/30',
    finished: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    upcoming: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    hiatus: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
  };
  return colors[status?.toLowerCase()] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
}

// Returns a deterministic Tailwind color class for a genre name
export function getGenreColor(genre) {  const colors = [
    'bg-red-500/20 text-red-300',
    'bg-blue-500/20 text-blue-300',
    'bg-green-500/20 text-green-300',
    'bg-yellow-500/20 text-yellow-300',
    'bg-purple-500/20 text-purple-300',
    'bg-pink-500/20 text-pink-300',
    'bg-indigo-500/20 text-indigo-300',
    'bg-cyan-500/20 text-cyan-300',
    'bg-orange-500/20 text-orange-300',
    'bg-teal-500/20 text-teal-300',
  ];

  if (!genre) return colors[0];

  let hash = 0;
  for (let i = 0; i < genre.length; i++) {
    hash = genre.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
}

const STAFF_ROLES = ['super_admin', 'content_admin', 'moderator', 'creator'];

// Returns true when the given role is a site staff role (admin/mod/creator)
export function isStaffRole(role) {
  return STAFF_ROLES.includes(role);
}

// Returns the glow CSS class for staff usernames, or '' for regular users
export function glowNameClass(role) {
  return isStaffRole(role) ? 'glow-name' : '';
}