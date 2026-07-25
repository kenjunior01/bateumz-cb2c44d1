import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';

const DISMISS_KEY = 'push_banner_dismissed';

function isBannerDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const dismissedAt = Number(raw);
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    return Date.now() - dismissedAt < sevenDaysMs;
  } catch {
    return false;
  }
}

function dismissBanner() {
  localStorage.setItem(DISMISS_KEY, String(Date.now()));
}

export default function PushNotificationBanner() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const { permission, isSubscribed, loading, requestAndSubscribe } = usePushNotifications();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isBannerDismissed()) {
      setDismissed(true);
    }
  }, []);

  // Don't show if: not logged in, still loading auth, already subscribed, denied, or dismissed
  const shouldShow =
    !authLoading &&
    !!user &&
    !dismissed &&
    !isSubscribed &&
    permission !== 'denied' &&
    permission !== 'granted';

  const handleDismiss = () => {
    dismissBanner();
    setDismissed(true);
  };

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed top-0 left-0 right-0 z-[100] flex justify-center px-3 pt-3 sm:px-4 sm:pt-4"
        >
          <div className="relative flex w-full max-w-2xl items-center gap-3 rounded-xl border border-primary/20 bg-card/95 px-4 py-3 shadow-lg backdrop-blur-md sm:gap-4 sm:px-5 sm:py-3.5">
            {/* Bell icon */}
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 sm:h-10 sm:w-10">
              <Bell className="h-5 w-5 text-primary sm:h-5 sm:w-5" />
            </div>

            {/* Text */}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">{t('push.enable')}</p>
              <p className="truncate text-xs text-muted-foreground sm:text-sm">
                {t('push.description')}
              </p>
            </div>

            {/* Activate button */}
            <Button
              size="sm"
              className="shrink-0 gap-1.5"
              onClick={requestAndSubscribe}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              {t('push.activate')}
            </Button>

            {/* Dismiss */}
            <button
              onClick={handleDismiss}
              className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-muted/80 sm:-right-2 sm:-top-2 sm:h-7 sm:w-7"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
