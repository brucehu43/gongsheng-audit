/* 公勝稽核表 service worker：預先快取本站檔案，供離線使用。
   發布新版時請同時修改 index.html 內的 APP_VERSION 與這裡的 VERSION，舊快取會自動清除。 */
const VERSION = '1.0.0';
const CACHE = 'gongsheng-audit-' + VERSION;
const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-64.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(PRECACHE.map((u) => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((k) => k.startsWith('gongsheng-audit-') && k !== CACHE)
        .map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // 外部網站一律直接走網路，不經快取。
  if (url.origin !== self.location.origin) return;

  // 頁面本身：先抓網路上的最新版，連不上才用快取（離線可開）。
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put('./index.html', copy));
          }
          return res;
        })
        .catch(() => caches.match('./index.html', { cacheName: CACHE })
          .then((hit) => hit || caches.match('./')))
    );
    return;
  }

  // 圖示、manifest 等靜態檔：快取優先，沒有才抓網路。
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req))
  );
});
