const CACHE_NAME = 'absensi-blessing-v1';
const urlsToCache = [
  './',
  './index.html',
  './app.js',
  './html5-qrcode.min.js', // file kamera lokal
  './manifest.json'
];

// 1. Install & Simpan ke Cache
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache berhasil dibuka');
        return cache.addAll(urlsToCache);
      })
  );
});

// 2. Ambil dari Cache saat Offline
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Kalau file ada di cache (memori lokal), pakai itu. Kalau tidak, download dari internet.
        return response || fetch(event.request);
      })
  );
});

// 3. Bersihkan Cache Lama jika ada Update
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
