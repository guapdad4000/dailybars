// ============================================================================
// DAILY BARS SERVICE WORKER - v22
// NETWORK-FIRST strategy - NOW WITH SUPABASE 🔥
// ============================================================================

const CACHE_NAME = 'daily-bars-v22';
const CACHE_VERSION = 22;

const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/style.css',
  '/js/app.js',
  '/js/app-views.js',
  '/js/daily-deposit-engine.js',
  '/images/smooth-paper-texture.jpg',
  '/images/newspaper-sprites.png'
];

// External CDN resources (cache these too)
const cdnResources = [
  'https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Archivo+Black&family=IBM+Plex+Mono:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,700;0,900;1,700&display=swap',
  'https://cdn.jsdelivr.net/npm/react@18/umd/react.production.min.js',
  'https://cdn.jsdelivr.net/npm/react-dom@18/umd/react-dom.production.min.js',
  'https://unpkg.com/lucide@latest/dist/umd/lucide.min.js',
  'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

// Critical files that should ALWAYS be network-first
const networkFirstFiles = [
  'index.html',
  'app.js',
  'app-views.js',
  'daily-deposit-engine.js',
  'style.css',
  'manifest.json',
  'service-worker.js'
];

// Install event - cache essential files
self.addEventListener('install', (event) => {
  console.log(`🔧 Service Worker v${CACHE_VERSION} installing...`);
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Caching app shell...');
        return Promise.allSettled(
          urlsToCache.map(async (url) => {
            try {
              // Add cache-busting param
              const bustUrl = url + (url.includes('?') ? '&' : '?') + '_v=' + CACHE_VERSION;
              const response = await fetch(bustUrl, { cache: 'no-store' });
              if (response.ok) {
                await cache.put(url, response);
              }
            } catch (error) {
              console.error(`🚫 Cache add failed: ${url}`, error);
            }
          })
        ).then(() => {
          return Promise.allSettled(
            cdnResources.map(async (url) => {
              try {
                await cache.add(url);
              } catch (err) {
                console.log(`CDN cache skip: ${url}`);
              }
            })
          );
        });
      })
      .catch((error) => {
        console.error('❌ Cache install failed:', error);
      })
  );
  
  // Force this service worker to become active immediately
  self.skipWaiting();
});

// Activate event - NUKE ALL old caches
self.addEventListener('activate', (event) => {
  console.log(`✅ Service Worker v${CACHE_VERSION} activating...`);
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete ANY cache that isn't our current version
          if (cacheName !== CACHE_NAME) {
            console.log(`🗑️ Nuking old cache: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log(`🚀 Service Worker v${CACHE_VERSION} now active!`);
      // Notify all clients to refresh
      return self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'SW_ACTIVATED', version: CACHE_VERSION });
        });
      });
    })
  );
  
  // Take control of all clients immediately
  self.clients.claim();
});

// Check if file is critical (should be network-first)
function isCriticalFile(url) {
  return networkFirstFiles.some(file => url.includes(file));
}

// Fetch event - NETWORK-FIRST for critical files
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // 1. Skip non-GET requests entirely
  if (event.request.method !== 'GET') {
    return;
  }

  // 2. Skip non-http(s) requests
  if (!event.request.url.startsWith('http')) {
    return;
  }

  // 3. NEVER cache API requests - always go to network
  if (url.pathname.includes('/tables') || url.pathname.includes('tables/')) {
    return;
  }
  
  // 4. NEVER cache Supabase requests - always fresh data
  if (url.hostname.includes('supabase.co') || url.hostname.includes('supabase.io')) {
    return;
  }

  // 5. NETWORK-FIRST for critical files (HTML, JS, CSS)
  if (isCriticalFile(url.pathname)) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then((networkResponse) => {
          if (networkResponse && networkResponse.ok) {
            // Update cache with fresh content
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Network failed, fall back to cache
          console.log(`📦 Serving from cache: ${url.pathname}`);
          return caches.match(event.request);
        })
    );
    return;
  }

  // 6. CACHE-FIRST for static assets (images, fonts)
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        // Not in cache, fetch from network
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.ok) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        });
      })
      .catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
        return new Response('Offline', { status: 503 });
      })
  );
});

// Listen for messages from the main app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('⏭️ Skip waiting requested');
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    console.log('🧹 Cache clear requested');
    caches.keys().then((cacheNames) => {
      cacheNames.forEach((cacheName) => {
        caches.delete(cacheName);
      });
    });
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.source.postMessage({ type: 'VERSION', version: CACHE_VERSION });
  }
});

console.log(`📱 Daily Bars Service Worker v${CACHE_VERSION} loaded`);
