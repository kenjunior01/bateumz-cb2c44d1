// ═══════════════════════════════════════════════════════════════════════
// v57 — ENDPOINTS DA IA — FONTE ÚNICA (extraído da página /ia da v54)
//
// A v54 definia `resolverEndpointChat` + `cabecalhosEdge` DENTRO do
// IaBateu.tsx. A v57 põe o NPC IA na Praça da Cidade Bateu — a segunda
// página que fala com o Nemotron — e duplicar a regra em dois sítios é
// furo aberto. A regra vive AQUI agora; as duas páginas importam.
//
// O browser NUNCA conhece a chave NVIDIA:
//   · modo "edge"  (produção): supabase/functions/nemotron-chat com JWT;
//   · modo "proxy" (dev/testes): server/ia-proxy.mjs via VITE_IA_ENDPOINT;
//   · modo "directo" (SÓ dev, declarado no UI): VITE_NEMOTRON_DIRECTO=1 +
//     VITE_NVIDIA_API_KEY — a chave fica no bundle (risco assumido e visível).
// ═══════════════════════════════════════════════════════════════════════

import { supabase } from "@/integrations/supabase/client";

export type ModoIa = "edge" | "proxy" | "directo";

export interface EndpointIa {
  url: string;
  modo: ModoIa;
  chaveDirecta?: string;
}

export function resolverEndpointChat(): EndpointIa {
  const explicito = import.meta.env.VITE_IA_ENDPOINT as string | undefined;
  if (explicito) return { url: explicito, modo: "proxy" };
  const chaveDirecta = import.meta.env.VITE_NVIDIA_API_KEY as string | undefined;
  if (import.meta.env.VITE_NEMOTRON_DIRECTO === "1" && chaveDirecta) {
    return { url: "https://integrate.api.nvidia.com/v1/chat/completions", modo: "directo", chaveDirecta };
  }
  const base = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || "https://ngxrdpplyghlugoowjqj.supabase.co";
  return { url: `${base}/functions/v1/nemotron-chat`, modo: "edge" };
}

// ── Cabeçalhos da edge function (JWT do utilizador — a chave NVIDIA fica no Deno) ──

export async function cabecalhosEdge(): Promise<Record<string, string>> {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) return { Authorization: `Bearer ${token}`, apikey: (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string) || "" };
  } catch {}
  return { apikey: (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string) || "" };
}
