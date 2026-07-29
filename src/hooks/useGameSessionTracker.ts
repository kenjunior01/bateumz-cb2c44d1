import { useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface TrackParams {
  gameType: string;
  gameName: string;
  gameId?: string;
  liveCode?: string;
  playerName?: string;
  score?: number;
  prize?: string;
  prizeValue?: number;
  isWinner?: boolean;
  durationSeconds?: number;
  playerCount?: number;
  metadata?: Record<string, any>;
}

export function useGameSessionTracker(businessUserId?: string) {
  const pendingRef = useRef<any[]>([]);
  const flushTimer = useRef<ReturnType<typeof setTimeout>>();

  const flush = useCallback(async () => {
    if (pendingRef.current.length === 0) return;
    const batch = [...pendingRef.current];
    pendingRef.current = [];
    try {
      const rows = batch.map((s) => ({
        business_user_id: businessUserId || null,
        live_code: s.liveCode || null,
        game_type: s.gameType,
        game_id: s.gameId || null,
        game_name: s.gameName,
        player_name: s.playerName || null,
        player_count: s.playerCount || 0,
        score: s.score || 0,
        prize: s.prize || null,
        prize_value: s.prizeValue || 0,
        is_winner: s.isWinner || false,
        duration_seconds: s.durationSeconds || 0,
        metadata: s.metadata || {},
      }));
      await supabase.from("game_sessions").insert(rows);
    } catch (e) {
      console.error("Failed to flush game sessions:", e);
      pendingRef.current.push(...batch);
    }
  }, [businessUserId]);

  const track = useCallback(
    (params: TrackParams) => {
      pendingRef.current.push(params);
      if (flushTimer.current) clearTimeout(flushTimer.current);
      flushTimer.current = setTimeout(flush, 2000);
    },
    [flush]
  );

  const trackWinner = useCallback(
    (params: TrackParams) => {
      track({ ...params, isWinner: true });
    },
    [track]
  );

  return { track, trackWinner, flush };
}

interface BrandingData {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  companyName?: string;
  companyLogoUrl?: string;
  companySlogan?: string;
  backgroundImageUrl?: string;
  overlayStyle?: string;
}

const DEFAULT_BRANDING: BrandingData = {
  primaryColor: "#fbbf24",
  secondaryColor: "#3b82f6",
  accentColor: "#8b5cf6",
  backgroundColor: "#0a0a0a",
  textColor: "#ffffff",
};

export function useGameBranding(businessUserId?: string) {
  const cachedRef = useRef<BrandingData | null>(null);
  const loadedRef = useRef<string | null>(null);

  const loadBranding = useCallback(async (): Promise<BrandingData> => {
    if (!businessUserId) return DEFAULT_BRANDING;
    if (loadedRef.current === businessUserId && cachedRef.current) {
      return cachedRef.current;
    }
    try {
      const { data } = await supabase
        .from("company_branding")
        .select("*")
        .eq("user_id", businessUserId)
        .eq("enabled", true)
        .maybeSingle();
      if (data) {
        const b: BrandingData = {
          primaryColor: data.primary_color || DEFAULT_BRANDING.primaryColor,
          secondaryColor: data.secondary_color || DEFAULT_BRANDING.secondaryColor,
          accentColor: data.accent_color || DEFAULT_BRANDING.accentColor,
          backgroundColor: data.background_color || DEFAULT_BRANDING.backgroundColor,
          textColor: data.text_color || DEFAULT_BRANDING.textColor,
          companyName: data.company_name || undefined,
          companyLogoUrl: data.company_logo_url || undefined,
          companySlogan: data.company_slogan || undefined,
          backgroundImageUrl: data.background_image_url || undefined,
          overlayStyle: data.overlay_style || undefined,
        };
        cachedRef.current = b;
        loadedRef.current = businessUserId;
        return b;
      }
    } catch (e) {
      console.error("Failed to load branding:", e);
    }
    return DEFAULT_BRANDING;
  }, [businessUserId]);

  return { loadBranding, defaultBranding: DEFAULT_BRANDING };
}
