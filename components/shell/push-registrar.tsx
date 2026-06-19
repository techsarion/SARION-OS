'use client';
// Registers the service worker and subscribes this browser to Web Push, then
// stores the subscription server-side. Runs once on mount; no UI. Silently
// no-ops when push is unsupported or the user hasn't granted permission — the
// permission prompt itself is driven by the notifications bell.
import { useEffect } from 'react';
import { savePushSubscription } from '@/lib/actions/push';

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function PushRegistrar() {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!key || typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    let cancelled = false;
    (async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js');
        // Only subscribe once permission is granted — don't prompt here.
        if (Notification.permission !== 'granted') return;
        const existing = await reg.pushManager.getSubscription();
        const sub = existing ?? await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(key) as BufferSource,
        });
        if (cancelled) return;
        const json = sub.toJSON();
        if (json.endpoint && json.keys?.p256dh && json.keys?.auth) {
          await savePushSubscription({
            endpoint: json.endpoint,
            keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
            userAgent: navigator.userAgent,
          });
        }
      } catch {
        /* push unsupported or blocked — in-app + email still cover the user */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return null;
}
