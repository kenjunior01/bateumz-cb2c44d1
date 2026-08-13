'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy, Crown, Gamepad2, Lock, Check, ChevronRight, Zap, Star, Gift, Flame, Shield,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface BattlePassTier {
  level: number;
  title: string;
  world: 'esports' | 'sorteios' | 'jogos';
  reward: string;
  rewardIcon: typeof Trophy;
  xpRequired: number;
  color: string;
}

const TIERS: BattlePassTier[] = [
  { level: 1, title: 'Iniciante', world: 'jogos', reward: '10 Bilhetes Gratis', rewardIcon: Gift, xpRequired: 0, color: '#58a6ff' },
  { level: 2, title: 'Competidor', world: 'esports', reward: 'Badge Exclusivo', rewardIcon: Shield, xpRequired: 100, color: '#00d4ff' },
  { level: 3, title: 'Sortudo', world: 'sorteios', reward: 'Sorteio VIP', rewardIcon: Crown, xpRequired: 300, color: '#a855f7' },
  { level: 4, title: 'Gamer', world: 'jogos', reward: 'Skin Exclusiva', rewardIcon: Gamepad2, xpRequired: 600, color: '#2ea043' },
  { level: 5, title: 'Atleta', world: 'esports', reward: 'Entrada Torneio', rewardIcon: Trophy, xpRequired: 1000, color: '#00d4ff' },
  { level: 6, title: 'Diamante', world: 'sorteios', reward: '100% Bonus', rewardIcon: Star, xpRequired: 1500, color: '#f59e0b' },
  { level: 7, title: 'Lenda', world: 'jogos', reward: 'Jogo Exclusivo', rewardIcon: Zap, xpRequired: 2200, color: '#2ea043' },
  { level: 8, title: 'Campeao', world: 'esports', reward: 'Titulo Especial', rewardIcon: Flame, xpRequired: 3000, color: '#ff4655' },
];

const WORLD_CONFIG = {
  esports: { color: '#00d4ff', label: 'ESPORTS', icon: Trophy },
  sorteios: { color: '#a855f7', label: 'SORTEIOS', icon: Crown },
  jogos: { color: '#2ea043', label: 'JOGOS', icon: Gamepad2 },
};

export default function BattlePass() {
  const navigate = useNavigate();
  const [currentXP] = useState(750);
  const [expandedTier, setExpandedTier] = useState<number | null>(null);

  const currentLevel = TIERS.reduce((acc, tier) => currentXP >= tier.xpRequired ? tier.level : acc, 1);
  const nextTier = TIERS.find(t => t.level === currentLevel + 1);
  const progress = nextTier
    ? ((currentXP - TIERS[currentLevel - 1].xpRequired) / (nextTier.xpRequired - TIERS[currentLevel - 1].xpRequired)) * 100
    : 100;

  return (
    <section className="relative py-20 overflow-hidden">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-14">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold mb-5"
            style={{
              background: 'linear-gradient(135deg, rgba(0,212,255,0.1), rgba(168,85,247,0.1), rgba(46,160,67,0.1))',
              border: '1px solid rgba(255,255,255,0.06)',
              color: 'hsl(var(--muted-foreground))',
            }}
          >
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            <span>NOVO — BATTLE PASS</span>
          </motion.div>
          <h2
            className="text-3xl md:text-5xl font-black font-[family-name:var(--font-display)] tracking-tight mb-3"
            style={{
              background: 'linear-gradient(135deg, #00d4ff, #a855f7, #2ea043)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            BATEU BATTLE PASS
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto text-sm">
            Joga em todas as areas. Sobe de nivel. Ganha recompensas exclusivas em cada mundo.
          </p>
        </div>

        {/* XP Progress Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto mb-12"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-bold">Nivel {currentLevel}</span>
              <span className="text-xs text-muted-foreground">· {currentXP} XP</span>
            </div>
            {nextTier && (
              <span className="text-xs text-muted-foreground">
                {nextTier.xpRequired - currentXP} XP para Nivel {nextTier.level}
              </span>
            )}
          </div>
          <div className="h-3 rounded-full overflow-hidden" style={{ background: 'hsl(var(--muted) / 0.3)' }}>
            <motion.div
              className="h-full rounded-full"
              style={{
                background: `linear-gradient(90deg, ${TIERS[currentLevel - 1]?.color || '#58a6ff'}, ${nextTier?.color || '#00d4ff'})`,
                boxShadow: `0 0 15px ${nextTier?.color || '#00d4ff'}30`,
              }}
              initial={{ width: 0 }}
              whileInView={{ width: `${Math.min(progress, 100)}%` }}
              viewport={{ once: true }}
              transition={{ delay: 0.3, duration: 1, ease: 'easeOut' }}
            />
          </div>
        </motion.div>

        {/* Tiers Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mx-auto">
          {TIERS.map((tier, index) => {
            const RewardIcon = tier.rewardIcon;
            const isUnlocked = currentXP >= tier.xpRequired;
            const isCurrent = tier.level === currentLevel;
            const worldConf = WORLD_CONFIG[tier.world];

            return (
              <motion.button
                key={tier.level}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.06, duration: 0.4 }}
                onClick={() => setExpandedTier(expandedTier === tier.level ? null : tier.level)}
                className="relative text-left rounded-2xl p-4 overflow-hidden transition-all duration-300"
                style={{
                  background: isCurrent
                    ? `linear-gradient(135deg, ${tier.color}12, ${tier.color}05)`
                    : 'hsl(var(--card) / 0.4)',
                  border: isCurrent
                    ? `1px solid ${tier.color}30`
                    : isUnlocked
                      ? `1px solid ${tier.color}10`
                      : '1px solid hsl(var(--border) / 0.2)',
                }}
              >
                {/* Background glow for current */}
                {isCurrent && (
                  <div
                    className="absolute -top-8 -right-8 w-24 h-24 rounded-full pointer-events-none"
                    style={{ background: tier.color, filter: 'blur(40px)', opacity: 0.1 }}
                  />
                )}

                <div className="relative z-10">
                  {/* Level number + world indicator */}
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className="text-2xl font-black font-[family-name:var(--font-display)]"
                      style={{
                        color: isUnlocked ? tier.color : 'hsl(var(--muted-foreground) / 0.3)',
                        textShadow: isUnlocked ? `0 0 15px ${tier.color}30` : 'none',
                      }}
                    >
                      {tier.level}
                    </span>
                    <div
                      className="w-6 h-6 rounded-lg flex items-center justify-center"
                      style={{ background: `${worldConf.color}15`, border: `1px solid ${worldConf.color}15` }}
                    >
                      <worldConf.icon className="w-3 h-3" style={{ color: worldConf.color, opacity: 0.7 }} />
                    </div>
                  </div>

                  {/* Title */}
                  <h4 className="text-xs font-bold mb-1.5 tracking-wide" style={{ color: isUnlocked ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground) / 0.4)' }}>
                    {tier.title}
                  </h4>

                  {/* Reward */}
                  <div className="flex items-center gap-1.5">
                    {isUnlocked ? (
                      <Check className="w-3.5 h-3.5" style={{ color: tier.color }} />
                    ) : (
                      <Lock className="w-3.5 h-3.5 text-muted-foreground/30" />
                    )}
                    <span className={"text-[11px] font-medium " + (isUnlocked ? 'text-foreground/70' : 'text-muted-foreground/30')}>
                      {tier.reward}
                    </span>
                  </div>

                  {/* World label */}
                  <div className="mt-2">
                    <span
                      className="text-[8px] font-bold tracking-widest uppercase"
                      style={{ color: worldConf.color, opacity: isUnlocked ? 0.6 : 0.2 }}
                    >
                      {worldConf.label}
                    </span>
                  </div>
                </div>

                {/* Expanded detail */}
                <AnimatePresence>
                  {expandedTier === tier.level && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                      style={{ borderTop: `1px solid ${tier.color}10`, marginTop: '12px', paddingTop: '12px' }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <RewardIcon className="w-5 h-5" style={{ color: tier.color }} />
                          <div>
                            <p className="text-xs font-bold">{tier.reward}</p>
                            <p className="text-[10px] text-muted-foreground">{tier.xpRequired} XP necessarios</p>
                          </div>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate('/' + (tier.world === 'sorteios' ? 'marketplace' : tier.world)); }}
                          className="flex items-center gap-1 text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all"
                          style={{ background: `${tier.color}15`, color: tier.color, border: `1px solid ${tier.color}20` }}
                        >
                            <span>IR</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            );
          })}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mt-12"
        >
          <p className="text-xs text-muted-foreground/50">
            Ganha XP jogando, participando em sorteios e competindo em esports.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
