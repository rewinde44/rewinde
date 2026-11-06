import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = dirname(fileURLToPath(import.meta.url));
// Static files only: no workspace API, request-body processing or disk writes.
export async function createApp() {
  return http.createServer(async (req, res) => {
    const reply = (code, message) => { res.writeHead(code, { 'Content-Type':'text/plain; charset=utf-8' }); res.end(req.method === 'HEAD' ? undefined : message); };
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
    res.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'none'; font-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'");
    try {
      const hostname = new URL('http://' + (req.headers.host || 'invalid')).hostname;
      const allowedHosts = (process.env.ALLOWED_HOSTS || 'localhost,127.0.0.1,[::1]').split(',').map(x=>x.trim());
      if (!allowedHosts.includes(hostname)) return reply(403, 'Dieser Hostname ist nicht freigegeben.');
      if (!['GET','HEAD'].includes(req.method)) { res.setHeader('Allow','GET, HEAD'); return reply(405,'Nur statische Dateien werden ausgeliefert.'); }
      const url = new URL(req.url, 'http://localhost');
      const publicRoot = resolve(root,'public');
      let path;
      try { path = resolve(publicRoot, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname)); } catch { return reply(400,'Ungültiger Pfad.'); }
      if (!path.startsWith(publicRoot + sep)) return reply(403,'Zugriff verweigert.');
      const types = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.svg':'image/svg+xml' };
      if (!types[extname(path)]) return reply(404,'Nicht gefunden.');
      const bytes = await readFile(path);
      res.writeHead(200, {'Content-Type':types[extname(path)]});
      res.end(req.method === 'HEAD' ? undefined : bytes);
    } catch(e) { reply(e.code === 'ENOENT' ? 404 : 500, e.code === 'ENOENT' ? 'Nicht gefunden.' : 'Datei konnte nicht geladen werden.'); }
  });
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 4173), host = process.env.HOST || '127.0.0.1';
  const server = await createApp();
  server.on('error', error => { console.error(error.message); process.exit(1); });
  server.listen(port, host, () => console.log('Rewinde läuft: http://' + host + ':' + port + '\nStatischer Testserver · Prozessdaten verbleiben im Browser'));
}
