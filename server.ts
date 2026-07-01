import { ɵsetAngularAppEngineManifest, ɵsetAngularAppManifest, ɵgetOrCreateAngularServerApp } from '@angular/ssr';
import express from 'express';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';

const __dirname = dirname(fileURLToPath(import.meta.url));
const browserDistFolder = resolve(__dirname, '../browser');

const angularAppManifest = (await import('./angular-app-manifest.mjs')).default;
const angularAppEngineManifest = (await import('./angular-app-engine-manifest.mjs')).default;

angularAppEngineManifest.allowedHosts = ['localhost', '127.0.0.1'];

ɵsetAngularAppManifest(angularAppManifest);
ɵsetAngularAppEngineManifest(angularAppEngineManifest);

const app = express();
const basePath = angularAppEngineManifest.basePath;

// Suppress NG0201 console spam from Angular SSR internals
// (Router factory tries DI resolution; Angular catches it internally)
process.on('uncaughtException', (err) => {
  if (err.message?.includes('NG0201')) return; // skip
});

const serverApp = ɵgetOrCreateAngularServerApp({ allowStaticRouteRender: true });

// Static files (browser dist)
app.use(
  basePath,
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
    setHeaders: (res) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    },
  }),
);

// SSR handler
app.use(async (req, res) => {
  let url = req.originalUrl;
  // Strip baseHref prefix so SSR route tree matches
  if (basePath !== '/' && url.startsWith(basePath)) {
    url = url.slice(basePath.length) || '/';
  }

  const requestUrl = `http://localhost:4000${basePath}${url === '/' ? '' : url}`;

  try {
    const response = await serverApp.handle(
      new Request(requestUrl, {
        headers: {
          host: 'localhost:4000',
          'x-forwarded-proto': 'https',
          'x-forwarded-for': req.ip,
        },
      }),
      { url: `${basePath}${url === '/' ? '' : url}` },
    );

    if (response) {
      for (const [k, v] of response.headers.entries()) {
        if (k.toLowerCase() === 'content-length') continue; // let Express set this
        res.setHeader(k, v);
      }
      res.status(response.status);

      if (response.body) {
        // Stream the ReadableStream body
        const reader = response.body.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(value);
          }
        } finally {
          reader.releaseLock();
        }
        res.end();
      } else {
        res.send(await response.text());
      }
    } else {
      // No matching SSR route — serve static or 404
      res.status(404).send('Not found');
    }
  } catch (err) {
    console.error(`[SSR] Error handling ${req.originalUrl}:`, err.message);
    res.status(500).send('Internal Server Error');
  }
});

const port = Number(process.env['PORT']) || 4000;
createServer(app).listen(port, () => {
  console.log(`\n  ◆ SSR server running at http://localhost:${port}${basePath}`);
  console.log(`  ◆ Serving browser assets from: ${browserDistFolder}`);
  console.log(`  ◆ baseHref: ${basePath}\n`);
});

export {};
