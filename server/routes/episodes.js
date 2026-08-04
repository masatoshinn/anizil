const express = require('express');
const { getPool } = require('../config/database');

const router = express.Router();

// Return episode detail with active sources and prev/next episode links.
router.get('/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const { id } = req.params;

    const [episodes] = await pool.query(
      `SELECT e.*, a.title as anime_title, a.slug as anime_slug, a.poster as anime_poster
       FROM episodes e
       JOIN anime a ON e.anime_id = a.id
       WHERE e.id = ?`,
      [id]
    );

    if (episodes.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Episode not found'
      });
    }

    const [sources] = await pool.query(
      'SELECT * FROM episode_sources WHERE episode_id = ? AND is_active = 1',
      [id]
    );

    const [prevEpisode] = await pool.query(
      'SELECT id, episode_number, title FROM episodes WHERE anime_id = ? AND episode_number < ? ORDER BY episode_number DESC LIMIT 1',
      [episodes[0].anime_id, episodes[0].episode_number]
    );

    const [nextEpisode] = await pool.query(
      'SELECT id, episode_number, title FROM episodes WHERE anime_id = ? AND episode_number > ? ORDER BY episode_number ASC LIMIT 1',
      [episodes[0].anime_id, episodes[0].episode_number]
    );

    res.json({
      success: true,
      data: {
        ...episodes[0],
        sources,
        prev_episode: prevEpisode.length > 0 ? prevEpisode[0] : null,
        next_episode: nextEpisode.length > 0 ? nextEpisode[0] : null
      }
    });
  } catch (error) {
    console.error('Get episode detail error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
