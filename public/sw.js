// Service Worker for Hostel Ledger PWA - Network First Strategy
const CACHE_NAME = 'hostel-ledger-v3'; // Increment version to force update
const STATIC_CACHE_URLS = [
  '/only-logo.png',
  '/manifest.json'
];

// Install event - cache only essential assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing v3...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching essential assets');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        console.log('Service Worker: Installation complete, skipping waiting');
        return self.skipWaiting(); // Force immediate activation
      })
      .catch((error) => {
        console.error('Service Worker: Installation failed', error);
      })
  );
});

// Activate event - clean up ALL old caches and take control immediately
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating v3...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Taking control of all clients');
        return self.clients.claim(); // Take control immediately
      })
  );
});

// Fetch event - NETWORK FIRST strategy to always get fresh content
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip Firebase and external API requests
  if (
    event.request.url.includes('firebaseio.com') ||
    event.request.url.includes('googleapis.com') ||
    event.request.url.includes('cloudinary.com') ||
    event.request.url.includes('fonts.googleapis.com') ||
    event.request.url.includes('fonts.gstatic.com') ||
    event.request.url.includes('chrome-extension') ||
    event.request.url.includes('moz-extension')
  ) {
    return;
  }

  // NETWORK FIRST: Always try network, fallback to cache only if offline
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Check if response is valid
        if (response && response.status === 200) {
          // Clone and cache the response for offline use
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });
        }
        return response;
      })
      .catch(() => {
        // Only use cache if network fails (offline)
        console.log('Service Worker: Network failed, using cache for', event.request.url);
        return caches.match(event.request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // If no cache and offline, return offline page
            if (event.request.destination === 'document') {
              return caches.match('/');
            }
            throw new Error('No cache available');
          });
      })
  );
});

// Message event - allow manual cache clearing
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      })
    );
  }
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync', event.tag);
  
  if (event.tag === 'expense-sync') {
    event.waitUntil(syncExpenses());
  }
});

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push notification received');
  
  const options = {
    body: event.data ? event.data.text() : 'New expense activity',
    icon: '/only-logo.png',
    badge: '/only-logo.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'view',
        title: 'View',
        icon: '/only-logo.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/only-logo.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Hostel Ledger', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked');
  
  event.notification.close();

  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Helper function to sync expenses when back online
async function syncExpenses() {
  try {
    console.log('Service Worker: Syncing expenses...');
    // Implementation would depend on your offline storage strategy
  } catch (error) {
    console.error('Service Worker: Sync failed', error);
  }
}