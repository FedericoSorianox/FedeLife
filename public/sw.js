// Service Worker para Fede Life PWA
// Autor: Senior Full Stack Developer

const CACHE_NAME = 'fede-life-v1.0.0';
const STATIC_CACHE = 'fede-life-static-v1.0.0';
const DYNAMIC_CACHE = 'fede-life-dynamic-v1.0.0';

// Recursos críticos para cachear
const STATIC_ASSETS = [
  '/',
  '/finanzas',
  '/goals',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  // CSS y JS críticos se cachearán automáticamente por Next.js
];

// Recursos adicionales para cache offline
const OFFLINE_FALLBACKS = {
  '/': '/offline.html',
  '/finanzas': '/offline.html',
  '/goals': '/offline.html',
};

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker instalándose...');

  event.waitUntil(
    Promise.all([
      // Cachear recursos estáticos
      caches.open(STATIC_CACHE).then((cache) => {
        console.log('📦 Cacheando recursos estáticos...');
        return cache.addAll(STATIC_ASSETS);
      }),

      // Forzar activación inmediata
      self.skipWaiting()
    ])
  );

  console.log('✅ Service Worker instalado');
});

// Activación del Service Worker
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker activándose...');

  event.waitUntil(
    Promise.all([
      // Limpiar caches antiguos
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('🗑️ Eliminando cache antiguo:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),

      // Tomar control de todas las pestañas
      self.clients.claim()
    ])
  );

  console.log('✅ Service Worker activado');
});

// Estrategia de cache: Cache First para recursos estáticos, Network First para API
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Solo manejar requests del mismo origen
  if (url.origin !== location.origin) return;

  // Estrategia Cache First para recursos estáticos
  if (STATIC_ASSETS.includes(url.pathname) || request.destination === 'style' || request.destination === 'script') {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Estrategia Network First para API calls
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Estrategia Stale While Revalidate para páginas
  if (request.destination === 'document') {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Default: Network First con fallback a cache
  event.respondWith(networkFirst(request));
});

// Estrategia Cache First: Buscar en cache primero, luego network
async function cacheFirst(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.warn('❌ Cache First falló:', error);
    return new Response('Error de conexión', { status: 503 });
  }
}

// Estrategia Network First: Intentar network primero, fallback a cache
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.warn('🌐 Network falló, usando cache:', error);

    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Fallback para páginas offline
    if (request.destination === 'document') {
      const offlinePage = await caches.match(OFFLINE_FALLBACKS[request.url] || '/offline.html');
      if (offlinePage) {
        return offlinePage;
      }
    }

    return new Response('Contenido no disponible offline', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

// Estrategia Stale While Revalidate: Servir cache mientras actualiza en background
async function staleWhileRevalidate(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  const cachedResponse = await cache.match(request);

  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  });

  return cachedResponse || fetchPromise;
}

// Manejar mensajes desde el cliente
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Manejar notificaciones push (futuro)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-96x96.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: 1
      }
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Manejar clicks en notificaciones
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});

// Background sync para transacciones offline (futuro)
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync-transactions') {
    event.waitUntil(syncTransactions());
  }
});

// Función para sincronizar transacciones offline
async function syncTransactions() {
  try {
    // Aquí iría la lógica para sincronizar transacciones guardadas offline
    console.log('🔄 Sincronizando transacciones offline...');
    // TODO: Implementar sincronización real
  } catch (error) {
    console.error('❌ Error sincronizando transacciones:', error);
  }
}
