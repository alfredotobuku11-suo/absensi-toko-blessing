const CACHE_NAME = 'absensi-blessing-v3';
const urlsToCache = [
  './',
  './index.html',
  './app.js',
  './html5-qrcode.min.js',
  './20260921_171622_0000.png',
  './manifest.json'
];

// 1. Install & Simpan ke Cache
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache v3 berhasil dibuka');
        return cache.addAll(urlsToCache);
      })
  );
  // Memaksa SW baru untuk langsung aktif tanpa menunggu halaman ditutup
  self.skipWaiting();
});

// 2. Ambil dari Cache saat Offline (VERSI TAHAN BANTING)
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Coba cari di brankas dulu, kalau tidak ada baru ambil dari internet
        return response || fetch(event.request);
      })
      .catch(() => {
        // JIKA INTERNET MATI (fetch gagal), paksa berikan halaman index.html
        // Ini adalah kunci utama untuk membunuh layar "Anda offline" bawaan Chrome!
        if (event.request.mode === 'navigate' || event.request.headers.get('accept').includes('text/html')) {
            return caches.match('./index.html');
        }
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
            console.log('Menghapus cache lama:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Langsung ambil alih kontrol dari semua halaman yang sedang terbuka
  self.clients.claim();
});
