import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Globe, Building2, Trophy, Clapperboard, Zap, Drum, ArrowRight, Play,
} from "lucide-react";
import RollUp from "./RollUp";

/**
 * DestaquesRollUp — o roll-up ESPECIAL da homepage.
 * Cartões editoriais imersivos com os pilares da plataforma (features reais).
 * Auto-avança e pausa ao interagir (o RollUp trata disso).
 */

const ACCENT = {
  cyan: "#00d4ff", purple: "#a855f7", green: "#2ea043",
  gold: "#fbbf24", rose: "#f43f5e", orange: "#fb923c",
};

interface Feature {
  num: string;
  badge: string;
  badgeColor: string;
  title: string;
  titleHighlight: string;
  desc: string;
  cta: string;
  href: string;
  icon: any;
  grad: string;
  accent: string;
  glow: string;
}

const FEATURES: Feature[] = [
  {
    num: "01",
    badge: "OFICIAL · AO VIVO",
    badgeColor: ACCENT.orange,
    title: "Bateu World",
    titleHighlight: "3D",
    desc: "O nosso mundo aberto multiplayer: explora territórios, encontra outros jogadores, enfrenta monstros e sobe no ranking global.",
    cta: "Entrar no Mundo",
    href: "/lives?game=mmorpg",
    icon: Globe,
    grad: "linear-gradient(145deg, #1a0b02 0%, #3b1403 45%, #4a1a05 100%)",
    accent: ACCENT.orange,
    glow: "rgba(251,146,60,0.22)",
  },
  {
    num: "02",
    badge: "PARA EMPRESAS",
    badgeColor: ACCENT.cyan,
    title: "A tua marca na",
    titleHighlight: "plataforma",
    desc: "Mensalidade acessível: crie torneios, sorteios com marca própria, loja e bens à venda — tudo com o nome da sua empresa.",
    cta: "Saber como funciona",
    href: "/empresas",
    icon: Building2,
    grad: "linear-gradient(145deg, #02121a 0%, #04202e 45%, #032938 100%)",
    accent: ACCENT.cyan,
    glow: "rgba(0,212,255,0.22)",
  },
  {
    num: "03",
    badge: "COMPETITIVO",
    badgeColor: ACCENT.purple,
    title: "Esports &",
    titleHighlight: "Torneios",
    desc: "Campeonatos com prémios, rankings ao vivo e standings por jogador. Empresas e criadores também criam os seus torneios.",
    cta: "Ver competições",
    href: "/esports",
    icon: Trophy,
    grad: "linear-gradient(145deg, #12051f 0%, #1d0a33 45%, #250d3f 100%)",
    accent: ACCENT.purple,
    glow: "rgba(168,85,247,0.22)",
  },
  {
    num: "04",
    badge: "NOVO",
    badgeColor: ACCENT.rose,
    title: "Stories da",
    titleHighlight: "comunidade",
    desc: "Publica momentos, enquetes e quizzes com prémio. Ganhou créditos? Partilha nos stories e mostra a tua conquista.",
    cta: "Abrir comunidade",
    href: "/community",
    icon: Clapperboard,
    grad: "linear-gradient(145deg, #1f0410 0%, #33091b 45%, #3f0c21 100%)",
    accent: ACCENT.rose,
    glow: "rgba(244,63,94,0.22)",
  },
  {
    num: "05",
    badge: "RESULTADO NA HORA",
    badgeColor: ACCENT.gold,
    title: "Jogos",
    titleHighlight: "instantâneos",
    desc: "Crash, Plinko, Mines, Raspadinha e mais — roda, levanta e multiplica os teus Luck Coins em segundos.",
    cta: "Jogar agora",
    href: "/jogos",
    icon: Zap,
    grad: "linear-gradient(145deg, #1c1200 0%, #2e1e00 45%, #3a2600 100%)",
    accent: ACCENT.gold,
    glow: "rgba(251,191,36,0.22)",
  },
  {
    num: "06",
    badge: "MOÇAMBIQUE",
    badgeColor: ACCENT.green,
    title: "Jogos",
    titleHighlight: "tradicionais",
    desc: "Mexerica, Urusse, Ntchuva, Chigogo e Capulana Quiz — os clássicos de casa, online e contra o mundo.",
    cta: "Descobrir clássicos",
    href: "/jogos",
    icon: Drum,
    grad: "linear-gradient(145deg, #02170a 0%, #052713 45%, #063018 100%)",
    accent: ACCENT.green,
    glow: "rgba(46,160,67,0.22)",
  },
];

export default function DestaquesRollUp() {
  const navigate = useNavigate();
  const accentRef = useRef(ACCENT.cyan);

  return (
    <RollUp
      kicker="Destaques & Features"
      title="Tudo o que a plataforma tem para ti"
      subtitle="Desliza e descobre — cada cartão leva-te a uma parte viva do Bateu"
      accent={ACCENT.cyan}
      autoAdvanceMs={4500}
    >
      {FEATURES.map((f, i) => {
        const Icon = f.icon;
        return (
          <motion.article
            key={f.num}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ delay: Math.min(i * 0.05, 0.25), duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="relative shrink-0 snap-start w-[78vw] max-w-[320px] sm:w-[46%] sm:max-w-none md:w-[38%] lg:w-[31%] rounded-3xl overflow-hidden cursor-pointer group"
            style={{ background: f.grad, border: `1px solid ${f.accent}22`, minHeight: 340, boxShadow: `0 12px 48px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)` }}
            onClick={() => { accentRef.current = f.accent; navigate(f.href); }}
            role="link"
            aria-label={`${f.title} ${f.titleHighlight}`}
          >
            {/* número editorial fantasma */}
            <span
              className="absolute -top-3 right-3 text-[92px] leading-none font-black select-none pointer-events-none opacity-[0.07]"
              style={{ color: "#ffffff", WebkitTextStroke: `1px ${f.accent}30` }}
            >
              {f.num}
            </span>

            {/* orbes decorativos */}
            <div className="absolute -top-10 -left-10 h-36 w-36 rounded-full blur-3xl pointer-events-none opacity-70 transition-opacity duration-500 group-hover:opacity-100" style={{ background: f.glow }} />
            <div className="absolute bottom-6 -right-8 h-28 w-28 rounded-full blur-2xl pointer-events-none opacity-50" style={{ background: f.glow }} />

            {/* padrão de grelha subtil */}
            <div
              className="absolute inset-0 pointer-events-none opacity-[0.05]"
              style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)", backgroundSize: "28px 28px" }}
            />

            <div className="relative h-full flex flex-col p-5 sm:p-6" style={{ minHeight: 340 }}>
              {/* badge */}
              <div className="flex items-center justify-between mb-auto">
                <span
                  className="text-[9px] font-black tracking-[0.14em] px-2.5 py-1 rounded-full"
                  style={{ color: f.badgeColor, background: `${f.badgeColor}14`, border: `1px solid ${f.badgeColor}33` }}
                >
                  {f.badge}
                </span>
                <div
                  className="h-10 w-10 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6"
                  style={{ background: `${f.accent}16`, border: `1px solid ${f.accent}30`, boxShadow: `0 0 20px ${f.accent}22` }}
                >
                  <Icon className="h-5 w-5" style={{ color: f.accent }} />
                </div>
              </div>

              {/* título + descrição */}
              <div className="mt-6">
                <h3 className="text-[22px] sm:text-2xl font-black text-white leading-tight">
                  {f.title}{" "}
                  <span style={{ color: f.accent }}>{f.titleHighlight}</span>
                </h3>
                <p className="mt-2 text-[13px] leading-relaxed text-zinc-400">{f.desc}</p>
              </div>

              {/* CTA */}
              <div className="mt-5 flex items-center gap-2">
                <span
                  className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl transition-all duration-200 group-hover:gap-2.5"
                  style={{ color: "#fff", background: `${f.accent}1c`, border: `1px solid ${f.accent}40` }}
                >
                  {f.href.includes("mmorpg") && <Play className="h-3.5 w-3.5" />}
                  {f.cta}
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </div>

            {/* linha de acento no fundo */}
            <div className="absolute bottom-0 inset-x-0 h-[3px]" style={{ background: `linear-gradient(90deg, ${f.accent}, transparent 70%)` }} />
          </motion.article>
        );
      })}
    </RollUp>
  );
}
