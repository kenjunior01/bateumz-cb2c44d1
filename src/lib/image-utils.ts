/** Supabase Storage image transforms + helpers for SEO-friendly delivery. */

export interface ImageOptimizeOptions {
  width?: number;
  height?: number;
  quality?: number;
}

/** Convert Supabase public object URLs to WebP render URLs when possible. */
export function getOptimizedImageUrl(
  url: string | null | undefined,
  options: ImageOptimizeOptions = {},
): string | undefined {
  if (!url?.trim()) return undefined;

  const { width = 800, height, quality = 80 } = options;
  const objectMatch = url.match(
    /^(https:\/\/[^/]+)\/storage\/v1\/object\/public\/(.+)$/,
  );

  if (objectMatch) {
    const [, base, path] = objectMatch;
    const params = new URLSearchParams({
      width: String(width),
      quality: String(quality),
      format: "webp",
    });
    if (height) params.set("height", String(height));
    return `${base}/storage/v1/render/image/public/${path}?${params.toString()}`;
  }

  return url;
}

export function hasWebpVariant(url: string | null | undefined): boolean {
  if (!url) return false;
  const optimized = getOptimizedImageUrl(url);
  return !!optimized && optimized !== url;
}
