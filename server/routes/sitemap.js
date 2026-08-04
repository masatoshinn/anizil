const express = require('express');
const { getPool } = require('../config/database');

const router = express.Router();

// Static, always-present routes (Client-side SPA pages)
const STATIC_PAGES = [
  '/', '/manga', '/genres', '/schedule', '/forum', '/shop', '/leaderboard',
  '/premium', '/about', '/docs', '/faq', '/contact', '/terms', '/privacy',
];

// Escapes a URL for safe inclusion inside an XML sitemap
function xmlEscape(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Builds an XML <url> entry for the given loc with an optional priority
function urlEntry(baseUrl, path, priority = '0.5', lastmod = null) {
  const loc = `${baseUrl}${path === '/' ? '' : path}`;
  const mod = lastmod ? `<lastmod>${lastmod}</lastmod>` : '';
  return `  <url><loc>${xmlEscape(loc)}</loc>${mod}<priority>${priority}</priority></url>`;
}

// Resolves the canonical base URL from env override or the incoming request
function getBaseUrl(req) {
  const envUrl = process.env.SITE_URL || process.env.CORS_ORIGIN;
  if (envUrl && !envUrl.includes('localhost')) return envUrl.replace(/\/$/, '');
  const host = req.get('host') || 'localhost';
  const proto = req.protocol === 'https' || req.secure ? 'https' : 'http';
  return `${proto}://${host}`;
}

// Generate and serve the XML sitemap for Google Search Console.
router.get('/sitemap.xml', async (req, res) => {
  try {
    const pool = await getPool();
    const baseUrl = getBaseUrl(req);
    const entries = [];

    for (const page of STATIC_PAGES) {
      entries.push(urlEntry(baseUrl, page, page === '/' ? '1.0' : '0.7'));
    }

    // Anime detail pages (most valuable, sorted by popularity)
    const [animeRows] = await pool.query(
      'SELECT slug, updated_at FROM anime ORDER BY views DESC, rating DESC LIMIT 10000'
    );
    for (const a of animeRows) {
      entries.push(urlEntry(baseUrl, `/anime/${a.slug}`, '0.8'));
    }

    // Manga detail pages
    const [mangaRows] = await pool.query(
      'SELECT slug, updated_at FROM mangas ORDER BY views DESC LIMIT 10000'
    );
    for (const m of mangaRows) {
      entries.push(urlEntry(baseUrl, `/manga/${m.slug}`, '0.8'));
    }

    // Genre listing pages
    const [genreRows] = await pool.query(
      'SELECT DISTINCT TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(genres, ",", n.n), ",", -1)) AS genre FROM anime JOIN (SELECT 1 n UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10) n ON CHAR_LENGTH(genres) - CHAR_LENGTH(REPLACE(genres, ",", "")) >= n.n - 1 WHERE genres IS NOT NULL AND genres != ""'
    );
    for (const g of genreRows) {
      if (g.genre && g.genre.trim()) {
        entries.push(urlEntry(baseUrl, `/genre/${encodeURIComponent(g.genre.trim())}`, '0.6'));
      }
    }

    // Recent public user profiles (top by XP)
    const [userRows] = await pool.query(
      'SELECT id FROM users WHERE is_banned = 0 ORDER BY xp DESC LIMIT 500'
    );
    for (const u of userRows) {
      entries.push(urlEntry(baseUrl, `/user/${u.id}`, '0.3'));
    }

    res.header('Content-Type', 'application/xml; charset=utf-8');
    res.send(
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n` +
      entries.join('\n') +
      `\n</urlset>`
    );
  } catch (error) {
    console.error('Sitemap generation error:', error);
    res.status(500).type('text/plain').send('Sitemap generation failed');
  }
});

// Serve robots.txt with the sitemap location.
router.get('/robots.txt', async (req, res) => {
  const baseUrl = getBaseUrl(req);
  res.type('text/plain').send(
    `User-agent: *\nAllow: /\n\nSitemap: ${baseUrl}/sitemap.xml\n`
  );
});

module.exports = router;
