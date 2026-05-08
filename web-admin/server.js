const fs = require('fs/promises');
const http = require('http');
const https = require('https');
const path = require('path');

const PORT = Number(process.env.PORT || 8787);
const ROOT_DIR = path.join(__dirname, '..');
const CATALOG_PATH = path.join(ROOT_DIR, 'app', 'src', 'main', 'assets', 'catalog.json');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml; charset=utf-8',
};

const STATIC_ROUTES = new Map([
  ['/', 'index.html'],
  ['/index.html', 'index.html'],
  ['/admin', 'admin.html'],
  ['/admin/', 'admin.html'],
  ['/admin.html', 'admin.html'],
  ['/tv', 'tv.html'],
  ['/tv/', 'tv.html'],
  ['/tv.html', 'tv.html'],
  ['/app.js', 'app.js'],
  ['/styles.css', 'styles.css'],
  ['/tv.js', 'tv.js'],
  ['/tv.css', 'tv.css'],
  ['/logo.png', 'logo.png'],
]);

function send(res, statusCode, body, contentType = 'text/plain; charset=utf-8') {
  res.writeHead(statusCode, {
    'Content-Type': contentType,
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

async function readCatalog() {
  const text = await fs.readFile(CATALOG_PATH, 'utf8');
  return JSON.parse(text);
}

async function writeCatalog(catalog) {
  const normalized = JSON.stringify(catalog, null, 2);
  await fs.writeFile(CATALOG_PATH, `${normalized}\n`, 'utf8');
}

function getMimeType(filePath) {
  return MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
}

async function serveStatic(res, fileName) {
  const filePath = path.join(__dirname, fileName);
  const body = await fs.readFile(filePath);
  send(res, 200, body, getMimeType(filePath));
}

function extractYouTubeVideoId(input) {
  const raw = String(input || '').trim();
  if (!raw) {
    return null;
  }

  if (/^[A-Za-z0-9_-]{11}$/.test(raw)) {
    return raw;
  }

  try {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase();

    if (host === 'youtu.be') {
      const shortId = url.pathname.split('/').filter(Boolean)[0];
      return shortId ? shortId.slice(0, 11) : null;
    }

    if (host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com')) {
      const videoId = url.searchParams.get('v');
      if (videoId) {
        return videoId.slice(0, 11);
      }

      const segments = url.pathname.split('/').filter(Boolean);
      if (['embed', 'shorts', 'live'].includes(segments[0]) && segments[1]) {
        return segments[1].slice(0, 11);
      }
    }
  } catch (error) {
    return null;
  }

  return null;
}

function requestJson(urlString, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    const request = https.get(urlString, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'LilloAdmin/1.0',
      },
    }, (response) => {
      const statusCode = response.statusCode || 0;
      const location = response.headers.location;

      if (statusCode >= 300 && statusCode < 400 && location) {
        response.resume();
        if (redirectCount >= 4) {
          reject(new Error('Too many redirects while reading YouTube metadata.'));
          return;
        }

        const nextUrl = new URL(Array.isArray(location) ? location[0] : location, urlString).toString();
        resolve(requestJson(nextUrl, redirectCount + 1));
        return;
      }

      if (statusCode !== 200) {
        response.resume();
        reject(new Error(`Request failed with status ${statusCode}.`));
        return;
      }

      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => {
        body += chunk;
      });
      response.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(new Error('Failed to parse YouTube metadata response.'));
        }
      });
    });

    request.setTimeout(6000, () => {
      request.destroy(new Error('YouTube metadata request timed out.'));
    });
    request.on('error', reject);
  });
}

async function fetchYouTubeInfo(rawUrl) {
  const videoId = extractYouTubeVideoId(rawUrl);
  if (!videoId) {
    throw new Error('Invalid YouTube URL.');
  }

  const watchUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
  const oEmbedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`;
  const metadata = await requestJson(oEmbedUrl);

  return {
    videoId,
    title: metadata.title || '',
    authorName: metadata.author_name || '',
    providerName: metadata.provider_name || '',
    thumbnailUrl: metadata.thumbnail_url || '',
    html: metadata.html || '',
  };
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let totalLength = 0;
    req.on('data', (chunk) => {
      chunks.push(chunk);
      totalLength += chunk.length;
      if (totalLength > 2 * 1024 * 1024) {
        reject(new Error('Request body too large.'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  try {
    if (req.method === 'GET' && STATIC_ROUTES.has(url.pathname)) {
      return serveStatic(res, STATIC_ROUTES.get(url.pathname));
    }

    if (req.method === 'GET' && url.pathname === '/api/catalog') {
      const catalog = await readCatalog();
      return send(res, 200, JSON.stringify(catalog, null, 2), 'application/json; charset=utf-8');
    }

    if (req.method === 'GET' && url.pathname === '/api/youtube-info') {
      const rawUrl = url.searchParams.get('url') || '';
      const metadata = await fetchYouTubeInfo(rawUrl);
      return send(res, 200, JSON.stringify({
        ok: true,
        ...metadata,
      }, null, 2), 'application/json; charset=utf-8');
    }

    if ((req.method === 'PUT' || req.method === 'POST') && url.pathname === '/api/catalog') {
      const body = await readBody(req);
      const parsed = JSON.parse(body);

      const hasPages = Array.isArray(parsed?.pages);
      const hasCategories = Array.isArray(parsed?.categories);

      if (!parsed || typeof parsed !== 'object' || (!hasPages && !hasCategories)) {
        return send(res, 400, JSON.stringify({ error: 'Invalid catalog payload.' }), 'application/json; charset=utf-8');
      }

      if ('pages' in parsed && !hasPages) {
        return send(res, 400, JSON.stringify({ error: 'Invalid pages array.' }), 'application/json; charset=utf-8');
      }

      if ('categories' in parsed && !hasCategories) {
        return send(res, 400, JSON.stringify({ error: 'Invalid categories array.' }), 'application/json; charset=utf-8');
      }

      await writeCatalog(parsed);
      return send(res, 200, JSON.stringify({
        ok: true,
        updatedAt: new Date().toISOString(),
      }), 'application/json; charset=utf-8');
    }

    if (req.method === 'GET' && url.pathname === '/health') {
      return send(res, 200, 'ok');
    }

    return send(res, 404, 'Not found');
  } catch (error) {
    return send(
      res,
      500,
      JSON.stringify({ error: error.message || 'Unexpected server error.' }),
      'application/json; charset=utf-8',
    );
  }
});

server.listen(PORT, () => {
  console.log(`Lillo site local running on http://localhost:${PORT}`);
  console.log(`Routes: /, /admin, /tv, /api/catalog, /api/youtube-info`);
  console.log(`Catalog file: ${CATALOG_PATH}`);
});
