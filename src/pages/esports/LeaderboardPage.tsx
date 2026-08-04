'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Trophy,
  Medal,
  Crown,
  Star,
  TrendingUp,
  Users,
  Shield,
  Flame,
  Target,
  Search,
  ChevronUp,
  ChevronDown,
  Minus,
  Zap,
  Award,
  Swords,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  getPlayerLeaderboard,
  getGlobalLeaderboard,
  getTopReputation,
  type UserReputation,
  type GlobalLeaderboardEntry,
} from '@/lib/esports-advanced';
import { getTeams, type EsportTeam } from '@/lib/esports';

// ============================================================
// DADOS MOCK - JOGADORES
// ============================================================

const MOCK_PLAYERS: GlobalLeaderboardEntry[] = [
  {
    user_id: 'p1',
    username: 'NightWolf',
    avatar_url: '',
    rating: 2850,
    total_matches: 342,
    wins: 289,
    karma_points: 4820,
    reputation_title: 'Lenda Viva',
  },
  {
    user_id: 'p2',
    username: 'ShadowFx',
    avatar_url: '',
    rating: 2710,
    total_matches: 310,
    wins: 255,
    karma_points: 4510,
    reputation_title: 'Mestre Supremo',
  },
  {
    user_id: 'p3',
    username: 'ThunderKill',
    avatar_url: '',
    rating: 2680,
    total_matches: 298,
    wins: 241,
    karma_points: 4290,
    reputation_title: 'Mestre Supremo',
  },
  {
    user_id: 'p4',
    username: 'PhantomBR',
    avatar_url: '',
    rating: 2550,
    total_matches: 276,
    wins: 220,
    karma_points: 3980,
    reputation_title: 'Elite',
  },
  {
    user_id: 'p5',
    username: 'StormGamer',
    avatar_url: '',
    rating: 2490,
    total_matches: 265,
    wins: 210,
    karma_points: 3750,
    reputation_title: 'Elite',
  },
  {
    user_id: 'p6',
    username: 'VenomStrike',
    avatar_url: '',
    rating: 2400,
    total_matches: 251,
    wins: 198,
    karma_points: 3620,
    reputation_title: 'Veterano',
  },
  {
    user_id: 'p7',
    username: 'CyberLobo',
    avatar_url: '',
    rating: 2380,
    total_matches: 245,
    wins: 190,
    karma_points: 3480,
    reputation_title: 'Veterano',
  },
  {
    user_id: 'p8',
    username: 'TrovaoDivino',
    avatar_url: '',
    rating: 2350,
    total_matches: 240,
    wins: 185,
    karma_points: 3340,
    reputation_title: 'Veterano',
  },
  {
    user_id: 'p9',
    username: 'FerroVelho',
    avatar_url: '',
    rating: 2310,
    total_matches: 232,
    wins: 178,
    karma_points: 3200,
    reputation_title: 'Veterano',
  },
  {
    user_id: 'p10',
    username: 'MatériaEscura',
    avatar_url: '',
    rating: 2280,
    total_matches: 225,
    wins: 172,
    karma_points: 3100,
    reputation_title: 'Veterano',
  },
  {
    user_id: 'p11',
    username: 'BlazeRunner',
    avatar_url: '',
    rating: 2250,
    total_matches: 220,
    wins: 165,
    karma_points: 2980,
    reputation_title: 'Experiente',
  },
  {
    user_id: 'p12',
    username: 'GeloBit',
    avatar_url: '',
    rating: 2220,
    total_matches: 215,
    wins: 160,
    karma_points: 2890,
    reputation_title: 'Experiente',
  },
  {
    user_id: 'p13',
    username: 'NovaEstelar',
    avatar_url: '',
    rating: 2190,
    total_matches: 210,
    wins: 155,
    karma_points: 2780,
    reputation_title: 'Experiente',
  },
  {
    user_id: 'p14',
    username: 'LâminaAfiada',
    avatar_url: '',
    rating: 2160,
    total_matches: 205,
    wins: 148,
    karma_points: 2650,
    reputation_title: 'Experiente',
  },
  {
    user_id: 'p15',
    username: 'QuantumBR',
    avatar_url: '',
    rating: 2130,
    total_matches: 198,
    wins: 142,
    karma_points: 2540,
    reputation_title: 'Ascendente',
  },
];

// ============================================================
// DADOS MOCK - EQUIPAS
// ============================================================

const MOCK_TEAMS: EsportTeam[] = [
  {
    id: 't1',
    name: 'Legião das Sombras',
    slug: 'legiao-das-sombras',
    tag: 'LDS',
    logo_url: '',
    banner_url: '',
    description: '',
    country: 'AO',
    region: 'AO',
    discord_url: null,
    social_links: null,
    owner_id: 'o1',
    is_verified: true,
    is_public: true,
    total_wins: 89,
    total_losses: 12,
    total_tournaments: 45,
    total_earnings: 250000,
    rating: 1720,
    created_at: '',
    updated_at: '',
  },
  {
    id: 't2',
    name: 'Fénix Renascida',
    slug: 'fenix-renascida',
    tag: 'FEN',
    logo_url: '',
    banner_url: '',
    description: '',
    country: 'BR',
    region: 'BR',
    discord_url: null,
    social_links: null,
    owner_id: 'o2',
    is_verified: true,
    is_public: true,
    total_wins: 82,
    total_losses: 18,
    total_tournaments: 42,
    total_earnings: 210000,
    rating: 1680,
    created_at: '',
    updated_at: '',
  },
  {
    id: 't3',
    name: 'Lobos do Trovão',
    slug: 'lobos-do-trovao',
    tag: 'LBT',
    logo_url: '',
    banner_url: '',
    description: '',
    country: 'PT',
    region: 'EU',
    discord_url: null,
    social_links: null,
    owner_id: 'o3',
    is_verified: true,
    is_public: true,
    total_wins: 76,
    total_losses: 22,
    total_tournaments: 40,
    total_earnings: 185000,
    rating: 1640,
    created_at: '',
    updated_at: '',
  },
  {
    id: 't4',
    name: 'Vanguarda de Ferro',
    slug: 'vanguarda-de-ferro',
    tag: 'VDF',
    logo_url: '',
    banner_url: '',
    description: '',
    country: 'AO',
    region: 'AO',
    discord_url: null,
    social_links: null,
    owner_id: 'o4',
    is_verified: true,
    is_public: true,
    total_wins: 71,
    total_losses: 25,
    total_tournaments: 38,
    total_earnings: 160000,
    rating: 1590,
    created_at: '',
    updated_at: '',
  },
  {
    id: 't5',
    name: 'Neon Strikers',
    slug: 'neon-strikers',
    tag: 'NNS',
    logo_url: '',
    banner_url: '',
    description: '',
    country: 'MZ',
    region: 'AO',
    discord_url: null,
    social_links: null,
    owner_id: 'o5',
    is_verified: false,
    is_public: true,
    total_wins: 65,
    total_losses: 30,
    total_tournaments: 35,
    total_earnings: 135000,
    rating: 1520,
    created_at: '',
    updated_at: '',
  },
  {
    id: 't6',
    name: 'Maré Carmesim',
    slug: 'mare-carmesim',
    tag: 'MCR',
    logo_url: '',
    banner_url: '',
    description: '',
    country: 'AO',
    region: 'AO',
    discord_url: null,
    social_links: null,
    owner_id: 'o6',
    is_verified: true,
    is_public: true,
    total_wins: 60,
    total_losses: 28,
    total_tournaments: 33,
    total_earnings: 120000,
    rating: 1480,
    created_at: '',
    updated_at: '',
  },
  {
    id: 't7',
    name: 'Raposas Árticas',
    slug: 'raposas-articas',
    tag: 'RAX',
    logo_url: '',
    banner_url: '',
    description: '',
    country: 'BR',
    region: 'BR',
    discord_url: null,
    social_links: null,
    owner_id: 'o7',
    is_verified: false,
    is_public: true,
    total_wins: 55,
    total_losses: 32,
    total_tournaments: 30,
    total_earnings: 95000,
    rating: 1420,
    created_at: '',
    updated_at: '',
  },
  {
    id: 't8',
    name: 'Horizonte Negro',
    slug: 'horizonte-negro',
    tag: 'HRN',
    logo_url: '',
    banner_url: '',
    description: '',
    country: 'PT',
    region: 'EU',
    discord_url: null,
    social_links: null,
    owner_id: 'o8',
    is_verified: false,
    is_public: true,
    total_wins: 50,
    total_losses: 35,
    total_tournaments: 28,
    total_earnings: 80000,
    rating: 1370,
    created_at: '',
    updated_at: '',
  },
  {
    id: 't9',
    name: 'Chama Solar',
    slug: 'chama-solar',
    tag: 'CHS',
    logo_url: '',
    banner_url: '',
    description: '',
    country: 'AO',
    region: 'AO',
    discord_url: null,
    social_links: null,
    owner_id: 'o9',
    is_verified: false,
    is_public: true,
    total_wins: 45,
    total_losses: 38,
    total_tournaments: 25,
    total_earnings: 65000,
    rating: 1310,
    created_at: '',
    updated_at: '',
  },
  {
    id: 't10',
    name: 'Eclipse Lunar',
    slug: 'eclipse-lunar',
    tag: 'ECL',
    logo_url: '',
    banner_url: '',
    description: '',
    country: 'MZ',
    region: 'AO',
    discord_url: null,
    social_links: null,
    owner_id: 'o10',
    is_verified: false,
    is_public: true,
    total_wins: 40,
    total_losses: 40,
    total_tournaments: 22,
    total_earnings: 50000,
    rating: 1250,
    created_at: '',
    updated_at: '',
  },
];

// ============================================================
// FUNÇÕES AUXILIARES
// ============================================================

function calcularTaxaVitorias(vitorias: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((vitorias / total) * 100);
}

function obterIniciais(nome: string): string {
  return nome
    .split(' ')
    .map((palavra) => palavra[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function obterDireccaoTendencia(indice: number): 'up' | 'down' | 'stable' {
  const padroes = [0, 1, 2, 4, 6, 9, 11, 14];
  if (padroes.includes(indice % 20)) return 'up';
  if (padroes.includes((indice + 5) % 20)) return 'down';
  return 'stable';
}

function obterCorReputacao(titulo: string): string {
  if (titulo.includes('Lenda')) return 'bg-red-500/20 text-red-400 border border-red-500/30';
  if (titulo.includes('Mestre')) return 'bg-purple-500/20 text-purple-400 border border-purple-500/30';
  if (titulo.includes('Elite')) return 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
  if (titulo.includes('Veterano')) return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
  if (titulo.includes('Experiente')) return 'bg-sky-500/20 text-sky-400 border border-sky-500/30';
  return 'bg-zinc-500/20 text-zinc-400 border border-zinc-500/30';
}

function obterCorGlowReputacao(titulo: string): string {
  if (titulo.includes('Lenda')) return '0 0 8px rgba(239, 68, 68, 0.4), 0 0 16px rgba(239, 68, 68, 0.2)';
  if (titulo.includes('Mestre')) return '0 0 8px rgba(168, 85, 247, 0.4), 0 0 16px rgba(168, 85, 247, 0.2)';
  if (titulo.includes('Elite')) return '0 0 8px rgba(245, 158, 11, 0.4), 0 0 16px rgba(245, 158, 11, 0.2)';
  return 'none';
}

function obterCorBarraProgresso(taxa: number): string {
  if (taxa >= 85) return 'bg-gradient-to-r from-amber-400 to-yellow-300';
  if (taxa >= 75) return 'bg-gradient-to-r from-emerald-400 to-green-300';
  if (taxa >= 65) return 'bg-gradient-to-r from-cyan-400 to-sky-300';
  if (taxa >= 50) return 'bg-gradient-to-r from-violet-400 to-purple-300';
  return 'bg-gradient-to-r from-zinc-400 to-zinc-300';
}

// ============================================================
// COMPONENTE: ÍCONE DE TENDÊNCIA
// ============================================================

function IconeTendencia({ indice }: { indice: number }) {
  const direcao = obterDireccaoTendencia(indice);

  if (direcao === 'up') {
    return (
      <span className="flex items-center text-emerald-400">
        <ChevronUp className="w-4 h-4" />
      </span>
    );
  }

  if (direcao === 'down') {
    return (
      <span className="flex items-center text-red-400">
        <ChevronDown className="w-4 h-4" />
      </span>
    );
  }

  return (
    <span className="flex items-center text-zinc-500">
      <Minus className="w-4 h-4" />
    </span>
  );
}

// ============================================================
// COMPONENTE: BARRA DE TAXA DE VITÓRIAS
// ============================================================

function BarraTaxaVitorias({ taxa }: { taxa: number }) {
  const corBarra = obterCorBarraProgresso(taxa);

  return (
    <div className="flex items-center gap-2 w-24">
      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className={"h-full rounded-full " + corBarra}
          initial={{ width: 0 }}
          animate={{ width: `${taxa}%` }}
          transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
        />
      </div>
      <span className="text-xs text-zinc-300 font-mono w-10 text-right">{taxa}%</span>
    </div>
  );
}

// ============================================================
// COMPONENTE: PÓDIO TOP 3 (JOGADORES)
// ============================================================

function PodioJogadores({
  jogadores,
}: {
  jogadores: GlobalLeaderboardEntry[];
}) {
  const topo3 = jogadores.slice(0, 3);
  const primeiro = topo3[0];
  const segundo = topo3[1];
  const terceiro = topo3[2];

  return (
    <div className="relative pt-6 pb-10">

      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-transparent via-purple-500/5 to-transparent pointer-events-none" />

      <div className="flex items-end justify-center gap-3 sm:gap-6 md:gap-10 px-4">

        <motion.div
          className="flex flex-col items-center"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="relative mb-2">
            <Avatar className="w-14 h-14 sm:w-16 sm:h-16 ring-2 ring-zinc-400/50">
              <AvatarImage src={segundo.avatar_url || ''} alt={segundo.username} />
              <AvatarFallback className="bg-zinc-700 text-zinc-200 text-sm font-bold">
                {obterIniciais(segundo.username || '?')}
              </AvatarFallback>
            </Avatar>
            <div
              className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-gradient-to-br from-zinc-300 to-zinc-500 flex items-center justify-center shadow-lg"
              style={{
                boxShadow: '0 0 10px rgba(161, 161, 170, 0.5)',
              }}
            >
              <Medal className="w-4 h-4 text-zinc-900" />
            </div>
          </div>
          <span
            className="text-sm sm:text-base font-bold text-zinc-300 mb-0.5"
            style={{
              textShadow: '0 0 8px rgba(161, 161, 170, 0.3)',
            }}
          >
            {segundo.username}
          </span>
          <span className="text-xs text-zinc-500 font-mono mb-3">
            {segundo.karma_points.toLocaleString('pt-BR')} KP
          </span>
          <div
            className="w-20 sm:w-28 h-24 rounded-t-lg flex items-center justify-center"
            style={{
              background: 'linear-gradient(180deg, #a1a1aa 0%, #71717a 100%)',
            }}
          >
            <span className="text-2xl sm:text-3xl font-black text-zinc-900/80">2</span>
          </div>
          <div
            className="w-20 sm:w-28 h-6 rounded-b-sm"
            style={{
              background: 'linear-gradient(180deg, rgba(161,161,170,0.15) 0%, transparent 100%)',
              filter: 'blur(2px)',
            }}
          />
        </motion.div>


        <motion.div
          className="flex flex-col items-center"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
        >
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            className="relative mb-2"
          >
            <Avatar className="w-18 h-18 sm:w-20 sm:h-20 ring-2 ring-amber-400/60">
              <AvatarImage src={primeiro.avatar_url || ''} alt={primeiro.username} />
              <AvatarFallback className="bg-amber-900/60 text-amber-300 text-base font-bold">
                {obterIniciais(primeiro.username || '?')}
              </AvatarFallback>
            </Avatar>
            <div
              className="absolute -top-3 -right-2 w-8 h-8 rounded-full bg-gradient-to-br from-amber-300 to-orange-500 flex items-center justify-center"
              style={{
                boxShadow:
                  '0 0 12px rgba(251, 191, 36, 0.6), 0 0 24px rgba(251, 191, 36, 0.3)',
              }}
            >
              <Crown className="w-4 h-4 text-amber-900" />
            </div>
          </motion.div>
          <span
            className="text-base sm:text-lg font-black text-amber-400 mb-0.5"
            style={{
              textShadow:
                '0 0 10px rgba(251, 191, 36, 0.5), 0 0 20px rgba(251, 191, 36, 0.3)',
            }}
          >
            {primeiro.username}
          </span>
          <span className="text-sm text-amber-500/80 font-mono font-bold mb-3">
            {primeiro.karma_points.toLocaleString('pt-BR')} KP
          </span>
          <div
            className="w-24 sm:w-32 h-32 rounded-t-lg flex items-center justify-center"
            style={{
              background: 'linear-gradient(180deg, #fbbf24 0%, #f59e0b 50%, #ea580c 100%)',
              boxShadow:
                '0 0 20px rgba(251, 191, 36, 0.3), 0 -4px 30px rgba(251, 191, 36, 0.15)',
            }}
          >
            <span className="text-3xl sm:text-4xl font-black text-amber-950/70">1</span>
          </div>
          <div
            className="w-24 sm:w-32 h-8 rounded-b-sm"
            style={{
              background:
                'linear-gradient(180deg, rgba(251,191,36,0.2) 0%, transparent 100%)',
              filter: 'blur(3px)',
            }}
          />
        </motion.div>


        <motion.div
          className="flex flex-col items-center"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <div className="relative mb-2">
            <Avatar className="w-14 h-14 sm:w-16 sm:h-16 ring-2 ring-orange-600/50">
              <AvatarImage src={terceiro.avatar_url || ''} alt={terceiro.username} />
              <AvatarFallback className="bg-orange-900/50 text-orange-300 text-sm font-bold">
                {obterIniciais(terceiro.username || '?')}
              </AvatarFallback>
            </Avatar>
            <div
              className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-orange-700 flex items-center justify-center shadow-lg"
              style={{
                boxShadow: '0 0 10px rgba(234, 88, 12, 0.5)',
              }}
            >
              <Medal className="w-4 h-4 text-orange-100" />
            </div>
          </div>
          <span
            className="text-sm sm:text-base font-bold text-orange-400 mb-0.5"
            style={{
              textShadow: '0 0 8px rgba(234, 88, 12, 0.3)',
            }}
          >
            {terceiro.username}
          </span>
          <span className="text-xs text-orange-500/60 font-mono mb-3">
            {terceiro.karma_points.toLocaleString('pt-BR')} KP
          </span>
          <div
            className="w-20 sm:w-28 h-24 rounded-t-lg flex items-center justify-center"
            style={{
              background: 'linear-gradient(180deg, #ea580c 0%, #92400e 100%)',
            }}
          >
            <span className="text-2xl sm:text-3xl font-black text-orange-100/70">3</span>
          </div>
          <div
            className="w-20 sm:w-28 h-6 rounded-b-sm"
            style={{
              background:
                'linear-gradient(180deg, rgba(234,88,12,0.15) 0%, transparent 100%)',
              filter: 'blur(2px)',
            }}
          />
        </motion.div>
      </div>
    </div>
  );
}

// ============================================================
// COMPONENTE: PÓDIO TOP 3 (EQUIPAS)
// ============================================================

function PodioEquipas({ equipas }: { equipas: EsportTeam[] }) {
  const topo3 = equipas.slice(0, 3);
  const primeira = topo3[0];
  const segunda = topo3[1];
  const terceira = topo3[2];

  return (
    <div className="relative pt-6 pb-10">
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-transparent via-cyan-500/5 to-transparent pointer-events-none" />

      <div className="flex items-end justify-center gap-3 sm:gap-6 md:gap-10 px-4">

        <motion.div
          className="flex flex-col items-center"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="relative mb-2">
            <Avatar className="w-14 h-14 sm:w-16 sm:h-16 ring-2 ring-zinc-400/50">
              <AvatarImage src={segunda.logo_url || ''} alt={segunda.name} />
              <AvatarFallback className="bg-zinc-700 text-zinc-200 text-sm font-bold">
                {obterIniciais(segunda.name)}
              </AvatarFallback>
            </Avatar>
            <div
              className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-gradient-to-br from-zinc-300 to-zinc-500 flex items-center justify-center shadow-lg"
              style={{
                boxShadow: '0 0 10px rgba(161, 161, 170, 0.5)',
              }}
            >
              <Medal className="w-4 h-4 text-zinc-900" />
            </div>
          </div>
          <span
            className="text-sm sm:text-base font-bold text-zinc-300 mb-0.5"
            style={{
              textShadow: '0 0 8px rgba(161, 161, 170, 0.3)',
            }}
          >
            {segunda.tag && (
              <span className="text-zinc-500 text-xs mr-1">[{segunda.tag}]</span>
            )}
            {segunda.name}
          </span>
          <span className="text-xs text-zinc-500 font-mono mb-3">
            {segunda.rating} RTG
          </span>
          <div
            className="w-20 sm:w-28 h-24 rounded-t-lg flex items-center justify-center"
            style={{
              background: 'linear-gradient(180deg, #a1a1aa 0%, #71717a 100%)',
            }}
          >
            <span className="text-2xl sm:text-3xl font-black text-zinc-900/80">2</span>
          </div>
          <div
            className="w-20 sm:w-28 h-6 rounded-b-sm"
            style={{
              background: 'linear-gradient(180deg, rgba(161,161,170,0.15) 0%, transparent 100%)',
              filter: 'blur(2px)',
            }}
          />
        </motion.div>


        <motion.div
          className="flex flex-col items-center"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
        >
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            className="relative mb-2"
          >
            <Avatar className="w-18 h-18 sm:w-20 sm:h-20 ring-2 ring-amber-400/60">
              <AvatarImage src={primeira.logo_url || ''} alt={primeira.name} />
              <AvatarFallback className="bg-amber-900/60 text-amber-300 text-base font-bold">
                {obterIniciais(primeira.name)}
              </AvatarFallback>
            </Avatar>
            <div
              className="absolute -top-3 -right-2 w-8 h-8 rounded-full bg-gradient-to-br from-amber-300 to-orange-500 flex items-center justify-center"
              style={{
                boxShadow:
                  '0 0 12px rgba(251, 191, 36, 0.6), 0 0 24px rgba(251, 191, 36, 0.3)',
              }}
            >
              <Crown className="w-4 h-4 text-amber-900" />
            </div>
          </motion.div>
          <span
            className="text-base sm:text-lg font-black text-amber-400 mb-0.5"
            style={{
              textShadow:
                '0 0 10px rgba(251, 191, 36, 0.5), 0 0 20px rgba(251, 191, 36, 0.3)',
            }}
          >
            {primeira.tag && (
              <span className="text-amber-600/80 text-xs mr-1">[{primeira.tag}]</span>
            )}
            {primeira.name}
          </span>
          <span className="text-sm text-amber-500/80 font-mono font-bold mb-3">
            {primeira.rating} RTG
          </span>
          <div
            className="w-24 sm:w-32 h-32 rounded-t-lg flex items-center justify-center"
            style={{
              background: 'linear-gradient(180deg, #fbbf24 0%, #f59e0b 50%, #ea580c 100%)',
              boxShadow:
                '0 0 20px rgba(251, 191, 36, 0.3), 0 -4px 30px rgba(251, 191, 36, 0.15)',
            }}
          >
            <span className="text-3xl sm:text-4xl font-black text-amber-950/70">1</span>
          </div>
          <div
            className="w-24 sm:w-32 h-8 rounded-b-sm"
            style={{
              background:
                'linear-gradient(180deg, rgba(251,191,36,0.2) 0%, transparent 100%)',
              filter: 'blur(3px)',
            }}
          />
        </motion.div>


        <motion.div
          className="flex flex-col items-center"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <div className="relative mb-2">
            <Avatar className="w-14 h-14 sm:w-16 sm:h-16 ring-2 ring-orange-600/50">
              <AvatarImage src={terceira.logo_url || ''} alt={terceira.name} />
              <AvatarFallback className="bg-orange-900/50 text-orange-300 text-sm font-bold">
                {obterIniciais(terceira.name)}
              </AvatarFallback>
            </Avatar>
            <div
              className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-orange-700 flex items-center justify-center shadow-lg"
              style={{
                boxShadow: '0 0 10px rgba(234, 88, 12, 0.5)',
              }}
            >
              <Medal className="w-4 h-4 text-orange-100" />
            </div>
          </div>
          <span
            className="text-sm sm:text-base font-bold text-orange-400 mb-0.5"
            style={{
              textShadow: '0 0 8px rgba(234, 88, 12, 0.3)',
            }}
          >
            {terceira.tag && (
              <span className="text-orange-600/80 text-xs mr-1">[{terceira.tag}]</span>
            )}
            {terceira.name}
          </span>
          <span className="text-xs text-orange-500/60 font-mono mb-3">
            {terceira.rating} RTG
          </span>
          <div
            className="w-20 sm:w-28 h-24 rounded-t-lg flex items-center justify-center"
            style={{
              background: 'linear-gradient(180deg, #ea580c 0%, #92400e 100%)',
            }}
          >
            <span className="text-2xl sm:text-3xl font-black text-orange-100/70">3</span>
          </div>
          <div
            className="w-20 sm:w-28 h-6 rounded-b-sm"
            style={{
              background:
                'linear-gradient(180deg, rgba(234,88,12,0.15) 0%, transparent 100%)',
              filter: 'blur(2px)',
            }}
          />
        </motion.div>
      </div>
    </div>
  );
}

// ============================================================
// COMPONENTE: LINHA DA TABELA DE JOGADORES
// ============================================================

function LinhaJogador({
  jogador,
  posicao,
  indice,
}: {
  jogador: GlobalLeaderboardEntry;
  posicao: number;
  indice: number;
}) {
  const taxa = calcularTaxaVitorias(jogador.wins, jogador.total_matches);
  const ehImpar = posicao % 2 === 1;
  const bordaEsquerda =
    posicao >= 4 && posicao <= 10
      ? 'border-l-2 border-l-emerald-600'
      : 'border-l-2 border-l-transparent';
  const corReputacao = obterCorReputacao(jogador.reputation_title);
  const glowReputacao = obterCorGlowReputacao(jogador.reputation_title);

  return (
    <motion.div
      className={
        'flex items-center gap-3 px-3 sm:px-4 py-2.5 rounded-lg border border-white/5 transition-colors hover:bg-white/[0.04] ' +
        (ehImpar ? 'bg-white/[0.02]' : '') +
        ' ' +
        bordaEsquerda
      }
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: indice * 0.04 }}
    >

      <div className="flex items-center gap-1.5 w-10 sm:w-14 shrink-0">
        <span className="text-sm font-mono text-zinc-400 w-6 text-center">
          #{posicao}
        </span>
        <IconeTendencia indice={indice} />
      </div>


      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <Avatar className="w-8 h-8 sm:w-9 sm:h-9 shrink-0">
          <AvatarImage src={jogador.avatar_url || ''} alt={jogador.username} />
          <AvatarFallback className="bg-zinc-800 text-zinc-300 text-xs font-semibold">
            {obterIniciais(jogador.username || '?')}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <span className="text-sm font-semibold text-white truncate block">
            {jogador.username}
          </span>
          <div className="mt-0.5">
            <span
              className={
                'inline-block text-[10px] px-1.5 py-0.5 rounded-full font-semibold ' +
                corReputacao
              }
              style={{
                boxShadow: glowReputacao,
              }}
            >
              {jogador.reputation_title}
            </span>
          </div>
        </div>
      </div>


      <div className="hidden sm:flex flex-col items-end w-20 shrink-0">
        <span
          className="text-sm font-bold font-mono text-cyan-400"
          style={{
            textShadow: '0 0 10px rgba(34, 211, 238, 0.5)',
          }}
        >
          {jogador.karma_points.toLocaleString('pt-BR')}
        </span>
        <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
          Karma
        </span>
      </div>


      <div className="hidden md:flex flex-col items-center w-14 shrink-0">
        <span className="text-sm font-mono text-zinc-300">
          {jogador.total_matches}
        </span>
        <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
          Jogos
        </span>
      </div>


      <div className="hidden md:flex flex-col items-center w-14 shrink-0">
        <span className="text-sm font-mono text-emerald-400">
          {jogador.wins}
        </span>
        <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
          Vitórias
        </span>
      </div>


      <div className="hidden lg:flex shrink-0">
        <BarraTaxaVitorias taxa={taxa} />
      </div>
    </motion.div>
  );
}

// ============================================================
// COMPONENTE: LINHA DA TABELA DE EQUIPAS
// ============================================================

function LinhaEquipa({
  equipa,
  posicao,
  indice,
}: {
  equipa: EsportTeam;
  posicao: number;
  indice: number;
}) {
  const totalJogos = equipa.total_wins + equipa.total_losses;
  const taxa = calcularTaxaVitorias(equipa.total_wins, totalJogos);
  const ehImpar = posicao % 2 === 1;
  const bordaEsquerda =
    posicao >= 4 && posicao <= 10
      ? 'border-l-2 border-l-emerald-600'
      : 'border-l-2 border-l-transparent';

  return (
    <motion.div
      className={
        'flex items-center gap-3 px-3 sm:px-4 py-2.5 rounded-lg border border-white/5 transition-colors hover:bg-white/[0.04] ' +
        (ehImpar ? 'bg-white/[0.02]' : '') +
        ' ' +
        bordaEsquerda
      }
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: indice * 0.04 }}
    >

      <div className="flex items-center gap-1.5 w-10 sm:w-14 shrink-0">
        <span className="text-sm font-mono text-zinc-400 w-6 text-center">
          #{posicao}
        </span>
        <IconeTendencia indice={indice} />
      </div>


      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <Avatar className="w-8 h-8 sm:w-9 sm:h-9 shrink-0">
          <AvatarImage src={equipa.logo_url || ''} alt={equipa.name} />
          <AvatarFallback className="bg-zinc-800 text-zinc-300 text-xs font-semibold">
            {obterIniciais(equipa.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            {equipa.tag && (
              <span className="text-xs text-zinc-500 font-mono shrink-0">
                [{equipa.tag}]
              </span>
            )}
            <span className="text-sm font-semibold text-white truncate">
              {equipa.name}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {equipa.is_verified && (
              <span className="inline-flex items-center gap-0.5 text-[10px] text-cyan-400">
                <Shield className="w-3 h-3" />
                <span>Verificada</span>
              </span>
            )}
            {equipa.country && (
              <span className="text-[10px] text-zinc-500">{equipa.country}</span>
            )}
          </div>
        </div>
      </div>


      <div className="hidden sm:flex flex-col items-end w-20 shrink-0">
        <span
          className="text-sm font-bold font-mono text-cyan-400"
          style={{
            textShadow: '0 0 10px rgba(34, 211, 238, 0.5)',
          }}
        >
          {equipa.rating}
        </span>
        <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
          Rating
        </span>
      </div>


      <div className="hidden md:flex flex-col items-center w-14 shrink-0">
        <span className="text-sm font-mono text-zinc-300">
          {equipa.total_tournaments}
        </span>
        <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
          Torneios
        </span>
      </div>


      <div className="hidden md:flex flex-col items-center w-14 shrink-0">
        <span className="text-sm font-mono text-emerald-400">
          {equipa.total_wins}
        </span>
        <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
          Vitórias
        </span>
      </div>


      <div className="hidden lg:flex shrink-0">
        <BarraTaxaVitorias taxa={taxa} />
      </div>
    </motion.div>
  );
}

// ============================================================
// COMPONENTE: CABEÇALHO DA TABELA
// ============================================================

function CabecalhoTabelaJogadores() {
  return (
    <div className="flex items-center gap-3 px-3 sm:px-4 py-2 rounded-lg bg-white/[0.03] border border-white/5 mb-1">
      <div className="w-10 sm:w-14 shrink-0">
        <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
          Pos
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
          Jogador
        </span>
      </div>
      <div className="hidden sm:block w-20 shrink-0 text-right">
        <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
          Karma
        </span>
      </div>
      <div className="hidden md:block w-14 shrink-0 text-center">
        <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
          Jogos
        </span>
      </div>
      <div className="hidden md:block w-14 shrink-0 text-center">
        <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
          Vitórias
        </span>
      </div>
      <div className="hidden lg:block w-24 shrink-0">
        <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
          Taxa Vit.
        </span>
      </div>
    </div>
  );
}

function CabecalhoTabelaEquipas() {
  return (
    <div className="flex items-center gap-3 px-3 sm:px-4 py-2 rounded-lg bg-white/[0.03] border border-white/5 mb-1">
      <div className="w-10 sm:w-14 shrink-0">
        <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
          Pos
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
          Equipa
        </span>
      </div>
      <div className="hidden sm:block w-20 shrink-0 text-right">
        <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
          Rating
        </span>
      </div>
      <div className="hidden md:block w-14 shrink-0 text-center">
        <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
          Torneios
        </span>
      </div>
      <div className="hidden md:block w-14 shrink-0 text-center">
        <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
          Vitórias
        </span>
      </div>
      <div className="hidden lg:block w-24 shrink-0">
        <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
          Taxa Vit.
        </span>
      </div>
    </div>
  );
}

// ============================================================
// COMPONENTE: SKELETON CARREGANDO
// ============================================================

function EsqueletoPodio() {
  return (
    <div className="flex items-end justify-center gap-6 pt-6 pb-10">
      {[96, 128, 96].map((altura, i) => (
        <div key={i} className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-full bg-white/5 animate-pulse" />
          <div className="w-24 h-3 rounded bg-white/5 animate-pulse" />
          <div
            className="w-24 rounded-t-lg animate-pulse bg-white/5"
            style={{ height: `${altura}px` }}
          />
        </div>
      ))}
    </div>
  );
}

function EsqueletoLinha() {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-white/[0.02]">
      <div className="w-10 h-4 rounded bg-white/5 animate-pulse" />
      <div className="w-8 h-8 rounded-full bg-white/5 animate-pulse" />
      <div className="flex-1 space-y-1.5">
        <div className="w-28 h-3 rounded bg-white/5 animate-pulse" />
        <div className="w-16 h-2 rounded bg-white/5 animate-pulse" />
      </div>
      <div className="w-16 h-3 rounded bg-white/5 animate-pulse" />
      <div className="w-12 h-3 rounded bg-white/5 animate-pulse" />
      <div className="w-20 h-1.5 rounded-full bg-white/5 animate-pulse" />
    </div>
  );
}

// ============================================================
// COMPONENTE PRINCIPAL: PÁGINA DE CLASSIFICAÇÃO
// ============================================================

export default function LeaderboardPage() {
  const [separadorAtivo, setSeparadorAtivo] = useState<'jogadores' | 'equipas'>(
    'jogadores'
  );
  const [termoPesquisa, setTermoPesquisa] = useState('');
  const [jogadores, setJogadores] = useState<GlobalLeaderboardEntry[]>([]);
  const [equipas, setEquipas] = useState<EsportTeam[]>([]);
  const [aCarregar, setACarregar] = useState(true);

  // Carregar dados da API
  useEffect(() => {
    async function carregarDados() {
      setACarregar(true);
      try {
        const [dadosJogadores, dadosEquipas] = await Promise.all([
          getPlayerLeaderboard(20),
          getTeams({ limit: 15 }),
        ]);

        setJogadores(dadosJogadores.length > 0 ? dadosJogadores : MOCK_PLAYERS);
        setEquipas(dadosEquipas.length > 0 ? dadosEquipas : MOCK_TEAMS);
      } catch (erro) {
        console.error('Erro ao carregar classificação:', erro);
        setJogadores(MOCK_PLAYERS);
        setEquipas(MOCK_TEAMS);
      } finally {
        setACarregar(false);
      }
    }
    carregarDados();
  }, []);

  // Filtrar jogadores por pesquisa
  const jogadoresFiltrados = useMemo(() => {
    if (!termoPesquisa.trim()) return jogadores;
    const termo = termoPesquisa.toLowerCase();
    return jogadores.filter(
      (j) =>
        j.username?.toLowerCase().includes(termo) ||
        j.reputation_title.toLowerCase().includes(termo)
    );
  }, [jogadores, termoPesquisa]);

  // Filtrar equipas por pesquisa
  const equipasFiltradas = useMemo(() => {
    if (!termoPesquisa.trim()) return equipas;
    const termo = termoPesquisa.toLowerCase();
    return equipas.filter(
      (e) =>
        e.name.toLowerCase().includes(termo) ||
        e.tag?.toLowerCase().includes(termo)
    );
  }, [equipas, termoPesquisa]);

  // Jogadores da tabela (excluindo top 3)
  const jogadoresTabela = jogadoresFiltrados.slice(3);
  const equipasTabela = equipasFiltradas.slice(3);

  // Estatísticas resumidas
  const totalJogadores = jogadores.length;
  const totalEquipas = equipas.length;
  const mediaKarma =
    jogadores.length > 0
      ? Math.round(
          jogadores.reduce((soma, j) => soma + j.karma_points, 0) /
            jogadores.length
        )
      : 0;
  const melhorTaxa =
    jogadores.length > 0
      ? Math.max(
          ...jogadores.map((j) =>
            calcularTaxaVitorias(j.wins, j.total_matches)
          )
        )
      : 0;

  return (
    <div className="w-full max-w-5xl mx-auto px-3 sm:px-6 py-6 sm:py-8">

      <motion.div
        className="text-center mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1
          className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white mb-2"
          style={{
            textShadow:
              '0 0 10px rgba(168, 85, 247, 0.5), 0 0 30px rgba(168, 85, 247, 0.25), 0 0 10px rgba(34, 211, 238, 0.3)',
          }}
        >
          RANKING GLOBAL
        </h1>
        <p className="text-sm sm:text-base text-zinc-400 mb-5">
          Os melhores jogadores e equipas da plataforma
        </p>


        <div className="flex items-center justify-center gap-2 mb-6">
          <motion.button
            onClick={() => setSeparadorAtivo('jogadores')}
            className={
              'relative px-5 py-2 rounded-full text-sm font-bold uppercase tracking-wider transition-all duration-300 ' +
              (separadorAtivo === 'jogadores'
                ? 'text-cyan-400'
                : 'text-zinc-500 hover:text-zinc-300')
            }
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {separadorAtivo === 'jogadores' && (
              <motion.div
                className="absolute inset-0 rounded-full border border-cyan-400/40"
                style={{
                  boxShadow:
                    '0 0 12px rgba(34, 211, 238, 0.3), inset 0 0 12px rgba(34, 211, 238, 0.1)',
                }}
                layoutId="separador-ativo"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              Jogadores
            </span>
          </motion.button>

          <motion.button
            onClick={() => setSeparadorAtivo('equipas')}
            className={
              'relative px-5 py-2 rounded-full text-sm font-bold uppercase tracking-wider transition-all duration-300 ' +
              (separadorAtivo === 'equipas'
                ? 'text-cyan-400'
                : 'text-zinc-500 hover:text-zinc-300')
            }
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {separadorAtivo === 'equipas' && (
              <motion.div
                className="absolute inset-0 rounded-full border border-cyan-400/40"
                style={{
                  boxShadow:
                    '0 0 12px rgba(34, 211, 238, 0.3), inset 0 0 12px rgba(34, 211, 238, 0.1)',
                }}
                layoutId="separador-ativo"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              <Swords className="w-4 h-4" />
              Equipas
            </span>
          </motion.button>
        </div>


        <div className="relative max-w-sm mx-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            placeholder="Pesquisar jogador ou equipa..."
            value={termoPesquisa}
            onChange={(e) => setTermoPesquisa(e.target.value)}
            className="pl-9 bg-white/[0.04] border-white/10 text-white placeholder:text-zinc-500 focus:border-cyan-500/50 focus:ring-cyan-500/20 h-9 text-sm rounded-full"
          />
        </div>
      </motion.div>


      <motion.div
        className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="bg-white/[0.03] border border-white/5 rounded-xl p-3 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Users className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
              Jogadores
            </span>
          </div>
          <span
            className="text-xl font-black text-white font-mono"
            style={{
              textShadow: '0 0 10px rgba(34, 211, 238, 0.5)',
            }}
          >
            {totalJogadores}
          </span>
        </div>

        <div className="bg-white/[0.03] border border-white/5 rounded-xl p-3 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Swords className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
              Equipas
            </span>
          </div>
          <span
            className="text-xl font-black text-white font-mono"
            style={{
              textShadow: '0 0 10px rgba(168, 85, 247, 0.5)',
            }}
          >
            {totalEquipas}
          </span>
        </div>

        <div className="bg-white/[0.03] border border-white/5 rounded-xl p-3 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
              Karma Médio
            </span>
          </div>
          <span
            className="text-xl font-black text-white font-mono"
            style={{
              textShadow:
                '0 0 10px rgba(251, 191, 36, 0.5), 0 0 20px rgba(251, 191, 36, 0.3)',
            }}
          >
            {mediaKarma.toLocaleString('pt-BR')}
          </span>
        </div>

        <div className="bg-white/[0.03] border border-white/5 rounded-xl p-3 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
              Melhor Taxa
            </span>
          </div>
          <span
            className="text-xl font-black text-white font-mono"
            style={{
              textShadow: '0 0 10px rgba(249, 115, 22, 0.5)',
            }}
          >
            {melhorTaxa}%
          </span>
        </div>
      </motion.div>


      {separadorAtivo === 'jogadores' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
  
          {aCarregar ? (
            <EsqueletoPodio />
          ) : (
            jogadoresFiltrados.length >= 3 && (
              <PodioJogadores jogadores={jogadoresFiltrados} />
            )
          )}

  
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500/60" />
              <span className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">
                Classificação Completa
              </span>
              <Trophy className="w-4 h-4 text-amber-500/60" />
            </div>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </div>

  
          <CabecalhoTabelaJogadores />

  
          <div className="space-y-0.5">
            {aCarregar
              ? Array.from({ length: 8 }).map((_, i) => <EsqueletoLinha key={i} />)
              : jogadoresTabela.map((jogador, indice) => (
                  <LinhaJogador
                    key={jogador.user_id}
                    jogador={jogador}
                    posicao={indice + 4}
                    indice={indice}
                  />
                ))}
          </div>

  
          {!aCarregar && jogadoresTabela.length === 0 && (
            <motion.div
              className="text-center py-12"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <Search className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
              <p className="text-zinc-400 text-sm">
                Nenhum jogador encontrado para "{termoPesquisa}"
              </p>
            </motion.div>
          )}
        </motion.div>
      )}


      {separadorAtivo === 'equipas' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
  
          {aCarregar ? (
            <EsqueletoPodio />
          ) : (
            equipasFiltradas.length >= 3 && (
              <PodioEquipas equipas={equipasFiltradas} />
            )
          )}

  
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-purple-500/60" />
              <span className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">
                Classificação Completa
              </span>
              <Award className="w-4 h-4 text-purple-500/60" />
            </div>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </div>

  
          <CabecalhoTabelaEquipas />

  
          <div className="space-y-0.5">
            {aCarregar
              ? Array.from({ length: 8 }).map((_, i) => <EsqueletoLinha key={i} />)
              : equipasTabela.map((equipa, indice) => (
                  <LinhaEquipa
                    key={equipa.id}
                    equipa={equipa}
                    posicao={indice + 4}
                    indice={indice}
                  />
                ))}
          </div>

  
          {!aCarregar && equipasTabela.length === 0 && (
            <motion.div
              className="text-center py-12"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <Search className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
              <p className="text-zinc-400 text-sm">
                Nenhuma equipa encontrada para "{termoPesquisa}"
              </p>
            </motion.div>
          )}
        </motion.div>
      )}


      <motion.div
        className="mt-10 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        <div className="flex items-center justify-center gap-4 flex-wrap text-[10px] text-zinc-600 uppercase tracking-wider">
          <span className="flex items-center gap-1">
            <Target className="w-3 h-3" />
            Atualização em tempo real
          </span>
          <span className="text-zinc-700">|</span>
          <span className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            Baseado em Karma e Rating
          </span>
          <span className="text-zinc-700">|</span>
          <span className="flex items-center gap-1">
            <Star className="w-3 h-3" />
            Temporada atual
          </span>
        </div>
      </motion.div>
    </div>
  );
}
