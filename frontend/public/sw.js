const CACHE_NAME = 'geulpi-calendar-v1';
const STATIC_CACHE = 'geulpi-static-v1';
const DYNAMIC_CACHE = 'geulpi-dynamic-v1';

// Static assets to cache
const STATIC_ASSETS = [
  '/',
  '/calendar',
  '/dashboard',
  '/offline',
  '/favicon.ico',
  '/manifest.json',
  // Add other static assets as needed
];

// API routes to cache
const API_CACHE_PATTERNS = [
  /^https:\/\/fonts\.googleapis\.com/,
  /^https:\/\/fonts\.gstatic\.com/,
  // Add GraphQL endpoint for specific queries if needed
];

// Network-first strategy for GraphQL queries
const NETWORK_FIRST_PATTERNS = [
  /\/graphql$/,
];

// Cache-first strategy for static assets
const CACHE_FIRST_PATTERNS = [
  /\.(js|css|png|jpg|jpeg|svg|gif|woff|woff2|ttf|eot)$/,
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  // Force activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (
            cacheName !== STATIC_CACHE &&
            cacheName !== DYNAMIC_CACHE &&
            cacheName !== CACHE_NAME
          ) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Take control immediately
  self.clients.claim();
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-http requests
  if (!request.url.startsWith('http')) {
    return;
  }

  // Skip Chrome extension requests
  if (request.url.startsWith('chrome-extension://')) {
    return;
  }

  // Handle different types of requests
  if (NETWORK_FIRST_PATTERNS.some(pattern => pattern.test(url.pathname))) {
    // Network-first strategy for GraphQL and API calls
    event.respondWith(networkFirst(request));
  } else if (CACHE_FIRST_PATTERNS.some(pattern => pattern.test(url.pathname))) {
    // Cache-first strategy for static assets
    event.respondWith(cacheFirst(request));
  } else if (API_CACHE_PATTERNS.some(pattern => pattern.test(url.href))) {
    // Stale-while-revalidate for API endpoints
    event.respondWith(staleWhileRevalidate(request));
  } else {
    // Default strategy: network-first with fallback
    event.respondWith(networkFirstWithFallback(request));
  }
});

// Network-first strategy
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Fallback to cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/offline');
    }
    
    throw error;
  }
}

// Cache-first strategy
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    throw error;
  }
}

// Stale-while-revalidate strategy
async function staleWhileRevalidate(request) {
  const cachedResponse = await caches.match(request);
  
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      const cache = caches.open(DYNAMIC_CACHE);
      cache.then(c => c.put(request, networkResponse.clone()));
    }
    return networkResponse;
  });
  
  return cachedResponse || fetchPromise;
}

// Network-first with offline fallback
async function networkFirstWithFallback(request) {
  try {
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Try cache first
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      const offlinePage = await caches.match('/offline');
      if (offlinePage) {
        return offlinePage;
      }
    }
    
    throw error;
  }
}

// Handle background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(handleBackgroundSync());
  }
});

async function handleBackgroundSync() {
  // Handle any queued offline actions
  // This could include queued GraphQL mutations, etc.
  console.log('Background sync triggered');
}

// Handle push notifications (if needed)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    
    event.waitUntil(
      self.registration.showNotification(data.title, {
        body: data.body,
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        tag: data.tag || 'default',
        data: data.data
      })
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    self.clients.openWindow(event.notification.data?.url || '/')
  );
});