// Minimal, host-agnostic production server for the exported web build
// (`npx expo export --platform web`). Expo Router's web export produces
// static HTML per route plus small self-contained CommonJS function
// modules for API routes (app/api/**/+api.ts) - there's no bundled Node
// server to run them, so this file is that server. It only depends on
// Node's built-ins (http, fs, path) and Node 18+'s global fetch/Request/
// Response, so it runs on any plain Node host - no platform-specific
// adapter needed.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const DIST_DIR = path.join(__dirname, 'dist');
const CLIENT_DIR = path.join(DIST_DIR, 'client');
const SERVER_DIR = path.join(DIST_DIR, 'server');
const PORT = process.env.PORT || 3000;

const routes = JSON.parse(fs.readFileSync(path.join(SERVER_DIR, '_expo', 'routes.json'), 'utf-8'));

const apiRoutes = routes.apiRoutes.map((r) => ({ ...r, regex: new RegExp(r.namedRegex) }));
const htmlRoutes = routes.htmlRoutes.map((r) => ({ ...r, regex: new RegExp(r.namedRegex) }));
const notFoundRoute = routes.notFoundRoutes[0];

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.wasm': 'application/wasm',
  '.map': 'application/json; charset=utf-8',
};

function contentTypeFor(filePath) {
  return CONTENT_TYPES[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream';
}

// Required for expo-sqlite's web storage backend (SharedArrayBuffer) to
// work at all in the browser - see metro.config.js for the same headers
// applied during local dev, and the README for why these are needed.
function setSecurityHeaders(res) {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
}

function serveStaticFile(res, filePath) {
  const stream = fs.createReadStream(filePath);
  stream.on('error', () => {
    res.writeHead(404);
    res.end('Not found');
  });
  res.writeHead(200, { 'Content-Type': contentTypeFor(filePath) });
  stream.pipe(res);
}

async function nodeRequestToWebRequest(req) {
  const url = `http://${req.headers.host}${req.url}`;
  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
  let body;
  if (hasBody) {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    body = Buffer.concat(chunks);
  }
  return new Request(url, { method: req.method, headers: req.headers, body });
}

async function writeWebResponse(res, webResponse) {
  const headers = {};
  webResponse.headers.forEach((value, key) => {
    headers[key] = value;
  });
  res.writeHead(webResponse.status, headers);
  const buffer = Buffer.from(await webResponse.arrayBuffer());
  res.end(buffer);
}

const server = http.createServer(async (req, res) => {
  setSecurityHeaders(res);

  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);

  // 1. Static assets (JS bundles, fonts, images, manifest, favicon, ...).
  const staticCandidate = path.join(CLIENT_DIR, pathname);
  if (pathname !== '/' && staticCandidate.startsWith(CLIENT_DIR) && fs.existsSync(staticCandidate) && fs.statSync(staticCandidate).isFile()) {
    return serveStaticFile(res, staticCandidate);
  }

  // 2. API routes - dynamically load the matching function module and
  // invoke the export matching the HTTP method (GET, POST, ...).
  const apiMatch = apiRoutes.find((r) => r.regex.test(pathname));
  if (apiMatch) {
    try {
      const modulePath = path.join(SERVER_DIR, apiMatch.file);
      delete require.cache[require.resolve(modulePath)];
      const mod = require(modulePath);
      const handler = mod[req.method];
      if (!handler) {
        res.writeHead(405, { 'Content-Type': 'text/plain' });
        return res.end('Method not allowed');
      }
      const webRequest = await nodeRequestToWebRequest(req);
      const webResponse = await handler(webRequest);
      return await writeWebResponse(res, webResponse);
    } catch (error) {
      console.error(`API route ${pathname} failed:`, error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Internal server error' }));
    }
  }

  // 3. Pre-rendered HTML pages.
  const htmlMatch = htmlRoutes.find((r) => r.regex.test(pathname));
  if (htmlMatch) {
    const htmlFile = path.join(SERVER_DIR, htmlMatch.page + '.html');
    if (fs.existsSync(htmlFile)) return serveStaticFile(res, htmlFile);
  }

  // 4. Not found.
  if (notFoundRoute) {
    const notFoundFile = path.join(SERVER_DIR, notFoundRoute.page + '.html');
    if (fs.existsSync(notFoundFile)) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      return fs.createReadStream(notFoundFile).pipe(res);
    }
  }
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`Simple Macros web server listening on port ${PORT}`);
});
