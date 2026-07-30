import { useState, useEffect } from 'react';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const sb: any = supabase;

type PreferenceKey =
  | 'new_raffles'
  | 'raffle_results'
  | 'live_starting'
  | 'live_games'
  | 'community'
  | 'platform_updates';

interface NotificationPreferences {
  new_raffles: boolean;
  raffle_results: boolean;
  live_starting: boolean;
  live_games: boolean;
  community: boolean;
  platform_updates: boolean;
}

const DEFAULT_PREFS: NotificationPreferences = {
  new_raffles: true,
  raffle_results: true,
  live_starting: true,
  live_games: false,
  community: false,
  platform_updates: true,
};

const PREF_KEYS: { key: PreferenceKey; labelKey: string }[] = [
  { key: 'new_raffles', labelKey: 'push.new_raffles' },
  { key: 'raffle_results', labelKey: 'push.raffle_results' },
  { key: 'live_starting', labelKey: 'push.live_starting' },
  { key: 'live_games', labelKey: 'push.live_games' },
  { key: 'community', labelKey: 'push.community' },
  { key: 'platform_updates', labelKey: 'push.platform_updates' },
];

export default function NotificationSettings() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { permission, isSubscribed, loading, requestAndSubscribe, unsubscribe, sendTest } =
    usePushNotifications();
  const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULT_PREFS);
  const [savingPrefs, setSavingPrefs] = useState(false);

  // Load preferences from user profile
  useEffect(() => {
    if (!user) return;
    sb
      .from('profiles')
      .select('notification_preferences')
      .eq('user_id', user.id)
      .single()
      .then(({ data, error }) => {
        if (error || !data?.notification_preferences || typeof data.notification_preferences !== 'object') return;
        const stored = data.notification_preferences as Record<string, unknown>;
        setPrefs({
          ...DEFAULT_PREFS,
          ...Object.fromEntries(
            PREF_KEYS.map(({ key }) => [key, typeof stored[key] === 'boolean' ? stored[key] : DEFAULT_PREFS[key]]),
          ),
        });
      })
      .catch(() => { /* column may not exist yet */ });
  }, [user]);

  const togglePref = async (key: PreferenceKey, value: boolean) => {
    if (!user) return;
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    setSavingPrefs(true);
    const { error } = await sb
      .from('profiles')
      .update({ notification_preferences: next as any })
      .eq('user_id', user.id);
    setSavingPrefs(false);
    if (error) {
      toast({ title: 'Erro', description: 'Não foi possível guardar preferências.', variant: 'destructive' });
      setPrefs(prefs); // revert
    }
  };

  const handleToggleSubscription = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await requestAndSubscribe();
    }
  };

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          {t('push.settings')}
        </CardTitle>
        <CardDescription>
          {permission === 'granted'
            ? t('push.granted')
            : permission === 'denied'
              ? t('push.denied')
              : t('push.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-xl bg-secondary/30 p-3">
          <div className="flex items-center gap-2">
            {permission === 'granted' ? (
              <Bell className="h-5 w-5 text-green-500" />
            ) : (
              <BellOff className="h-5 w-5 text-muted-foreground" />
            )}
            <div>
              <p className="text-sm font-medium text-foreground">
                Push Notifications
              </p>
              <p className="text-xs text-muted-foreground">
                {isSubscribed ? 'Ativo' : 'Inativo'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            <Switch
              checked={isSubscribed}
              onCheckedChange={handleToggleSubscription}
              disabled={loading || permission === 'denied'}
            />
          </div>
        </div>

        {permission === 'denied' && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {t('push.denied')} — Verifique as configurações do navegador para permitir notificações.
          </p>
        )}

        <div className="space-y-2">
          {PREF_KEYS.map(({ key, labelKey }) => (
            <div
              key={key}
              className="flex items-center justify-between rounded-xl bg-secondary/30 px-3 py-2.5"
            >
              <p className="text-sm font-medium text-foreground">{t(labelKey)}</p>
              <Switch
                checked={prefs[key]}
                onCheckedChange={(v) => togglePref(key, v)}
                disabled={savingPrefs}
              />
            </div>
          ))}
        </div>

        {permission === 'granted' && (
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={() => sendTest(t('push.enable'), t('push.description'))}
          >
            <Bell className="h-4 w-4" />
            Enviar Notificação de Teste
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
