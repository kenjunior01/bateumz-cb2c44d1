import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, Copy, Check, AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { generateSlug, checkSlugAvailability } from '@/hooks/useCompanySlug';
import { supabase } from '@/integrations/supabase/client';

interface CompanySlugManagerProps {
  companyId: string;
  companyName: string;
  currentSlug?: string;
  onSlugUpdated?: (newSlug: string) => void;
}

export const CompanySlugManager: React.FC<CompanySlugManagerProps> = ({
  companyId,
  companyName,
  currentSlug,
  onSlugUpdated
}) => {
  const [slug, setSlug] = useState(currentSlug || generateSlug(companyName));
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // Check slug availability when it changes
  useEffect(() => {
    const checkAvailability = async () => {
      if (!slug) return;

      setIsChecking(true);
      try {
        const available = await checkSlugAvailability(slug, companyId);
        setIsAvailable(available);
      } catch (err) {
        console.error('Error checking slug:', err);
        setIsAvailable(false);
      } finally {
        setIsChecking(false);
      }
    };

    const timer = setTimeout(checkAvailability, 500);
    return () => clearTimeout(timer);
  }, [slug, companyId]);

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSlug(generateSlug(value));
  };

  const handleSave = async () => {
    if (!isAvailable) {
      toast.error('Este URL já está em uso. Escolha outro.');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await (supabase as any)
        .from('companies')
        .update({ slug })
        .eq('id', companyId);

      if (error) throw error;

      toast.success('URL personalizado atualizado com sucesso!');
      if (onSlugUpdated) onSlugUpdated(slug);
    } catch (err) {
      console.error('Error saving slug:', err);
      toast.error('Erro ao atualizar URL');
    } finally {
      setIsSaving(false);
    }
  };


  const handleCopy = () => {
    const url = `${window.location.origin}/business/${slug}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('URL copiado para clipboard!');
  };

  const publicUrl = `${window.location.origin}/business/${slug}`;

  return (
    <Card className="border-white/10 bg-white/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link className="w-5 h-5 text-primary" />
          URL Personalizado
        </CardTitle>
        <CardDescription>
          Crie uma URL amigável para sua empresa que seja fácil de compartilhar
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Input Section */}
        <div className="space-y-3">
          <label className="text-sm font-semibold">Seu URL Personalizado</label>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                bateu.online/business/
              </span>
              <Input
                value={slug}
                onChange={handleSlugChange}
                placeholder="sua-empresa"
                className="pl-[200px] font-mono"
              />
              {isChecking && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-500" />
              )}
            </div>
          </div>

          {/* Status Indicator */}
          <div className="flex items-center gap-2">
            {isAvailable === null ? (
              <Badge variant="outline" className="gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                Verificando...
              </Badge>
            ) : isAvailable ? (
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30 gap-1">
                <Check className="w-3 h-3" />
                Disponível
              </Badge>
            ) : (
              <Badge className="bg-red-500/20 text-red-400 border-red-500/30 gap-1">
                <AlertCircle className="w-3 h-3" />
                Não disponível
              </Badge>
            )}
          </div>
        </div>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={!isAvailable || isSaving}
          className="w-full"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            'Salvar URL Personalizado'
          )}
        </Button>

        {/* Public URL Display */}
        {currentSlug && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-lg bg-primary/10 border border-primary/20 space-y-3"
          >
            <p className="text-sm text-gray-400">Seu URL público:</p>
            <div className="flex items-center gap-2 bg-black/30 rounded-lg p-3 border border-white/10">
              <code className="flex-1 text-sm font-mono text-primary break-all">
                {publicUrl}
              </code>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCopy}
                className="shrink-0"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              Compartilhe este link com seus clientes para que acessem seu perfil
            </p>
          </motion.div>
        )}

        {/* Guidelines */}
        <div className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-2">
          <p className="text-sm font-semibold">Dicas para um bom URL:</p>
          <ul className="text-xs text-gray-400 space-y-1 list-disc list-inside">
            <li>Use o nome da sua empresa ou marca</li>
            <li>Evite caracteres especiais (apenas letras, números e hífens)</li>
            <li>Mantenha curto e fácil de lembrar</li>
            <li>Use minúsculas (será convertido automaticamente)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default CompanySlugManager;
