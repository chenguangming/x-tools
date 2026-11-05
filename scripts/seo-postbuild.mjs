import process from 'node:process';

// Post-build SEO step: writes sitemap.xml, extends robots.txt and pre-renders every tool page,
// so crawlers get the title, description and content in the initial HTML.
// Needs Chrome/Chromium (CHROME_PATH, defaults to /usr/bin/google-chrome) and an existing dist/.
// Usage: SITE_URL=https://example.com node scripts/seo-postbuild.mjs
import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const siteUrl = (process.env.SITE_URL ?? '').replace(/\/+$/, '');
const chromePath = process.env.CHROME_PATH ?? '/usr/bin/google-chrome';
const concurrency = Number(process.env.PRERENDER_CONCURRENCY ?? 3);

if (!siteUrl) {
  console.error('SITE_URL is required, e.g. SITE_URL=https://xtools.codestudio.uk');
  process.exit(1);
}
if (!existsSync(join(dist, 'index.html'))) {
  console.error('dist/index.html not found, run the build first');
  process.exit(1);
}
if (!existsSync(chromePath)) {
  console.error(`Chrome not found at ${chromePath}, set CHROME_PATH`);
  process.exit(1);
}

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.wasm': 'application/wasm',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain',
};

// static server with the same SPA fallback as the real nginx
const server = createServer(async (req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  let file = join(dist, urlPath);
  try {
    if ((await stat(file)).isDirectory()) {
      file = join(file, 'index.html');
    }
    await stat(file);
  }
  catch {
    file = join(dist, 'index.html');
  }
  res.setHeader('Content-Type', mimeTypes[extname(file)] ?? 'application/octet-stream');
  res.end(await readFile(file));
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch({ executablePath: chromePath, args: ['--no-sandbox', '--no-proxy-server'] });
const context = await browser.newContext({ locale: 'en-US' });
// never send analytics from the pre-render browser
await context.route('**/_s/**', route => route.abort());

async function openPage(path) {
  const page = await context.newPage();
  await page.goto(`${origin}${path}`, { waitUntil: 'domcontentloaded' });
  return page;
}

// the router is the single source of truth for which tools exist
const home = await openPage('/');
await home.waitForSelector('#app > *', { timeout: 60_000 });
const toolPaths = await home.evaluate(() =>
  document.querySelector('#app').__vue_app__.config.globalProperties.$router
    .getRoutes()
    .filter(route => route.meta?.isTool)
    .map(route => route.path),
);
await home.close();

const paths = [...new Set(toolPaths)].sort();
console.log(`Pre-rendering ${paths.length + 1} pages...`);

async function render(path) {
  const page = await openPage(path);
  try {
    await page.waitForSelector(path === '/about' ? '#app h1, #app h2' : '.tool-layout h1', { timeout: 60_000 });
    await page.waitForTimeout(800);
    const rendered = await page.evaluate(() => document.documentElement.outerHTML);
    // canonical/og:url were generated from the local pre-render origin
    const html = `<!DOCTYPE html>\n${rendered.replaceAll(origin, siteUrl)}`;
    const target = join(dist, path, 'index.html');
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, html);
  }
  finally {
    await page.close();
  }
}

const queue = ['/about', ...paths];
const failed = [];
await Promise.all(Array.from({ length: concurrency }, async () => {
  while (queue.length > 0) {
    const path = queue.shift();
    try {
      await render(path);
      console.log(`  ok ${path}`);
    }
    catch (error) {
      failed.push(path);
      console.warn(`  FAILED ${path}: ${error.message.split('\n')[0]}`);
    }
  }
}));

await browser.close();
server.close();

const lastmod = new Date().toISOString().slice(0, 10);
const urls = ['/', '/about', ...paths].map(path =>
  `  <url><loc>${siteUrl}${path === '/' ? '/' : path}</loc><lastmod>${lastmod}</lastmod></url>`);
await writeFile(join(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`);

const robotsPath = join(dist, 'robots.txt');
const robots = existsSync(robotsPath) ? readFileSync(robotsPath, 'utf8').trimEnd() : 'User-agent: *\nDisallow:';
await writeFile(robotsPath, `${robots}\n\nSitemap: ${siteUrl}/sitemap.xml\n`);

console.log(`sitemap.xml: ${urls.length} urls, pre-rendered: ${paths.length + 1 - failed.length}, failed: ${failed.length}`);
process.exit(failed.length > 0 ? 1 : 0);
