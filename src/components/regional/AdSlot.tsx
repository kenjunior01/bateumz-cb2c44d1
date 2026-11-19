import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Megaphone, ChevronRight } from "lucide-react";
import { useRegionalTheme } from "@/contexts/RegionalThemeContext";
import {
  anunciosAtivos, registrarImpressao, registrarClique, urlSegura,
  type AnuncioRegional, type PaisCoFundador,
} from "@/lib/regionalBranding";
import { cn } from "@/lib/utils";

// ── FAIXA DE ANÚNCIOS REGIONAIS — v72 ─────────────────────────
// O co-fundador DO PAÍS publica anúncios que os jogadores DAQUELE
// país veem no topo do hub. Rotação a cada 9 s entre os anúncios
// ativos, impressões/cliques HONESTOS (1 impressão por rotação
// visível), CTA só caminhos internos.
// Sem anúncios no país → o componente NÃO RENDERIZA nada.

const ROTACAO_MS = 9000;

export function FaixaAnunciosRegionais({ className }: { className?: string }) {
  const { country } = useRegionalTheme();
  const pais = country as PaisCoFundador;
  const [lista, setLista] = useState<AnuncioRegional[]>([]);
  const [idx, setIdx] = useState(0);
  const ultimaContada = useRef<string | null>(null);

  // carrega a lista do país (e re-verifica quando o país muda)
  useEffect(() => {
    if (!["MZ", "AO", "BR", "PT"].includes(pais)) { setLista([]); return; }
    setLista(anunciosAtivos(pais));
    setIdx(0);
  }, [pais]);

  // rotação entre anúncios
  const atual = lista.length > 0 ? lista[idx % lista.length] : null;
  useEffect(() => {
    if (!atual || lista.length < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % lista.length), ROTACAO_MS);
    return () => clearInterval(t);
  }, [atual, lista.length]);

  // impressão honesta (1× por anúncio por montagem)
  useEffect(() => {
    if (atual && ultimaContada.current !== atual.id) {
      ultimaContada.current = atual.id;
      registrarImpressao(atual.id);
    }
  }, [atual]);

  if (!atual) return null;

  return (
    <div className={cn("relative", className)} data-testid="faixa-anuncios">
      <AnimatePresence mode="wait">
        <motion.a
          key={atual.id}
          href={urlSegura(atual.ctaUrl)}
          onClick={(e) => {
            e.preventDefault();
            registrarClique(atual.id);
            window.location.assign(urlSegura(atual.ctaUrl));
          }}
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.35 }}
          className={cn(
            "group flex items-center gap-3 rounded-xl px-4 py-2.5 bg-gradient-to-r text-white shadow-lg",
            atual.gradiente
          )}
          data-testid="anuncio-ativo"
          data-anuncio-id={atual.id}
        >
          <Megaphone className="h-4 w-4 shrink-0 opacity-90" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold leading-tight truncate">{atual.titulo}</p>
            <p className="text-[11px] opacity-90 truncate">{atual.texto}</p>
          </div>
          <span className="shrink-0 rounded-full bg-white/20 px-3 py-1 text-[11px] font-semibold group-hover:bg-white/30 transition-colors">
            {atual.ctaEtiqueta}
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 opacity-80 group-hover:translate-x-0.5 transition-transform" />
        </motion.a>
      </AnimatePresence>
    </div>
  );
}

// ── CARTÃO DE ANÚNCIO «DESTAQUE» — para a grelha do hub ───────
export function CartaoAnuncioRegional({ className }: { className?: string }) {
  const { country } = useRegionalTheme();
  const pais = country as PaisCoFundador;
  const [destaque, setDestaque] = useState<AnuncioRegional | null>(null);

  useEffect(() => {
    if (!["MZ", "AO", "BR", "PT"].includes(pais)) { setDestaque(null); return; }
    const faixas = anunciosAtivos(pais);
    setDestaque(faixas.length > 0 ? faixas[Math.floor(Date.now() / 30000) % faixas.length] : null);
  }, [pais]);

  const contou = useRef<string | null>(null);
  useEffect(() => {
    if (destaque && contou.current !== destaque.id) {
      contou.current = destaque.id;
      registrarImpressao(destaque.id);
    }
  }, [destaque]);

  if (!destaque) return null;

  return (
    <motion.a
      href={urlSegura(destaque.ctaUrl)}
      onClick={(e) => {
        e.preventDefault();
        registrarClique(destaque.id);
        window.location.assign(urlSegura(destaque.ctaUrl));
      }}
      whileHover={{ scale: 1.02 }}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "relative flex flex-col justify-between overflow-hidden rounded-2xl p-4 bg-gradient-to-br text-white shadow-xl min-h-[120px]",
        destaque.gradiente, className
      )}
      data-testid="anuncio-destaque"
      data-anuncio-id={destaque.id}
    >
      <div className="absolute inset-0 bg-black/10" />
      <div className="relative">
        <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">Patrocinado · {destaque.criadoPor}</p>
        <p className="mt-1 text-lg font-extrabold leading-tight">{destaque.titulo}</p>
        <p className="text-xs opacity-90 line-clamp-2">{destaque.texto}</p>
      </div>
      <span className="relative mt-2 inline-flex w-fit items-center gap-1 rounded-full bg-white/25 px-3 py-1 text-xs font-bold">
        {destaque.ctaEtiqueta} <ChevronRight className="h-3 w-3" />
      </span>
    </motion.a>
  );
}
