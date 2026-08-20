/**
 * SERVICE WORKER FOR PASSPORT PHOTO GENERATOR
 * 
 * This service worker enables offline functionality and caching
 * for the passport photo generator PWA.
 */

const CACHE_NAME = 'passport-photo-v3';
const urlsToCache = [
  './',
  './index.html',
  './editor.html',
  './css/styles.css',
  './css/camera-studio.css',
  './js/app.js',
  './js/editor.js',
  './js/photoUpload.js',
  './js/canvasRenderer.js',
  './js/pdfGenerator.js',
  './js/cameraStudio.js',
  './manifest.json',
  // CDN resources will be cached on first load
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.6.1/cropper.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.6.1/cropper.min.css'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching files');
        return cache.addAll(urlsToCache.map(url => new Request(url, { cache: 'reload' })))
          .catch(err => {
            // Some resources might fail (CDN), but continue anyway
            console.warn('Service Worker: Some resources failed to cache', err);
          });
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache', cache);
            return caches.delete(cache);
          }
        })
      );
    })
    .then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        
        // Clone the request
        const fetchRequest = event.request.clone();
        
        return fetch(fetchRequest).then((response) => {
          // Check if valid response. Allow same-origin ('basic') responses
          // and successful cross-origin CDN responses ('cors') so that
          // third-party assets (e.g. the client-side face-detection model
          // used by Live Camera Studio) can also be cached for offline use.
          if (!response || response.status !== 200 || (response.type !== 'basic' && response.type !== 'cors')) {
            return response;
          }
          
          // Clone the response
          const responseToCache = response.clone();
          
          // Cache the fetched resource
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });
          
          return response;
        }).catch((error) => {
          console.error('Service Worker: Fetch failed', error);
          // Return a custom offline page if needed
          return new Response('Offline - Please check your connection', {
            status: 503,
            statusText: 'Service Unavailable'
          });
        });
      })
  );
});

// Message event - communicate with main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cache) => caches.delete(cache))
        );
      })
    );
  }
});

console.log('Service Worker: Loaded');
