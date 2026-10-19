// ═══════════════════════════════════════════════════════════════
//  GAME ART — arte vetorial original por jogo (sem emojis, sem
//  assets externos, sem copyright). Padrão REA: a apresentação dos
//  cards dos líderes (CrazyGames/Poki/Steam) é feita com ARTE de
//  cena — aqui cada jogo tem a sua mini-cena SVG, nítida em
//  qualquer ecrã (vetor puro) e leve (sem runtime de animação,
//  só 1-2 keyframes CSS de transform/opacity).
// ═══════════════════════════════════════════════════════════════
import { memo, useId } from "react";

/* ── util: estrelas determinísticas ── */
function seeded(n: number, salt = 1) {
  let h = 2166136261 ^ salt;
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822519);
    h = Math.imul(h ^ (h >>> 13), 3266489917);
    return (((h ^= h >>> 16) >>> 0) % 1000) / 1000;
  };
}
function Stars({ uid, n = 26, salt = 3, w = 320, h = 180 }: { uid: string; n?: number; salt?: number; w?: number; h?: number }) {
  const pts: React.ReactNode[] = [];
  const rnd = seeded(n, salt);
  for (let i = 0; i < n; i++) {
    const x = rnd() * w, y = rnd() * h * 0.72, r = 0.5 + rnd() * 1.3, o = 0.25 + rnd() * 0.6;
    pts.push(<circle key={i} cx={x} cy={y} r={r} fill="#fff" opacity={o} />);
  }
  return <g className="ga-stars">{pts}</g>;
}

/* ─────────────────────────────────────────────────────────────
   CENAS — uma por jogo do catálogo (+ jogos ao vivo).
   Canvas 320×180 (16:9). Cada cena usa <defs> com ids únicos
   por instância (useId) para suportar N instâncias na página.
   ───────────────────────────────────────────────────────────── */

function ArtMmorpg(u: string) {
  return (
    <>
      <defs>
        <linearGradient id={`${u}sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1e1b4b" /><stop offset="1" stopColor="#7c2d12" />
        </linearGradient>
        <radialGradient id={`${u}pl`} cx="0.35" cy="0.3">
          <stop offset="0" stopColor="#fdba74" /><stop offset="0.55" stopColor="#f97316" /><stop offset="1" stopColor="#9a3412" />
        </radialGradient>
        <radialGradient id={`${u}glow`} cx="0.5" cy="0.5">
          <stop offset="0" stopColor="#fb923c" stopOpacity="0.5" /><stop offset="1" stopColor="#fb923c" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="320" height="180" fill={`url(#${u}sky)`} />
      <Stars uid={u} n={30} salt={7} />
      <circle cx="160" cy="150" r="95" fill={`url(#${u}glow)`} />
      {/* planeta */}
      <circle cx="160" cy="118" r="58" fill={`url(#${u}pl)`} />
      {/* continentes */}
      <path d="M126 88c10-6 26-8 34 0s4 16-8 18-24 6-30-2-4-12 4-16z" fill="#65a30d" opacity="0.9" />
      <path d="M168 108c8-3 20 0 22 8s-8 14-18 12-14-4-12-10 4-8 8-10z" fill="#65a30d" opacity="0.85" />
      <path d="M136 128c6-2 16 1 16 7s-8 9-14 6-8-11-2-13z" fill="#4d7c0f" opacity="0.8" />
      {/* anel orbital */}
      <ellipse cx="160" cy="118" rx="86" ry="20" fill="none" stroke="#fcd34d" strokeWidth="2.5" opacity="0.55" transform="rotate(-14 160 118)" />
      {/* satélites/avatares */}
      <circle cx="248" cy="84" r="7" fill="#22d3ee" opacity="0.95" />
      <circle cx="248" cy="84" r="11" fill="none" stroke="#22d3ee" strokeWidth="1.4" opacity="0.4" />
      <circle cx="70" cy="66" r="5" fill="#a3e635" opacity="0.9" />
      <circle cx="70" cy="66" r="8.5" fill="none" stroke="#a3e635" strokeWidth="1.2" opacity="0.4" />
      {/* brilho no limbo do planeta */}
      <path d="M104 142a58 58 0 0 0 112 0" fill="none" stroke="#fde68a" strokeWidth="2" opacity="0.5" />
    </>
  );
}

function ArtBounce(u: string) {
  return (
    <>
      <defs>
        <linearGradient id={`${u}sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0ea5e9" /><stop offset="1" stopColor="#312e81" />
        </linearGradient>
        <radialGradient id={`${u}ball`} cx="0.35" cy="0.3">
          <stop offset="0" stopColor="#fde68a" /><stop offset="0.5" stopColor="#f59e0b" /><stop offset="1" stopColor="#b45309" />
        </radialGradient>
      </defs>
      <rect width="320" height="180" fill={`url(#${u}sky)`} />
      <circle cx="270" cy="34" r="16" fill="#fef9c3" opacity="0.9" />
      {/* nuvens */}
      <g fill="#fff" opacity="0.25"><ellipse cx="70" cy="40" rx="26" ry="9" /><ellipse cx="250" cy="62" rx="22" ry="7" /></g>
      {/* trilho do quique */}
      <path d="M60 96q40-52 80 0t80 0" fill="none" stroke="#e0f2fe" strokeWidth="3" strokeDasharray="2 10" strokeLinecap="round" opacity="0.8" />
      {/* plataformas */}
      <g fill="#1e293b"><rect x="28" y="100" width="88" height="12" rx="5" /><rect x="128" y="100" width="88" height="12" rx="5" /><rect x="224" y="100" width="72" height="12" rx="5" /><rect x="76" y="142" width="84" height="12" rx="5" /><rect x="196" y="142" width="84" height="12" rx="5" /></g>
      <g fill="#38bdf8" opacity="0.85"><rect x="28" y="100" width="88" height="4" rx="2" /><rect x="128" y="100" width="88" height="4" rx="2" /><rect x="224" y="100" width="72" height="4" rx="2" /><rect x="76" y="142" width="84" height="4" rx="2" /><rect x="196" y="142" width="84" height="4" rx="2" /></g>
      {/* anéis */}
      <g fill="none" stroke="#fbbf24" strokeWidth="4"><ellipse cx="106" cy="74" rx="13" ry="15" opacity="0.95" /><ellipse cx="186" cy="58" rx="13" ry="15" opacity="0.9" /><ellipse cx="258" cy="76" rx="13" ry="15" opacity="0.85" /></g>
      {/* espinhos */}
      <g fill="#475569"><path d="M0 180l14-18 14 18zM56 180l14-18 14 18zM112 180l14-18 14 18zM168 180l14-18 14 18zM224 180l14-18 14 18zM280 180l14-18 14 18z" /></g>
      {/* bola */}
      <g className="ga-float"><circle cx="104" cy="82" r="15" fill={`url(#${u}ball)`} /><circle cx="99" cy="76" r="4" fill="#fff" opacity="0.85" /></g>
    </>
  );
}

function ArtSpaceshooter(u: string) {
  return (
    <>
      <defs>
        <linearGradient id={`${u}sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#020617" /><stop offset="1" stopColor="#1d4ed8" />
        </linearGradient>
        <linearGradient id={`${u}shot`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f0abfc" /><stop offset="1" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      <rect width="320" height="180" fill={`url(#${u}sky)`} />
      <Stars uid={u} n={34} salt={11} />
      {/* nave inimigas */}
      <g fill="#f87171">
        <path d="M84 34l10 16h-20z" /><path d="M160 26l10 16h-20z" /><path d="M236 40l10 16h-20z" />
      </g>
      <g fill="#fca5a5" opacity="0.7"><path d="M84 34l10 16h-20z" transform="translate(0 -6)" opacity="0.35" /></g>
      {/* lasers */}
      <g stroke={`url(#${u}shot)`} strokeWidth="3.4" strokeLinecap="round"><line x1="160" y1="128" x2="160" y2="52" /><line x1="140" y1="132" x2="128" y2="62" /><line x1="180" y1="132" x2="192" y2="62" /></g>
      {/* nave do jogador */}
      <g>
        <path d="M160 96l16 34h-12l-4 10-4-10h-12z" fill="#38bdf8" />
        <path d="M160 108l10 22h-20z" fill="#e0f2fe" />
        <path d="M154 140l6 18 6-18z" fill="#fb923c" />
        <path d="M154 140l6 10 6-10z" fill="#fef08a" />
      </g>
      {/* explosão */}
      <g opacity="0.9"><circle cx="84" cy="52" r="8" fill="#fde047" /><circle cx="84" cy="52" r="14" fill="none" stroke="#fb923c" strokeWidth="2" opacity="0.6" /></g>
    </>
  );
}

function ArtFlappybird(u: string) {
  return (
    <>
      <defs>
        <linearGradient id={`${u}sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7dd3fc" /><stop offset="1" stopColor="#bae6fd" />
        </linearGradient>
        <linearGradient id={`${u}pipe`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#4ade80" /><stop offset="0.5" stopColor="#22c55e" /><stop offset="1" stopColor="#15803d" />
        </linearGradient>
      </defs>
      <rect width="320" height="180" fill={`url(#${u}sky)`} />
      <g fill="#fff" opacity="0.8"><ellipse cx="60" cy="44" rx="30" ry="10" /><ellipse cx="250" cy="30" rx="26" ry="9" /><ellipse cx="160" cy="70" rx="20" ry="7" opacity="0.6" /></g>
      {/* canos */}
      <g>
        <rect x="52" y="0" width="52" height="62" fill={`url(#${u}pipe)`} /><rect x="46" y="56" width="64" height="16" rx="4" fill="#16a34a" />
        <rect x="52" y="128" width="52" height="52" fill={`url(#${u}pipe)`} /><rect x="46" y="120" width="64" height="16" rx="4" fill="#16a34a" />
        <rect x="214" y="0" width="52" height="86" fill={`url(#${u}pipe)`} /><rect x="208" y="80" width="64" height="16" rx="4" fill="#16a34a" />
        <rect x="214" y="162" width="52" height="18" fill={`url(#${u}pipe)`} /><rect x="208" y="150" width="64" height="16" rx="4" fill="#16a34a" />
      </g>
      {/* pássaro */}
      <g className="ga-float">
        <ellipse cx="140" cy="96" rx="21" ry="17" fill="#facc15" />
        <ellipse cx="132" cy="100" rx="9" ry="6" fill="#f59e0b" />
        <circle cx="152" cy="89" r="7.5" fill="#fff" /><circle cx="154" cy="89" r="3.2" fill="#1c1917" />
        <path d="M160 96l12 3-12 4z" fill="#f97316" />
        <path d="M128 94q-12-2-16 6 10 4 16-2z" fill="#eab308" />
      </g>
    </>
  );
}

function ArtSnake(u: string) {
  return (
    <>
      <defs>
        <linearGradient id={`${u}bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#064e3b" /><stop offset="1" stopColor="#0f766e" />
        </linearGradient>
      </defs>
      <rect width="320" height="180" fill={`url(#${u}bg)`} />
      {/* grelha */}
      <g stroke="#ffffff" strokeWidth="1" opacity="0.07">{Array.from({ length: 9 }, (_, i) => <line key={"v" + i} x1={i * 40} y1="0" x2={i * 40} y2="180" />)}{Array.from({ length: 5 }, (_, i) => <line key={"h" + i} x1="0" y1={i * 40} x2="320" y2={i * 40} />)}</g>
      {/* cobra 1 (esmeralda) */}
      <g>
        <path d="M40 140h80v-40h80v-40h60" fill="none" stroke="#4ade80" strokeWidth="20" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M40 140h80v-40h80v-40h60" fill="none" stroke="#86efac" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1 26" />
        <circle cx="264" cy="60" r="13" fill="#4ade80" />
        <circle cx="268" cy="56" r="2.6" fill="#052e16" /><circle cx="260" cy="56" r="2.6" fill="#052e16" />
        <path d="M264 48l3-7M268 52l7-4" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" />
      </g>
      {/* cobra 2 (laranja) */}
      <g opacity="0.95">
        <path d="M280 128h-72v36H108" fill="none" stroke="#fb923c" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="104" cy="164" r="10" fill="#fb923c" />
        <circle cx="101" cy="162" r="2.2" fill="#431407" /><circle cx="107" cy="162" r="2.2" fill="#431407" />
      </g>
      {/* maçã */}
      <g><circle cx="60" cy="60" r="10" fill="#ef4444" /><path d="M60 50q2-6 8-8" stroke="#713f12" strokeWidth="2.4" fill="none" strokeLinecap="round" /><circle cx="56" cy="56" r="2.6" fill="#fecaca" /></g>
    </>
  );
}

function ArtNumTetris(u: string) {
  const cell = 26;
  const piece = (px: number, py: number, c1: string, c2: string, n: string) => (
    <g>
      <rect x={px} y={py} width={cell} height={cell} rx="5" fill={c1} stroke={c2} strokeWidth="2" />
      <text x={px + cell / 2} y={py + cell / 2 + 7} textAnchor="middle" fontSize="17" fontWeight="800" fill="#fff">{n}</text>
    </g>
  );
  return (
    <>
      <defs>
        <linearGradient id={`${u}bg`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7c2d12" /><stop offset="1" stopColor="#b91c1c" />
        </linearGradient>
      </defs>
      <rect width="320" height="180" fill={`url(#${u}bg)`} />
      <g stroke="#fff" strokeWidth="1" opacity="0.06">{Array.from({ length: 11 }, (_, i) => <line key={i} x1={i * 32} y1="0" x2={i * 32} y2="180" />)}</g>
      {/* peças a cair */}
      <g className="ga-float">
        {piece(96, 22, "#f97316", "#fdba74", "4")}
        {piece(122, 22, "#f97316", "#fdba74", "8")}
        {piece(96, 48, "#ea580c", "#fdba74", "2")}
      </g>
      {piece(196, 64, "#dc2626", "#fca5a5", "8")}
      {piece(196, 90, "#dc2626", "#fca5a5", "16")}
      {piece(170, 90, "#b91c1c", "#fca5a5", "4")}
      {/* pilha no chão */}
      {piece(64, 128, "#c2410c", "#fdba74", "2")}
      {piece(90, 128, "#ea580c", "#fdba74", "8")}
      {piece(116, 128, "#c2410c", "#fdba74", "4")}
      {piece(142, 128, "#ea580c", "#fdba74", "16")}
      {/* faíscas de fusão */}
      <g stroke="#fde047" strokeWidth="2.6" strokeLinecap="round"><line x1="154" y1="118" x2="162" y2="110" /><line x1="160" y1="126" x2="170" y2="124" /><line x1="148" y1="114" x2="150" y2="104" /></g>
    </>
  );
}

function ArtPong(u: string) {
  return (
    <>
      <defs>
        <linearGradient id={`${u}bg`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1e3a8a" /><stop offset="1" stopColor="#312e81" />
        </linearGradient>
      </defs>
      <rect width="320" height="180" fill={`url(#${u}bg)`} />
      <line x1="160" y1="10" x2="160" y2="170" stroke="#e0e7ff" strokeWidth="3" strokeDasharray="10 12" opacity="0.55" />
      <text x="112" y="44" textAnchor="middle" fontSize="30" fontWeight="900" fill="#f87171" opacity="0.9">3</text>
      <text x="208" y="44" textAnchor="middle" fontSize="30" fontWeight="900" fill="#67e8f9" opacity="0.9">2</text>
      <rect x="30" y="56" width="12" height="56" rx="6" fill="#f87171" />
      <rect x="278" y="86" width="12" height="56" rx="6" fill="#22d3ee" />
      {/* bola com rasto */}
      <g className="ga-float">
        <line x1="205" y1="96" x2="185" y2="104" stroke="#fff" strokeWidth="5" strokeLinecap="round" opacity="0.25" />
        <line x1="185" y1="104" x2="172" y2="109" stroke="#fff" strokeWidth="5" strokeLinecap="round" opacity="0.45" />
        <circle cx="158" cy="112" r="8.5" fill="#fff" />
      </g>
    </>
  );
}

function ArtGalo(u: string) {
  const cell = 40;
  const grid = (
    <g stroke="#e9d5ff" strokeWidth="4" strokeLinecap="round">
      <line x1="112" y1="30" x2="112" y2="150" /><line x1="176" y1="30" x2="176" y2="150" />
      <line x1="64" y1="70" x2="224" y2="70" /><line x1="64" y1="110" x2="224" y2="110" />
    </g>
  );
  return (
    <>
      <defs>
        <linearGradient id={`${u}bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4c1d95" /><stop offset="1" stopColor="#312e81" />
        </linearGradient>
      </defs>
      <rect width="320" height="180" fill={`url(#${u}bg)`} />
      {/* mini-tabuleiros de fundo (PRO: 9 tabuleiros) */}
      <g opacity="0.2" stroke="#fff" strokeWidth="1.4">{Array.from({ length: 4 }, (_, i) => {
        const bx = 14 + (i % 2) * 30, by = 18 + Math.floor(i / 2) * 30;
        return <g key={i}><rect x={bx} y={by} width="24" height="24" fill="none" /><line x1={bx + 8} y1={by} x2={bx + 8} y2={by + 24} /><line x1={bx + 16} y1={by} x2={bx + 16} y2={by + 24} /><line x1={bx} y1={by + 8} x2={bx + 24} y2={by + 8} /><line x1={bx} y1={by + 16} x2={bx + 24} y2={by + 16} /></g>;
      })}
        {Array.from({ length: 4 }, (_, i) => {
          const bx = 250 + (i % 2) * 30, by = 100 + Math.floor(i / 2) * 30;
          return <g key={"b" + i}><rect x={bx} y={by} width="24" height="24" fill="none" /><line x1={bx + 8} y1={by} x2={bx + 8} y2={by + 24} /><line x1={bx + 16} y1={by} x2={bx + 16} y2={by + 24} /><line x1={bx} y1={by + 8} x2={bx + 24} y2={by + 8} /><line x1={bx} y1={by + 16} x2={bx + 24} y2={by + 16} /></g>;
        })}
      </g>
      {grid}
      {/* X vencedor diagonal + O */}
      <g stroke="#fbbf24" strokeWidth="7" strokeLinecap="round"><line x1="84" y1="42" x2="104" y2="62" /><line x1="104" y1="42" x2="84" y2="62" /><line x1="148" y1="82" x2="168" y2="102" /><line x1="168" y1="82" x2="148" y2="102" /><line x1="204" y1="122" x2="224" y2="142" /><line x1="224" y1="122" x2="204" y2="142" /></g>
      <g fill="none" stroke="#22d3ee" strokeWidth="6"><circle cx="144" cy="50" r="13" /><circle cx="208" cy="90" r="13" /><circle cx="88" cy="130" r="13" /></g>
      <line x1="74" y1="36" x2="232" y2="148" stroke="#fbbf24" strokeWidth="2.4" opacity="0.5" strokeDasharray="6 6" />
    </>
  );
}

function ArtConnect4(u: string) {
  const holes: React.ReactNode[] = [];
  const discs: Record<string, string> = { "0-1": "#ef4444", "1-2": "#facc15", "2-3": "#ef4444", "3-4": "#facc15", "1-0": "#facc15", "2-1": "#ef4444", "3-2": "#facc15", "0-4": "#ef4444" };
  for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) {
    const cx = 62 + c * 40, cy = 38 + r * 34;
    const d = discs[`${r}-${c}`];
    holes.push(<g key={`${r}-${c}`}>
      <circle cx={cx} cy={cy} r="14" fill="#0b1220" opacity="0.85" />
      {d && <circle cx={cx} cy={cy} r="11" fill={d} />}
    </g>);
  }
  return (
    <>
      <defs>
        <linearGradient id={`${u}bg`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0369a1" /><stop offset="1" stopColor="#1e40af" />
        </linearGradient>
        <linearGradient id={`${u}board`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3b82f6" /><stop offset="1" stopColor="#1d4ed8" />
        </linearGradient>
      </defs>
      <rect width="320" height="180" fill={`url(#${u}bg)`} />
      <rect x="30" y="16" width="260" height="152" rx="14" fill={`url(#${u}board)`} stroke="#93c5fd" strokeWidth="2" opacity="0.96" />
      {holes}
      <line x1="62" y1="38" x2="202" y2="140" stroke="#fef08a" strokeWidth="3" strokeDasharray="5 7" opacity="0.75" />
    </>
  );
}

function ArtCheckers(u: string) {
  const sq = 34, ox = 84, oy = 24;
  const cells: React.ReactNode[] = [];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) {
    const dark = (r + c) % 2 === 0;
    cells.push(<rect key={`${r}-${c}`} x={ox + c * sq} y={oy + r * sq} width={sq} height={sq} fill={dark ? "#78350f" : "#fcd34d"} />);
  }
  const disc = (cx: number, cy: number, fill: string, ring: string) => (
    <g><circle cx={cx} cy={cy} r="13" fill={fill} /><circle cx={cx} cy={cy} r="8" fill="none" stroke={ring} strokeWidth="2" opacity="0.7" /><circle cx={cx} cy={cy - 2.5} r="4" fill={ring} opacity="0.35" /></g>
  );
  return (
    <>
      <defs>
        <linearGradient id={`${u}bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7c2d12" /><stop offset="1" stopColor="#9a3412" />
        </linearGradient>
      </defs>
      <rect width="320" height="180" fill={`url(#${u}bg)`} />
      <g transform="skewY(-6)">{cells}
        {/* peças */}
        {disc(ox + sq * 0.5 + 0, oy + sq * 0.5 + 0, "#1c1917", "#a8a29e")}
        {disc(ox + sq * 2.5, oy + sq * 0.5, "#1c1917", "#a8a29e")}
        {disc(ox + sq * 1.5, oy + sq * 1.5, "#fef3c7", "#d97706")}
        {disc(ox + sq * 3.5, oy + sq * 1.5, "#1c1917", "#a8a29e")}
        {disc(ox + sq * 2.5, oy + sq * 2.5, "#fef3c7", "#d97706")}
        {/* dama coroada */}
        <g>
          {disc(ox + sq * 4.5, oy + sq * 3.5, "#fef3c7", "#d97706")}
          <path d={`M${ox + sq * 4.5 - 8} ${oy + sq * 3.5 - 12}l4 5 4-7 4 7 4-5 1 8h-18z`} fill="#f59e0b" stroke="#b45309" strokeWidth="1" />
        </g>
      </g>
      <g opacity="0.9"><path d="M232 26c8 6 8 18 0 24M244 20c12 9 12 27 0 36" stroke="#fbbf24" strokeWidth="3" fill="none" strokeLinecap="round" /></g>
    </>
  );
}

function ArtChess(u: string) {
  const sq = 36, ox = 100, oy = 40;
  const cells: React.ReactNode[] = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
    const dark = (r + c) % 2 === 0;
    cells.push(<rect key={`${r}-${c}`} x={ox + c * sq} y={oy + r * sq} width={sq} height={sq} fill={dark ? "#3f3f46" : "#e4e4e7"} />);
  }
  return (
    <>
      <defs>
        <linearGradient id={`${u}bg`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#18181b" /><stop offset="1" stopColor="#27272a" />
        </linearGradient>
        <radialGradient id={`${u}spot`} cx="0.5" cy="0.35">
          <stop offset="0" stopColor="#fde68a" stopOpacity="0.32" /><stop offset="1" stopColor="#fde68a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="320" height="180" fill={`url(#${u}bg)`} />
      <rect width="320" height="180" fill={`url(#${u}spot)`} />
      <g transform="skewY(-5)">{cells}</g>
      {/* rei branco */}
      <g fill="#fafafa" stroke="#a1a1aa" strokeWidth="1.4">
        <path d="M148 132v-10q0-8-6-12 6-6 6-14 0-12-12-16-12 4-12 16 0 8 6 14-6 4-6 12v10z" transform="translate(6 -8) scale(0.92)" />
        <rect x="142" y="74" width="4" height="10" /><rect x="138" y="70" width="12" height="5" rx="2" />
      </g>
      {/* peão preto */}
      <g fill="#18181b" stroke="#52525b" strokeWidth="1.2">
        <circle cx="212" cy="104" r="8" />
        <path d="M212 112q-10 2-10 12v8h20v-8q0-10-10-12z" />
      </g>
      {/* peão branco capturado ao lado */}
      <g fill="#e4e4e7" stroke="#a1a1aa" strokeWidth="1.1" opacity="0.85">
        <circle cx="248" cy="130" r="6.5" /><path d="M248 136q-8 2-8 10v6h16v-6q0-8-8-10z" />
      </g>
      <text x="160" y="30" textAnchor="middle" fontSize="15" fontWeight="800" fill="#fbbf24" letterSpacing="4">XEQUE!</text>
    </>
  );
}

function ArtDominoes(u: string) {
  const tile = (x: number, y: number, w: number, h: number, top: number[], bot: number[], rot = 0) => (
    <g transform={`rotate(${rot} ${x + w / 2} ${y + h / 2})`}>
      <rect x={x} y={y} width={w} height={h} rx="7" fill="#fafafa" stroke="#d4d4d8" strokeWidth="2" />
      <line x1={x + 4} y1={y + h / 2} x2={x + w - 4} y2={y + h / 2} stroke="#a1a1aa" strokeWidth="2" />
      {[...top].map((py, i) => <circle key={"t" + i} cx={x + w / 2} cy={y + h * 0.25 + (py - 1) * 6} r="3.4" fill="#27272a" />)}
      {[...bot].map((py, i) => <circle key={"b" + i} cx={x + w / 2} cy={y + h * 0.75 + (py - 1) * 6} r="3.4" fill="#27272a" />)}
    </g>
  );
  const pipRow = (n: number) => Array.from({ length: n }, (_, i) => i + 1);
  return (
    <>
      <defs>
        <linearGradient id={`${u}bg`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3f3f46" /><stop offset="1" stopColor="#18181b" />
        </linearGradient>
      </defs>
      <rect width="320" height="180" fill={`url(#${u}bg)`} />
      <ellipse cx="160" cy="152" rx="130" ry="16" fill="#000" opacity="0.35" />
      {tile(84, 30, 52, 104, pipRow(2), pipRow(3), -8)}
      {tile(184, 26, 52, 104, pipRow(6), pipRow(1), 7)}
      {tile(140, 118, 46, 40, pipRow(5), pipRow(5), 0)}
    </>
  );
}

function ArtSnakesLadders(u: string) {
  return (
    <>
      <defs>
        <linearGradient id={`${u}bg`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3f6212" /><stop offset="1" stopColor="#166534" />
        </linearGradient>
      </defs>
      <rect width="320" height="180" fill={`url(#${u}bg)`} />
      {/* trilha de casas numeradas */}
      <g>
        {Array.from({ length: 10 }, (_, i) => {
          const row = Math.floor(i / 5), col = i % 5;
          const x = 26 + col * 44, y = 96 - row * 44;
          return <g key={i}><rect x={x} y={y} width="34" height="34" rx="6" fill="#ecfccb" opacity="0.92" /><text x={x + 17} y={y + 23} textAnchor="middle" fontSize="14" fontWeight="800" fill="#365314">{i + 1}</text></g>;
        })}
      </g>
      {/* escada */}
      <g stroke="#fbbf24" strokeWidth="4.4" strokeLinecap="round">
        <line x1="44" y1="150" x2="196" y2="34" /><line x1="62" y1="158" x2="214" y2="42" />
        {Array.from({ length: 5 }, (_, i) => { const t = (i + 0.5) / 5; const x1 = 44 + (196 - 44) * t, y1 = 150 + (34 - 150) * t, x2 = 62 + (214 - 62) * t, y2 = 158 + (42 - 158) * t; return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth="3.6" />; })}
      </g>
      {/* cobra */}
      <path d="M262 40q-24 22 0 44t0 44q-14 16-34 10" fill="none" stroke="#ef4444" strokeWidth="9" strokeLinecap="round" />
      <circle cx="226" cy="138" r="8" fill="#ef4444" />
      <circle cx="223" cy="136" r="1.8" fill="#450a0a" /><circle cx="229" cy="136" r="1.8" fill="#450a0a" />
      {/* dado */}
      <g transform="rotate(12 282 146)">
        <rect x="262" y="126" width="40" height="40" rx="9" fill="#fff" stroke="#d4d4d8" strokeWidth="2" />
        {[[274, 138], [290, 138], [282, 146], [274, 154], [290, 154]].map(([cx, cy], i) => <circle key={i} cx={cx} cy={cy} r="3.4" fill="#1c1917" />)}
      </g>
    </>
  );
}

function ArtMemory(u: string) {
  const card = (x: number, y: number, rot: number, face: React.ReactNode) => (
    <g transform={`rotate(${rot} ${x + 34} ${y + 48})`}>
      <rect x={x} y={y} width="68" height="96" rx="10" fill="#fafafa" stroke="#c4b5fd" strokeWidth="2.4" />
      {face}
    </g>
  );
  return (
    <>
      <defs>
        <linearGradient id={`${u}bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4338ca" /><stop offset="1" stopColor="#7e22ce" />
        </linearGradient>
      </defs>
      <rect width="320" height="180" fill={`url(#${u}bg)`} />
      {card(52, 40, -9, (
        <g>
          <rect x="60" y="48" width="52" height="80" rx="7" fill="#7c3aed" />
          <text x="86" y="100" textAnchor="middle" fontSize="34" fill="#c4b5fd">★</text>
        </g>
      ))}
      {card(126, 34, 4, (
        <g>
          <rect x="134" y="42" width="52" height="80" rx="7" fill="#ede9fe" />
          <text x="160" y="94" textAnchor="middle" fontSize="34" fill="#7c3aed">★</text>
        </g>
      ))}
      {card(206, 44, 10, (
        <g>
          <rect x="214" y="52" width="52" height="80" rx="7" fill="#7c3aed" />
          <path d="M240 62l30 0 0 60-30 0z" fill="#a78bfa" opacity="0.35" />
          <circle cx="240" cy="92" r="14" fill="none" stroke="#c4b5fd" strokeWidth="2.4" />
          <path d="M240 82v20M230 92h20" stroke="#c4b5fd" strokeWidth="2.4" />
        </g>
      ))}
      {/* pares combinados — brilho */}
      <g stroke="#fde047" strokeWidth="2.6" strokeLinecap="round"><line x1="108" y1="26" x2="116" y2="18" /><line x1="118" y1="34" x2="128" y2="30" /><line x1="100" y1="36" x2="102" y2="26" /></g>
    </>
  );
}

function ArtUrusse(u: string) {
  const seeds: React.ReactNode[] = [];
  const rnd = seeded(12, 21);
  for (let p = 0; p < 12; p++) {
    const n = 2 + Math.floor(rnd() * 4);
    for (let s = 0; s < n; s++) {
      const cx = 46 + p * 20 + (rnd() - 0.5) * 8;
      const cy = 70 + (s % 2) * 12 + (rnd() - 0.5) * 4;
      seeds.push(<ellipse key={`${p}-${s}`} cx={cx} cy={cy} rx="4.6" ry="3.4" fill={s % 3 === 0 ? "#fbbf24" : "#a3e635"} stroke="#365314" strokeWidth="0.8" />);
    }
  }
  return (
    <>
      <defs>
        <linearGradient id={`${u}bg`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#14532d" /><stop offset="1" stopColor="#713f12" />
        </linearGradient>
        <linearGradient id={`${u}wood`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b45309" /><stop offset="1" stopColor="#78350f" />
        </linearGradient>
      </defs>
      <rect width="320" height="180" fill={`url(#${u}bg)`} />
      {/* tabuleiro de madeira */}
      <rect x="20" y="42" width="280" height="96" rx="18" fill={`url(#${u}wood)`} stroke="#92400e" strokeWidth="3" />
      {/* covas */}
      {Array.from({ length: 6 }, (_, i) => <ellipse key={"t" + i} cx={50 + i * 40} cy="70" rx="13" ry="9.5" fill="#431407" opacity="0.9" />)}
      {Array.from({ length: 6 }, (_, i) => <ellipse key={"b" + i} cx={50 + i * 40} cy="112" rx="13" ry="9.5" fill="#431407" opacity="0.9" />)}
      {/* lojas laterais */}
      <ellipse cx="30" cy="90" rx="9" ry="34" fill="#431407" opacity="0.9" />
      <ellipse cx="290" cy="90" rx="9" ry="34" fill="#431407" opacity="0.9" />
      {seeds}
      {/* semente a ser movida (mão) */}
      <g className="ga-float"><ellipse cx="160" cy="34" rx="5" ry="3.8" fill="#fde047" stroke="#365314" strokeWidth="0.8" /><path d="M150 26q10-8 22-2" stroke="#fbbf24" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeDasharray="2 5" /></g>
    </>
  );
}

function ArtMexerica(u: string) {
  const hand = (x: number, y: number, flip: boolean) => (
    <g transform={flip ? `translate(${x + 64} ${y}) scale(-1 1) translate(${-64} 0)` : `translate(${x} ${y})`}>
      <rect x="8" y="18" width="56" height="52" rx="14" fill="#fcd9b8" />
      <rect x="10" y="2" width="12" height="30" rx="6" fill="#fcd9b8" />
      <rect x="24" y="-2" width="12" height="34" rx="6" fill="#fcd9b8" />
      <rect x="38" y="0" width="12" height="32" rx="6" fill="#fcd9b8" />
      <rect x="52" y="8" width="12" height="26" rx="6" fill="#fcd9b8" />
      <ellipse cx="36" cy="44" rx="12" ry="9" fill="#f9a8d4" opacity="0.75" />
    </g>
  );
  return (
    <>
      <defs>
        <linearGradient id={`${u}bg`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c2410c" /><stop offset="1" stopColor="#7f1d1d" />
        </linearGradient>
        <radialGradient id={`${u}zap`} cx="0.5" cy="0.5">
          <stop offset="0" stopColor="#fde047" stopOpacity="0.9" /><stop offset="1" stopColor="#fde047" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="320" height="180" fill={`url(#${u}bg)`} />
      <circle cx="160" cy="92" r="42" fill={`url(#${u}zap)`} className="ga-pulse" />
      {hand(26, 58, false)}
      {hand(166, 58, true)}
      {/* palma e impacto */}
      <path d="M150 60l8-12 8 12-8 8z" fill="#fde047" />
      <g stroke="#fef3c7" strokeWidth="3.4" strokeLinecap="round">
        <line x1="142" y1="44" x2="134" y2="32" /><line x1="178" y1="44" x2="186" y2="32" /><line x1="160" y1="38" x2="160" y2="24" />
      </g>
      <text x="160" y="150" textAnchor="middle" fontSize="16" fontWeight="900" fill="#fef3c7" letterSpacing="3">BATE A MÃO!</text>
    </>
  );
}

/* ── Jogos ao vivo (hub /lives) ── */
function ArtLudo(u: string) {
  const g = 28, o = 86;
  return (
    <>
      <defs><linearGradient id={`${u}bg`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0f766e" /><stop offset="1" stopColor="#134e4a" /></linearGradient></defs>
      <rect width="320" height="180" fill={`url(#${u}bg)`} />
      <rect x={o} y="18" width="148" height="148" rx="10" fill="#f8fafc" />
      {/* cantos coloridos */}
      <rect x={o} y="18" width={g * 2} height={g * 2} rx="6" fill="#ef4444" />
      <rect x={o + 148 - g * 2} y="18" width={g * 2} height={g * 2} rx="6" fill="#22c55e" />
      <rect x={o} y={18 + 148 - g * 2} width={g * 2} height={g * 2} rx="6" fill="#facc15" />
      <rect x={o + 148 - g * 2} y={18 + 148 - g * 2} width={g * 2} height={g * 2} rx="6" fill="#3b82f6" />
      {/* cruz central */}
      <rect x={o + 44} y="46" width="60" height="20" fill="#e2e8f0" />
      <rect x={o + 44} y="118" width="60" height="20" fill="#e2e8f0" />
      <rect x={o + 64} y="46" width="20" height="92" fill="#e2e8f0" />
      {/* peões */}
      {[[o + 28, 46, "#ef4444"], [o + 120, 46, "#22c55e"], [o + 28, 140, "#facc15"], [o + 120, 140, "#3b82f6"], [o + 74, 74, "#0f172a"], [o + 74, 96, "#0f172a"]].map(([cx, cy, f], i) => (
        <g key={i}><circle cx={cx as number} cy={cy as number} r="7" fill={f as string} /><circle cx={cx as number} cy={(cy as number) - 3} r="2.2" fill="#fff" opacity="0.5" /></g>
      ))}
    </>
  );
}

function ArtUno(u: string) {
  const card = (x: number, y: number, rot: number, c: string) => (
    <g transform={`rotate(${rot} ${x + 30} ${y + 46})`}>
      <rect x={x} y={y} width="60" height="92" rx="10" fill={c} stroke="#fff" strokeWidth="3" />
      <ellipse cx={x + 30} cy={y + 46} rx="22" ry="30" fill="#fff" opacity="0.92" />
      <text x={x + 30} y={y + 55} textAnchor="middle" fontSize="20" fontWeight="900" fill={c}>O</text>
    </g>
  );
  return (
    <>
      <defs><linearGradient id={`${u}bg`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#4c1d95" /><stop offset="1" stopColor="#6d28d9" /></linearGradient></defs>
      <rect width="320" height="180" fill={`url(#${u}bg)`} />
      {card(66, 40, -14, "#dc2626")}
      {card(104, 30, -5, "#16a34a")}
      {card(142, 26, 4, "#2563eb")}
      {card(180, 36, 13, "#eab308")}
      <text x="160" y="162" textAnchor="middle" fontSize="22" fontWeight="900" fill="#fef08a" letterSpacing="8">UNO!</text>
    </>
  );
}

function ArtBattleRoyale(u: string) {
  return (
    <>
      <defs>
        <linearGradient id={`${u}bg`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#b45309" /><stop offset="1" stopColor="#7f1d1d" /></linearGradient>
        <radialGradient id={`${u}zone`} cx="0.5" cy="0.5"><stop offset="0.62" stopColor="#22c55e" stopOpacity="0.16" /><stop offset="0.72" stopColor="#22c55e" stopOpacity="0.55" /><stop offset="1" stopColor="#22c55e" stopOpacity="0" /></radialGradient>
      </defs>
      <rect width="320" height="180" fill={`url(#${u}bg)`} />
      {/* ilha top-view */}
      <path d="M60 120q20-60 90-64t110 40q10 40-40 60t-110 8z" fill="#3f6212" opacity="0.85" />
      <path d="M90 108q16-40 70-42t80 26" fill="none" stroke="#a3e635" strokeWidth="3" strokeDasharray="4 8" opacity="0.6" />
      {/* zona */}
      <circle cx="160" cy="92" r="76" fill={`url(#${u}zone)`} />
      <circle cx="160" cy="92" r="52" fill="none" stroke="#4ade80" strokeWidth="3" strokeDasharray="10 8" opacity="0.9" />
      {/* jogadores */}
      {[[136, 84], [186, 102], [158, 122]].map(([cx, cy], i) => (
        <g key={i}><circle cx={cx} cy={cy} r="5" fill="#fff" /><circle cx={cx} cy={cy} r="9" fill="none" stroke="#fff" strokeWidth="1.6" opacity="0.5" /></g>
      ))}
      {/* mira */}
      <g stroke="#fde047" strokeWidth="3" fill="none" strokeLinecap="round"><circle cx="160" cy="92" r="18" /><line x1="160" y1="66" x2="160" y2="76" /><line x1="160" y1="108" x2="160" y2="118" /><line x1="134" y1="92" x2="144" y2="92" /><line x1="176" y1="92" x2="186" y2="92" /></g>
      <text x="286" y="28" textAnchor="middle" fontSize="15" fontWeight="900" fill="#fff" opacity="0.9">40</text>
    </>
  );
}

function ArtMillionaire(u: string) {
  return (
    <>
      <defs>
        <linearGradient id={`${u}bg`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2e1065" /><stop offset="1" stopColor="#5b21b6" /></linearGradient>
        <linearGradient id={`${u}gold`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fde68a" /><stop offset="1" stopColor="#b45309" /></linearGradient>
      </defs>
      <rect width="320" height="180" fill={`url(#${u}bg)`} />
      {/* holofotes */}
      <g opacity="0.35" fill="#c4b5fd"><path d="M0 0l90 180-30 0z" /><path d="M320 0l-90 180 30 0z" /></g>
      {/* diamante */}
      <g className="ga-float">
        <path d="M130 60l14-20h32l14 20-30 44z" fill={`url(#${u}gold)`} stroke="#fef3c7" strokeWidth="2" />
        <path d="M130 60h60M144 40l-4 20 20 44M176 40l4 20-20 44M144 40h32" stroke="#fff7ed" strokeWidth="1.6" fill="none" opacity="0.8" />
      </g>
      {/* pilha de moedas */}
      {[[118, 132], [150, 138], [182, 130]].map(([cx, cy], i) => (
        <g key={i}><ellipse cx={cx} cy={cy} rx="17" ry="6.5" fill="#d97706" /><ellipse cx={cx} cy={(cy as number) - 6} rx="17" ry="6.5" fill="#f59e0b" /><ellipse cx={cx} cy={(cy as number) - 11} rx="13" ry="5" fill="#fbbf24" /></g>
      ))}
      <text x="160" y="34" textAnchor="middle" fontSize="18" fontWeight="900" fill="#fde68a" letterSpacing="4">1.000.000 MT</text>
    </>
  );
}

function ArtBingo(u: string) {
  return (
    <>
      <defs><linearGradient id={`${u}bg`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#065f46" /><stop offset="1" stopColor="#064e3b" /></linearGradient></defs>
      <rect width="320" height="180" fill={`url(#${u}bg)`} />
      {/* bola de bingo */}
      <g className="ga-float">
        <circle cx="108" cy="84" r="38" fill="#f8fafc" />
        <circle cx="108" cy="84" r="30" fill="#ef4444" />
        <rect x="86" y="72" width="44" height="24" rx="5" fill="#fff" />
        <text x="108" y="91" textAnchor="middle" fontSize="19" fontWeight="900" fill="#7f1d1d">B7</text>
        <circle cx="108" cy="46" r="7" fill="#e2e8f0" />
      </g>
      {/* cartão */}
      <g transform="rotate(6 234 96)">
        <rect x="176" y="40" width="116" height="112" rx="10" fill="#fff" />
        <text x="234" y="62" textAnchor="middle" fontSize="15" fontWeight="900" fill="#065f46" letterSpacing="5">BINGO</text>
        {Array.from({ length: 9 }, (_, i) => {
          const r = Math.floor(i / 3), c = i % 3;
          return <rect key={i} x={188 + c * 32} y={72 + r * 24} width="26" height="18" rx="4" fill={i === 4 ? "#22c55e" : "#e2e8f0"} />;
        })}
      </g>
      <g stroke="#fbbf24" strokeWidth="3" strokeLinecap="round"><line x1="140" y1="30" x2="152" y2="20" /><line x1="152" y1="40" x2="166" y2="36" /></g>
    </>
  );
}

function ArtRpgArena(u: string) {
  return (
    <>
      <defs>
        <linearGradient id={`${u}bg`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#450a0a" /><stop offset="1" stopColor="#3b0764" /></linearGradient>
        <radialGradient id={`${u}glow`} cx="0.5" cy="0.45"><stop offset="0" stopColor="#f59e0b" stopOpacity="0.35" /><stop offset="1" stopColor="#f59e0b" stopOpacity="0" /></radialGradient>
      </defs>
      <rect width="320" height="180" fill={`url(#${u}bg)`} />
      <circle cx="160" cy="90" r="70" fill={`url(#${u}glow)`} />
      {/* espadas cruzadas */}
      <g stroke="#e5e7eb" strokeWidth="7" strokeLinecap="round">
        <line x1="108" y1="122" x2="204" y2="52" /><line x1="212" y1="122" x2="116" y2="52" />
      </g>
      <g stroke="#9ca3af" strokeWidth="5.4" strokeLinecap="round">
        <line x1="100" y1="130" x2="112" y2="118" /><line x1="220" y1="130" x2="208" y2="118" />
      </g>
      <g fill="#fbbf24"><rect x="96" y="126" width="18" height="6" rx="3" transform="rotate(45 105 129)" /><rect x="206" y="126" width="18" height="6" rx="3" transform="rotate(-45 215 129)" /></g>
      {/* escudo central */}
      <g>
        <path d="M160 58l26 10v26q0 22-26 32-26-10-26-32v-26z" fill="#7c2d12" stroke="#fbbf24" strokeWidth="3.4" />
        <path d="M160 70v34M147 82h26" stroke="#fde68a" strokeWidth="3.6" strokeLinecap="round" />
      </g>
      <g stroke="#f87171" strokeWidth="3" strokeLinecap="round" opacity="0.85"><line x1="66" y1="40" x2="86" y2="56" /><line x1="254" y1="40" x2="234" y2="56" /></g>
    </>
  );
}

function ArtQuiz(u: string) {
  return (
    <>
      <defs><linearGradient id={`${u}bg`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#075985" /><stop offset="1" stopColor="#0c4a6e" /></linearGradient></defs>
      <rect width="320" height="180" fill={`url(#${u}bg)`} />
      {/* balão de pergunta */}
      <g className="ga-float">
        <rect x="120" y="24" width="80" height="56" rx="16" fill="#f8fafc" />
        <path d="M150 80l6 14 10-14z" fill="#f8fafc" />
        <text x="160" y="66" textAnchor="middle" fontSize="36" fontWeight="900" fill="#0ea5e9">?</text>
      </g>
      {/* botões de resposta */}
      <g>
        <rect x="56" y="112" width="98" height="30" rx="9" fill="#ef4444" /><text x="70" y="133" fontSize="15" fontWeight="800" fill="#fff">A</text><rect x="88" y="120" width="52" height="12" rx="6" fill="#fff" opacity="0.35" />
        <rect x="166" y="112" width="98" height="30" rx="9" fill="#0ea5e9" /><text x="180" y="133" fontSize="15" fontWeight="800" fill="#fff">B</text><rect x="198" y="120" width="52" height="12" rx="6" fill="#fff" opacity="0.35" />
      </g>
      {/* temporizador */}
      <circle cx="160" cy="164" r="11" fill="none" stroke="#fbbf24" strokeWidth="3.4" strokeDasharray="48 22" strokeLinecap="round" transform="rotate(-90 160 164)" />
    </>
  );
}

function ArtCrash(u: string) {
  return (
    <>
      <defs>
        <linearGradient id={`${u}bg`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#450a0a" /><stop offset="1" stopColor="#831843" /></linearGradient>
        <linearGradient id={`${u}curve`} x1="0" y1="1" x2="1" y2="0"><stop offset="0" stopColor="#f59e0b" /><stop offset="1" stopColor="#fbbf24" /></linearGradient>
      </defs>
      <rect width="320" height="180" fill={`url(#${u}bg)`} />
      <g stroke="#fff" strokeWidth="1" opacity="0.06">{Array.from({ length: 9 }, (_, i) => <line key={i} x1={i * 40} y1="0" x2={i * 40} y2="180" />)}{Array.from({ length: 4 }, (_, i) => <line key={"h" + i} x1="0" y1={i * 48} x2="320" y2={i * 48} />)}</g>
      <path d="M20 160q120-6 180-70t90-58" fill="none" stroke={`url(#${u}curve)`} strokeWidth="6" strokeLinecap="round" />
      <g className="ga-float">
        <path d="M290 24l10 14-14-2z" fill="#f87171" transform="rotate(40 292 30)" />
        <circle cx="288" cy="34" r="6" fill="#fff" opacity="0.7" />
      </g>
      <text x="52" y="44" fontSize="26" fontWeight="900" fill="#fbbf24">×2.4</text>
      <text x="52" y="66" fontSize="12" fontWeight="700" fill="#fca5a5">a subir…</text>
    </>
  );
}

function ArtDice(u: string) {
  const die = (x: number, y: number, rot: number, pts: number[][], c = "#fff") => (
    <g transform={`rotate(${rot} ${x + 42} ${y + 42})`}>
      <rect x={x} y={y} width="84" height="84" rx="18" fill={c} stroke="#cbd5e1" strokeWidth="2.6" />
      {pts.map(([dx, dy], i) => <circle key={i} cx={x + dx} cy={y + dy} r="7.4" fill="#1e293b" />)}
    </g>
  );
  return (
    <>
      <defs><linearGradient id={`${u}bg`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#312e81" /><stop offset="1" stopColor="#1e1b4b" /></linearGradient></defs>
      <rect width="320" height="180" fill={`url(#${u}bg)`} />
      <ellipse cx="160" cy="156" rx="120" ry="14" fill="#000" opacity="0.3" />
      {die(58, 44, -10, [[80, 64], [80, 86], [80, 108]])}
      {die(178, 40, 9, [[198, 60], [222, 84], [198, 108], [222, 60], [222, 108]], "#fef9c3")}
      <g stroke="#fbbf24" strokeWidth="3.4" strokeLinecap="round"><line x1="150" y1="52" x2="158" y2="38" /><line x1="162" y1="46" x2="174" y2="38" /></g>
    </>
  );
}

function ArtWheel(u: string) {
  const segs = ["#ef4444", "#f59e0b", "#22c55e", "#0ea5e9", "#a855f7", "#ec4899"];
  return (
    <>
      <defs><linearGradient id={`${u}bg`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#831843" /><stop offset="1" stopColor="#4c1d95" /></linearGradient></defs>
      <rect width="320" height="180" fill={`url(#${u}bg)`} />
      <g className="ga-wheel" style={{ transformOrigin: "160px 92px" }}>
        {segs.map((c, i) => {
          const a0 = (i * 360) / segs.length - 90, a1 = ((i + 1) * 360) / segs.length - 90;
          const r = 62;
          const x0 = 160 + r * Math.cos((a0 * Math.PI) / 180), y0 = 92 + r * Math.sin((a0 * Math.PI) / 180);
          const x1 = 160 + r * Math.cos((a1 * Math.PI) / 180), y1 = 92 + r * Math.sin((a1 * Math.PI) / 180);
          return <path key={i} d={`M160 92 L${x0} ${y0} A${r} ${r} 0 0 1 ${x1} ${y1} Z`} fill={c} stroke="#fff" strokeWidth="2.4" />;
        })}
        <circle cx="160" cy="92" r="16" fill="#fff" /><circle cx="160" cy="92" r="8" fill="#fbbf24" />
      </g>
      <path d="M160 18l10 16h-20z" fill="#fbbf24" />
    </>
  );
}

function ArtDefault(u: string) {
  return (
    <>
      <defs><linearGradient id={`${u}bg`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#1e293b" /><stop offset="1" stopColor="#0f172a" /></linearGradient></defs>
      <rect width="320" height="180" fill={`url(#${u}bg)`} />
      <g className="ga-float">
        <rect x="104" y="56" width="112" height="68" rx="24" fill="#334155" />
        <rect x="86" y="76" width="22" height="28" rx="10" fill="#334155" />
        <rect x="212" y="76" width="22" height="28" rx="10" fill="#334155" />
        <circle cx="136" cy="82" r="7" fill="#22d3ee" /><circle cx="156" cy="82" r="7" fill="#f472b6" />
        <rect x="122" y="102" width="26" height="8" rx="4" fill="#94a3b8" />
        <rect x="154" y="102" width="26" height="8" rx="4" fill="#94a3b8" />
      </g>
    </>
  );
}

/* ── registo id → cena ── */
const SCENES: Record<string, (u: string) => React.ReactNode> = {
  mmorpg: ArtMmorpg,
  bounce: ArtBounce,
  spaceshooter: ArtSpaceshooter,
  flappybird: ArtFlappybird,
  snakebattle: ArtSnake,
  numbertetris: ArtNumTetris,
  pongvs: ArtPong,
  tictactoepro: ArtGalo,
  connect4: ArtConnect4,
  checkers: ArtCheckers,
  chess: ArtChess,
  dominoes: ArtDominoes,
  snakesladders: ArtSnakesLadders,
  memory: ArtMemory,
  urusse: ArtUrusse,
  mexerica: ArtMexerica,
  ludo: ArtLudo,
  uno: ArtUno,
  battleroyale: ArtBattleRoyale,
  millionaire: ArtMillionaire,
  bingo: ArtBingo,
  rpgarena: ArtRpgArena,
  quiz: ArtQuiz,
  crash: ArtCrash,
  diceduel: ArtDice,
  spinwheel: ArtWheel,
};

/*Aliases dos modos ao vivo para reutilizar cenas */
const ALIASES: Record<string, string> = {
  domino: "dominoes", snakeslader: "snakesladders", galo: "tictactoepro",
  betpanel: "crash", limbo: "crash", hilo: "crash", keno: "bingo",
  millionario: "millionaire", "quem-quer-ser-milionario": "millionaire",
  roleta: "spinwheel", timspin: "spinwheel", dados: "diceduel",
};

export interface GameArtProps {
  /** id do jogo (gamesCatalog ou modo ao vivo) */
  id: string;
  className?: string;
  style?: React.CSSProperties;
  /** animação subtil (só transform/opacity) — desligar em listas densas */
  animate?: boolean;
}

/**
 * GameArt — cena vetorial original do jogo, 16:9, nítida em qualquer DPR.
 * Uso: <GameArt id="chess" className="w-full h-24" />
 */
const GameArt = memo(function GameArt({ id, className = "", style, animate = true }: GameArtProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const key = ALIASES[id] ?? id;
  const Scene = SCENES[key] ?? SCENES[key.split("-")[0]] ?? ArtDefault;
  return (
    <svg
      viewBox="0 0 320 180"
      preserveAspectRatio="xMidYMid slice"
      className={`game-art ${animate ? "ga-animated" : ""} ${className}`}
      style={style}
      role="img"
      aria-hidden="true"
    >
      {Scene(uid)}
    </svg>
  );
});

export default GameArt;

/** Chip quadrado pequeno (busca, listas compactas). */
export function GameArtChip({ id, size = 34, className = "" }: { id: string; size?: number; className?: string }) {
  return (
    <span className={`inline-block shrink-0 overflow-hidden rounded-lg ${className}`} style={{ width: size, height: size }} aria-hidden="true">
      <GameArt id={id} className="h-full w-full" />
    </span>
  );
}

/** true se existe cena de arte para este id (usar antes do chip). */
export function hasArt(id: string): boolean {
  const key = ALIASES[id] ?? id;
  return key in SCENES || key.split("-")[0] in SCENES;
}
