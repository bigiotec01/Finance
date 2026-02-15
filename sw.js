// Service Worker - Organizador de Finanzas Personal
// Versión 3.0.4 - Network First para actualizaciones automáticas en iPhone
// Creado por Ismael Bigio

const CACHE_NAME = 'finanzas-v3.0.4';
const urlsToCache = [
  './',
  './index.html',
  './notifications.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js'
];

// ==================== INSTALACIÓN ====================
self.addEventListener('install', event => {
  console.log('✅ Service Worker: Instalando v3.0.4...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📦 Cacheando archivos...');
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.error('❌ Error al cachear:', error);
      })
  );
  self.skipWaiting();
});

// ==================== ACTIVACIÓN ====================
self.addEventListener('activate', event => {
  console.log('✅ Service Worker: Activando v3.0.4...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Eliminando cache antigua:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// ==================== FETCH (ESTRATEGIA DE CACHÉ) ====================
//
// Network First → index.html, .js, .json
//   Siempre intenta la red primero para obtener la versión más reciente.
//   Si no hay conexión, sirve desde caché (modo offline).
//
// Cache First → imágenes, iconos, CDN estáticos
//   Sirve desde caché inmediatamente; ideal para recursos que no cambian.
//
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Network First: recursos de la app (HTML, JS, JSON)
  const isAppResource =
    event.request.mode === 'navigate' ||
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.json');

  if (isAppResource) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
          }
          return response;
        })
        .catch(() => {
          // Sin conexión: usar caché como fallback
          return caches.match(event.request);
        })
    );
    return;
  }

  // Cache First: imágenes, iconos y CDN estáticos
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) return response;
        return fetch(event.request).then(response => {
          if (response && response.status === 200 && response.type !== 'opaque') {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
          }
          return response;
        });
      })
      .catch(error => {
        console.error('❌ Error en fetch:', error);
      })
  );
});

// ==================== NOTIFICACIONES PUSH ====================

// Escuchar mensajes desde la app principal
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'SCHEDULE_NOTIFICATIONS') {
    console.log('📅 Programando notificaciones de pagos...');
    schedulePaymentNotifications(event.data.payments);
  }
});

// Click en notificación - abrir la app
self.addEventListener('notificationclick', event => {
  console.log('🔔 Click en notificación:', event.notification.tag);
  event.notification.close();

  event.waitUntil(
    clients.openWindow('./')
  );
});

// Programar notificaciones de pagos
function schedulePaymentNotifications(payments) {
  if (!payments || payments.length === 0) {
    console.log('ℹ️ No hay pagos para notificar');
    return;
  }

  const now = new Date();

  payments.forEach(payment => {
    const paymentDate = new Date(payment.year, payment.month - 1, payment.day);

    // Notificar 3 días antes, 1 día antes, y el mismo día
    [3, 1, 0].forEach(daysBefore => {
      const notifyDate = new Date(paymentDate);
      notifyDate.setDate(notifyDate.getDate() - daysBefore);

      const timeUntilNotification = notifyDate - now;

      if (timeUntilNotification > 0) {
        setTimeout(() => {
          showPaymentNotification(payment, daysBefore);
        }, timeUntilNotification);
      }
    });
  });
}

// Mostrar notificación de pago
function showPaymentNotification(payment, daysBefore) {
  const options = {
    body: daysBefore === 0
      ? `¡Hoy vence ${payment.name}! Monto: $${payment.amount}`
      : daysBefore === 1
      ? `Mañana vence ${payment.name}. Monto: $${payment.amount}`
      : `En ${daysBefore} días vence ${payment.name}. Monto: $${payment.amount}`,
    icon: './icon-192.png',
    badge: './icon-192.png',
    tag: `payment-${payment.id}-${daysBefore}`,
    requireInteraction: daysBefore === 0,
    vibrate: daysBefore === 0 ? [200, 100, 200] : [200],
    data: {
      paymentId: payment.id,
      daysBefore: daysBefore,
      url: './'
    },
    actions: [
      { action: 'open', title: 'Abrir App' },
      { action: 'dismiss', title: 'Descartar' }
    ]
  };

  self.registration.showNotification('💰 Recordatorio de Pago', options);
}

// ==================== SINCRONIZACIÓN EN SEGUNDO PLANO ====================

self.addEventListener('sync', event => {
  if (event.tag === 'check-payments') {
    event.waitUntil(checkUpcomingPayments());
  }
});

async function checkUpcomingPayments() {
  try {
    const allClients = await clients.matchAll();
    if (allClients.length > 0) {
      allClients[0].postMessage({ type: 'REQUEST_PAYMENT_DATA' });
    }
  } catch (error) {
    console.error('❌ Error al verificar pagos:', error);
  }
}

// ==================== NOTIFICACIONES PERIÓDICAS ====================

self.addEventListener('periodicsync', event => {
  if (event.tag === 'daily-payment-check') {
    event.waitUntil(checkUpcomingPayments());
  }
});

console.log('🚀 Service Worker v3.0.4 cargado - Network First activado');
