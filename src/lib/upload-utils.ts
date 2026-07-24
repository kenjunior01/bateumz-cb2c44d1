/** Shared, permissive upload validation for images and media. */

export const DEFAULT_MAX_UPLOAD_MB = 20;

/** Broad accept string for file inputs — includes common image formats. */
export const ACCEPT_IMAGES =
  "image/*,.webp,.gif,.svg,.heic,.heif,.bmp,.tiff,.avif,.ico";

export const ACCEPT_MEDIA =
  "image/*,video/*,audio/*,.webp,.gif,.svg,.heic,.heif,.bmp,.tiff,.avif,.mp4,.webm,.mov,.pdf";

const IMAGE_EXTENSIONS = new Set([
  "jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "tiff", "tif", "heic", "heif", "avif", "ico",
]);

export function isLikelyImage(file: File): boolean {
  if (file.type.startsWith("image/")) return true;
  const ext = file.name.split(".").pop()?.toLowerCase();
  return ext ? IMAGE_EXTENSIONS.has(ext) : false;
}

export function validateImageFile(file: File, maxMb = DEFAULT_MAX_UPLOAD_MB): string | null {
  if (!isLikelyImage(file)) {
    return "Selecione um ficheiro de imagem válido (JPG, PNG, WEBP, GIF, SVG, HEIC, etc.)";
  }
  if (file.size > maxMb * 1024 * 1024) {
    return `Ficheiro demasiado grande (máx. ${maxMb}MB)`;
  }
  return null;
}

export function formatUploadHint(maxMb = DEFAULT_MAX_UPLOAD_MB): string {
  return `Imagens até ${maxMb}MB — JPG, PNG, WEBP, GIF, SVG, HEIC e mais`;
}
