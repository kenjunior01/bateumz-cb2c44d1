'use client';

import { Shield, CheckCircle, Lock, Eye, Heart, Gem } from 'lucide-react';
import { motion } from 'framer-motion';

interface FairPlayShieldProps {
  variant?: 'badge' | 'banner' | 'full';
  className?: string;
}

const containerVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, delay: i * 0.1, ease: 'easeOut' },
  }),
};

const bannerItems = [
  {
    icon: Eye,
    label: '100% Verificável',
    description: 'Todos os resultados são públicos e auditáveis',
  },
  {
    icon: Lock,
    label: 'Sem Dinheiro Real',
    description: 'Nenhuma transação financeira real envolvida',
  },
  {
    icon: Gem,
    label: 'Moeda Virtual',
    description: 'Apenas moedas virtuais no sistema',
  },
  {
    icon: Heart,
    label: 'Jogo Responsável',
    description: 'Ferramentas de controlo ao teu dispor',
  },
];

export default function FairPlayShield({ variant = 'badge', className = '' }: FairPlayShieldProps) {
  if (variant === 'badge') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className={`inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full ${className}`}
        style={{
          background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.12), rgba(14, 165, 233, 0.06))',
          border: '1px solid rgba(14, 165, 233, 0.25)',
          boxShadow: '0 0 12px rgba(14, 165, 233, 0.08)',
        }}
      >
        <Shield className="w-4 h-4 text-sky-400" />
        <span className="text-xs sm:text-sm font-semibold text-sky-300 whitespace-nowrap">
          Jogo Justo & Transparente
        </span>
        <CheckCircle className="w-3.5 h-3.5 text-sky-400/70" />
      </motion.div>
    );
  }

  if (variant === 'banner') {
    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-20px' }}
        className={`w-full ${className}`}
      >
        <div
          className="rounded-xl sm:rounded-2xl p-4 sm:p-5"
          style={{
            background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.08), rgba(14, 165, 233, 0.03))',
            border: '1px solid rgba(14, 165, 233, 0.15)',
          }}
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {bannerItems.map((item, i) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.label}
                  custom={i}
                  variants={itemVariants}
                  className="flex flex-col items-center gap-2 text-center"
                >
                  <div
                    className="h-10 w-10 rounded-xl flex items-center justify-center"
                    style={{
                      background: 'rgba(14, 165, 233, 0.12)',
                      border: '1px solid rgba(14, 165, 233, 0.2)',
                    }}
                  >
                    <Icon className="w-4.5 h-4.5 text-sky-400" />
                  </div>
                  <span className="text-xs sm:text-sm font-semibold text-sky-300">
                    {item.label}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.div>
    );
  }

  // full variant
  return (
    <motion.section
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-40px' }}
      className={`w-full ${className}`}
    >
      <div
        className="rounded-2xl p-6 sm:p-8 lg:p-10"
        style={{
          background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.08) 0%, rgba(14, 165, 233, 0.03) 100%)',
          border: '1px solid rgba(14, 165, 233, 0.15)',
        }}
      >
        {/* Header */}
        <motion.div
          custom={0}
          variants={itemVariants}
          className="flex items-center gap-3 mb-6 sm:mb-8"
        >
          <div
            className="h-12 w-12 rounded-xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.2), rgba(14, 165, 233, 0.08))',
              border: '1px solid rgba(14, 165, 233, 0.3)',
              boxShadow: '0 0 20px rgba(14, 165, 233, 0.1)',
            }}
          >
            <Shield className="w-6 h-6 text-sky-400" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-white">
              O Nosso Compromisso com o Jogo Justo
            </h3>
            <p className="text-xs sm:text-sm text-white/40 mt-0.5">
              Transparência total em cada previsão
            </p>
          </div>
        </motion.div>

        {/* Detailed items */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
          {bannerItems.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.label}
                custom={i + 1}
                variants={itemVariants}
                className="rounded-xl p-4 sm:p-5"
                style={{
                  background: 'rgba(14, 165, 233, 0.05)',
                  border: '1px solid rgba(14, 165, 233, 0.1)',
                }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                      background: 'rgba(14, 165, 233, 0.15)',
                    }}
                  >
                    <Icon className="w-5 h-5 text-sky-400" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold text-sky-300 mb-1">
                      {item.label}
                    </h4>
                    <p className="text-xs sm:text-sm text-white/45 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Footer badge */}
        <motion.div
          custom={5}
          variants={itemVariants}
          className="mt-6 sm:mt-8 flex items-center justify-center gap-2"
        >
          <CheckCircle className="w-4 h-4 text-sky-400/60" />
          <span className="text-xs text-white/30">
            Plataforma 100% legal · Sem apostas com dinheiro real · Moedas virtuais apenas
          </span>
        </motion.div>
      </div>
    </motion.section>
  );
}
