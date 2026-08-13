import { useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import {
  Swords, Crown, Gamepad2, Sparkles, ChevronRight, ArrowRight,
  Users, Zap, Radio,
} from "lucide-react";

const HUB_ZONES = [
  {
    id: "esports",
    title: "ESPORTS",
    subtitle: "Compete. Domina. Conquista.",
    description: "Campeonatos, ligas, ranking, transferencias e apostas. O cenario competitivo definitivo.",
    href: "/esports",
    icon: Swords,
    color: "#00d4ff",
    colorSecondary: "#ff4655",
    gradientClass: "hub-zone-esports",
    stats: [
      { label: "Campeonatos", value: "12+" },
      { label: "Equipas", value: "50+" },
      { label: "Jogadores", value: "2k+" },
    ],
    features: ["AO VIVO", "RANKING", "LIGAS"],
    inspiration: "Inspirado em Riot Games / VALORANT",
  },
  {
    id: "sorteios",
    title: "SORTEIOS & PREMIOS",
    subtitle: "Ganhe. Sonhe. Conquista.",
    description: "Sorteios transparentes, concursos exclusivos e premios reais verificados na blockchain.",
    href: "/marketplace",
    icon: Crown,
    color: "#a855f7",
    colorSecondary: "#f59e0b",
    gradientClass: "hub-zone-sorteios",
    stats: [
      { label: "Sorteios", value: "100+" },
      { label: "Premios", value: "500k+" },
      { label: "Vencedores", value: "1k+" },
    ],
    features: ["BLOCKCHAIN", "24/7", "GOLD"],
    inspiration: "Inspirado em Omaze / Gleam.io",
  },
  {
    id: "jogos",
    title: "JOGOS ONLINE",
    subtitle: "Joga. Conquista. Domina.",
    description: "90+ jogos ao vivo e em tempo real. Arcade, estrategia, quiz, puzzle e muito mais.",
    href: "/jogos",
    icon: Gamepad2,
    color: "#2ea043",
    colorSecondary: "#58a6ff",
    gradientClass: "hub-zone-jogos",
    stats: [
      { label: "Jogos", value: "90+" },
      { label: "Categorias", value: "15+" },
      { label: "Lives", value: "24/7" },
    ],
    features: ["MULTIPLAYER", "BOT", "AO VIVO"],
    inspiration: "Inspirado em Steam / CrazyGames",
  },
];

export default function PlatformHub() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="relative py-16 lg:py-24">
      <div className="container mx-auto px-4 mb-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold mb-4"
            style={{
              background: "linear-gradient(135deg, rgba(0,212,255,0.1), rgba(168,85,247,0.1), rgba(46,160,67,0.1))",
              border: "1px solid rgba(255,255,255,0.06)",
              color: "hsl(var(--muted-foreground))",
            }}
          >
            <Sparkles className="w-3 h-3" />
            <span>PLATAFORMA COMPLETA</span>
          </motion.div>
          <h2
            className="text-3xl md:text-5xl font-black font-[family-name:var(--font-display)] tracking-tight mb-3"
            style={{
              background: "linear-gradient(135deg, hsl(var(--foreground)), hsl(var(--muted-foreground)))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Tres mundos. Uma plataforma.
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm md:text-base">
            Esports, sorteios e jogos online — cada area com design e experiencia unicos, inspirados nas maiores plataformas mundiais.
          </p>
        </motion.div>
      </div>

      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-5 lg:gap-6">
          {HUB_ZONES.map((zone, index) => {
            const Icon = zone.icon;
            return (
              <motion.div
                key={zone.id}
                initial={{ opacity: 0, y: 40 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.15 + index * 0.12, duration: 0.6, ease: [0.22, 1, 0.36, 1] as const }}
              >
                <Link to={zone.href} className="block">
                  <div className={("hub-zone " + zone.gradientClass + " p-6 lg:p-8 h-full")}>
                    <div
                      className="hub-zone-glow hub-zone-glow-tl"
                      style={{ background: zone.color }}
                    />
                    <div
                      className="hub-zone-glow hub-zone-glow-br"
                      style={{ background: zone.colorSecondary }}
                    />

                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                      {[...Array(4)].map((_, i) => (
                        <motion.div
                          key={i}
                          className="absolute rounded-full"
                          style={{
                            width: (2 + Math.random() * 2) + "px",
                            height: (2 + Math.random() * 2) + "px",
                            background: zone.color,
                            opacity: 0.2,
                            left: (10 + Math.random() * 80) + "%",
                            top: (10 + Math.random() * 80) + "%",
                          }}
                          animate={{
                            y: [0, -15, 0],
                            opacity: [0.1, 0.4, 0.1],
                          }}
                          transition={{
                            duration: 3 + Math.random() * 3,
                            repeat: Infinity,
                            delay: Math.random() * 2,
                            ease: "easeInOut",
                          }}
                        />
                      ))}
                    </div>

                    <div className="relative z-10">
                      <div className="flex items-start justify-between mb-5">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center"
                          style={{
                            background: ("linear-gradient(135deg, " + zone.color + "20, " + zone.colorSecondary + "15)"),
                            border: ("1px solid " + zone.color + "25"),
                          }}
                        >
                          <Icon className="w-5 h-5" style={{ color: zone.color }} />
                        </div>
                        <ChevronRight
                          className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ color: zone.color }}
                        />
                      </div>

                      <h3
                        className="text-lg font-black font-[family-name:var(--font-display)] tracking-wide mb-1"
                        style={{
                          color: zone.color,
                          textShadow: ("0 0 20px " + zone.color + "30"),
                        }}
                      >
                        {zone.title}
                      </h3>
                      <p
                        className="text-[10px] tracking-[0.2em] font-bold uppercase mb-4"
                        style={{ color: (zone.color + "60") }}
                      >
                        {zone.subtitle}
                      </p>

                      <p className="text-sm text-white/50 mb-6 leading-relaxed">
                        {zone.description}
                      </p>

                      <div className="grid grid-cols-3 gap-2 mb-5">
                        {zone.stats.map((stat) => (
                          <div
                            key={stat.label}
                            className="text-center py-2 rounded-lg"
                            style={{
                              background: (zone.color + "08"),
                              border: ("1px solid " + zone.color + "10"),
                            }}
                          >
                            <div
                              className="text-base font-black font-[family-name:var(--font-display)]"
                              style={{ color: zone.color }}
                            >
                              {stat.value}
                            </div>
                            <div className="text-[9px] text-white/30 font-medium uppercase tracking-wider">
                              {stat.label}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-wrap gap-1.5 mb-5">
                        {zone.features.map((feat) => (
                          <span
                            key={feat}
                            className="text-[9px] font-bold tracking-[0.15em] px-2 py-1 rounded"
                            style={{
                              color: (zone.color + "80"),
                              background: (zone.color + "10"),
                              border: ("1px solid " + zone.color + "15"),
                            }}
                          >
                            {feat}
                          </span>
                        ))}
                      </div>

                      <div
                        className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all duration-300"
                        style={{
                          background: ("linear-gradient(135deg, " + zone.color + "15, " + zone.colorSecondary + "10)"),
                          border: ("1px solid " + zone.color + "20"),
                          color: zone.color,
                        }}
                      >
                        <span>Entrar</span>
                        <ArrowRight className="w-4 h-4" />
                      </div>

                      <p className="text-[9px] text-white/15 text-center mt-3 font-medium tracking-wide">
                        {zone.inspiration}
                      </p>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>

      <div className="container mx-auto px-4 mt-12">
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(0,212,255,0.3))" }} />
          <div className="flex items-center gap-2">
            {["#00d4ff", "#a855f7", "#2ea043"].map((color, i) => (
              <motion.div
                key={color}
                className="w-2 h-2 rounded-full"
                style={{ background: color, boxShadow: ("0 0 8px " + color + "40") }}
                animate={{ scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
              />
            ))}
          </div>
          <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, rgba(46,160,67,0.3), transparent)" }} />
        </div>
      </div>
    </section>
  );
}
