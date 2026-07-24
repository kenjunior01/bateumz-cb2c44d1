import { getOptimizedImageUrl } from "@/lib/image-utils";

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string | null | undefined;
  alt: string;
  /** Target width for Supabase transform (WebP). */
  optimizeWidth?: number;
  priority?: boolean;
}

/**
 * Lazy-loaded image with WebP source when served from Supabase Storage.
 * Falls back to the original URL for external/CDN assets.
 */
export default function OptimizedImage({
  src,
  alt,
  optimizeWidth = 800,
  priority = false,
  className,
  ...rest
}: OptimizedImageProps) {
  if (!src) return null;

  const webpSrc = getOptimizedImageUrl(src, { width: optimizeWidth });
  const loading = priority ? "eager" : "lazy";
  const fetchPriority = priority ? ("high" as const) : undefined;

  if (webpSrc && webpSrc !== src) {
    return (
      <picture>
        <source srcSet={webpSrc} type="image/webp" />
        <img
          src={src}
          alt={alt}
          loading={loading}
          decoding="async"
          fetchPriority={fetchPriority}
          className={className}
          {...rest}
        />
      </picture>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={loading}
      decoding="async"
      fetchPriority={fetchPriority}
      className={className}
      {...rest}
    />
  );
}
