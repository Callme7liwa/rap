// backend-api/routes/songs.js
const express = require('express');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  GetCommand,
  UpdateCommand,
  ScanCommand,
  DeleteCommand,
} = require('@aws-sdk/lib-dynamodb');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();



const dynamoClient = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: process.env.AWS_REGION || 'eu-north-1' }),
  { marshallOptions: { removeUndefinedValues: true } }
);

// Simple in-memory cache (dev-time). Keys are strings -> { value, ts }
const cache = new Map();
const CACHE_TTL = Number(process.env.SONGS_CACHE_TTL_MS) || 60 * 1000; // 1 minute default

// Metrics
const cacheMetrics = {
  hits: 0,
  misses: 0,
  sets: 0,
  evictions: 0, // TTL-based
  deletes: 0,   // explicit deletes
};

function setCache(key, value) {
  try { cache.set(key, { value, ts: Date.now() }); cacheMetrics.sets += 1; } catch (e) { /* ignore */ }
}

function getCache(key) {
  const e = cache.get(key);
  if (!e) { cacheMetrics.misses += 1; return null; }
  if (Date.now() - e.ts > CACHE_TTL) { cache.delete(key); cacheMetrics.evictions += 1; cacheMetrics.misses += 1; return null; }
  cacheMetrics.hits += 1;
  return e.value;
}

function delCacheKey(key) { cache.delete(key); cacheMetrics.deletes += 1; }
function delCachePrefix(prefix) {
  for (const k of Array.from(cache.keys())) if (k.startsWith(prefix)) { cache.delete(k); cacheMetrics.deletes += 1; }
}

// Expose a small metrics endpoint under the songs router
router.get('/cache-metrics', (req, res) => {
  try {
    const { reset } = req.query;
    const metrics = { ...cacheMetrics, size: cache.size, ttlMs: CACHE_TTL };
    if (reset === '1' || reset === 'true') {
      cache.clear();
      cacheMetrics.hits = cacheMetrics.misses = cacheMetrics.sets = cacheMetrics.evictions = cacheMetrics.deletes = 0;
      return res.json({ metrics, reset: true });
    }
    res.json({ metrics });
  } catch (e) {
    res.status(500).json({ error: 'Failed to get cache metrics', details: e.message });
  }
});


// ---------- Config (adjust if your schema differs) ----------
const SONGS_TABLE = process.env.SONGS_TABLE || 'lyricscape-songs-prod';
const SONGS_PK    = process.env.SONGS_PK    || 'id'; // Primary key is 'id' (Number)

const VOTES_TABLE = process.env.VOTES_TABLE || 'lyricscape-votes-prod';
const VOTES_PK = process.env.VOTES_PK || 'PK';
const VOTES_SK = process.env.VOTES_SK || 'SK';

// Optional GSIs
const SLUG_GSI = process.env.SONGS_SLUG_GSI || 'SlugIndex'; // (slug as partition key)
const ARTIST_GSI = process.env.SONGS_ARTIST_GSI || 'ArtistIdIndex';     // GSI on artist_id

// Helper function to get vote counts for items
async function getVoteCounts(type) {
  try {
    const result = await dynamoClient.send(new ScanCommand({
      TableName: VOTES_TABLE,
      FilterExpression: 'item_type = :type AND begins_with(PK, :votePrefix)',
      ExpressionAttributeNames: {},
      ExpressionAttributeValues: {
        ':type': type,
        ':votePrefix': 'VOTE#'
      }
    }));

    const voteCounts = {};
    for (const vote of result.Items || []) {
      voteCounts[vote.item_id] = (voteCounts[vote.item_id] || 0) + 1;
    }
    return voteCounts;
  } catch (error) {
    console.error(`Error fetching vote counts for ${type}:`, error);
    return {};
  }
}

// ---------- Helpers ----------
const base64 = {
  encode: (obj) => Buffer.from(JSON.stringify(obj), 'utf8').toString('base64'),
  decode: (str) => JSON.parse(Buffer.from(str, 'base64').toString('utf8')),
};
function asStr(v) {
  if (v == null) return v;
  return String(v);
}

function nowTs() { return Date.now(); }
function coerceId(v) {
  if (typeof v === 'number') return v;
  if (typeof v === 'string' && /^\d+$/.test(v)) return Number(v);
  return v;
}

// ---------- Likes helpers ----------
async function likeSongRow(songId, userId) {
  const item = {
    [VOTES_PK]: `SONG#${songId}`,
    [VOTES_SK]: `USER#${userId}`,
    entity: 'LIKE',
    songId: coerceId(songId),
    userId: String(userId),
    createdAt: new Date().toISOString(),
  };

  // Idempotent insert
  await dynamoClient.send(new PutCommand({
    TableName: VOTES_TABLE,
    Item: item,
    ConditionExpression: `attribute_not_exists(${VOTES_PK}) AND attribute_not_exists(${VOTES_SK})`,
  })).catch(err => {
    if (err.name !== 'ConditionalCheckFailedException') throw err;
  });
}

async function unlikeSongRow(songId, userId) {
  await dynamoClient.send(new DeleteCommand({
    TableName: VOTES_TABLE,
    Key: {
      [VOTES_PK]: `SONG#${songId}`,
      [VOTES_SK]: `USER#${userId}`,
    },
    ConditionExpression: `attribute_exists(${VOTES_PK}) AND attribute_exists(${VOTES_SK})`,
  })).catch(err => {
    if (err.name !== 'ConditionalCheckFailedException') throw err;
  });
}

async function getLikeCount(songId) {
  const res = await dynamoClient.send(new QueryCommand({
    TableName: VOTES_TABLE,
    KeyConditionExpression: '#pk = :pk',
    ExpressionAttributeNames: { '#pk': VOTES_PK },
    ExpressionAttributeValues: { ':pk': `SONG#${songId}` },
    Select: 'COUNT',
  }));
  return res.Count || 0;
}

// ============================================
// GET /api/songs - List songs (with optional search & artist filter)
//   ?limit=20&cursor=...&q=term&artistId=71279
// If q provided -> Scan + contains(title, q)
// If artistId with ARTIST_GSI -> Query GSI
// Else default Scan
// ============================================
router.get('/', async (req, res) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const cursor = req.query.cursor;
    const q = (req.query.q || '').trim();
    const artistId = req.query.artistId ? coerceId(req.query.artistId) : null;

    // Cache key for list queries
    const listCacheKey = `list:${limit}:${cursor || ''}:q=${q}:artist=${artistId || ''}`;
    const cachedList = getCache(listCacheKey);
    if (cachedList) return res.json(cachedList);

    let params;

    console.log('getting called && List songs params:', { limit, cursor, q, artistId });

    if (artistId && ARTIST_GSI) {
      // Query by artistId via GSI
      params = {
        TableName: SONGS_TABLE,
        IndexName: ARTIST_GSI,
        KeyConditionExpression: '#aid = :aid',
        ExpressionAttributeNames: { '#aid': 'primary_artist_id' },
        ExpressionAttributeValues: { ':aid': artistId },
        Limit: limit,
      };
    } else if (q) {
      // Search across all songs - scan entire table
      const allItems = [];
      let lastEvaluatedKey;
      
      try {
        lastEvaluatedKey = cursor ? base64.decode(cursor) : undefined;
      } catch (decodeError) {
        console.error('Failed to decode cursor:', decodeError);
        return res.status(400).json({ error: 'Invalid cursor format' });
      }
      
      // Pour la recherche, on continue jusqu'à avoir assez de résultats ou fin de table
      let scannedCount = 0;
      const maxScans = 10; // Limite pour éviter les scans trop longs
      
      while (scannedCount < maxScans) {
        const scanParams = {
          TableName: SONGS_TABLE,
          FilterExpression: '(attribute_exists(#title) AND contains(#title, :q)) OR (attribute_exists(#artist) AND contains(#artist, :q)) OR (attribute_exists(#lyrics) AND contains(#lyrics, :q))',
          ExpressionAttributeNames: { 
            '#title': 'title',
            '#artist': 'primary_artist_name',
            '#lyrics': 'lyrics'
          },
          ExpressionAttributeValues: { ':q': q },
          Limit: 50, // Réduit à 50 pour éviter le throttling
        };
        
        if (lastEvaluatedKey) {
          scanParams.ExclusiveStartKey = lastEvaluatedKey;
        }
        
        try {
          const scanResult = await dynamoClient.send(new ScanCommand(scanParams));
          allItems.push(...(scanResult.Items || []));
          
          // Si on a assez de résultats pour cette page, on s'arrête
          if (allItems.length >= limit || !scanResult.LastEvaluatedKey) {
            lastEvaluatedKey = scanResult.LastEvaluatedKey;
            break;
          }
          
          lastEvaluatedKey = scanResult.LastEvaluatedKey;
          scannedCount++;
          
          // Ajouter un délai entre les scans pour éviter le throttling (500ms)
          if (lastEvaluatedKey) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } catch (scanError) {
          // Si c'est un throttling error, on retourne ce qu'on a déjà
          if (scanError.name === 'ProvisionedThroughputExceededException') {
            console.warn('Throttling detected, returning partial results:', {
              itemsFound: allItems.length,
              query: q,
              scannedCount: scannedCount
            });
            break;
          }
          
          console.error('Scan error during search:', {
            error: scanError.message,
            query: q,
            cursor: cursor,
            lastEvaluatedKey: lastEvaluatedKey,
            scannedCount: scannedCount
          });
          throw scanError;
        }
      }
      
      // Get vote counts for songs
      const voteCounts = await getVoteCounts('song');
      
      // Add vote_count to each song
      let itemsWithVotes = allItems.map(song => ({
        ...song,
        vote_count: voteCounts[song.id] || 0
      }));
      
      // Sort by vote count first, then by pageviews
      itemsWithVotes.sort((a, b) => {
        const voteDiff = (b.vote_count || 0) - (a.vote_count || 0);
        if (voteDiff !== 0) return voteDiff;
        return (b.pageviews || 0) - (a.pageviews || 0);
      });
      
      // Retourner seulement 'limit' items pour cette page
      const items = itemsWithVotes.slice(0, limit);
      const nextCursor = lastEvaluatedKey ? base64.encode(lastEvaluatedKey) : null;
      
      const payload = { 
        data: items, 
        total: items.length,
        count: items.length,
        nextCursor,
        hasMore: !!nextCursor || allItems.length > limit
      };
      setCache(listCacheKey, payload);
      return res.json(payload);
    } else {
      // Plain Scan
      params = {
        TableName: SONGS_TABLE,
        Limit: limit,
      };
    }

    if (cursor) params.ExclusiveStartKey = base64.decode(cursor);

    const result = await dynamoClient.send(
      params.IndexName ? new QueryCommand(params) : new ScanCommand(params)
    );

    let items = result.Items || [];
    console.log("items:", items.at(0));
    
    // Get vote counts for songs
    const voteCounts = await getVoteCounts('song');
    
    // Add vote_count to each song
    items = items.map(song => ({
      ...song,
      vote_count: voteCounts[song.id] || 0
    }));
    
    // Sort by vote count first, then by pageviews
    items.sort((a, b) => {
      const voteDiff = (b.vote_count || 0) - (a.vote_count || 0);
      if (voteDiff !== 0) return voteDiff;
      return (b.pageviews || 0) - (a.pageviews || 0);
    });
    
    const nextCursor = result.LastEvaluatedKey ? base64.encode(result.LastEvaluatedKey) : null;

    const payload = { 
      data: items, 
      total: items.length, // Nombre d'items dans cette page
      count: items.length,  // Pour compatibilité
      nextCursor,           // Pour la pagination
      hasMore: !!nextCursor // Indique s'il y a plus de résultats
    };
    setCache(listCacheKey, payload);
    res.json(payload);
  } catch (error) {
    console.error('List songs error:', error);
    res.status(500).json({ error: 'Failed to list songs', details: error.message });
  }
});

// ============================================
// GET /api/songs/:id - Get a song by id
// ============================================
router.get('/:id', async (req, res) => {
  try {
    const id = coerceId(req.params.id);
    const cacheKey = `song:${id}`;
    const cached = getCache(cacheKey);
    if (cached) return res.json(cached);

    // Get song
    const key = { [SONGS_PK]: id };
    const result = await dynamoClient.send(new GetCommand({ 
      TableName: SONGS_TABLE, 
      Key: key 
    }));
    if (!result.Item) return res.status(404).json({ error: 'Song not found' });

    // Get like count (temporairement désactivé jusqu'à ce que la table votes soit créée)
    const likeCount = 0; // await getLikeCount(id);

    // Get comments (latest 5) - Temporairement désactivé
    const comments = []; // await dynamoClient.send(new QueryCommand({...

    // If song has album_id, get album details (temporairement désactivé)
    let album = null;
    // if (result.Item.album_id) {
    //   const albumResult = await dynamoClient.send(new GetCommand({
    //     TableName: 'lyricscape-albums-prod',
    //     Key: { id: result.Item.album_id }
    //   }));
    //   album = albumResult.Item;
    // }

    // Get artist details (temporairement désactivé)
    let artist = null;
    // if (result.Item.primary_artist_id) {
    //   const artistResult = await dynamoClient.send(new GetCommand({
    //     TableName: 'lyricscape-artists-prod',
    //     Key: { id: result.Item.primary_artist_id }
    //   }));
    //   artist = artistResult.Item;
    // }

    const payload = { 
      song: result.Item,
      likeCount,
      comments,
      album,
      artist,
      _cached: false
    };

    setCache(cacheKey, payload);
    res.json(payload);
  } catch (e) {
    console.error('Get song error:', e);
    res.status(500).json({ error: 'Failed to get song', details: e.message });
  }
});


// ============================================
// GET /api/songs/slug/:slug - Get song by slug (needs SlugIndex)
// ============================================
router.get('/slug/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    if (!SLUG_GSI) return res.status(400).json({ error: 'Slug GSI not configured' });

    const cacheKey = `slug:${slug}`;
    const cached = getCache(cacheKey);
    if (cached) return res.json(cached);

    const result = await dynamoClient.send(new QueryCommand({
      TableName: SONGS_TABLE,
      IndexName: SLUG_GSI,
      KeyConditionExpression: 'slug = :slug',
      ExpressionAttributeValues: { ':slug': slug },
      Limit: 1,
    }));

    const item = (result.Items || [])[0];
    if (!item) return res.status(404).json({ error: 'Song not found' });

    const likeCount = 0; // await getLikeCount(item[SONGS_PK]).catch(() => 0);
    const payload = { song: item, likeCount };
    setCache(cacheKey, payload);
    res.json(payload);
  } catch (error) {
    if (error.name === 'ResourceNotFoundException') {
      return res.status(400).json({ error: `GSI ${SLUG_GSI} not found on table` });
    }
    console.error('Get song by slug error:', error);
    res.status(500).json({ error: 'Failed to get song by slug', details: error.message });
  }
});

// ============================================
// POST /api/songs - Create a song (authenticated)
// Body should include at least: { id, title } (id can be number or string)
// ============================================
router.post('/', verifyToken, async (req, res) => {
  try {
    const userId = req.user?.sub;
    const body = req.body || {};

    if (body[SONGS_PK] == null || body.title == null) {
      return res.status(400).json({ error: `Both '${SONGS_PK}' and 'title' are required` });
    }

    const now = nowTs();
    const item = {
      ...body,
      [SONGS_PK]: coerceId(body[SONGS_PK]),
      entity_type: 'song',
      created_at: now,
      updated_at: now,
      created_by: userId || 'system',
    };

    await dynamoClient.send(new PutCommand({
      TableName: SONGS_TABLE,
      Item: item,
      ConditionExpression: `attribute_not_exists(${SONGS_PK})`,
    }));

    // Invalidate list caches and this song id cache
    delCachePrefix('list:');
    delCacheKey(`song:${item[SONGS_PK]}`);

    res.json({ success: true, song: item });
  } catch (error) {
    if (error.name === 'ConditionalCheckFailedException') {
      return res.status(409).json({ error: 'Song with this id already exists' });
    }
    console.error('Create song error:', error);
    res.status(500).json({ error: 'Failed to create song', details: error.message });
  }
});

// ============================================
// PUT /api/songs/:id - Update (full/partial) a song (authenticated)
// Only updates provided fields, sets updated_at
// ============================================
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const key = { [SONGS_PK]: coerceId(req.params.id) };
    // ...build UpdateExpression as you already had...
    const result = await dynamoClient.send(new UpdateCommand({
      TableName: SONGS_TABLE,
      Key: key,
      UpdateExpression: 'SET #updated_at = :u',  // plus your other fields
      ExpressionAttributeNames: { '#updated_at': 'updated_at' /* + others */ },
      ExpressionAttributeValues: { ':u': Date.now() /* + others */ },
      ReturnValues: 'ALL_NEW',
    }));
    // Invalidate caches related to this song
    delCachePrefix('list:');
    delCacheKey(`song:${req.params.id}`);

    res.json({ success: true, song: result.Attributes });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update song', details: e.message });
  }
});


// ============================================
// DELETE /api/songs/:id - Delete a song (authenticated)
// ============================================
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const key = { [SONGS_PK]: coerceId(req.params.id) };
    await dynamoClient.send(new DeleteCommand({ TableName: SONGS_TABLE, Key: key }));
  // Invalidate cache
  delCachePrefix('list:');
  delCacheKey(`song:${req.params.id}`);

  res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete song', details: e.message });
  }
});


// ============================================
// POST /api/songs/:id/like - Like a song (authenticated, idempotent)
// ============================================
router.post('/', verifyToken, async (req, res) => {
  try {
    const body = req.body || {};
    if (body[SONGS_PK] == null && body.id == null)
      return res.status(400).json({ error: `'${SONGS_PK}' (or 'id') is required` });

    const item = {
      ...body,
      [SONGS_PK]: asStr(body[SONGS_PK] ?? body.id), // ensure STRING
      created_at: Date.now(),
      updated_at: Date.now(),
      entity_type: 'song',
    };

    await dynamoClient.send(new PutCommand({
      TableName: SONGS_TABLE,
      Item: item,
      ConditionExpression: `attribute_not_exists(${SONGS_PK})`,
    }));

    res.json({ success: true, song: item });
  } catch (e) {
    if (e.name === 'ConditionalCheckFailedException')
      return res.status(409).json({ error: 'Song with this id already exists' });
    res.status(500).json({ error: 'Failed to create song', details: e.message });
  }
});


// ============================================
// POST /api/songs/:id/unlike - Unlike a song (authenticated, idempotent)
// ============================================
router.post('/:id/unlike', verifyToken, async (req, res) => {
  try {
    const songId = coerceId(req.params.id);
    const userId = req.user?.sub;

    await unlikeSongRow(songId, userId);
    const likeCount = await getLikeCount(songId);

    res.json({ success: true, likeCount });
  } catch (error) {
    console.error('Unlike song error:', error);
    res.status(500).json({ error: 'Failed to unlike song', details: error.message });
  }
});

// ============================================
// POST /api/songs/seed - Seed multiple songs (dev helper)
// Body: { songs: [ { id, title, ... }, ... ] }
// ============================================
router.post('/seed', async (req, res) => {
  try {
    const { songs } = req.body;
    if (!Array.isArray(songs)) {
      return res.status(400).json({ error: 'songs array is required' });
    }

    const results = [];
    for (const s of songs) {
      const item = {
        ...s,
        [SONGS_PK]: coerceId(s[SONGS_PK] ?? s.id),
        entity_type: 'song',
        created_at: s.created_at || nowTs(),
        updated_at: nowTs(),
      };
      await dynamoClient.send(new PutCommand({
        TableName: SONGS_TABLE,
        Item: item,
      }));
      results.push(item);
    }

    // Clear caches - seeding replaces data
    delCachePrefix('list:');
    for (const s of results) delCacheKey(`song:${s[SONGS_PK]}`);

    res.json({ success: true, message: `Seeded ${results.length} songs`, songs: results });
  } catch (error) {
    console.error('Seed songs error:', error);
    res.status(500).json({ error: 'Failed to seed songs', details: error.message });
  }
});

module.exports = router;
