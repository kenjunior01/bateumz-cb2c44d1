import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FileUploadProps {
  value?: string;
  onChange: (url: string) => void;
  label?: string;
  placeholder?: string;
  accept?: string;
  bucketName?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({ 
  value, 
  onChange, 
  label, 
  placeholder = "URL do arquivo",
  accept = "*/*",
  bucketName = "game-assets"
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(value || null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      
      const { error } = await supabase.storage
        .from(bucketName)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        throw error;
      }

      const { data } = supabase.storage
        .from(bucketName)
        .getPublicUrl(fileName);

      const url = data.publicUrl;
      setPreview(url);
      onChange(url);
      toast.success("Arquivo carregado com sucesso!");
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error("Erro ao carregar arquivo. Tente novamente.");
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
    <motion.div
      className="space-y-3"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {label && <Label>{label}</Label>}
      
      <div className="flex gap-2 shadow-[0_0_10px_hsl(var(--primary)/0.1)] rounded-lg p-1">
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
              accept={accept}
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
        <div className="mt-2 text-sm text-muted-foreground">
          Arquivo selecionado: {preview}
        </div>
      )}
    </motion.div>
  );
};
