/* Offline cache for the app shell. Drive API calls are never cached. */
const CACHE = 'quote-desk-v1.2.0';
const SHELL = ['./', 'index.html', 'css/app.css', 'manifest.webmanifest', 'logo.png',
  'js/config.js', 'js/data.js', 'js/sample.js', 'js/sync.js', 'js/pdf.js', 'js/app.js',
  'vendor/pdf-lib.min.js', 'vendor/pdfjs/pdf.min.mjs', 'vendor/pdfjs/pdf.worker.min.mjs',
  'vendor/pdfjs/standard_fonts/LiberationSans-Regular.ttf', 'vendor/pdfjs/standard_fonts/LiberationSans-Bold.ttf',
  'fonts/Poppins-Regular.ttf', 'fonts/Poppins-Medium.ttf', 'fonts/Poppins-Bold.ttf',
  'logo_mono.png', 'icons/mark.png', 'icons/favicon.png', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  // Network first for the page itself (gets updates), cache first for everything else.
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put('index.html', copy)); return r; }).catch(() => caches.match('index.html')));
    return;
  }
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request)));
});
