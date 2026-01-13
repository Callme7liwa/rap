// backend-api/db/songs.js
// DynamoDB DAO for songs + likes (AWS SDK v3)

const {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  UpdateItemCommand,
  DeleteItemCommand,
  ScanCommand,
  QueryCommand,
} = require("@aws-sdk/client-dynamodb");
const { marshall, unmarshall } = require("@aws-sdk/util-dynamodb");

// ----- config -----
const REGION = process.env.AWS_REGION || "eu-north-1";
const SONGS_TABLE = process.env.SONGS_TABLE || "lyricscape-songs-prod";
const VOTES_TABLE = process.env.VOTES_TABLE || "lyricscape-votes-prod";

// keys
const SONGS_PK = "id"; // change if your table uses another PK
const VOTES_PK = "PK";
const VOTES_SK = "SK";

const ddb = new DynamoDBClient({ region: REGION });

// ---------- SONGS ----------
async function getSongById(songId) {
  const key = { [SONGS_PK]: coerceId(songId) };
  const res = await ddb.send(new GetItemCommand({
    TableName: SONGS_TABLE,
    Key: marshall(key),
    ConsistentRead: false,
  }));
  return res.Item ? unmarshall(res.Item) : null;
}

async function createSong(song) {
  const now = new Date().toISOString();
  const item = {
    ...song,
    [SONGS_PK]: coerceId(song[SONGS_PK] ?? song.id),
    entity_type: "song",
    created_at: now,
    updated_at: now,
  };
  if (item.release_date_components && typeof item.release_date_components === "string") {
    try { item.release_date_components = JSON.parse(item.release_date_components); } catch {}
  }
  await ddb.send(new PutItemCommand({
    TableName: SONGS_TABLE,
    Item: marshall(item, { removeUndefinedValues: true }),
    ConditionExpression: `attribute_not_exists(${SONGS_PK})`,
  }));
  return item;
}

async function updateSong(songId, patch) {
  const now = new Date().toISOString();
  const allowed = [
    "title","full_title","url","path","release_date_for_display",
    "release_date_components","song_art_image_url","lyrics_state",
    "instrumental","annotation_count","pyongs_count","pageviews",
    "primary_artist_id","primary_artist_name","primary_artist_slug","lyrics"
  ];
  const setExpr = [];
  const names = {};
  const values = { ":now": { S: now } };

  for (const k of allowed) {
    if (patch[k] !== undefined) {
      const nameKey = `#${k.replace(/\W/g, "_")}`;
      const valueKey = `:${k.replace(/\W/g, "_")}`;
      names[nameKey] = k;
      values[valueKey] = marshall(patch[k]).M?.value ?? marshall(patch[k]);
      setExpr.push(`${nameKey} = ${valueKey}`);
    }
  }
  // always update updated_at
  names["#updated_at"] = "updated_at";
  setExpr.push("#updated_at = :now");

  if (setExpr.length === 0) return getSongById(songId);

  const res = await ddb.send(new UpdateItemCommand({
    TableName: SONGS_TABLE,
    Key: marshall({ [SONGS_PK]: coerceId(songId) }),
    UpdateExpression: `SET ${setExpr.join(", ")}`,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
    ReturnValues: "ALL_NEW",
  }));
  return res.Attributes ? unmarshall(res.Attributes) : null;
}

async function deleteSong(songId) {
  await ddb.send(new DeleteItemCommand({
    TableName: SONGS_TABLE,
    Key: marshall({ [SONGS_PK]: coerceId(songId) }),
  }));
}

// Simple paginated list (Scan). For production, prefer a GSI query.
async function listSongs({ limit = 25, cursor } = {}) {
  const params = {
    TableName: SONGS_TABLE,
    Limit: Number(limit),
  };
  if (cursor) params.ExclusiveStartKey = JSON.parse(Buffer.from(cursor, "base64").toString("utf8"));

  const res = await ddb.send(new ScanCommand(params));
  const items = (res.Items || []).map(unmarshall);
  const nextCursor = res.LastEvaluatedKey
    ? Buffer.from(JSON.stringify(res.LastEvaluatedKey)).toString("base64")
    : null;

  return { items, nextCursor };
}

// Optional fuzzy search by title (Scan + FilterExpression)
// If you have a GSI on title, switch to Query for efficiency.
async function searchSongsByTitle(q, { limit = 25, cursor } = {}) {
  const params = {
    TableName: SONGS_TABLE,
    Limit: Number(limit),
    FilterExpression: "contains(#title, :q)",
    ExpressionAttributeNames: { "#title": "title" },
    ExpressionAttributeValues: marshall({ ":q": q }),
  };
  if (cursor) params.ExclusiveStartKey = JSON.parse(Buffer.from(cursor, "base64").toString("utf8"));

  const res = await ddb.send(new ScanCommand(params));
  const items = (res.Items || []).map(unmarshall);
  const nextCursor = res.LastEvaluatedKey
    ? Buffer.from(JSON.stringify(res.LastEvaluatedKey)).toString("base64")
    : null;

  return { items, nextCursor };
}

// ---------- LIKES ----------
async function likeSong(songId, userId) {
  const item = {
    [VOTES_PK]: `SONG#${songId}`,
    [VOTES_SK]: `USER#${userId}`,
    entity: "LIKE",
    songId: coerceId(songId),
    userId: String(userId),
    createdAt: new Date().toISOString(),
  };
  await ddb.send(new PutItemCommand({
    TableName: VOTES_TABLE,
    Item: marshall(item),
    ConditionExpression: `attribute_not_exists(${VOTES_PK}) AND attribute_not_exists(${VOTES_SK})`,
  })).catch(err => {
    if (err.name !== "ConditionalCheckFailedException") throw err;
  });
}

async function unlikeSong(songId, userId) {
  await ddb.send(new DeleteItemCommand({
    TableName: VOTES_TABLE,
    Key: marshall({
      [VOTES_PK]: `SONG#${songId}`,
      [VOTES_SK]: `USER#${userId}`,
    }),
    ConditionExpression: `attribute_exists(${VOTES_PK}) AND attribute_exists(${VOTES_SK})`,
  })).catch(err => {
    if (err.name !== "ConditionalCheckFailedException") throw err;
  });
}

async function getSongLikeCount(songId) {
  const res = await ddb.send(new QueryCommand({
    TableName: VOTES_TABLE,
    KeyConditionExpression: "#pk = :pk",
    ExpressionAttributeNames: { "#pk": VOTES_PK },
    ExpressionAttributeValues: marshall({ ":pk": `SONG#${songId}` }),
    Select: "COUNT",
  }));
  return res.Count || 0;
}

// ---------- utils ----------
function coerceId(v) {
  // your sample IDs are numbers; keep numeric if possible
  if (typeof v === "number") return v;
  if (typeof v === "string" && /^\d+$/.test(v)) return Number(v);
  return v;
}

module.exports = {
  // songs
  getSongById,
  createSong,
  updateSong,
  deleteSong,
  listSongs,
  searchSongsByTitle,
  // likes
  likeSong,
  unlikeSong,
  getSongLikeCount,
};
