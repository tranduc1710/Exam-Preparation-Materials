import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import fs from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.join(__dirname, 'dist');
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const PORT = Number(process.env.PORT || 3030);

// Ensure data directory exists for database storage
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ================= High-Performance SQLite Setup =================
let sqliteDb = null;
let stmtGetProfiles = null;
let stmtGetProfile = null;
let stmtSaveProfile = null;
let stmtHeartbeat = null;
let stmtLogout = null;
let stmtGetProgress = null;
let stmtSaveProgress = null;
let stmtDeleteProfile = null;
let stmtDeleteProgress = null;

try {
  const { DatabaseSync } = await import('node:sqlite');
  const dbFile = path.join(DATA_DIR, 'istqb.db');
  sqliteDb = new DatabaseSync(dbFile);

  // Fast SQLite PRAGMAs for high concurrency
  sqliteDb.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA cache_size = -64000;
    PRAGMA temp_store = MEMORY;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS profiles (
      username TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      last_active_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS progress (
      username TEXT PRIMARY KEY,
      data_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Pre-compiled prepared statements for zero CPU parsing overhead
  stmtGetProfiles = sqliteDb.prepare(
    'SELECT username, display_name AS displayName, created_at AS createdAt, last_active_at AS lastActiveAt FROM profiles ORDER BY datetime(last_active_at) DESC'
  );
  stmtGetProfile = sqliteDb.prepare(
    'SELECT username, display_name AS displayName, created_at AS createdAt, last_active_at AS lastActiveAt FROM profiles WHERE lower(username) = ?'
  );
  stmtSaveProfile = sqliteDb.prepare(`
    INSERT INTO profiles (username, display_name, created_at, last_active_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(username) DO UPDATE SET
      display_name = excluded.display_name,
      last_active_at = excluded.last_active_at
  `);
  stmtHeartbeat = sqliteDb.prepare(
    'UPDATE profiles SET last_active_at = ? WHERE lower(username) = ?'
  );
  stmtLogout = sqliteDb.prepare(
    'UPDATE profiles SET last_active_at = ? WHERE lower(username) = ?'
  );
  stmtGetProgress = sqliteDb.prepare(
    'SELECT data_json, updated_at FROM progress WHERE lower(username) = ?'
  );
  stmtSaveProgress = sqliteDb.prepare(`
    INSERT INTO progress (username, data_json, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(username) DO UPDATE SET
      data_json = excluded.data_json,
      updated_at = excluded.updated_at
  `);
  stmtDeleteProfile = sqliteDb.prepare('DELETE FROM profiles WHERE lower(username) = ?');
  stmtDeleteProgress = sqliteDb.prepare('DELETE FROM progress WHERE lower(username) = ?');

  console.log(`[Database] SQLite connected at ${dbFile} (WAL + Prepared Statements ready)`);
} catch (err) {
  console.warn(
    `[Database] node:sqlite unavailable (${err.message}), using file-based storage in ${DATA_DIR}`
  );
}

// Fallback JSON-file based store if node:sqlite is ever missing
const FALLBACK_PROFILES_FILE = path.join(DATA_DIR, 'profiles.json');
const FALLBACK_PROGRESS_FILE = path.join(DATA_DIR, 'progress.json');

function fallbackReadJson(filePath, def) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch (e) {
    console.error('fallbackReadJson error:', e);
  }
  return def;
}

function fallbackWriteJson(filePath, data) {
  try {
    const temp = `${filePath}.tmp.${Date.now()}`;
    fs.writeFileSync(temp, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(temp, filePath);
  } catch (e) {
    console.error('fallbackWriteJson error:', e);
  }
}

// Active within 70s is considered online
const ONLINE_WINDOW_MS = 70 * 1000;

function dbGetProfiles() {
  const now = Date.now();
  let rawList = [];
  if (stmtGetProfiles) {
    rawList = stmtGetProfiles.all();
  } else {
    const map = fallbackReadJson(FALLBACK_PROFILES_FILE, {});
    rawList = Object.values(map).sort(
      (a, b) => new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime()
    );
  }

  return rawList.map((p) => {
    const isOnline = now - new Date(p.lastActiveAt).getTime() < ONLINE_WINDOW_MS;
    return { ...p, isOnline };
  });
}

function dbGetOnlineCount() {
  const now = Date.now();
  if (stmtGetProfiles) {
    const rows = stmtGetProfiles.all();
    return rows.filter((r) => now - new Date(r.lastActiveAt).getTime() < ONLINE_WINDOW_MS).length;
  }
  const map = fallbackReadJson(FALLBACK_PROFILES_FILE, {});
  return Object.values(map).filter(
    (p) => now - new Date(p.lastActiveAt).getTime() < ONLINE_WINDOW_MS
  ).length;
}

function dbGetProfile(username) {
  const key = (username || '').trim().toLowerCase();
  let p = null;
  if (stmtGetProfile) {
    p = stmtGetProfile.get(key) || null;
  } else {
    const map = fallbackReadJson(FALLBACK_PROFILES_FILE, {});
    p = map[key] || null;
  }
  if (!p) return null;
  const isOnline = Date.now() - new Date(p.lastActiveAt).getTime() < ONLINE_WINDOW_MS;
  return { ...p, isOnline };
}

function dbSaveProfile(profile) {
  const key = profile.username.trim().toLowerCase();
  if (stmtSaveProfile) {
    stmtSaveProfile.run(profile.username, profile.displayName, profile.createdAt, profile.lastActiveAt);
    return;
  }
  const map = fallbackReadJson(FALLBACK_PROFILES_FILE, {});
  map[key] = profile;
  fallbackWriteJson(FALLBACK_PROFILES_FILE, map);
}

function dbHeartbeat(username) {
  const key = (username || '').trim().toLowerCase();
  const now = new Date().toISOString();
  if (stmtHeartbeat) {
    stmtHeartbeat.run(now, key);
    return true;
  }
  const map = fallbackReadJson(FALLBACK_PROFILES_FILE, {});
  if (map[key]) {
    map[key].lastActiveAt = now;
    fallbackWriteJson(FALLBACK_PROFILES_FILE, map);
    return true;
  }
  return false;
}

function dbLogout(username) {
  const key = (username || '').trim().toLowerCase();
  const past = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  if (stmtLogout) {
    stmtLogout.run(past, key);
    return true;
  }
  const map = fallbackReadJson(FALLBACK_PROFILES_FILE, {});
  if (map[key]) {
    map[key].lastActiveAt = past;
    fallbackWriteJson(FALLBACK_PROFILES_FILE, map);
    return true;
  }
  return false;
}

function dbGetProgress(username) {
  const key = (username || '').trim().toLowerCase();
  if (stmtGetProgress) {
    const row = stmtGetProgress.get(key);
    if (row && row.data_json) {
      try {
        return JSON.parse(row.data_json);
      } catch (e) {
        console.error('Error parsing progress JSON:', e);
      }
    }
  } else {
    const map = fallbackReadJson(FALLBACK_PROGRESS_FILE, {});
    if (map[key]) return map[key];
  }

  return {
    username,
    attempts: [],
    bookmarks: [],
    wrongIds: [],
    exposureMap: {},
    updatedAt: new Date().toISOString(),
  };
}

function dbSaveProgress(progress) {
  const username = progress.username;
  const key = (username || '').trim().toLowerCase();
  const now = new Date().toISOString();
  progress.updatedAt = now;
  const jsonStr = JSON.stringify(progress);

  if (stmtSaveProgress) {
    stmtSaveProgress.run(username, jsonStr, now);
    return;
  }

  const map = fallbackReadJson(FALLBACK_PROGRESS_FILE, {});
  map[key] = progress;
  fallbackWriteJson(FALLBACK_PROGRESS_FILE, map);
}

function dbDeleteProfile(username) {
  const key = (username || '').trim().toLowerCase();
  if (stmtDeleteProfile && stmtDeleteProgress) {
    stmtDeleteProfile.run(key);
    stmtDeleteProgress.run(key);
    return;
  }
  const profs = fallbackReadJson(FALLBACK_PROFILES_FILE, {});
  delete profs[key];
  fallbackWriteJson(FALLBACK_PROFILES_FILE, profs);

  const prog = fallbackReadJson(FALLBACK_PROGRESS_FILE, {});
  delete prog[key];
  fallbackWriteJson(FALLBACK_PROGRESS_FILE, prog);
}

// ================= API Route Handler =================
function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 5 * 1024 * 1024) {
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, data) {
  const jsonBuf = Buffer.from(JSON.stringify(data));
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': jsonBuf.length,
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(jsonBuf);
}

async function handleApiRequest(req, res, urlObj) {
  const pathname = urlObj.pathname;
  const method = req.method;

  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    return res.end();
  }

  try {
    // 1. Health check
    if (pathname === '/api/health' && method === 'GET') {
      return sendJson(res, 200, {
        status: 'ok',
        database: sqliteDb ? 'sqlite' : 'file-json',
        dataDir: DATA_DIR,
        serverTime: new Date().toISOString(),
      });
    }

    // 2. Fast Online Count
    if (pathname === '/api/online-count' && method === 'GET') {
      return sendJson(res, 200, { onlineCount: dbGetOnlineCount() });
    }

    // 3. Get all profiles: GET /api/profiles
    if (pathname === '/api/profiles' && method === 'GET') {
      const profiles = dbGetProfiles();
      return sendJson(res, 200, profiles);
    }

    // 4. Login or Create User (Passwordless): POST /api/users/login
    if (pathname === '/api/users/login' && method === 'POST') {
      const body = await readBody(req);
      const rawName = (body.username || '').trim().replace(/\s+/g, ' ');
      const username = rawName || 'Học viên 1';
      const now = new Date().toISOString();

      let profile = dbGetProfile(username);
      let isNew = false;

      if (profile) {
        profile.lastActiveAt = now;
        dbSaveProfile(profile);
      } else {
        isNew = true;
        profile = {
          username,
          displayName: username,
          createdAt: now,
          lastActiveAt: now,
        };
        dbSaveProfile(profile);
      }

      const progress = dbGetProgress(profile.username);
      return sendJson(res, 200, { profile, progress, isNew });
    }

    // Match /api/users/:username/progress
    const progressMatch = pathname.match(/^\/api\/users\/([^/]+)\/progress$/);
    if (progressMatch) {
      const username = decodeURIComponent(progressMatch[1]);

      if (method === 'GET') {
        const progress = dbGetProgress(username);
        return sendJson(res, 200, progress);
      }

      if (method === 'PUT') {
        const progressData = await readBody(req);
        progressData.username = username;
        dbSaveProgress(progressData);
        dbHeartbeat(username);
        return sendJson(res, 200, { success: true, updatedAt: progressData.updatedAt });
      }
    }

    // Match /api/users/:username/heartbeat: POST
    const heartbeatMatch = pathname.match(/^\/api\/users\/([^/]+)\/heartbeat$/);
    if (heartbeatMatch && method === 'POST') {
      const username = decodeURIComponent(heartbeatMatch[1]);
      const updated = dbHeartbeat(username);
      const onlineCount = dbGetOnlineCount();
      return sendJson(res, 200, { success: updated, isOnline: true, onlineCount });
    }

    // Match /api/users/:username/logout: POST
    const logoutMatch = pathname.match(/^\/api\/users\/([^/]+)\/logout$/);
    if (logoutMatch && method === 'POST') {
      const username = decodeURIComponent(logoutMatch[1]);
      dbLogout(username);
      return sendJson(res, 200, { success: true });
    }

    // Match /api/users/:username/reset: POST
    const resetMatch = pathname.match(/^\/api\/users\/([^/]+)\/reset$/);
    if (resetMatch && method === 'POST') {
      const username = decodeURIComponent(resetMatch[1]);
      const body = await readBody(req);
      const keepBookmarks = Boolean(body.keepBookmarks);

      const current = dbGetProgress(username);
      const updated = {
        ...current,
        username,
        attempts: [],
        wrongIds: [],
        exposureMap: {},
        bookmarks: keepBookmarks ? current.bookmarks : [],
        updatedAt: new Date().toISOString(),
      };

      dbSaveProgress(updated);
      return sendJson(res, 200, updated);
    }

    // Match /api/users/:username: DELETE
    const userMatch = pathname.match(/^\/api\/users\/([^/]+)$/);
    if (userMatch && method === 'DELETE') {
      const username = decodeURIComponent(userMatch[1]);
      dbDeleteProfile(username);
      return sendJson(res, 200, { success: true });
    }

    return sendJson(res, 404, { error: 'API route not found' });
  } catch (err) {
    console.error('API Error:', err);
    return sendJson(res, 500, { error: err.message || 'Internal API Error' });
  }
}

// ================= High-Performance Static File Serving with RAM Cache =================
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
};

// In-memory cache for ultra-low latency & zero CPU streaming overhead
const staticCache = new Map();

function getCachedFile(filePath, ext) {
  try {
    const stat = fs.statSync(filePath);
    const key = `${filePath}:${stat.mtimeMs}`;
    let item = staticCache.get(key);
    if (!item) {
      const raw = fs.readFileSync(filePath);
      const compressible = ['.html', '.js', '.css', '.json', '.svg'].includes(ext);
      const gzipped = compressible ? gzipSync(raw, { level: 6 }) : null;
      const etag = `W/"${stat.size}-${stat.mtimeMs}"`;
      item = { raw, gzipped, etag, mtime: stat.mtime };
      // Limit cache size to 100 items
      if (staticCache.size > 100) staticCache.clear();
      staticCache.set(key, item);
    }
    return item;
  } catch {
    return null;
  }
}

function handleRequest(req, res) {
  try {
    const urlObj = new URL(req.url || '/', 'http://localhost');

    // Route /api requests to API Handler
    if (urlObj.pathname.startsWith('/api/')) {
      return handleApiRequest(req, res, urlObj);
    }

    let pathname = decodeURIComponent(urlObj.pathname);
    if (pathname === '/') pathname = '/index.html';

    // Prevent directory traversal
    const safePath = path.normalize(pathname).replace(/^(\.\.(\/|\\|$))+/, '');
    let filePath = path.join(DIST_DIR, safePath);

    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(DIST_DIR, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const isAsset = safePath.startsWith('assets/');

    // Assets can cache forever; HTML & JSON use 304 revalidation
    const cacheControl = isAsset
      ? 'public, max-age=31536000, immutable'
      : (ext === '.html' || ext === '.json')
      ? 'no-cache, must-revalidate'
      : 'public, max-age=3600';

    const cached = getCachedFile(filePath, ext);
    if (!cached) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('File Not Found');
    }

    // 304 Not Modified Check (Zero bandwidth)
    if (req.headers['if-none-match'] === cached.etag) {
      res.writeHead(304, {
        'ETag': cached.etag,
        'Cache-Control': cacheControl,
      });
      return res.end();
    }

    const acceptEncoding = String(req.headers['accept-encoding'] || '');
    const useGzip = Boolean(cached.gzipped && /\bgzip\b/.test(acceptEncoding));
    const body = useGzip ? cached.gzipped : cached.raw;

    const headers = {
      'Content-Type': contentType,
      'Content-Length': body.length,
      'ETag': cached.etag,
      'Cache-Control': cacheControl,
    };
    if (useGzip) {
      headers['Content-Encoding'] = 'gzip';
      headers['Vary'] = 'Accept-Encoding';
    }

    res.writeHead(200, headers);
    res.end(body);
  } catch (err) {
    console.error('Request handling error:', err);
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Internal Server Error');
  }
}

const httpServer = http.createServer(handleRequest);

let httpsServer = null;
const SSL_CERT = process.env.SSL_CERT;
const SSL_KEY = process.env.SSL_KEY;

if (SSL_CERT && SSL_KEY && fs.existsSync(SSL_CERT) && fs.existsSync(SSL_KEY)) {
  try {
    const httpsOptions = {
      cert: fs.readFileSync(SSL_CERT),
      key: fs.readFileSync(SSL_KEY),
    };
    httpsServer = https.createServer(httpsOptions, handleRequest);
  } catch (err) {
    console.error('Failed to initialize HTTPS:', err);
  }
}

// Multiplex HTTP and HTTPS on the same port if SSL certificates exist
const server = net.createServer((socket) => {
  socket.once('data', (buffer) => {
    socket.pause();
    const isTls = buffer[0] === 22; // TLS handshake byte
    const targetServer = isTls && httpsServer ? httpsServer : httpServer;
    socket.unshift(buffer);
    targetServer.emit('connection', socket);
    process.nextTick(() => socket.resume());
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`ISTQB Web & DB Server running on http://0.0.0.0:${PORT} (Database: ${DATA_DIR})`);
});
