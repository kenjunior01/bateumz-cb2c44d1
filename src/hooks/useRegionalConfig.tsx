import { useEffect, useState, useContext, createContext } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface RegionalBranding {
  id?: string;
  region_id?: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_color: string;
  text_color: string;
  logo_url?: string;
  banner_url?: string;
  favicon_url?: string;
  font_family: string;
  theme_name: string;
  custom_css?: string;
}

export interface RegionalSettings {
  id?: string;
  region_id?: string;
  enable_spin_wheel: boolean;
  enable_millionaire_game: boolean;
  enable_challenge_games: boolean;
  enable_predictions: boolean;
  enable_live_games: boolean;
  maintenance_mode: boolean;
}

export interface RegionalConfig {
  region_id?: string;
  country_code: string;
  country_name: string;
  language_code: string;
  currency_code: string;
  timezone: string;
  branding: RegionalBranding;
  settings: RegionalSettings;
}

const DEFAULT_BRANDING: RegionalBranding = {
  primary_color: '#0A1F44',
  secondary_color: '#F1F5F9',
  accent_color: '#D7263D',
  background_color: '#FFFFFF',
  text_color: '#0A1F44',
  font_family: 'Inter, sans-serif',
  theme_name: 'Default',
};

const DEFAULT_SETTINGS: RegionalSettings = {
  enable_spin_wheel: true,
  enable_millionaire_game: true,
  enable_challenge_games: true,
  enable_predictions: true,
  enable_live_games: true,
  maintenance_mode: false,
};

interface RegionalContextType {
  config: RegionalConfig | null;
  loading: boolean;
  error: string | null;
  refreshConfig: () => Promise<void>;
}

const RegionalContext = createContext<RegionalContextType | null>(null);

/**
 * Detect user's region based on:
 * 1. Stored preference in localStorage
 * 2. User's profile country
 * 3. IP geolocation
 * 4. Browser language
 * 5. Default to 'US'
 */
export const detectUserRegion = async (): Promise<string> => {
  // 1. Check localStorage
  const stored = localStorage.getItem('bateu_region');
  if (stored) return stored;

  // 2. Try to get from user profile
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.user_metadata?.country) {
      return user.user_metadata.country;
    }
  } catch (err) {
    console.error('Error getting user metadata:', err);
  }

  // 3. Try IP geolocation (multiple fallbacks)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const response = await fetch('https://ipwho.is/', { signal: controller.signal });
    clearTimeout(timeoutId);
    const data = await response.json();
    if (data?.country_code) {
      return data.country_code;
    }
  } catch {
    try {
      const controller2 = new AbortController();
      const timeoutId2 = setTimeout(() => controller2.abort(), 3000);
      const r2 = await fetch('https://freeipapi.com/api/json', { signal: controller2.signal });
      clearTimeout(timeoutId2);
      const d2 = await r2.json();
      if (d2?.countryCode) return d2.countryCode;
    } catch {
      // Both services failed, continue to fallbacks
    }
  }

  // 4. Browser language
  const browserLang = navigator.language.split('-')[0].toUpperCase();
  const langMap: Record<string, string> = {
    'PT': 'MZ',
    'BR': 'BR',
    'EN': 'MZ',
  };
  if (langMap[browserLang]) return langMap[browserLang];

  // 5. Default to Mozambique
  return 'MZ';
};

/**
 * Fetch regional configuration for a given country code
 */
export const fetchRegionalConfig = async (countryCode: string): Promise<RegionalConfig | null> => {
  try {
    // Fetch region info
    const { data: region, error: regionError } = await supabase
      .from('regions')
      .select('*')
      .eq('country_code', countryCode)
      .maybeSingle();

    if (regionError || !region) {
      console.warn('Region not found in DB, using default config:', countryCode);
      return {
        country_code: countryCode,
        country_name: countryCode,
        language_code: 'en',
        currency_code: 'USD',
        timezone: 'UTC',
        branding: DEFAULT_BRANDING,
        settings: DEFAULT_SETTINGS,
      };
    }

    // Fetch branding
    const { data: branding } = await (supabase as any)
      .from('regional_branding')
      .select('*')
      .eq('region_id', region.id)
      .maybeSingle();

    // Fetch settings
    const { data: settings } = await (supabase as any)
      .from('regional_settings')
      .select('*')
      .eq('region_id', region.id)
      .maybeSingle();

    const r: any = region;
    return {
      region_id: r.id,
      country_code: r.country_code,
      country_name: r.country_name || r.label || r.country_code,
      language_code: r.language_code || r.default_language || 'en',
      currency_code: r.currency_code || r.currency || 'USD',
      timezone: r.timezone || 'UTC',
      branding: branding || DEFAULT_BRANDING,
      settings: settings || DEFAULT_SETTINGS,
    };
  } catch (err) {
    console.error('Error fetching regional config:', err);
    return {
      country_code: countryCode,
      country_name: countryCode,
      language_code: 'en',
      currency_code: 'USD',
      timezone: 'UTC',
      branding: DEFAULT_BRANDING,
      settings: DEFAULT_SETTINGS,
    };
  }
};

/**
 * Apply regional branding to the DOM
 */
export const applyRegionalBranding = (branding: RegionalBranding) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  // Set CSS variables with safety checks
  if (branding.primary_color) root.style.setProperty('--primary-color', branding.primary_color);
  if (branding.secondary_color) root.style.setProperty('--secondary-color', branding.secondary_color);
  if (branding.accent_color) root.style.setProperty('--accent-color', branding.accent_color);
  if (branding.background_color) root.style.setProperty('--background-color', branding.background_color);
  if (branding.text_color) root.style.setProperty('--text-color', branding.text_color);

  // Set font
  if (branding.font_family) {
    document.body.style.fontFamily = branding.font_family;
  }

  // Apply custom CSS if available
  if (branding.custom_css) {
    const styleElement = document.getElementById('regional-custom-styles') || document.createElement('style');
    styleElement.id = 'regional-custom-styles';
    styleElement.innerHTML = branding.custom_css;
    if (!document.getElementById('regional-custom-styles')) {
      document.head.appendChild(styleElement);
    }
  }

  // Update favicon if available
  if (branding.favicon_url) {
    const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
    if (link) {
      link.href = branding.favicon_url;
    }
  }

  // Store in localStorage for persistence
  localStorage.setItem('bateu_branding', JSON.stringify(branding));
};

/**
 * Hook to use regional configuration
 */
export const useRegionalConfig = () => {
  const [config, setConfig] = useState<RegionalConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadConfig = async () => {
    try {
      setLoading(true);
      setError(null);

      const countryCode = await detectUserRegion();
      localStorage.setItem('bateu_region', countryCode);

      const regionalConfig = await fetchRegionalConfig(countryCode);
      if (regionalConfig) {
        setConfig(regionalConfig);
        applyRegionalBranding(regionalConfig.branding);
      } else {
        setError(`Could not load config for region: ${countryCode}`);
      }
    } catch (err) {
      console.error('Error loading regional config:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const refreshConfig = async () => {
    await loadConfig();
  };

  return { config, loading, error, refreshConfig };
};

/**
 * Provider component for regional configuration
 */
export const RegionalConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { config, loading, error, refreshConfig } = useRegionalConfig();

  return (
    <RegionalContext.Provider value={{ config, loading, error, refreshConfig }}>
      {children}
    </RegionalContext.Provider>
  );
};

/**
 * Hook to access regional context
 */
export const useRegionalContext = () => {
  const context = useContext(RegionalContext);
  if (!context) {
    throw new Error('useRegionalContext must be used within RegionalConfigProvider');
  }
  return context;
};
