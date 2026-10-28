import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import fs from 'node:fs';
import path from 'node:path';
import { createGzip } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.join(__dirname, 'dist');
const PORT = Number(process.env.PORT || 3030);

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

function handleRequest(req, res) {
  try {
    const urlObj = new URL(req.url || '/', 'http://localhost');
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

    // HTML and the runtime-fetched exams dataset (.json) must never be served
    // stale; hashed JS/CSS and images can cache for a day.
    const cacheControl =
      ext === '.html' || ext === '.json' ? 'no-cache' : 'public, max-age=86400';

    // Gzip text-based responses when the client supports it: the JS bundle and
    // the ~1 MB exams dataset JSON shrink by roughly 70% on the wire.
    const compressible = ['.html', '.js', '.css', '.json', '.svg'].includes(ext);
    const acceptEncoding = String(req.headers['accept-encoding'] || '');
    const useGzip = compressible && /\bgzip\b/.test(acceptEncoding);

    const headers = {
      'Content-Type': contentType,
      'Cache-Control': cacheControl,
    };
    let stream = fs.createReadStream(filePath);
    if (useGzip) {
      headers['Content-Encoding'] = 'gzip';
      headers['Vary'] = 'Accept-Encoding';
      stream = stream.pipe(createGzip());
    }
    res.writeHead(200, headers);
    stream.pipe(res);
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Internal Server Error');
  }
}

const httpServer = http.createServer(handleRequest);

let httpsServer = null;
const certPath = path.join(__dirname, 'cert.pem');
const keyPath = path.join(__dirname, 'key.pem');
if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
  httpsServer = https.createServer(
    {
      cert: fs.readFileSync(certPath),
      key: fs.readFileSync(keyPath),
    },
    handleRequest
  );
}

// Multiplex HTTP and HTTPS on the same port (3030)
const server = net.createServer((socket) => {
  socket.once('readable', () => {
    const chunk = socket.read(1);
    if (!chunk) return;
    socket.unshift(chunk);
    // 0x16 (22) is TLS Handshake record
    if (chunk[0] === 0x16 && httpsServer) {
      httpsServer.emit('connection', socket);
    } else {
      httpServer.emit('connection', socket);
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`ISTQB Web Server running on http://0.0.0.0:${PORT} (HTTP + HTTPS multiplex)`);
});

