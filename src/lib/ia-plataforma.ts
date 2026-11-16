// ═══════════════════════════════════════════════════════════════════════
// v56 — IA LÊ A PLATAFORMA — CONSULTAS REAIS (browser, supabase)
//
// Busca os dados PÚBLICOS reais da plataforma (sorteios ativos, concursos
// ativos, blog publicado) e devolve DocPlataforma[] para o índice RAG.
// SÓ corre no browser (usa o cliente supabase) — o mapeio puro vive em
// ia-docs.ts e é testado no Node.
//
// Honestidade: cada fonte é consultada e validada INDEPENDENTEMENTE; uma
// fonte que falha entra em `erros` (com o motivo real) — nunca silenciada.
// Se TODAS falharem, docs sai vazio e o UI mostra os erros (sem fingir).
// ═══════════════════════════════════════════════════════════════════════

import { supabase } from "@/integrations/supabase/client";
import { LIMITES_DOCS, raffleParaDoc, contestParaDoc, blogParaDoc } from "@/lib/ia-docs";
import type { DocPlataforma } from "@/lib/nemotron-rag";

export interface ResultadoPlataforma {
  docs: DocPlataforma[];
  erros: string[];
  fontesOk: string[];
}

export interface OpcoesPlataforma {
  maxPorTipo?: number;
}

export async function carregarDocsPlataforma(opcoes: OpcoesPlataforma = {}): Promise<ResultadoPlataforma> {
  const maxPorTipo = Math.max(1, Math.min(LIMITES_DOCS.POR_TIPO, Math.round(opcoes.maxPorTipo ?? LIMITES_DOCS.POR_TIPO)));
  const docs: DocPlataforma[] = [];
  const erros: string[] = [];
  const fontesOk: string[] = [];

  // ── Sorteios ATIVOS (o que a homepage mostra) ─────────────────────────
  try {
    const { data, error } = await supabase
      .from("raffles")
      .select("id,title,description,prize_title,ticket_price,currency,total_tickets,sold_tickets,category,city,province,country,end_date,slug,status")
      .eq("status", "active")
      .order("end_date", { ascending: true, nullsFirst: false })
      .limit(maxPorTipo);
    if (error) throw new Error(String(error.message ?? error));
    for (const linha of data ?? []) {
      try { docs.push(raffleParaDoc(linha as any)); } catch (e) { erros.push(`sorteio ignorado: ${String((e as any)?.message ?? e).slice(0, 120)}`); }
    }
    fontesOk.push("sorteios");
  } catch (e) {
    erros.push(`sorteios: ${String((e as any)?.message ?? e).slice(0, 160)}`);
  }

  // ── Concursos ATIVOS ──────────────────────────────────────────────────
  try {
    const { data, error } = await supabase
      .from("contests")
      .select("id,title,description,prize_description,category,entry_fee,end_date,status")
      .eq("status", "active")
      .order("end_date", { ascending: true, nullsFirst: false })
      .limit(maxPorTipo);
    if (error) throw new Error(String(error.message ?? error));
    for (const linha of data ?? []) {
      try { docs.push(contestParaDoc(linha as any)); } catch (e) { erros.push(`concurso ignorado: ${String((e as any)?.message ?? e).slice(0, 120)}`); }
    }
    fontesOk.push("concursos");
  } catch (e) {
    erros.push(`concursos: ${String((e as any)?.message ?? e).slice(0, 160)}`);
  }

  // ── Blog PUBLICADO (mais recente primeiro) ────────────────────────────
  try {
    const { data, error } = await supabase
      .from("blog_posts")
      .select("id,title,summary,content,author_name,slug,published")
      .eq("published", true)
      .order("published_at", { ascending: false })
      .limit(maxPorTipo);
    if (error) throw new Error(String(error.message ?? error));
    for (const linha of data ?? []) {
      try { docs.push(blogParaDoc(linha as any)); } catch (e) { erros.push(`blog ignorado: ${String((e as any)?.message ?? e).slice(0, 120)}`); }
    }
    fontesOk.push("blog");
  } catch (e) {
    erros.push(`blog: ${String((e as any)?.message ?? e).slice(0, 160)}`);
  }

  return { docs, erros, fontesOk };
}
