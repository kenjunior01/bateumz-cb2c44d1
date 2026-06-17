import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  label?: string;
  placeholder?: string;
  bucketName?: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({ 
  value, 
  onChange, 
  label, 
  placeholder = "URL da imagem",
  bucketName = "game-images"
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(value || null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    
    try {
      // Create a unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      
      // Upload to Supabase Storage
      const { error } = await supabase.storage
        .from(bucketName)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        throw error;
      }

      // Get the public URL
      const { data } = supabase.storage
        .from(bucketName)
        .getPublicUrl(fileName);

      const url = data.publicUrl;
      setPreview(url);
      onChange(url);
      toast.success("Imagem carregada com sucesso!");
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error("Erro ao carregar imagem. Tente novamente.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setPreview(url);
    onChange(url);
  };

  const handleClear = () => {
    setPreview(null);
    onChange("");
  };

  return (
    <div className="space-y-3">
      {label && <Label>{label}</Label>}
      
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder={placeholder}
          value={value || ""}
          onChange={handleUrlChange}
          className="flex-1"
        />
        <Label className="cursor-pointer">
          <Button 
            variant="secondary" 
            disabled={isUploading}
            type="button"
            className="relative overflow-hidden"
          >
            {isUploading ? (
              <Upload className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            {isUploading ? "Carregando..." : "Upload"}
            <input
              type="file"
              accept="image/*"
              className="absolute inset-0 opacity-0 cursor-pointer"
              onChange={handleFileUpload}
              disabled={isUploading}
            />
          </Button>
        </Label>
        {value && (
          <Button 
            variant="destructive" 
            size="icon" 
            type="button" 
            onClick={handleClear}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {preview && (
        <div className="mt-3 relative rounded-lg overflow-hidden border border-border">
          <img 
            src={preview} 
            alt="Preview" 
            className="w-full h-40 object-cover"
            onError={() => setPreview(null)}
          />
        </div>
      )}
    </div>
  );
};
