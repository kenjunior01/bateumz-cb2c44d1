// ============================================================
// RÁDIOS PALOP AO VIVO — dados reais do Radio Browser (v34)
// · Estações comunitárias reais de MZ / AO / CV (hidebroken)
// · Um só <audio> partilhado; stream offline → erro honesto
// · Atribuição visível; cache 6 h + stale-on-error no serviço
// ============================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { ExternalLink, Loader2, Pause, Play, Radio, RefreshCw, AlertTriangle, Signal } from "lucide-react";
import { getRadios, PAISES_PALOP, RADIO_ATTRIBUTION, type CcPalop, type RadioEstacao } from "@/lib/radioBrowser";
import { cn } from "@/lib/utils";

type Estado = "loading" | "ready" | "error";
type StreamEstado = "parado" | "aLigar" | "emitindo";

export default function RadiosPALOP({ compacto = false }: { compacto?: boolean }) {
  const [pais, setPais] = useState<CcPalop>("MZ");
  const [estado, setEstado] = useState<Estado>("loading");
  const [erroMsg, setErroMsg] = useState("");
  const [lista, setLista] = useState<RadioEstacao[]>([]);
  const [velho, setVelho] = useState(false); // dados da cache (offline)
  const [tocando, setTocando] = useState<string | null>(null);
  const [streamEstado, setStreamEstado] = useState<StreamEstado>("parado");
  const [erroStream, setErroStream] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const paisRef = useRef(pais);
  useEffect(() => { paisRef.current = pais; }, [pais]);

  const pararAudio = useCallback(() => {
    const a = audioRef.current;
    if (a) {
      a.onerror = null;
      a.onplaying = null;
      a.onended = null;
      try { a.pause(); a.src = ""; } catch { /* já parado */ }
      audioRef.current = null;
    }
    setTocando(null);
    setStreamEstado("parado");
  }, []);

  const carregar = useCallback(async (cc: CcPalop) => {
    setEstado("loading");
    setErroMsg("");
    pararAudio();
    setErroStream(null);
    try {
      const l = await getRadios(cc);
      setLista(l);
      setVelho(false);
      setEstado("ready");
    } catch (e) {
      setErroMsg(e instanceof Error ? e.message : "Sem ligação ao Radio Browser");
      setEstado("error");
    }
  }, [pararAudio]);

  useEffect(() => { carregar(paisRef.current); }, [carregar]);
  useEffect(() => () => pararAudio(), [pararAudio]);

  const ouvir = (est: RadioEstacao) => {
    setErroStream(null);
    if (tocando === est.uuid) { pararAudio(); return; }
    pararAudio();
    setTocando(est.uuid);
    setStreamEstado("aLigar");
    const a = new Audio();
    a.preload = "none";
    a.src = est.url;
    a.onerror = () => {
      // só importa o erro do stream que está mesmo selecionado agora
      if (audioRef.current !== a) return;
      setErroStream(est.uuid);
      setStreamEstado("parado");
      setTocando(null);
    };
    a.onplaying = () => setStreamEstado("emitindo");
    a.onended = () => { setStreamEstado("parado"); setTocando(null); };
    audioRef.current = a;
    a.play().catch(() => {
      setErroStream(est.uuid);
      setStreamEstado("parado");
      setTocando(null);
    });
  };

  return (
    <div data-testid="radios-palop" className={cn("rounded-2xl border border-border/60 bg-card overflow-hidden", compacto ? "text-xs" : "")}>
      {/* cabeçalho + tabs por país */}
      <div className="px-4 pt-3 pb-2 border-b border-border/50 bg-gradient-to-r from-rose-500/5 via-transparent to-amber-500/5">
        <div className="flex items-center gap-2">
          <Radio className="h-4 w-4 text-rose-500" />
          <h3 className={cn("font-black text-foreground", compacto ? "text-[13px]" : "text-sm")}>Rádios PALOP ao vivo</h3>
          <span className="text-[10px] text-muted-foreground hidden sm:inline">· emissores reais, ligação direta</span>
        </div>
        <div className="flex gap-1.5 mt-2" data-testid="radios-paises">
          {PAISES_PALOP.map((p) => (
            <button
              key={p.cc}
              data-testid={`radio-pais-${p.cc}`}
              onClick={() => { setPais(p.cc); carregar(p.cc); }}
              className={cn(
                "px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors",
                pais === p.cc
                  ? "bg-rose-500/15 border-rose-500/50 text-rose-600 dark:text-rose-400"
                  : "border-border/60 text-muted-foreground hover:bg-muted/40",
              )}
            >
              {p.bandeira} {p.nome}
            </button>
          ))}
        </div>
      </div>

      {/* estados honestos */}
      {estado === "loading" && (
        <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground" data-testid="radios-loading">
          <Loader2 className="h-4 w-4 animate-spin" /> A pedir estações reais…
        </div>
      )}

      {estado === "error" && (
        <div className="p-4 text-center space-y-2" data-testid="radios-erro">
          <AlertTriangle className="h-5 w-5 mx-auto text-amber-500" />
          <p className="text-xs font-bold text-amber-600 dark:text-amber-400">Rádios indisponíveis</p>
          <p className="text-[11px] text-muted-foreground">{erroMsg}</p>
          <button onClick={() => carregar(pais)} data-testid="radios-retry"
            className="mx-auto flex items-center gap-1 px-3 py-1.5 rounded-lg border border-amber-500/40 text-amber-600 dark:text-amber-400 text-xs font-bold hover:bg-amber-500/10">
            <RefreshCw className="h-3 w-3" /> Tentar novamente
          </button>
        </div>
      )}

      {estado === "ready" && lista.length === 0 && (
        <p className="py-6 text-center text-xs text-muted-foreground" data-testid="radios-vazio">
          Sem estações https ativas nesta categoria na fonte — nada inventado para preencher.
        </p>
      )}

      {estado === "ready" && lista.length > 0 && (
        <ul className={cn("divide-y divide-border/40", compacto ? "max-h-56 overflow-y-auto" : "")} data-testid="radios-lista">
          {lista.map((est, i) => {
            const ativo = tocando === est.uuid;
            return (
              <li key={est.uuid} data-testid={`radio-row-${i}`} className={cn("flex items-center gap-3 px-3", compacto ? "py-1.5" : "py-2", ativo && "bg-rose-500/5")}>
                <button
                  onClick={() => ouvir(est)}
                  data-testid={`radio-btn-${i}`}
                  aria-label={ativo ? `Parar ${est.nome}` : `Ouvir ${est.nome}`}
                  className={cn(
                    "shrink-0 h-8 w-8 rounded-full flex items-center justify-center border transition-colors active:scale-95",
                    ativo ? "bg-rose-500 border-rose-500 text-white" : "border-border text-muted-foreground hover:bg-muted/50",
                  )}
                >
                  {ativo && streamEstado !== "parado" ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
                </button>
                <div className="min-w-0 flex-1">
                  <p className={cn("font-bold truncate", compacto ? "text-[12px]" : "text-[13px]")} title={est.nome}>
                    {est.nome}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {est.codec}{est.bitrate ? ` · ${est.bitrate}kbps` : ""}{est.tags.length ? ` · ${est.tags.join(", ")}` : ""}
                  </p>
                  {ativo && (
                    <p className="text-[10px] font-bold text-rose-500 mt-0.5" data-testid="radio-estado">
                      {streamEstado === "aLigar" && "A ligar à emissão…"}
                      {streamEstado === "emitindo" && "● A emitir ao vivo"}
                    </p>
                  )}
                  {erroStream === est.uuid && (
                    <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 mt-0.5" data-testid="radio-erro-stream">
                      Emissão offline ou indisponível agora — tenta outra estação.
                    </p>
                  )}
                </div>
                {est.homepage && (
                  <a href={est.homepage} target="_blank" rel="noopener noreferrer" className="shrink-0 text-muted-foreground/60 hover:text-foreground" aria-label={`Site de ${est.nome}`}>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {estado === "ready" && velho && (
        <p className="px-4 py-1.5 text-[10px] text-amber-600 dark:text-amber-400 border-t border-border/40" data-testid="radios-velho">
          Sem ligação — a mostrar a última lista real guardada no teu dispositivo.
        </p>
      )}

      <p className="px-4 py-2 text-[10px] text-muted-foreground/70 flex items-center gap-1 border-t border-border/40" data-testid="radio-atrib">
        <Signal className="h-3 w-3 shrink-0" /> {RADIO_ATTRIBUTION}
      </p>
    </div>
  );
}
