// backend-api/routes/song-likes.js
const express = require('express');
const router = express.Router(); // mount at /api/content/song in app.js
const { requireAuth } = require('../middleware/auth');
const { getSongById, likeSong, unlikeSong, getSongLikeCount } = require('../db/songs');

// POST /api/content/song/:songId/like  (idempotent)
router.post('/:songId/like', requireAuth, async (req, res, next) => {
  try {
    const { songId } = req.params;
    const userId = req.user?.id;

    if (!songId) return res.status(400).json({ error: 'songId is required' });
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const song = await getSongById(songId);
    if (!song) return res.status(404).json({ error: 'Song not found' });

    // make sure likeSong is idempotent (no duplicate likes)
    await likeSong(songId, userId);

    const likeCount = await getSongLikeCount?.(songId).catch(() => null);
    return res.status(200).json({ success: true, likeCount });
  } catch (err) {
    next(err);
  }
});

// POST /api/content/song/:songId/unlike  (idempotent)
router.post('/:songId/unlike', requireAuth, async (req, res, next) => {
  try {
    const { songId } = req.params;
    const userId = req.user?.id;

    if (!songId) return res.status(400).json({ error: 'songId is required' });
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const song = await getSongById(songId);
    if (!song) return res.status(404).json({ error: 'Song not found' });

    // make sure unlikeSong is idempotent (no error if not liked)
    await unlikeSong(songId, userId);

    const likeCount = await getSongLikeCount?.(songId).catch(() => null);
    return res.status(200).json({ success: true, likeCount });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
