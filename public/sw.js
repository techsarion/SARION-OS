// Service worker for Web Push notifications (Sarion OS).
// Receives pushes delivered by the scheduled Edge Function and shows them even
// when no app tab is open. Payload shape: { title, body, url, tag }.

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (_e) { data = {}; }
  const title = data.title || 'Sarion';
  const options = {
    body: data.body || '',
    tag: data.tag || undefined,
    icon: '/SARION-ICON.png',
    badge: '/SARION-ICON.png',
    data: { url: data.url || '/' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const c of clients) {
        if ('focus' in c) { c.navigate(url); return c.focus(); }
      }
      return self.clients.openWindow(url);
    }),
  );
});
