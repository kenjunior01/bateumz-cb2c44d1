'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy, Gamepad2, Users, Clock, Search, Zap, Eye, Star, ChevronRight, Filter, TrendingUp, Shield, Radio, MapPin, Calendar, Play, Flame, CircleDollarSign, Video, MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  getEsportGames,
  getChampionships,
  getFeaturedChampionships,
  getTeams,
  getChampActivity,
  getChampMatches,
  GAME_EMOJIS,
  STATUS_LABELS,
  TOURNAMENT_FORMAT_LABELS,
  GENRE_LABELS,
  type EsportGame,
  type Championship,
  type EsportTeam,
  type EsportMatch,
  type EsportActivity,
} from '@/lib/esports';
import ShimmerText from '@/components/ui/ShimmerText';
import CardTilt from '@/components/ui/CardTilt';
import AnimatedNumber from '@/components/ui/AnimatedNumber';
import GlowOrb from '@/components/ui/GlowOrb';
import ParticleField from '@/components/ui/ParticleField';
import ButtonRipple from '@/components/ui/ButtonRipple';
import { fadeInUp, staggerContainer, neonPulse } from '@/lib/animation-utilities';
import { useSoundEffects } from '@/hooks/useSoundEffects';

const sb: any = supabase;

type AbaAtiva = 'live' | 'registration_open' | 'upcoming' | 'completed';

function tempoAgo(dateStr: string): string {
  const agora = Date.now();
  const data = new Date(dateStr).getTime();
  const diff = agora - data;
  const minutos = Math.floor(diff / 60000);
  if (minutos < 1) return 'Agora mesmo';
  if (minutos < 60) return `${minutos}min atr\u00e1s`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `${horas}h atr\u00e1s`;
  const dias = Math.floor(horas / 24);
  if (dias < 7) return `${dias}d atr\u00e1s`;
  return new Date(dateStr).toLocaleDateString('pt-BR');
}

function formatarPremio(valor: number): string {
  if (valor >= 1000000) return `${(valor / 1000000).toFixed(1)}M`;
  if (valor >= 1000) return `${(valor / 1000).toFixed(1)}K`;
  return String(valor);
}

function formatarHorario(dateStr: string | null): string {
  if (!dateStr) return '--:--';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function getGameEmoji(slug: string): string {
  return GAME_EMOJIS[slug] ?? '\uD83C\uDFAE';
}

function getGameById(jogos: EsportGame[], id: string): EsportGame | undefined {
  return jogos.find(g => g.id === id);
}

const ATIVIDADE_ICONS: Record<string, any> = {
  match_started: Play,
  match_completed: Trophy,
  round_started: Flame,
  registration_open: Zap,
  check_in_started: Shield,
  prize_distributed: CircleDollarSign,
  stream_started: Video,
  chat_message: MessageSquare,
  team_joined: Users,
  broadcast: Radio,
};

const POSICAO_CORES = [
  'text-yellow-400',
  'text-gray-300',
  'text-amber-600',
  'text-gray-500',
  'text-gray-600',
];



export default function EsportsHub() {
  const navigate = useNavigate();
  const { sfx } = useSoundEffects();

  const [jogos, setJogos] = useState<EsportGame[]>([]);
  const [campeonatos, setCampeonatos] = useState<Championship[]>([]);
  const [destaque, setDestaque] = useState<Championship | null>(null);
  const [topEquipas, setTopEquipas] = useState<EsportTeam[]>([]);
  const [jogosRecentes, setJogosRecentes] = useState<EsportMatch[]>([]);
  const [feedAtividade, setFeedAtividade] = useState<EsportActivity[]>([]);
  const [jogoSelecionado, setJogoSelecionado] = useState<string | null>(null);
  const [abaAtiva, setAbaAtiva] = useState<AbaAtiva>('live');
  const [consultaPesquisa, setConsultaPesquisa] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [contagensJogos, setContagensJogos] = useState<Record<string, number>>({});

  // Carregar dados principais
  const carregarDados = useCallback(async () => {
    setCarregando(true);
    try {
      const [gamesData, champsData, featuredData, teamsData] = await Promise.all([
        getEsportGames().catch(() => []),
        getChampionships({ is_published: true }).catch(() => []),
        getFeaturedChampionships().catch(() => []),
        getTeams({ sort_by: 'rating', sort_dir: 'desc', limit: 5 }).catch(() => []),
      ]);

      setJogos(gamesData);
      setCampeonatos(champsData);
      setTopEquipas(teamsData);

      if (featuredData.length > 0) {
        setDestaque(featuredData[0]);
      }

      // Contar campeonatos por jogo
      const contagens: Record<string, number> = {};
      for (const c of champsData) {
        contagens[c.game_id] = (contagens[c.game_id] || 0) + 1;
      }
      setContagensJogos(contagens);

      // Carregar jogos e atividade do primeiro campeonato relevante
      const champAtivo = featuredData.find(c => c.status === 'live') || champsData[0];
      if (champAtivo) {
        const [matchesData, activityData] = await Promise.all([
          getChampMatches(champAtivo.id).catch(() => []),
          getChampActivity(champAtivo.id, 5).catch(() => []),
        ]);
        setJogosRecentes(matchesData.filter(m => m.status === 'in_progress' || m.status === 'pending').slice(0, 5));
        setFeedAtividade(activityData);
      }
    } catch (err) {
      console.error('Erro ao carregar dados do hub:', err);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  // Campeonatos filtrados por jogo e pesquisa
  const campeonatosFiltrados = useMemo(() => {
    let lista = campeonatos;
    if (jogoSelecionado) {
      lista = lista.filter(c => c.game_id === jogoSelecionado);
    }
    if (consultaPesquisa.trim()) {
      const q = consultaPesquisa.toLowerCase();
      lista = lista.filter(c => c.name.toLowerCase().includes(q));
    }
    return lista;
  }, [campeonatos, jogoSelecionado, consultaPesquisa]);

  // Campeonatos por aba
  const campeonatosPorAba = useMemo(() => {
    const agora = new Date();
    const filtrados = campeonatosFiltrados;
    switch (abaAtiva) {
      case 'live':
        return filtrados.filter(c => c.status === 'live');
      case 'registration_open':
        return filtrados.filter(c => c.status === 'registration_open');
      case 'upcoming': {
        return filtrados.filter(c => {
          if (c.status === 'check_in') return true;
          if (c.starts_at && new Date(c.starts_at) > agora) return true;
          return false;
        });
      }
      case 'completed':
        return filtrados.filter(c => c.status === 'completed');
      default:
        return [];
    }
  }, [campeonatosFiltrados, abaAtiva]);

  // Contagem por status para badges nas abas
  const contagemPorAba = useMemo(() => {
    const agora = new Date();
    const base = jogoSelecionado
      ? campeonatos.filter(c => c.game_id === jogoSelecionado)
      : campeonatos;
    return {
      live: base.filter(c => c.status === 'live').length,
      registration_open: base.filter(c => c.status === 'registration_open').length,
      upcoming: base.filter(c => {
        if (c.status === 'check_in') return true;
        if (c.starts_at && new Date(c.starts_at) > agora) return true;
        return false;
      }).length,
      completed: base.filter(c => c.status === 'completed').length,
    };
  }, [campeonatos, jogoSelecionado]);

  const irParaCampeonato = (slug: string) => {
    navigate(`/esports/campeonato/${slug}`);
  };

  // Skeleton de carregamento
  if (carregando) {
    return (
      <div>
        <div className="bg-[#0d0d16] border-b border-white/5 py-3">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-28 rounded-full shrink-0" />
              ))}
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-64 w-full rounded-2xl" />
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-xl" />
                ))}
              </div>
            </div>
            <div className="space-y-6">
              <Skeleton className="h-72 w-full rounded-2xl" />
              <Skeleton className="h-64 w-full rounded-2xl" />
              <Skeleton className="h-40 w-full rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Faixa Superior com Filtro de Jogos */}
      <div className="bg-[#0d0d16] border-b border-white/5 py-3 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-4">
            <div className="flex gap-2 overflow-x-auto no-scrollbar flex-1">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => { sfx.click(); setJogoSelecionado(null); }}
                className={
                  'shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ' +
                  (jogoSelecionado === null
                    ? 'bg-gradient-to-r from-violet-600 to-cyan-500 text-white shadow-lg shadow-violet-500/20'
                    : 'bg-white/[0.04] text-gray-400 hover:bg-white/[0.08] hover:text-gray-200')
                }
              >
                <Gamepad2 size={15} />
                <span>Todos</span>
                <span className="text-xs opacity-70">({campeonatos.length})</span>
              </motion.button>
              {jogos.map(jogo => (
                <motion.button
                  key={jogo.id}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => { sfx.click(); setJogoSelecionado(jogo.id); }}
                  className={
                    'shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ' +
                    (jogoSelecionado === jogo.id
                      ? 'bg-gradient-to-r from-violet-600 to-cyan-500 text-white shadow-lg shadow-violet-500/20'
                      : 'bg-white/[0.04] text-gray-400 hover:bg-white/[0.08] hover:text-gray-200')
                  }
                >
                  <span>{getGameEmoji(jogo.slug)}</span>
                  <span>{jogo.name}</span>
                  <span className="text-xs opacity-70">({contagensJogos[jogo.id] || 0})</span>
                </motion.button>
              ))}
            </div>
            <div className="hidden md:flex items-center relative w-56 shrink-0">
              <Search size={14} className="absolute left-3 text-gray-500" />
              <Input
                placeholder="Pesquisar campeonato..."
                value={consultaPesquisa}
                onChange={(e) => setConsultaPesquisa(e.target.value)}
                className="pl-9 h-9 bg-white/[0.04] border-white/[0.08] text-sm text-gray-200 placeholder:text-gray-600 focus:border-violet-500/40 rounded-full"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Area de Conteudo Principal */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna Principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Banner de Destaque */}
            {destaque && (
              <CardTilt borderGlow="cyan" className="rounded-2xl">
              <motion.div
                variants={fadeInUp}
                initial="hidden"
                animate="visible"
                className={
                  'relative h-64 rounded-2xl overflow-hidden cursor-pointer group ' +
                  (destaque.status === 'live' ? 'ring-1 ring-red-500/30' : '')
                }
                style={{
                  background: `linear-gradient(135deg, ${destaque.primary_color || '#7c3aed'}, ${destaque.secondary_color || '#0891b2'})`,
                }}
                onClick={() => { sfx.click(); irParaCampeonato(destaque.slug); }}
              >
                <ParticleField colors={["#00d4ff", "#7b2ff7"]} count={30} particleSize={1.5} speed={0.2} enableConnections={false} enableMouseRepel={false} />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                <div className="relative h-full flex items-center justify-between p-6">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-6xl">
                        {getGameEmoji(getGameById(jogos, destaque.game_id)?.slug || '')}
                      </span>
                      <div className="min-w-0 relative">
                        <GlowOrb color="#00d4ff" secondaryColor="#7b2ff7" size={100} intensity={0.5} speed={12} orbitRadius={30} className="absolute -left-12 -top-8 opacity-60 pointer-events-none" />
                        <h2 className="text-2xl font-black text-white truncate relative z-10">{destaque.name}</h2>
                        <p className="text-sm text-white/70">
                          {getGameById(jogos, destaque.game_id)?.name || 'Jogo'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className="bg-white/20 text-white border-0 text-xs">
                        {TOURNAMENT_FORMAT_LABELS[destaque.tournament_format] || destaque.tournament_format}
                      </Badge>
                      <Badge
                        className={
                          destaque.status === 'live'
                            ? 'bg-red-600 text-white border-0 text-xs'
                            : 'bg-white/20 text-white border-0 text-xs'
                        }
                      >
                        {STATUS_LABELS[destaque.status] || destaque.status}
                      </Badge>
                      <span className="text-xs text-white/60 flex items-center gap-1">
                        <Users size={12} />
                        {destaque.registered_teams}/{destaque.max_teams} equipas
                      </span>
                    </div>
                    {destaque.status === 'live' && (
                      <div className="flex items-center gap-2 mt-3">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                        </span>
                        <span className="text-xs font-bold text-red-300 uppercase tracking-wider">Ao Vivo</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-3 shrink-0 ml-4">
                    <div className="text-right">
                      <p className="text-xs text-white/50 uppercase tracking-wider">Premio</p>
                      <p className="text-3xl font-black text-white flex items-center gap-1">
                        {formatarPremio(destaque.prize_pool)}
                        <CircleDollarSign size={20} className="text-yellow-300" />
                      </p>
                    </div>
                    <ButtonRipple
                      rippleColor="rgba(255,255,255,0.3)"
                      soundEffect={() => sfx.click()}
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        irParaCampeonato(destaque.slug);
                      }}
                      className="inline-flex items-center gap-1 bg-white/20 hover:bg-white/30 text-white border border-white/20 rounded-full text-xs font-semibold px-3 py-1.5 transition-colors"
                    >
                      Ver Campeonato
                      <ChevronRight size={14} />
                    </ButtonRipple>
                  </div>
                </div>
              </motion.div>
              </CardTilt>
            )}

            {/* Abas de Campeonatos */}
            <motion.div variants={fadeInUp} initial="hidden" animate="visible" className="transition-all">
              <Tabs
                value={abaAtiva}
                onValueChange={(v) => setAbaAtiva(v as AbaAtiva)}
                className="w-full"
              >
                <TabsList className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-1 h-auto w-full justify-start gap-1">
                  <TabsTrigger
                    value="live"
                    className="flex items-center gap-2 rounded-lg data-[state=active]:bg-red-600/20 data-[state=active]:text-red-400 text-gray-500 text-xs font-medium px-3 py-2"
                  >
                    <Radio size={13} />
                    AO VIVO
                    {contagemPorAba.live > 0 && (
                      <span className="bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                        {contagemPorAba.live}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger
                    value="registration_open"
                    className="flex items-center gap-2 rounded-lg data-[state=active]:bg-green-600/20 data-[state=active]:text-green-400 text-gray-500 text-xs font-medium px-3 py-2"
                  >
                    <Zap size={13} />
                    REGISTO ABERTO
                    {contagemPorAba.registration_open > 0 && (
                      <span className="bg-green-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                        {contagemPorAba.registration_open}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger
                    value="upcoming"
                    className="flex items-center gap-2 rounded-lg data-[state=active]:bg-blue-600/20 data-[state=active]:text-blue-400 text-gray-500 text-xs font-medium px-3 py-2"
                  >
                    <Clock size={13} />
                    BREVEMENTE
                    {contagemPorAba.upcoming > 0 && (
                      <span className="bg-blue-600/80 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                        {contagemPorAba.upcoming}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger
                    value="completed"
                    className="flex items-center gap-2 rounded-lg data-[state=active]:bg-gray-600/20 data-[state=active]:text-gray-400 text-gray-500 text-xs font-medium px-3 py-2"
                  >
                    <Trophy size={13} />
                    CONCLUIDO
                    {contagemPorAba.completed > 0 && (
                      <span className="bg-gray-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                        {contagemPorAba.completed}
                      </span>
                    )}
                  </TabsTrigger>
                </TabsList>

                {['live', 'registration_open', 'upcoming', 'completed'].map(aba => (
                  <TabsContent key={aba} value={aba} className="mt-3">
                    <AnimatePresence mode="wait">
                      {campeonatosPorAba.length === 0 ? (
                        <motion.div
                          key="empty"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-8 text-center"
                        >
                          <Gamepad2 size={32} className="mx-auto text-gray-600 mb-3" />
                          <p className="text-gray-500 text-sm">
                            Nenhum campeonato encontrado nesta categoria.
                          </p>
                        </motion.div>
                      ) : (
                        <motion.div
                          key={aba}
                          variants={staggerContainer}
                          initial="hidden"
                          animate="visible"
                          className="space-y-2 max-h-[480px] overflow-y-auto pr-1"
                          style={{
                            scrollbarWidth: 'thin',
                            scrollbarColor: 'rgba(255,255,255,0.08) transparent',
                          }}
                        >
                          {campeonatosPorAba.map(camp => {
                            const jogo = getGameById(jogos, camp.game_id);
                            const isLive = camp.status === 'live';
                            return (
                              <motion.div
                                key={camp.id}
                                variants={fadeInUp}
                                onClick={() => { sfx.click(); irParaCampeonato(camp.slug); }}
                                className={
                                  'relative flex items-center gap-4 h-24 px-4 rounded-xl cursor-pointer transition-all duration-200 group ' +
                                  'bg-white/[0.03] hover:bg-white/[0.06] border ' +
                                  (isLive
                                    ? 'border-l-[3px] border-l-red-500 border-t-white/[0.06] border-r-white/[0.06] border-b-white/[0.06] shadow-[0_0_20px_rgba(239,68,68,0.08)]'
                                    : 'border-white/[0.05] hover:border-white/10')
                                }
                              >
                                <div className="shrink-0 flex flex-col items-center gap-1 w-12">
                                  <span className="text-3xl">{getGameEmoji(jogo?.slug || '')}</span>
                                  <span className="text-[10px] text-gray-600 truncate max-w-full">{jogo?.name || ''}</span>
                                </div>

                                <div className="flex-1 min-w-0">
                                  <h3 className="text-sm font-semibold text-gray-200 truncate group-hover:text-white transition-colors">
                                    {camp.name}
                                  </h3>
                                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                                    <Badge
                                      className={
                                        'text-[10px] px-2 py-0 rounded-full border-0 font-medium ' +
                                        (isLive
                                          ? 'bg-red-600/20 text-red-400'
                                          : camp.status === 'registration_open'
                                            ? 'bg-green-600/20 text-green-400'
                                            : camp.status === 'completed'
                                              ? 'bg-gray-600/20 text-gray-400'
                                              : 'bg-blue-600/20 text-blue-400')
                                      }
                                    >
                                      {STATUS_LABELS[camp.status] || camp.status}
                                    </Badge>
                                    <span className="text-[10px] text-gray-500">
                                      {TOURNAMENT_FORMAT_LABELS[camp.tournament_format] || camp.tournament_format}
                                    </span>
                                    <span className="text-[10px] text-gray-600 flex items-center gap-1">
                                      <Users size={10} />
                                      {camp.registered_teams || 0}/{camp.max_teams || '?'}
                                    </span>
                                    {camp.registered_players > 0 && (
                                      <span className="text-[10px] text-gray-600">
                                        {camp.registered_players} jogadores
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="shrink-0 flex flex-col items-end gap-1.5">
                                  <div className="flex items-center gap-1">
                                    <CircleDollarSign size={12} className="text-yellow-500" />
                                    <span className="text-sm font-bold text-gray-200">
                                      {formatarPremio(camp.prize_pool)}
                                    </span>
                                  </div>
                                  {camp.status === 'registration_open' && (
                                    <Badge className="bg-green-600/20 text-green-400 border-0 text-[10px] px-2 py-0 rounded-full">
                                      Inscrever-se
                                    </Badge>
                                  )}
                                  {camp.starts_at && (camp.status === 'check_in' || camp.status === 'registration_open') && (
                                    <span className="text-[10px] text-gray-500 flex items-center gap-1">
                                      <Calendar size={9} />
                                      {new Date(camp.starts_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                                    </span>
                                  )}
                                  <ChevronRight size={14} className="text-gray-600 group-hover:text-gray-400 transition-colors" />
                                </div>
                              </motion.div>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </TabsContent>
                ))}
              </Tabs>
            </motion.div>

            {/* Feed de Atividade */}
            {feedAtividade.length > 0 && (
              <motion.div variants={fadeInUp} initial="hidden" animate="visible">
                <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                      <Flame size={15} className="text-orange-400" />
                      <ShimmerText colors={["#f97316", "#ef4444", "#fbbf24", "#f97316"]} speed={3}>Atividade Recente</ShimmerText>
                    </h3>
                    <Badge variant="secondary" className="bg-white/[0.05] text-gray-500 border-0 text-[10px]">
                      {feedAtividade.length} eventos
                    </Badge>
                  </div>
                  <div className="space-y-3">
                    {feedAtividade.map((atividade, idx) => {
                      const IconComp = ATIVIDADE_ICONS[atividade.type] || MessageSquare;
                      return (
                        <motion.div
                          key={atividade.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05, duration: 0.25 }}
                          className="flex items-start gap-3"
                        >
                          <div className="shrink-0 mt-0.5 w-7 h-7 rounded-lg bg-white/[0.05] flex items-center justify-center">
                            <IconComp size={13} className="text-gray-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-300 leading-relaxed">{atividade.title}</p>
                            {atividade.description && (
                              <p className="text-[11px] text-gray-600 mt-0.5 truncate">{atividade.description}</p>
                            )}
                          </div>
                          <span className="text-[10px] text-gray-600 shrink-0">
                            {tempoAgo(atividade.created_at)}
                          </span>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Coluna Lateral */}
          <div className="space-y-6">
            {/* Proximos Jogos */}
            <motion.div
              variants={fadeInUp}
              initial="hidden"
              animate="visible"
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <CardTilt borderGlow="cyan" className="rounded-2xl">
              <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                    <Play size={15} className="text-cyan-400" />
                    <ShimmerText colors={["#00d4ff", "#7b2ff7", "#00d4ff"]} speed={3}>Proximos Jogos</ShimmerText>
                  </h3>
                  {jogosRecentes.some(m => m.status === 'in_progress') && (
                    <div className="flex items-center gap-1.5">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                      </span>
                      <span className="text-[10px] text-red-400 font-medium">LIVE</span>
                    </div>
                  )}
                </div>
                {jogosRecentes.length === 0 ? (
                  <div className="py-8 text-center">
                    <Calendar size={24} className="mx-auto text-gray-700 mb-2" />
                    <p className="text-xs text-gray-600">Sem jogos agendados.</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-80 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.08) transparent' }}>
                    {jogosRecentes.map((jogo, idx) => {
                      const isLive = jogo.status === 'in_progress';
                      return (
                        <div
                          key={jogo.id}
                          className={
                            'p-3 rounded-xl transition-colors ' +
                            (isLive
                              ? 'bg-red-600/[0.06] border border-red-500/10'
                              : 'bg-white/[0.02] hover:bg-white/[0.04] border border-transparent')
                          }
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] text-gray-600 flex items-center gap-1">
                              <MapPin size={9} />
                              Rodada {jogo.round_number} - Jogo {jogo.match_number}
                            </span>
                            {isLive ? (
                              <Badge className="bg-red-600 text-white border-0 text-[9px] px-1.5 py-0 rounded-full font-bold">
                                AO VIVO
                              </Badge>
                            ) : jogo.scheduled_at ? (
                              <span className="text-[10px] text-gray-500 flex items-center gap-1">
                                <Clock size={9} />
                                {formatarHorario(jogo.scheduled_at)}
                              </span>
                            ) : null}
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              {jogo.team1_logo ? (
                                <Avatar className="w-5 h-5">
                                  <AvatarImage src={jogo.team1_logo} alt={jogo.team1_name || ''} />
                                  <AvatarFallback className="text-[8px]">?</AvatarFallback>
                                </Avatar>
                              ) : null}
                              <span className="text-xs text-gray-300 font-medium truncate">
                                {jogo.team1_name || 'TBD'}
                              </span>
                            </div>
                            <span className="text-[10px] text-gray-600 font-bold px-2 shrink-0">VS</span>
                            <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
                              <span className="text-xs text-gray-300 font-medium truncate text-right">
                                {jogo.team2_name || 'TBD'}
                              </span>
                              {jogo.team2_logo ? (
                                <Avatar className="w-5 h-5">
                                  <AvatarImage src={jogo.team2_logo} alt={jogo.team2_name || ''} />
                                  <AvatarFallback className="text-[8px]">?</AvatarFallback>
                                </Avatar>
                              ) : null}
                            </div>
                          </div>
                          {isLive && (jogo.team1_score !== null || jogo.team2_score !== null) && (
                            <div className="flex items-center justify-center gap-3 mt-1.5">
                              <span className="text-sm font-bold text-white">{jogo.team1_score ?? 0}</span>
                              <span className="text-[10px] text-gray-600">-</span>
                              <span className="text-sm font-bold text-white">{jogo.team2_score ?? 0}</span>
                            </div>
                          )}
                          {jogo.map_name && (
                            <p className="text-[10px] text-gray-600 mt-1.5 truncate">
                              <MapPin size={8} className="inline mr-1" />
                              {jogo.map_name}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              </CardTilt>
            </motion.div>

            {/* Top Equipas */}
            <motion.div
              variants={fadeInUp}
              initial="hidden"
              animate="visible"
              transition={{ duration: 0.3, delay: 0.15 }}
            >
              <CardTilt borderGlow="emerald" className="rounded-2xl">
              <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                    <TrendingUp size={15} className="text-emerald-400" />
                    <ShimmerText colors={["#10b981", "#00d4ff", "#a855f7", "#10b981"]} speed={3}>Top Equipas</ShimmerText>
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[10px] text-gray-500 hover:text-gray-300 h-auto p-0"
                    onClick={() => { sfx.whoosh(); navigate('/esports/ranking'); }}
                  >
                    Ver todos
                    <ChevronRight size={12} />
                  </Button>
                </div>
                {topEquipas.length === 0 ? (
                  <div className="py-8 text-center">
                    <Shield size={24} className="mx-auto text-gray-700 mb-2" />
                    <p className="text-xs text-gray-600">Sem equipas classificadas.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {topEquipas.map((equipa, idx) => (
                      <motion.div
                        key={equipa.id}
                        initial={{ opacity: 0, x: 8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.15 + idx * 0.05, duration: 0.25 }}
                        className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.04] transition-colors cursor-pointer group"
                        onClick={() => { sfx.click(); navigate(`/esports/equipa/${equipa.slug}`); }}
                      >
                        <span className={`text-sm font-black w-5 text-center ${POSICAO_CORES[idx] || 'text-gray-600'}`}>
                          #{idx + 1}
                        </span>
                        <Avatar className="w-8 h-8 border border-white/[0.08]">
                          <AvatarImage src={equipa.logo_url || undefined} alt={equipa.name} />
                          <AvatarFallback className="text-[10px] bg-white/[0.06]">{equipa.tag || equipa.name.slice(0, 2)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-gray-200 truncate group-hover:text-white transition-colors">
                              {equipa.name}
                            </span>
                            {equipa.is_verified && (
                              <Shield size={11} className="text-cyan-400 shrink-0" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-gray-600">
                              {equipa.total_wins}V / {equipa.total_losses}D
                            </span>
                            <span className="text-[10px] text-gray-700">|</span>
                            <span className="text-[10px] text-yellow-500/80 font-medium">ELO {equipa.rating}</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <Star size={10} className={idx === 0 ? 'text-yellow-400' : 'text-gray-700'} />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
              </CardTilt>
            </motion.div>

            {/* Links Rapidos */}
            <motion.div
              variants={fadeInUp}
              initial="hidden"
              animate="visible"
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2 mb-4">
                  <Zap size={15} className="text-yellow-400" />
                  Links Rapidos
                </h3>
                <div className="space-y-1">
                  {[
                    { icon: Trophy, label: 'Ver Ranking Global', path: '/esports/ranking' },
                    { icon: Gamepad2, label: 'Explorar Ligas', path: '/esports/ligas' },
                    { icon: Users, label: 'Minha Equipa', path: '/esports/equipa' },
                    { icon: Calendar, label: 'Calendario de Eventos', path: '/esports/calendario' },
                    { icon: Eye, label: 'Assistir Transmissoes', path: '/esports/ao-vivo' },
                  ].map((link) => (
                    <button
                      key={link.path}
                      onClick={() => { sfx.whoosh(); navigate(link.path); }}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-white/[0.04] transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center">
                          <link.icon size={13} className="text-gray-500 group-hover:text-gray-300 transition-colors" />
                        </div>
                        <span className="text-xs text-gray-400 group-hover:text-gray-200 transition-colors">
                          {link.label}
                        </span>
                      </div>
                      <ChevronRight size={13} className="text-gray-700 group-hover:text-gray-500 transition-colors" />
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Estatisticas rapidas */}
            <motion.div
              variants={fadeInUp}
              initial="hidden"
              animate="visible"
              transition={{ duration: 0.3, delay: 0.25 }}
            >
              <CardTilt borderGlow="violet" className="rounded-2xl">
              <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2 mb-4">
                  <Filter size={15} className="text-violet-400" />
                  <ShimmerText colors={["#a855f7", "#00d4ff", "#ec4899", "#a855f7"]} speed={3}>Visao Geral</ShimmerText>
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/[0.03] rounded-xl p-3 text-center">
                    <p className="text-lg font-bold text-gray-200"><AnimatedNumber value={jogos.length} className="text-lg font-bold text-gray-200" /></p>
                    <p className="text-[10px] text-gray-500 mt-0.5"><ShimmerText colors={["#00d4ff", "#7b2ff7", "#00d4ff"]} speed={4}>Jogos Ativos</ShimmerText></p>
                  </div>
                  <div className="bg-white/[0.03] rounded-xl p-3 text-center">
                    <p className="text-lg font-bold text-gray-200"><AnimatedNumber value={campeonatos.length} className="text-lg font-bold text-gray-200" /></p>
                    <p className="text-[10px] text-gray-500 mt-0.5"><ShimmerText colors={["#7b2ff7", "#00d4ff", "#7b2ff7"]} speed={4}>Campeonatos</ShimmerText></p>
                  </div>
                  <div className="bg-white/[0.03] rounded-xl p-3 text-center">
                    <p className="text-lg font-bold text-red-400"><AnimatedNumber value={contagemPorAba.live} className="text-lg font-bold text-red-400" /></p>
                    <p className="text-[10px] text-gray-500 mt-0.5"><ShimmerText colors={["#ef4444", "#f97316", "#ef4444"]} speed={4}>Ao Vivo Agora</ShimmerText></p>
                  </div>
                  <div className="bg-white/[0.03] rounded-xl p-3 text-center">
                    <p className="text-lg font-bold text-green-400"><AnimatedNumber value={contagemPorAba.registration_open} className="text-lg font-bold text-green-400" /></p>
                    <p className="text-[10px] text-gray-500 mt-0.5"><ShimmerText colors={["#22c55e", "#10b981", "#22c55e"]} speed={4}>Registo Aberto</ShimmerText></p>
                  </div>
                </div>
              </div>
              </CardTilt>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
