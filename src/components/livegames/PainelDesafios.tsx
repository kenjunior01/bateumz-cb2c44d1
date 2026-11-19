// =============================================================
// PAINEL DE DESAFIOS DE EMPRESAS — v70 (plataforma)
// ─────────────────────────────────────────────────────────────
// O vitrine da plataforma para o mecanismo de patrocínios do
// BATEU KART: empresas lançam desafios com prémios em moedas, o
// progresso vive no aparelho (`bateu_desafios_v1`) e a SALA DE
// PATROCÍNIOS deixa qualquer marca criar o seu desafio (demo
// honesta do mecanismo — sem contas de empresa ainda).
// Usado no LiveHub (secção própria) e lendo o MESMO estado que o
// menu do BateuKart usa — uma corrida alimenta os dois.
// =============================================================
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { Trophy, Building2, X, Sparkles } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  listarDesafios, progDe, metaAlvo, podeClamar, clamar, criarDesafio, lerEstado,
  validaInputDesafio, PREMIO_MIN, PREMIO_MAX,
  type MetaDesafio, type InputDesafio,
} from "@/lib/desafios";
import { validarSaveKart, nivelDeXp } from "@/game/kart/core";

const CHAVE_SAVE = "bateu_kart_save";

function nivelAtual(): number {
  try {
    const raw = localStorage.getItem(CHAVE_SAVE);
    return nivelDeXp(validarSaveKart(raw ? JSON.parse(raw) : null).xp);
  } catch { return 1; }
}

function adicionarMoedasSave(moedas: number, xp: number): void {
  try {
    const raw = localStorage.getItem(CHAVE_SAVE);
    const s = validarSaveKart(raw ? JSON.parse(raw) : null);
    const novo = { ...s, moedas: s.moedas + moedas, xp: s.xp + xp, ts: Date.now() };
    localStorage.setItem(CHAVE_SAVE, JSON.stringify(novo));
  } catch { /* sem storage — honesto */ }
}

/** Descrição legível da meta (pt/en). */
function descMeta(m: MetaDesafio, t: (k: string, v?: Record<string, string>) => string): string {
  switch (m.tipo) {
    case "podio": return t("desafios.meta.podio", { pista: m.pista === "qualquer" ? t("desafios.pista.qualquer") : m.pista, n: String(m.top) });
    case "corridasCompletas": return t("desafios.meta.corridas", { n: String(m.n) });
    case "vitorias": return t("desafios.meta.vitorias", { n: String(m.n) });
    case "moedasCorrida": return t("desafios.meta.moedas", { n: String(m.n) });
    case "caixas": return t("desafios.meta.caixas", { n: String(m.n) });
    case "baloes": return t("desafios.meta.baloes", { n: String(m.n) });
    case "onlineCorridas": return t("desafios.meta.online", { n: String(m.n) });
  }
}

// ═════════════════════════════════════════════════════════════
export default function PainelDesafios({ onJogar }: { onJogar?: () => void }) {
  const { t } = useLanguage();
  const [tick, setTick] = useState(0);
  const [sala, setSala] = useState(false);
  // formulário da Sala de Patrocínios
  const [form, setForm] = useState({ empresaNome: "", sector: "", titulo: "", desc: "", metaTipo: "podio" as MetaDesafio["tipo"], metaN: 3, pista: "praia", top: 3, modo: "qualquer" as "corrida" | "batalha" | "online" | "qualquer", premioMoedas: 400, nivelMin: 1 });
  const [erroForm, setErroForm] = useState("");

  const nivel = useMemo(() => nivelAtual(), [tick]);
  const desafios = useMemo(() => listarDesafios(nivel), [nivel, tick]);

  const criar = () => {
    let meta: MetaDesafio;
    if (form.metaTipo === "podio") meta = { tipo: "podio", pista: form.pista, top: form.top, modo: "qualquer" };
    else if (form.metaTipo === "vitorias") meta = { tipo: "vitorias", n: form.metaN, modo: form.modo };
    else if (form.metaTipo === "corridasCompletas") meta = { tipo: "corridasCompletas", n: form.metaN, modo: form.modo };
    else if (form.metaTipo === "moedasCorrida") meta = { tipo: "moedasCorrida", n: form.metaN };
    else if (form.metaTipo === "caixas") meta = { tipo: "caixas", n: form.metaN };
    else if (form.metaTipo === "baloes") meta = { tipo: "baloes", n: form.metaN };
    else meta = { tipo: "onlineCorridas", n: form.metaN };
    const input: InputDesafio = { empresaNome: form.empresaNome, sector: form.sector, titulo: form.titulo, desc: form.desc, meta, premioMoedas: form.premioMoedas, nivelMin: form.nivelMin };
    const v = validaInputDesafio(input);
    if (!v.sim) { setErroForm(t("desafios.sala.erro", { motivo: v.motivo })); return; }
    const { d } = criarDesafio(input);
    if (d) { setErroForm(""); setSala(false); setTick((k) => k + 1); }
  };

  return (
    <div className="mt-3 mb-4 rounded-2xl border border-amber-500/40 overflow-hidden" data-testid="desafios-painel" key={tick}>
      <div className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500/15 via-transparent to-transparent">
        <Trophy className="w-4 h-4 text-amber-400" />
        <span className="font-display text-sm font-black text-amber-200">{t("desafios.hub.titulo")}</span>
        <span className="px-1.5 py-0.5 rounded-full bg-amber-500/25 text-amber-200 text-[8px] font-black">{t("desafios.hub.badge")}</span>
        <button
          onClick={() => setSala(true)}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-amber-400/50 bg-amber-500/10 px-2.5 py-1.5 text-[10px] font-black text-amber-200 hover:bg-amber-500/20"
          data-testid="desafios-sala-abrir"
        ><Building2 className="w-3.5 h-3.5" /> {t("desafios.sala.botao")}</button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 px-3 pb-3 pt-1">
        {desafios.map((d) => {
          const alvo = metaAlvo(d);
          const prog = progDe(d.id);
          const agora = podeClamar(d.id);
          const st = lerEstado().porId[d.id];
          const pct = Math.min(100, (prog / alvo) * 100);
          return (
            <motion.div key={d.id} whileHover={{ y: -2 }} className="rounded-xl border border-white/10 bg-slate-900/60 p-2.5 flex flex-col gap-1.5" data-testid={`desafio-card-${d.id}`}>
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg grid place-items-center text-[10px] font-black text-white shrink-0" style={{ background: d.empresa.cor }}>{d.empresa.iniciais}</span>
                <div className="min-w-0">
                  <div className="text-[11px] font-black text-white truncate">{d.titulo}</div>
                  <div className="text-[9px] text-slate-400 truncate">{d.empresa.nome} · {d.empresa.sector}</div>
                </div>
              </div>
              <p className="text-[10px] text-slate-300 leading-snug">{descMeta(d.meta, t)}</p>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-black text-yellow-300">+{d.premioMoedas} 🪙</span>
                {agora ? (
                  <button
                    onClick={() => { const p = clamar(d.id); if (p) { adicionarMoedasSave(p.moedas, p.xp); setTick((k) => k + 1); } }}
                    className="rounded-lg bg-gradient-to-r from-emerald-500 to-lime-500 px-2.5 py-1 text-[10px] font-black text-white hover:brightness-110"
                    data-testid={`desafio-clamar-${d.id}`}
                  >{t("desafios.clamar")}</button>
                ) : st?.reclamado ? (
                  <span className="text-[9px] font-bold text-emerald-300">{t("desafios.reclamado")} ✓</span>
                ) : (
                  <span className="text-[9px] font-bold text-slate-400">{Math.min(prog, alvo)}/{alvo}</span>
                )}
              </div>
              {!st?.reclamado && (
                <div className="h-1 rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500" style={{ width: `${pct}%` }} />
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
      <button
        onClick={() => { if (onJogar) onJogar(); }}
        className="w-full py-2 text-[11px] font-black text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border-t border-amber-500/20"
        data-testid="desafios-hub-jogar"
      >{t("desafios.hub.cta")}</button>

      {/* ── SALA DE PATROCÍNIOS: uma empresa lança o SEU desafio (demo honesta no aparelho) ──
          v70 FURO REAL: `fixed` dentro de ancestral com transform (framer-motion do hub)
          ancora-se AO ANCESTRAL — o modal ficava a milhares de px do ecrã. FIX da casa
          (v62): createPortal para o body — position fixed volta a ser VIEWPORT. */}
      {sala && createPortal(
        <div className="fixed inset-0 z-[95] bg-black/80 grid place-items-center overflow-y-auto p-4" data-testid="desafios-sala-modal">
          <div className="w-full max-w-lg rounded-2xl border border-amber-400/40 bg-slate-900 p-5 my-8">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-amber-200 flex items-center gap-2"><Sparkles className="w-5 h-5" /> {t("desafios.sala.titulo")}</h3>
              <button onClick={() => setSala(false)} className="p-2 rounded-lg hover:bg-white/10" data-testid="desafios-sala-fechar"><X className="w-5 h-5 text-slate-300" /></button>
            </div>
            <p className="mt-1 text-[11px] text-slate-400">{t("desafios.sala.sub")}</p>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <input data-testid="desafios-sala-empresa" value={form.empresaNome} onChange={(e) => setForm({ ...form, empresaNome: e.target.value })} placeholder={t("desafios.sala.empresa")} className="rounded-xl bg-slate-800 border border-white/10 px-3 py-2 text-sm text-white" />
              <input data-testid="desafios-sala-sector" value={form.sector} onChange={(e) => setForm({ ...form, sector: e.target.value })} placeholder={t("desafios.sala.sector")} className="rounded-xl bg-slate-800 border border-white/10 px-3 py-2 text-sm text-white" />
              <input data-testid="desafios-sala-titulo" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder={t("desafios.sala.tituloPh")} className="rounded-xl bg-slate-800 border border-white/10 px-3 py-2 text-sm text-white sm:col-span-2" />
              <textarea data-testid="desafios-sala-desc" value={form.desc} onChange={(e) => setForm({ ...form, desc: e.target.value })} placeholder={t("desafios.sala.desc")} rows={2} className="rounded-xl bg-slate-800 border border-white/10 px-3 py-2 text-sm text-white sm:col-span-2" />
              <select data-testid="desafios-sala-meta" value={form.metaTipo} onChange={(e) => setForm({ ...form, metaTipo: e.target.value as MetaDesafio["tipo"] })} className="rounded-xl bg-slate-800 border border-white/10 px-3 py-2 text-sm text-white">
                <option value="podio">{t("desafios.meta.podioSel")}</option>
                <option value="vitorias">{t("desafios.meta.vitoriasSel")}</option>
                <option value="corridasCompletas">{t("desafios.meta.corridasSel")}</option>
                <option value="onlineCorridas">{t("desafios.meta.onlineSel")}</option>
                <option value="caixas">{t("desafios.meta.caixasSel")}</option>
                <option value="baloes">{t("desafios.meta.baloesSel")}</option>
                <option value="moedasCorrida">{t("desafios.meta.moedasSel")}</option>
              </select>
              {form.metaTipo === "podio" ? (
                <>
                  <select data-testid="desafios-sala-pista" value={form.pista} onChange={(e) => setForm({ ...form, pista: e.target.value })} className="rounded-xl bg-slate-800 border border-white/10 px-3 py-2 text-sm text-white">
                    <option value="praia">praia</option><option value="deserto">deserto</option><option value="vulcao">vulcão</option><option value="qualquer">{t("desafios.pista.qualquer")}</option>
                  </select>
                  <select data-testid="desafios-sala-top" value={form.top} onChange={(e) => setForm({ ...form, top: Number(e.target.value) })} className="rounded-xl bg-slate-800 border border-white/10 px-3 py-2 text-sm text-white">
                    <option value={1}>1º</option><option value={2}>2º</option><option value={3}>3º</option>
                  </select>
                </>
              ) : (
                <input data-testid="desafios-sala-n" type="number" min={1} max={60} value={form.metaN} onChange={(e) => setForm({ ...form, metaN: Number(e.target.value) })} className="rounded-xl bg-slate-800 border border-white/10 px-3 py-2 text-sm text-white" />
              )}
              <input data-testid="desafios-sala-premio" type="number" min={PREMIO_MIN} max={PREMIO_MAX} value={form.premioMoedas} onChange={(e) => setForm({ ...form, premioMoedas: Number(e.target.value) })} className="rounded-xl bg-slate-800 border border-white/10 px-3 py-2 text-sm text-white" />
              <input data-testid="desafios-sala-nivel" type="number" min={1} max={30} value={form.nivelMin} onChange={(e) => setForm({ ...form, nivelMin: Number(e.target.value) })} className="rounded-xl bg-slate-800 border border-white/10 px-3 py-2 text-sm text-white" />
            </div>
            {erroForm && <p className="mt-2 text-[11px] font-bold text-red-400" data-testid="desafios-sala-erro">{erroForm}</p>}
            <button onClick={criar} className="mt-3 w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-3 font-black text-white hover:brightness-110" data-testid="desafios-sala-criar">
              {t("desafios.sala.criar")}
            </button>
            <p className="mt-2 text-[10px] text-slate-500">{t("desafios.nota")}</p>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
