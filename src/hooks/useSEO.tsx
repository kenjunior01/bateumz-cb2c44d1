import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";

const SITE_URL = "https://bateu.online";
const SITE_NAME = "Bateu";
const DEFAULT_OG_IMAGE = "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/bd21f8dd-eda4-4443-8c1d-e2d7381d0894/id-preview-f4e30fa7--e2705fd6-9dd9-4a6f-a990-09889c32175c.lovable.app-1786955424283.png";

export interface SEOOptions {
  /** Page title — se não fornecido, usa o site name */
  title?: string;
  /** Meta description (150-160 chars recomendado) */
  description?: string;
  /** Caminho canónico relativo (ex: '/blog') — null para desativar */
  canonicalPath?: string | null;
  /** URL absoluta da imagem OG (1200x630) */
  ogImage?: string;
  /** Tipo OG (padrão: 'website') */
  ogType?: string;
  /** Desativar indexação */
  noindex?: boolean;
  /** Dados estruturados JSON-LD adicionais */
  structuredData?: object | object[];
  /** Palavras-chave (influencia og:description mas não é crítico) */
  keywords?: string[];
}

/**
 * Hook de SEO padronizado para todas as páginas.
 *
 * Uso:
 * ```tsx
 * useSEO({ title: "Blog", description: "Artigos sobre...", canonicalPath: "/blog" });
 * ```
 */
export function useSEO(opts: SEOOptions = {}) {
  const location = useLocation();

  const {
    title,
    description,
    canonicalPath,
    ogImage = DEFAULT_OG_IMAGE,
    ogType = "website",
    noindex = false,
    structuredData,
  } = opts;

  const fullTitle = title
    ? `${title} — ${SITE_NAME}`
    : `${SITE_NAME} — Plataforma de Jogos, Sorteios ao Vivo e Apostas Esportivas`;

  const canonicalUrl =
    canonicalPath === null
      ? undefined
      : canonicalPath
        ? `${SITE_URL}${canonicalPath}`
        : `${SITE_URL}${location.pathname}`;

  const robotsContent = noindex
    ? "noindex, nofollow"
    : "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1";

  // Normalizar structured data para array
  const jsonLdItems = structuredData
    ? Array.isArray(structuredData)
      ? structuredData
      : [structuredData]
    : [];

  useEffect(() => {
    // Scroll to top on route change (SEO-friendly: fresh page state)
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [location.pathname]);

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description || fullTitle} />
      <meta name="robots" content={robotsContent} />
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}

      {/* Open Graph */}
      <meta property="og:type" content={ogType} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description || fullTitle} />
      <meta property="og:url" content={canonicalUrl || `${SITE_URL}${location.pathname}`} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="pt_MZ" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description || fullTitle} />
      <meta name="twitter:image" content={ogImage} />

      {/* JSON-LD Structured Data */}
      {jsonLdItems.map((item, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }}
        />
      ))}
    </Helmet>
  );
}
