import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../site/', import.meta.url));
const port = Number(process.env.SITE_PORT || 4173);
const projectPrefix = '/deepseek-harness-themes';
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml' };

createServer(async (request, response) => {
  try {
    if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405).end(); return; }
    const url = new URL(request.url, `http://127.0.0.1:${port}`);
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === projectPrefix) { response.writeHead(302, { Location: `${projectPrefix}/` }).end(); return; }
    if (pathname.startsWith(`${projectPrefix}/`)) pathname = pathname.slice(projectPrefix.length);
    let path = resolve(root, `.${pathname}`);
    if (path !== resolve(root) && !path.startsWith(root.endsWith(sep) ? root : `${root}${sep}`)) { response.writeHead(403).end(); return; }
    if ((await stat(path)).isDirectory()) {
      if (!url.pathname.endsWith('/')) { response.writeHead(302, { Location: `${url.pathname}/` }).end(); return; }
      path = resolve(path, 'index.html');
    }
    const data = await readFile(path);
    response.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    response.end(request.method === 'HEAD' ? undefined : data);
  } catch { response.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found'); }
}).listen(port, '127.0.0.1', () => console.log(`Landing page: http://127.0.0.1:${port}/zh/\nProject-path preview: http://127.0.0.1:${port}${projectPrefix}/zh/`));
