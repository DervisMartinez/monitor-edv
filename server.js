/**
 * EDV MONITOR - SERVIDOR WEB DE PRODUCCIÓN PARA AAPANEL / VPS
 * Empresas del Valle - Panel Administrativo de Plantas Eléctricas
 * 
 * Diseñado para ejecutarse en aaPanel (Node.js Project Manager o PM2)
 * Sirve los archivos compilados en /dist con soporte SPA (Single Page Application)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = parseInt(process.env.PORT || '8081', 10);
const DIST_DIR = path.join(__dirname, 'dist');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.map': 'application/json',
};

const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Parse path
  let safePath = req.url.split('?')[0];
  if (safePath === '/') safePath = '/index.html';

  let filePath = path.join(DIST_DIR, safePath);

  // Security check: prevent directory traversal
  if (!filePath.startsWith(DIST_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // SPA Fallback: serve index.html for client-side routing
      const indexPath = path.join(DIST_DIR, 'index.html');
      fs.readFile(indexPath, (indexErr, indexData) => {
        if (indexErr) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Error: Asegúrate de compilar la app con "npm run build" antes de iniciar el servidor.');
          return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(indexData);
      });
      return;
    }

    // Serve requested file
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // Cache control: cache immutable static assets, revalidate HTML
    if (ext === '.html') {
      res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('=====================================================');
  console.log('🚀 EMPRESAS DEL VALLE - PANEL WEB ADMINISTRATIVO');
  console.log(`🌐 Servidor activo en http://0.0.0.0:${PORT}`);
  console.log(`📁 Directorio servido: ${DIST_DIR}`);
  console.log('=====================================================');
});
