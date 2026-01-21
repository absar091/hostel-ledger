/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { BackgroundSyncPlugin } from 'workbox-background-sync';

declare const self: ServiceWorkerGlobalScope;

// Take control immediately
self.skipWaiting();
clientsClaim();

// Precache all assets
precacheAndRoute(self.__WB_MANIFEST);

// Background Sync for offline expense submissions
const bgSyncPlugin = new BackgroundSyncPlugin('expense-queue', {
  maxRetentionTime: 24 * 60, // Retry for up to 24 hours (in minutes)
  onSync: async ({ queue }) => {
    let entry: any;
    while ((entry = await queue.shiftRequest())) {
      try {
        await fetch(entry.request);
        console.log('Background sync: Request successful', entry.request.url);
        
        // Show notification on successful sync
        await self.registration.showNotification('Expense Synced', {
          body: 'Your offline expense has been synced successfully!',
          icon: '/only-logo.png',
          badge: '/only-logo.png',
          tag: 'expense-sync',
          requireInteraction: false
        });
      } catch (error) {
        console.error('Background sync: Request failed', error);
        await queue.unshiftRequest(entry);
        throw error;
      }
    }
  }
});

// Register background sync for API calls
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    plugins: [bgSyncPlugin]
  }),
  'POST'
);

// Cache images
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
      }),
    ],
  })
);

// Cache fonts
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'google-fonts',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 10,
        maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
      }),
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  })
);

// Push Notification Handler
self.addEventListener('push', (event: PushEvent) => {
  const data = event.data?.json() ?? {};
  const title = data.title || 'Hostel Ledger';
  const options: NotificationOptions = {
    body: data.body || 'New update available',
    icon: '/only-logo.png',
    badge: '/only-logo.png',
    tag: data.tag || 'default',
    data: data.data || {},
    requireInteraction: false
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification Click Handler
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window open
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // Open new window if none exists
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      })
  );
});

// Periodic Background Sync (for checking new expenses)
self.addEventListener('periodicsync', (event: any) => {
  if (event.tag === 'check-expenses') {
    event.waitUntil(checkForNewExpenses());
  }
});

async function checkForNewExpenses() {
  try {
    // This would call your API to check for new expenses
    const response = await fetch('/api/check-new-expenses');
    const data = await response.json();
    
    if (data.hasNew) {
      await self.registration.showNotification('New Expense Added', {
        body: `${data.count} new expense(s) in your groups`,
        icon: '/only-logo.png',
        badge: '/only-logo.png',
        tag: 'new-expense',
        data: { url: '/activity' }
      });
    }
  } catch (error) {
    console.error('Periodic sync failed:', error);
  }
}

// Install event - show notification
self.addEventListener('install', () => {
  console.log('Service Worker installed');
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('Service Worker activated');
});

// Message handler for manual sync trigger
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SYNC_EXPENSES') {
    event.waitUntil(
      (async () => {
        try {
          // Trigger background sync
          await self.registration.sync.register('expense-queue');
          if (event.ports[0]) {
            event.ports[0].postMessage({ success: true });
          }
        } catch (error) {
          console.error('Manual sync failed:', error);
          if (event.ports[0]) {
            event.ports[0].postMessage({ success: false, error });
          }
        }
      })()
    );
  }
});
