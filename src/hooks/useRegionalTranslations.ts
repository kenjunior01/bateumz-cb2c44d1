import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useRegionalContext } from './useRegionalConfig';

export interface Translation {
  key: string;
  value: string;
  isCustom: boolean;
}

/**
 * Hook to fetch and manage regional translations
 */
export const useRegionalTranslations = (languageCode?: string) => {
  const { config } = useRegionalContext();
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const lang = languageCode || config?.language_code || 'en';
  const regionId = config?.region_id;

  useEffect(() => {
    const loadTranslations = async () => {
      if (!regionId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch translations from database
        const { data, error: fetchError } = await (supabase as any)
          .from('regional_translations')
          .select('translation_key, translation_value')
          .eq('region_id', regionId)
          .eq('language_code', lang);

        if (fetchError) throw fetchError;

        // Convert to key-value object
        const translationMap: Record<string, string> = {};
        data?.forEach((item) => {
          translationMap[item.translation_key] = item.translation_value;
        });

        setTranslations(translationMap);
      } catch (err) {
        console.error('Error loading translations:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    loadTranslations();
  }, [regionId, lang]);

  /**
   * Get translation for a key with fallback
   */
  const t = (key: string, defaultValue?: string): string => {
    return translations[key] || defaultValue || key;
  };

  /**
   * Update a translation (only for regional CEO)
   */
  const updateTranslation = async (key: string, value: string): Promise<boolean> => {
    if (!regionId) return false;

    try {
      const { error } = await (supabase as any)
        .from('regional_translations')
        .upsert({
          region_id: regionId,
          language_code: lang,
          translation_key: key,
          translation_value: value,
          is_custom: true,
        }, {
          onConflict: 'region_id,language_code,translation_key',
        });

      if (error) throw error;

      // Update local state
      setTranslations(prev => ({
        ...prev,
        [key]: value,
      }));

      return true;
    } catch (err) {
      console.error('Error updating translation:', err);
      return false;
    }
  };

  /**
   * Bulk update translations
   */
  const bulkUpdateTranslations = async (updates: Record<string, string>): Promise<boolean> => {
    if (!regionId) return false;

    try {
      const records = Object.entries(updates).map(([key, value]) => ({
        region_id: regionId,
        language_code: lang,
        translation_key: key,
        translation_value: value,
        is_custom: true,
      }));

      const { error } = await (supabase as any)
        .from('regional_translations')
        .upsert(records, {
          onConflict: 'region_id,language_code,translation_key',
        });

      if (error) throw error;

      // Update local state
      setTranslations(prev => ({
        ...prev,
        ...updates,
      }));

      return true;
    } catch (err) {
      console.error('Error bulk updating translations:', err);
      return false;
    }
  };

  return {
    translations,
    loading,
    error,
    t,
    updateTranslation,
    bulkUpdateTranslations,
    currentLanguage: lang,
  };
};

/**
 * Fetch all available languages for a region
 */
export const fetchAvailableLanguages = async (regionId: string) => {
  try {
    const { data, error } = await (supabase as any)
      .from('regional_translations')
      .select('language_code')
      .eq('region_id', regionId)
      .distinct();

    if (error) throw error;

    return data?.map(item => item.language_code) || [];
  } catch (err) {
    console.error('Error fetching available languages:', err);
    return [];
  }
};

/**
 * Export translations for a region and language
 */
export const exportTranslations = async (regionId: string, languageCode: string) => {
  try {
    const { data, error } = await (supabase as any)
      .from('regional_translations')
      .select('*')
      .eq('region_id', regionId)
      .eq('language_code', languageCode);

    if (error) throw error;

    return data || [];
  } catch (err) {
    console.error('Error exporting translations:', err);
    return [];
  }
};

/**
 * Import translations for a region and language
 */
export const importTranslations = async (
  regionId: string,
  languageCode: string,
  translations: Array<{ key: string; value: string }>
) => {
  try {
    const records = translations.map(({ key, value }) => ({
      region_id: regionId,
      language_code: languageCode,
      translation_key: key,
      translation_value: value,
      is_custom: true,
    }));

    const { error } = await (supabase as any)
      .from('regional_translations')
      .upsert(records, {
        onConflict: 'region_id,language_code,translation_key',
      });

    if (error) throw error;

    return true;
  } catch (err) {
    console.error('Error importing translations:', err);
    return false;
  }
};
