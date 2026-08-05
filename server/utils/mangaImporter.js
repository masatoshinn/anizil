const { generateSlug, fetchWithTimeout } = require('./helpers');

const MANGA_BASE = 'https://api.mangadex.org';
const UA = { 'User-Agent': 'anizil/1.0 (anime + manga portal)' };

// Fetch and parse a MangaDex API endpoint, throwing on errors
async function mangaDexFetch(path) {
  const response = await fetchWithTimeout(`${MANGA_BASE}${path}`, { headers: UA }, 12000);
  if (!response.ok) {
    throw new Error(`MangaDex API error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

// Pick the best localized title or fall back to Unknown
function extractTitle(manga) {
  const t = manga.attributes.title || {};
  return t.en || t['ja-ro'] || t['ja'] || t['ko'] || t['zh'] || Object.values(t)[0] || 'Unknown Title';
}

// Build the cover image URL from cover_art relationship
function buildCoverUrl(manga) {
  const cover = (manga.relationships || []).find((r) => r.type === 'cover_art');
  if (cover && cover.attributes && cover.attributes.fileName) {
    return `https://uploads.mangadex.org/covers/${manga.id}/${cover.attributes.fileName}`;
  }
  return null;
}

// Return the name from a related entity of the given type
function getRelatedName(manga, type) {
  const rel = (manga.relationships || []).find((r) => r.type === type);
  return rel && rel.attributes ? (rel.attributes.name || null) : null;
}

// Search MangaDex catalog
async function searchMangaDex(query, limit = 20, offset = 0) {
  const params = new URLSearchParams({ title: query, limit, offset, 'order[relevance]': 'desc' });
  ['cover_art', 'author', 'artist'].forEach((r) => params.append('includes[]', r));
  const data = await mangaDexFetch(`/manga?${params.toString()}`);

  return {
    manga: (data.data || []).map((m) => ({
      id: m.id,
      title: extractTitle(m),
      poster: buildCoverUrl(m),
      description: m.attributes.description?.en || '',
      year: m.attributes.year || null,
      status: m.attributes.status || null,
      author: getRelatedName(m, 'author'),
      artist: getRelatedName(m, 'artist'),
    })),
    total: data.total || 0,
    limit: data.limit || limit,
    offset: data.offset || offset,
  };
}

// Get MangaDex detail (full metadata)
async function getMangaDexInfo(mangadexId) {
  const data = await mangaDexFetch(`/manga/${mangadexId}?includes[]=cover_art&includes[]=author&includes[]=artist`);
  const m = data.data;
  if (!m) throw new Error('Manga not found on MangaDex');

  return {
    id: m.id,
    title: extractTitle(m),
    description: m.attributes.description?.en || '',
    poster: buildCoverUrl(m),
    author: getRelatedName(m, 'author'),
    artist: getRelatedName(m, 'artist'),
    status: m.attributes.status || 'ongoing',
    year: m.attributes.year || null,
    genres: (m.attributes.tags || [])
      .filter((t) => t.attributes.group === 'genre' || t.attributes.group === 'theme')
      .map((t) => t.attributes.name?.en || '')
      .filter(Boolean),
    demography: (m.attributes.tags || [])
      .filter((t) => t.attributes.group === 'demographic')
      .map((t) => t.attributes.name?.en || '')
      .filter(Boolean),
    contentRating: m.attributes.contentRating || '',
  };
}

// Get chapter list (English first) for a manga
async function getMangaChapters(mangadexId, language = 'en') {
  const chapters = [];
  let offset = 0;
  const limit = 100;
  let total = Infinity;

  while (offset < total && offset < 1000) {
    const params = new URLSearchParams({
      'translatedLanguage[]': language,
      'order[volume]': 'asc',
      'order[chapter]': 'asc',
      limit,
      offset,
      'includes[]': 'scanlation_group',
    });
    const data = await mangaDexFetch(`/manga/${mangadexId}/feed?${params.toString()}`);
    total = data.total || 0;
    (data.data || []).forEach((c) => {
      const gp = (c.relationships || []).find((r) => r.type === 'scanlation_group');
      chapters.push({
        chapter_uuid: c.id,
        chapter_number: c.attributes.chapter || '',
        title: c.attributes.title || '',
        volume: c.attributes.volume || '',
        language: c.attributes.translatedLanguage || language,
        scanlation_group: gp && gp.attributes ? (gp.attributes.name || '') : '',
        external_url: c.attributes.externalUrl || '',
        published_at: c.attributes.publishAt || null,
      });
    });
    offset += limit;
  }

  return chapters;
}

// Get page images for a chapter (live from MangaDex at-home server)
async function getChapterPages(chapterUuid) {
  const data = await mangaDexFetch(`/at-home/server/${chapterUuid}`);
  const base = data.baseUrl || 'https://uploads.mangadex.org';
  const hash = data.chapter?.hash || data.hash;
  const files = data.chapter?.data || data.data || [];
  if (!hash || files.length === 0) {
    throw new Error('Chapter has no readable pages');
  }
  return {
    baseUrl: base,
    hash,
    pages: files.map((f) => `${base}/data/${hash}/${f}`),
    dataSaver: (data.chapter?.dataSaver || []).map((f) => `${base}/data-saver/${hash}/${f}`),
  };
}

// Full import: manga metadata + chapters into the DB
async function importMangaIntoDb(pool, mangadexId, userId = null) {
  const [existing] = await pool.query('SELECT id FROM mangas WHERE mangadex_id = ?', [mangadexId]);
  if (existing.length > 0) {
    return { alreadyImported: true, id: existing[0].id };
  }

  const info = await getMangaDexInfo(mangadexId);
  const chapters = await getMangaChapters(mangadexId);

  const slug = generateSlug(info.title);
  const [existingSlug] = await pool.query('SELECT id FROM mangas WHERE slug = ?', [slug]);
  const finalSlug = existingSlug.length > 0 ? `${slug}-${Date.now()}` : slug;

  const [result] = await pool.query(
    `INSERT INTO mangas (title, slug, description, poster, author, artist, status, genres,
       demography, content_rating, year, rating, mangadex_id, follow_count)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      info.title,
      finalSlug,
      info.description,
      info.poster,
      info.author,
      info.artist,
      info.status,
      info.genres.join(','),
      info.demography.join(','),
      info.contentRating,
      info.year,
      0,
      mangadexId,
      0,
    ]
  );

  const mangaId = result.insertId;

  for (const ch of chapters) {
    await pool.query(
      `INSERT INTO manga_chapters (manga_id, chapter_uuid, chapter_number, title, volume, language, scanlation_group, external_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        mangaId,
        ch.chapter_uuid,
        ch.chapter_number,
        ch.title || `Chapter ${ch.chapter_number || '?'}`,
        ch.volume,
        ch.language,
        ch.scanlation_group,
        ch.external_url,
      ]
    );
  }

  if (userId) {
    await pool.query(
      'INSERT INTO activity_feed (user_id, action, details) VALUES (?, ?, ?)',
      [userId, 'import_manga', `Imported from MangaDex: ${info.title} (${chapters.length} chapters)`]
    );
  }

  const [newManga] = await pool.query('SELECT * FROM mangas WHERE id = ?', [mangaId]);
  return { alreadyImported: false, manga: newManga[0] };
}

module.exports = {
  searchMangaDex,
  getMangaDexInfo,
  getMangaChapters,
  getChapterPages,
  importMangaIntoDb,
};
