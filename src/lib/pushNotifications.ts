import { supabase } from '@/integrations/supabase/client';

const sb: any = supabase;

// VAPID keys would normally be generated server-side and injected via environment variables.
// These are placeholder values — replace with real VAPID public key before enabling push.
// const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

/** Current push permission status */
export function getPushStatus(): 'default' | 'granted' | 'denied' {
  if (typeof Notification === 'undefined') return 'denied';
  return Notification.permission as 'default' | 'granted' | 'denied';
}

/** Request browser notification permission */
export async function requestNotificationPermission(): Promise<'default' | 'granted' | 'denied'> {
  if (typeof Notification === 'undefined') return 'denied';
  const result = await Notification.requestPermission();
  return result as 'default' | 'granted' | 'denied';
}

/** Show a local test notification using the Notification API */
export function sendTestNotification(
  title: string,
  body: string,
  icon?: string,
): void {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  try {
    new Notification(title, {
      body,
      icon: icon || '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
    });
  } catch {
    // ServiceWorkerRegistration.showNotification is preferred when available
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.showNotification(title, {
          body,
          icon: icon || '/icons/icon-192x192.png',
          badge: '/icons/icon-192x192.png',
        });
      });
    }
  }
}

/**
 * Subscribe the current browser to push notifications.
 * Stores the subscription in Supabase `push_subscriptions` table (upsert).
 */
export async function subscribePush(userId: string): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('[pushNotifications] Service workers not supported');
    return null;
  }

  if (Notification.permission !== 'granted') {
    console.warn('[pushNotifications] Notification permission not granted');
    return null;
  }

  // VAPID keys not configured yet — show local notification instead
  const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';
  if (!VAPID_PUBLIC_KEY) {
    console.warn('[pushNotifications] VAPID public key not configured — push disabled');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    // Check if already subscribed
    const existing = await registration.pushManager.getSubscription();
    if (existing) {
      await storeSubscription(userId, existing);
      return existing;
    }

    const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });

    await storeSubscription(userId, subscription);
    return subscription;
  } catch (err) {
    console.error('[pushNotifications] subscribePush error:', err);
    return null;
  }
}

/** Unsubscribe from push and remove from Supabase */
export async function unsubscribePush(userId: string): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();
    }

    // Remove from Supabase
    await sb
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId);

    return true;
  } catch (err) {
    console.error('[pushNotifications] unsubscribePush error:', err);
    return false;
  }
}

/** Check if the current user has an active push subscription */
export async function isPushSubscribed(userId: string): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  } catch {
    return false;
  }
}

// ─── Helpers ────────────────────────────────

async function storeSubscription(userId: string, subscription: PushSubscription) {
  const sub = subscription.toJSON();
  const p256dh = (sub.keys?.p256dh as string) || '';
  const auth = (sub.keys?.auth as string) || '';

  const deviceInfo = typeof navigator !== 'undefined'
    ? `${navigator.userAgent}`
    : undefined;

  await sb.from('push_subscriptions').upsert(
    {
      user_id: userId,
      endpoint: sub.endpoint ?? '',
      p256dh_key: p256dh,
      auth_key: auth,
      device_info: deviceInfo,
    },
    { onConflict: 'user_id' },
  );
}

// Utility to convert VAPID key (base64 URL-safe → Uint8Array)
function urlBase64ToUint8Array(base64String: string): Uint8Array { const padding = '='.repeat((4 - (base64String.length % 4)) % 4); const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/'); const rawData = window.atob(base64); const outputArray = new Uint8Array(rawData.length); for (let i = 0; i < rawData.length; ++i) { outputArray[i] = rawData.charCodeAt(i); } return outputArray; }
