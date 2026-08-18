/**
 * Gerador de Sitemap Dinâmico para Bateu
 * 
 * Este script gera um sitemap.xml que inclui:
 * - Páginas estáticas (hardcoded)
 * - Sorteios ativos (da Supabase)
 * - Posts do blog (da Supabase)
 * - Empresas registadas (da Supabase)
 * - Torneios activos (da Supabase)
 * 
 * USO: npx tsx scripts/generate-sitemap.ts
 * OU: Adicionar ao CI/CD pipeline antes do build
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

const SITE_URL = "https://bateu.online";

// Supabase anon key (safe for read-only)
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://xqgiihrgvlnqjmojfoww.supabase.co";
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface SitemapEntry {
  loc: string;
  changefreq?: string;
  priority?: string;
  lastmod?: string;
}

// Páginas estáticas com prioridades SEO
const STATIC_PAGES: SitemapEntry[] = [
  { loc: "/", changefreq: "daily", priority: "1.0" },
  { loc: "/marketplace", changefreq: "hourly", priority: "0.95" },
  { loc: "/jogos", changefreq: "daily", priority: "0.9" },
  { loc: "/instant-win", changefreq: "daily", priority: "0.85" },
  { loc: "/lives", changefreq: "hourly", priority: "0.85" },
  { loc: "/lives-agora", changefreq: "always", priority: "0.8" },
  { loc: "/batalhas", changefreq: "daily", priority: "0.8" },
  { loc: "/tournaments", changefreq: "daily", priority: "0.8" },
  { loc: "/ligas", changefreq: "daily", priority: "0.75" },
  { loc: "/concursos", changefreq: "daily", priority: "0.8" },
  { loc: "/blog", changefreq: "daily", priority: "0.85" },
  { loc: "/empresas", changefreq: "daily", priority: "0.8" },
  { loc: "/community", changefreq: "weekly", priority: "0.6" },
  { loc: "/historico", changefreq: "daily", priority: "0.6" },
  { loc: "/como-funciona", changefreq: "monthly", priority: "0.7" },
  { loc: "/faq", changefreq: "monthly", priority: "0.7" },
  { loc: "/transparencia", changefreq: "monthly", priority: "0.7" },
  { loc: "/install", changefreq: "monthly", priority: "0.5" },
  { loc: "/prestacoes", changefreq: "daily", priority: "0.7" },
  { loc: "/prestacoes/catalogo", changefreq: "weekly", priority: "0.65" },
  { loc: "/register", changefreq: "monthly", priority: "0.6" },
];

function formatEntry(entry: SitemapEntry): string {
  const lines = [`  <url>`, `    <loc>${SITE_URL}${entry.loc}</loc>`];
  if (entry.lastmod) lines.push(`    <lastmod>${entry.lastmod}</lastmod>`);
  if (entry.changefreq) lines.push(`    <changefreq>${entry.changefreq}</changefreq>`);
  if (entry.priority) lines.push(`    <priority>${entry.priority}</priority>`);
  lines.push(`  </url>`);
  return lines.join("\n");
}

function toISO(date: string | null): string | undefined {
  if (!date) return undefined;
  try { return new Date(date).toISOString().split("T")[0]; } catch { return undefined; }
}

async function generateSitemap() {
  console.log("🔄 Gerando sitemap dinâmico...");
  const entries: SitemapEntry[] = [...STATIC_PAGES];
  let dynamicCount = 0;

  // 1. Sorteios ativos
  try {
    const { data: raffles } = await (supabase as any)
      .from("raffles")
      .select("slug, updated_at")
      .eq("status", "active")
      .order("updated_at", { ascending: false });

    if (raffles?.length) {
      for (const r of raffles) {
        if (r.slug) {
          entries.push({
            loc: `/raffle/${r.slug}`,
            changefreq: "daily",
            priority: "0.9",
            lastmod: toISO(r.updated_at),
          });
          dynamicCount++;
        }
      }
      console.log(`  ✓ ${raffles.length} sorteios activos`);
    }
  } catch (e) {
    console.log("  ⚠ Não foi possível buscar sorteios");
  }

  // 2. Posts do blog
  try {
    const { data: posts } = await (supabase as any)
      .from("blog_posts")
      .select("slug, updated_at")
      .eq("published", true)
      .order("updated_at", { ascending: false });

    if (posts?.length) {
      for (const p of posts) {
        if (p.slug) {
          entries.push({
            loc: `/blog/${p.slug}`,
            changefreq: "weekly",
            priority: "0.8",
            lastmod: toISO(p.updated_at),
          });
          dynamicCount++;
        }
      }
      console.log(`  ✓ ${posts.length} posts do blog`);
    }
  } catch (e) {
    console.log("  ⚠ Não foi possível buscar posts do blog");
  }

  // 3. Empresas
  try {
    const { data: companies } = await (supabase as any)
      .from("companies")
      .select("slug, updated_at")
      .eq("is_active", true)
      .order("updated_at", { ascending: false });

    if (companies?.length) {
      for (const c of companies) {
        if (c.slug) {
          entries.push({
            loc: `/empresa/${c.slug}`,
            changefreq: "weekly",
            priority: "0.75",
            lastmod: toISO(c.updated_at),
          });
          dynamicCount++;
        }
      }
      console.log(`  ✓ ${companies.length} empresas activas`);
    }
  } catch (e) {
    console.log("  ⚠ Não foi possível buscar empresas");
  }

  // 4. Torneios activos
  try {
    const { data: tournaments } = await (supabase as any)
      .from("tournaments")
      .select("id, updated_at")
      .eq("status", "active")
      .order("updated_at", { ascending: false });

    if (tournaments?.length) {
      for (const t of tournaments) {
        entries.push({
          loc: `/tournaments/${t.id}`,
          changefreq: "daily",
          priority: "0.7",
          lastmod: toISO(t.updated_at),
        });
        dynamicCount++;
      }
      console.log(`  ✓ ${tournaments.length} torneios activos`);
    }
  } catch (e) {
    console.log("  ⚠ Não foi possível buscar torneios");
  }

  // Gerar XML
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${entries.map(formatEntry).join("\n")}
</urlset>`;

  const outPath = path.join(__dirname, "..", "public", "sitemap.xml");
  fs.writeFileSync(outPath, xml, "utf-8");
  console.log(`\n✅ Sitemap gerado: ${entries.length} URLs (${dynamicCount} dinâmicas)`);
  console.log(`   Ficheiro: ${outPath}`);
}

generateSitemap().catch(console.error);
