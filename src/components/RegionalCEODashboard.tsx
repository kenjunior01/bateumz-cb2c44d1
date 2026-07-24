import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Palette, Globe, Settings, Upload, Save, Loader2, Check, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useRegionalContext } from '@/hooks/useRegionalConfig';
import { useRegionalTranslations } from '@/hooks/useRegionalTranslations';

interface BrandingFormData {
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_color: string;
  text_color: string;
  font_family: string;
  custom_css: string;
}

interface TranslationEntry {
  key: string;
  value: string;
}

export const RegionalCEODashboard: React.FC = () => {
  const { config } = useRegionalContext();
  const { t, updateTranslation, bulkUpdateTranslations } = useRegionalTranslations();

  const [branding, setBranding] = useState<BrandingFormData>({
    primary_color: config?.branding.primary_color || '#FF6B35',
    secondary_color: config?.branding.secondary_color || '#004E89',
    accent_color: config?.branding.accent_color || '#F7B801',
    background_color: config?.branding.background_color || '#FFFFFF',
    text_color: config?.branding.text_color || '#000000',
    font_family: config?.branding.font_family || 'Inter, sans-serif',
    custom_css: config?.branding.custom_css || '',
  });

  const [translations, setTranslations] = useState<TranslationEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);

  useEffect(() => {
    if (config?.branding) {
      setBranding({
        primary_color: config.branding.primary_color,
        secondary_color: config.branding.secondary_color,
        accent_color: config.branding.accent_color,
        background_color: config.branding.background_color,
        text_color: config.branding.text_color,
        font_family: config.branding.font_family,
        custom_css: config.branding.custom_css || '',
      });
    }
  }, [config]);

  const handleBrandingChange = (field: keyof BrandingFormData, value: string) => {
    setBranding(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSaveBranding = async () => {
    if (!config?.region_id) return;

    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from('regional_branding')
        .update(branding)
        .eq('region_id', config.region_id);

      if (error) throw error;

      toast.success('Branding atualizado com sucesso!');
    } catch (err) {
      console.error('Error saving branding:', err);
      toast.error('Erro ao salvar branding');
    } finally {
      setSaving(false);
    }
  };

  const handleUploadLogo = async () => {
    if (!logoFile || !config?.region_id) return;

    setSaving(true);
    try {
      const fileName = `${config.region_id}/logo-${Date.now()}`;
      const { error: uploadError } = await supabase.storage
        .from('white-label-logos')
        .upload(fileName, logoFile);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('white-label-logos')
        .getPublicUrl(fileName);

      const { error: updateError } = await (supabase as any)
        .from('regional_branding')
        .update({ logo_url: data.publicUrl })
        .eq('region_id', config.region_id);

      if (updateError) throw updateError;

      toast.success('Logo atualizado com sucesso!');
      setLogoFile(null);
    } catch (err) {
      console.error('Error uploading logo:', err);
      toast.error('Erro ao fazer upload do logo');
    } finally {
      setSaving(false);
    }
  };


  const handleTranslationChange = (index: number, field: 'key' | 'value', value: string) => {
    const newTranslations = [...translations];
    newTranslations[index] = {
      ...newTranslations[index],
      [field]: value,
    };
    setTranslations(newTranslations);
  };

  const handleAddTranslation = () => {
    setTranslations([...translations, { key: '', value: '' }]);
  };

  const handleSaveTranslations = async () => {
    if (!config?.region_id) return;

    setSaving(true);
    try {
      const updates: Record<string, string> = {};
      translations.forEach(({ key, value }) => {
        if (key && value) {
          updates[key] = value;
        }
      });

      const success = await bulkUpdateTranslations(updates);
      if (success) {
        toast.success('Traduções atualizadas com sucesso!');
      } else {
        throw new Error('Failed to update translations');
      }
    } catch (err) {
      console.error('Error saving translations:', err);
      toast.error('Erro ao salvar traduções');
    } finally {
      setSaving(false);
    }
  };

  if (!config) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-black text-white">CEO Regional Dashboard</h1>
          <p className="text-gray-400">
            Gerenciar branding e traduções para {config.country_name}
          </p>
          <Badge className="w-fit gap-2">
            <Globe className="w-3 h-3" />
            {config.country_code} • {config.language_code}
          </Badge>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="branding" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-white/10">
            <TabsTrigger value="branding" className="gap-2">
              <Palette className="w-4 h-4" />
              Branding
            </TabsTrigger>
            <TabsTrigger value="translations" className="gap-2">
              <Globe className="w-4 h-4" />
              Traduções
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="w-4 h-4" />
              Configurações
            </TabsTrigger>
          </TabsList>

          {/* Branding Tab */}
          <TabsContent value="branding" className="space-y-6">
            <Card className="border-white/10 bg-white/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="w-5 h-5" />
                  Cores e Tema
                </CardTitle>
                <CardDescription>Personalize as cores da sua plataforma regional</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {['primary_color', 'secondary_color', 'accent_color', 'background_color', 'text_color'].map((field) => (
                    <div key={field} className="space-y-2">
                      <label className="text-sm font-semibold capitalize">
                        {field.replace('_', ' ')}
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={branding[field as keyof BrandingFormData]}
                          onChange={(e) => handleBrandingChange(field as keyof BrandingFormData, e.target.value)}
                          className="w-12 h-12 rounded-lg cursor-pointer"
                        />
                        <Input
                          value={branding[field as keyof BrandingFormData]}
                          onChange={(e) => handleBrandingChange(field as keyof BrandingFormData, e.target.value)}
                          className="flex-1"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold">Font Family</label>
                  <Input
                    value={branding.font_family}
                    onChange={(e) => handleBrandingChange('font_family', e.target.value)}
                    placeholder="e.g., Inter, sans-serif"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold">Custom CSS</label>
                  <Textarea
                    value={branding.custom_css}
                    onChange={(e) => handleBrandingChange('custom_css', e.target.value)}
                    placeholder="/* Custom CSS rules */"
                    rows={6}
                    className="font-mono text-xs"
                  />
                </div>

                <Button onClick={handleSaveBranding} disabled={saving} className="w-full gap-2">
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Salvar Branding
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Logo Upload */}
            <Card className="border-white/10 bg-white/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Upload de Mídia
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Logo da Região</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                    className="block w-full"
                  />
                  {logoFile && (
                    <Button onClick={handleUploadLogo} disabled={saving} className="gap-2">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      Upload Logo
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Translations Tab */}
          <TabsContent value="translations" className="space-y-6">
            <Card className="border-white/10 bg-white/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  Gerenciar Traduções
                </CardTitle>
                <CardDescription>Adicione ou edite traduções personalizadas</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {translations.map((translation, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="grid grid-cols-2 gap-2"
                    >
                      <Input
                        placeholder="Chave (e.g., 'live.title')"
                        value={translation.key}
                        onChange={(e) => handleTranslationChange(index, 'key', e.target.value)}
                      />
                      <Input
                        placeholder="Valor da tradução"
                        value={translation.value}
                        onChange={(e) => handleTranslationChange(index, 'value', e.target.value)}
                      />
                    </motion.div>
                  ))}
                </div>

                <Button onClick={handleAddTranslation} variant="outline" className="w-full">
                  + Adicionar Tradução
                </Button>

                <Button onClick={handleSaveTranslations} disabled={saving} className="w-full gap-2">
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Salvar Traduções
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card className="border-white/10 bg-white/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Configurações Regionais
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {config.settings && Object.entries(config.settings).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                      <span className="text-sm font-medium capitalize">{key.replace(/_/g, ' ')}</span>
                      <Badge variant={value ? 'default' : 'secondary'}>
                        {value ? 'Ativado' : 'Desativado'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default RegionalCEODashboard;
