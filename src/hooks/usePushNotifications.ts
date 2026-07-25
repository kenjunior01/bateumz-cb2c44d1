import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getPushStatus,
  requestNotificationPermission,
  subscribePush,
  unsubscribePush,
  isPushSubscribed,
  sendTestNotification,
} from '@/lib/pushNotifications';

export function usePushNotifications() {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setPermission(getPushStatus());
    if (user) {
      isPushSubscribed(user.id).then(setIsSubscribed);
    }
  }, [user]);

  const requestAndSubscribe = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const perm = await requestNotificationPermission();
      setPermission(perm);
      if (perm === 'granted') {
        await subscribePush(user.id);
        setIsSubscribed(true);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  const unsubscribe = useCallback(async () => {
    if (!user) return;
    await unsubscribePush(user.id);
    setIsSubscribed(false);
  }, [user]);

  const sendTest = useCallback((title: string, body: string) => {
    sendTestNotification(title, body);
  }, []);

  return { permission, isSubscribed, loading, requestAndSubscribe, unsubscribe, sendTest };
}
