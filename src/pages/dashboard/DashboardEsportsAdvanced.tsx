import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import {
  Plus, Calendar, Shield, AlertTriangle, Ban, CheckCircle, Eye, Users,
  DollarSign, Settings, Tv, Upload, Trash2, Edit, Play, Pause, Award,
} from 'lucide-react';
import {
  createSeason, getSeasons, updateSeasonStatus, registerSeasonTeam,
  getSeasonTeams, createSeasonMatch, generateSeasonSchedule,
  reportSeasonMatchResult, createSponsor, getSponsors, updateSponsorStatus,
  deleteSponsor, submitEvidence, verifyEvidence, issuePunishment,
  getUserPunishments, createStreamOverlay, getStreamOverlays, toggleOverlay,
  SEASON_STATUS_LABELS, SPONSOR_TYPE_LABELS, PUNISHMENT_TYPE_LABELS,
  EVIDENCE_TYPE_LABELS,
} from '@/lib/esports-advanced';
import type {
  Season, SeasonTeam, SeasonMatch, Sponsor, Evidence, Punishment, StreamOverlay,
  CreateSeasonData,
} from '@/lib/esports-advanced';
import { getEsportGames } from '@/lib/esports';
import type { EsportGame } from '@/lib/esports';

const GAME_EMOJIS: Record<string, string> = {
  free_fire: '\uD83C\uDFAD',
  mobile_legends: '\u2694\uFE0F',
  pubg_mobile: '\uD83C\uDFAF',
  call_of_duty: '\uD83D\uDD2B',
  fifa: '\u26BD',
  valorant: '\uD83C\uDFAF',
  league_of_legends: '\uD83C\uDFAE',
  fortnite: '\uD83C\uDFF9\uFE0F',
  cs2: '\uD83D\uDD2B',
};

type Tab = 'temporadas' | 'anticheat' | 'patrocinadores' | 'overlay' | 'matches';

export default function DashboardEsportsAdvanced() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>('temporadas');

  // Temporadas
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [games, setGames] = useState<EsportGame[]>([]);
  const [loadingSeasons, setLoadingSeasons] = useState(true);
  const [showCreateSeason, setShowCreateSeason] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState<Season | null>(null);
  const [seasonTeams, setSeasonTeams] = useState<SeasonTeam[]>([]);
  const [seasonMatches, setSeasonMatches] = useState<SeasonMatch[]>([]);
  const [loadingSeasonDetail, setLoadingSeasonDetail] = useState(false);

  // Anti-Cheat
  const [evidenceList, setEvidenceList] = useState<Evidence[]>([]);
  const [punishments, setPunishments] = useState<Punishment[]>([]);
  const [loadingAntiCheat, setLoadingAntiCheat] = useState(true);

  // Patrocinadores
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loadingSponsors, setLoadingSponsors] = useState(true);

  // Overlay
  const [overlays, setOverlays] = useState<StreamOverlay[]>([]);
  const [loadingOverlays, setLoadingOverlays] = useState(true);

  // Matches
  const [matchesSeasonId, setMatchesSeasonId] = useState<string>('');
  const [allSeasonMatches, setAllSeasonMatches] = useState<SeasonMatch[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);

  // Create Season Form
  const [seasonForm, setSeasonForm] = useState<CreateSeasonData>({
    name: '', description: '', start_date: '', end_date: '',
    points_win: 3, points_draw: 1, points_loss: 0, bonus_points_per_kill: 0.5,
    max_teams: 16, prize_pool: 0, currency: 'AOA',
    prize_distribution: [50, 30, 20], primary_color: '#8B5CF6', secondary_color: '#EC4899',
  });

  // Anti-Cheat Form
  const [evidenceForm, setEvidenceForm] = useState({
    target_user_id: '', evidence_type: 'screenshot' as string, file_url: '', description: '',
  });
  const [punishmentForm, setPunishmentForm] = useState({
    user_id: '', punishment_type: 'warning' as string, reason: '', duration_days: '',
  });

  // Sponsor Form
  const [sponsorForm, setSponsorForm] = useState({
    company_name: '', logo_url: '', sponsorship_type: 'prize', value: '',
    currency: 'AOA', banner_url: '', overlay_url: '',
  });

  // Overlay Form
  const [overlayForm, setOverlayForm] = useState({
    name: '', show_scores: true, show_teams: true, show_sponsors: true,
    show_bracket: false, show_mvp: true, bg_color: '#000000',
    accent_color: '#8B5CF6', text_color: '#FFFFFF',
  });

  // Result Form
  const [resultForm, setResultForm] = useState({
    match_id: '', team1_score: '', team2_score: '',
    team1_kills: '', team2_kills: '', winner_id: '', mvp_name: '',
  });

  // Register team form
  const [teamForm, setTeamForm] = useState({ team_id: '', team_name: '', team_logo: '' });
  const [showRegisterTeam, setShowRegisterTeam] = useState(false);

  useEffect(() => {
    loadSeasons();
    loadGames();
    loadEvidence();
    loadSponsors();
    loadOverlays();
  }, []);

  const loadSeasons = async () => {
    setLoadingSeasons(true);
    try {
      const data = await getSeasons();
      setSeasons(data);
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setLoadingSeasons(false);
    }
  };

  const loadGames = async () => {
    try {
      const data = await getEsportGames();
      setGames(data);
    } catch (_e) {
      // games optional
    }
  };

  const loadSeasonDetail = async (seasonId: string) => {
    setLoadingSeasonDetail(true);
    try {
      const [teams, matches] = await Promise.all([
        getSeasonTeams(seasonId),
        loadSeasonMatches(seasonId),
      ]);
      setSeasonTeams(teams);
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setLoadingSeasonDetail(false);
    }
  };

  const loadSeasonMatches = async (seasonId: string): Promise<SeasonMatch[]> => {
    try {
      const { getSeasonMatches } = await import('@/lib/esports-advanced');
      const data = await getSeasonMatches(seasonId);
      setSeasonMatches(data);
      return data;
    } catch (_e) {
      return [];
    }
  };

  const loadEvidence = async () => {
    setLoadingAntiCheat(true);
    try {
      if (!user) return;
      const data = await getUserPunishments(user.id);
      setPunishments(data);
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setLoadingAntiCheat(false);
    }
  };

  const loadSponsors = async () => {
    setLoadingSponsors(true);
    try {
      const data = await getSponsors();
      setSponsors(data);
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setLoadingSponsors(false);
    }
  };

  const loadOverlays = async () => {
    setLoadingOverlays(true);
    try {
      const data = await getStreamOverlays();
      setOverlays(data);
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setLoadingOverlays(false);
    }
  };

  const handleCreateSeason = async () => {
    if (!seasonForm.name || !seasonForm.start_date || !seasonForm.end_date) {
      toast({ title: 'Erro', description: 'Preencha os campos obrigatorios', variant: 'destructive' });
      return;
    }
    try {
      await createSeason(seasonForm);
      toast({ title: 'Sucesso', description: 'Temporada criada com sucesso' });
      setShowCreateSeason(false);
      setSeasonForm({
        name: '', description: '', start_date: '', end_date: '',
        points_win: 3, points_draw: 1, points_loss: 0, bonus_points_per_kill: 0.5,
        max_teams: 16, prize_pool: 0, currency: 'AOA',
        prize_distribution: [50, 30, 20], primary_color: '#8B5CF6', secondary_color: '#EC4899',
      });
      loadSeasons();
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    }
  };

  const handleSeasonStatus = async (id: string, status: string) => {
    try {
      await updateSeasonStatus(id, status as any);
      toast({ title: 'Sucesso', description: 'Estado atualizado' });
      loadSeasons();
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    }
  };

  const handleGenerateSchedule = async (season: Season) => {
    try {
      const teams = await getSeasonTeams(season.id);
      if (teams.length < 2) {
        toast({ title: 'Erro', description: 'Necessarias pelo menos 2 equipas', variant: 'destructive' });
        return;
      }
      const teamIds = teams.map(t => t.team_id || t.id);
      const teamNames = teams.map(t => t.team_name);
      const teamLogos = teams.map(t => t.team_logo || '');
      await generateSeasonSchedule(season.id, teamIds, teamNames, teamLogos);
      toast({ title: 'Sucesso', description: 'Calendario gerado com sucesso' });
      loadSeasonDetail(season.id);
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    }
  };

  const handleRegisterTeam = async () => {
    if (!selectedSeason || !teamForm.team_name) {
      toast({ title: 'Erro', description: 'Preencha o nome da equipa', variant: 'destructive' });
      return;
    }
    try {
      await registerSeasonTeam(selectedSeason.id, {
        team_id: teamForm.team_id,
        team_name: teamForm.team_name,
        team_logo: teamForm.team_logo || undefined,
      });
      toast({ title: 'Sucesso', description: 'Equipa registada' });
      setShowRegisterTeam(false);
      setTeamForm({ team_id: '', team_name: '', team_logo: '' });
      loadSeasonDetail(selectedSeason.id);
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    }
  };

  const handleSubmitEvidence = async () => {
    if (!user || !evidenceForm.target_user_id || !evidenceForm.file_url) {
      toast({ title: 'Erro', description: 'Preencha todos os campos', variant: 'destructive' });
      return;
    }
    try {
      await submitEvidence({
        submitted_by: user.id,
        target_user_id: evidenceForm.target_user_id,
        evidence_type: evidenceForm.evidence_type as any,
        file_url: evidenceForm.file_url,
        description: evidenceForm.description || undefined,
      });
      toast({ title: 'Sucesso', description: 'Evidencia submetida' });
      setEvidenceForm({ target_user_id: '', evidence_type: 'screenshot', file_url: '', description: '' });
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    }
  };

  const handleVerifyEvidence = async (evidenceId: string) => {
    if (!user) return;
    try {
      await verifyEvidence(evidenceId, user.id);
      toast({ title: 'Sucesso', description: 'Evidencia verificada' });
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    }
  };

  const handleIssuePunishment = async () => {
    if (!user || !punishmentForm.user_id || !punishmentForm.reason) {
      toast({ title: 'Erro', description: 'Preencha todos os campos', variant: 'destructive' });
      return;
    }
    try {
      await issuePunishment({
        user_id: punishmentForm.user_id,
        punishment_type: punishmentForm.punishment_type as any,
        reason: punishmentForm.reason,
        duration_days: punishmentForm.duration_days ? parseInt(punishmentForm.duration_days) : undefined,
        issued_by: user.id,
      });
      toast({ title: 'Sucesso', description: 'Punicao aplicada' });
      setPunishmentForm({ user_id: '', punishment_type: 'warning', reason: '', duration_days: '' });
      loadEvidence();
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    }
  };

  const handleCreateSponsor = async () => {
    if (!sponsorForm.company_name) {
      toast({ title: 'Erro', description: 'Preencha o nome da empresa', variant: 'destructive' });
      return;
    }
    try {
      await createSponsor({
        company_name: sponsorForm.company_name,
        logo_url: sponsorForm.logo_url || undefined,
        sponsorship_type: sponsorForm.sponsorship_type,
        value: sponsorForm.value ? parseFloat(sponsorForm.value) : undefined,
        currency: sponsorForm.currency,
        banner_url: sponsorForm.banner_url || undefined,
        overlay_url: sponsorForm.overlay_url || undefined,
      });
      toast({ title: 'Sucesso', description: 'Patrocinador criado' });
      setSponsorForm({
        company_name: '', logo_url: '', sponsorship_type: 'prize',
        value: '', currency: 'AOA', banner_url: '', overlay_url: '',
      });
      loadSponsors();
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    }
  };

  const handleCreateOverlay = async () => {
    if (!overlayForm.name) {
      toast({ title: 'Erro', description: 'Preencha o nome do overlay', variant: 'destructive' });
      return;
    }
    try {
      await createStreamOverlay(overlayForm);
      toast({ title: 'Sucesso', description: 'Overlay criado' });
      setOverlayForm({
        name: '', show_scores: true, show_teams: true, show_sponsors: true,
        show_bracket: false, show_mvp: true, bg_color: '#000000',
        accent_color: '#8B5CF6', text_color: '#FFFFFF',
      });
      loadOverlays();
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    }
  };

  const handleToggleOverlay = async (id: string, isActive: boolean) => {
    try {
      await toggleOverlay(id, isActive);
      toast({ title: 'Sucesso', description: isActive ? 'Overlay ativado' : 'Overlay desativado' });
      loadOverlays();
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    }
  };

  const handleReportResult = async () => {
    if (!resultForm.match_id) {
      toast({ title: 'Erro', description: 'Selecione um jogo', variant: 'destructive' });
      return;
    }
    try {
      const t1Score = parseInt(resultForm.team1_score) || 0;
      const t2Score = parseInt(resultForm.team2_score) || 0;
      const isDraw = t1Score === t2Score;
      const match = allSeasonMatches.find(m => m.id === resultForm.match_id);
      const winnerId = isDraw ? undefined : (t1Score > t2Score ? match?.team1_id : match?.team2_id);
      await reportSeasonMatchResult(resultForm.match_id, {
        team1_score: t1Score,
        team2_score: t2Score,
        team1_kills: parseInt(resultForm.team1_kills) || 0,
        team2_kills: parseInt(resultForm.team2_kills) || 0,
        winner_id: winnerId,
        is_draw: isDraw,
        mvp_name: resultForm.mvp_name || undefined,
      });
      toast({ title: 'Sucesso', description: 'Resultado reportado' });
      setResultForm({ match_id: '', team1_score: '', team2_score: '', team1_kills: '', team2_kills: '', winner_id: '', mvp_name: '' });
      if (matchesSeasonId) {
        const { getSeasonMatches } = await import('@/lib/esports-advanced');
        const data = await getSeasonMatches(matchesSeasonId);
        setAllSeasonMatches(data);
      }
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    }
  };

  const handleLoadMatches = async (seasonId: string) => {
    setMatchesSeasonId(seasonId);
    setLoadingMatches(true);
    try {
      const { getSeasonMatches } = await import('@/lib/esports-advanced');
      const data = await getSeasonMatches(seasonId);
      setAllSeasonMatches(data);
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setLoadingMatches(false);
    }
  };

  const handleCopyWidgetUrl = (url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      toast({ title: 'Copiado', description: 'URL do widget copiada para o clipboard' });
    });
  };

  const getGameName = (gameId?: string) => {
    if (!gameId) return '-';
    const game = games.find(g => g.id === gameId);
    return game ? `${GAME_EMOJIS[game.slug] || ''} ${game.name}` : gameId;
  };

  const matchesByRound = allSeasonMatches.reduce<Record<number, SeasonMatch[]>>((acc, m) => {
    if (!acc[m.round_number]) acc[m.round_number] = [];
    acc[m.round_number].push(m);
    return acc;
  }, {});

  const statusColor: Record<string, string> = {
    upcoming: 'bg-yellow-100 text-yellow-800',
    active: 'bg-green-100 text-green-800',
    paused: 'bg-orange-100 text-orange-800',
    completed: 'bg-gray-100 text-gray-800',
    cancelled: 'bg-red-100 text-red-800',
    pending: 'bg-yellow-100 text-yellow-800',
    'active': 'bg-green-100 text-green-800',
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-center gap-3 mb-2">
            <Settings className="h-7 w-7 text-primary" />
            <h1 className="text-2xl md:text-3xl font-bold">eSports Avancado</h1>
          </div>
          <p className="text-muted-foreground">
            Gerir temporadas, anti-cheat, patrocinadores, overlays e jogos da temporada.
          </p>
        </motion.div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Tab)}>
          <TabsList className="flex flex-wrap h-auto gap-1 bg-muted p-1">
            <TabsTrigger value="temporadas" className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Temporadas</span>
            </TabsTrigger>
            <TabsTrigger value="anticheat" className="flex items-center gap-1.5">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Anti-Cheat</span>
            </TabsTrigger>
            <TabsTrigger value="patrocinadores" className="flex items-center gap-1.5">
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">Patrocinadores</span>
            </TabsTrigger>
            <TabsTrigger value="overlay" className="flex items-center gap-1.5">
              <Tv className="h-4 w-4" />
              <span className="hidden sm:inline">Stream Overlay</span>
            </TabsTrigger>
            <TabsTrigger value="matches" className="flex items-center gap-1.5">
              <Play className="h-4 w-4" />
              <span className="hidden sm:inline">Jogos</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="temporadas" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Temporadas</h2>
              <Button onClick={() => setShowCreateSeason(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Temporada
              </Button>
            </div>

            {loadingSeasons ? (
              <div className="text-center py-12 text-muted-foreground">A carregar temporadas...</div>
            ) : seasons.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                Nenhuma temporada encontrada. Crie a primeira temporada.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {seasons.map((s) => (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.01 }}
                  >
                    <Card
                      className={`cursor-pointer transition-shadow hover:shadow-md ${selectedSeason?.id === s.id ? 'ring-2 ring-primary' : ''}`}
                      onClick={() => {
                        setSelectedSeason(s);
                        loadSeasonDetail(s.id);
                      }}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-base leading-tight">{s.name}</CardTitle>
                          <Badge className={statusColor[s.status] || 'bg-gray-100'}>
                            {SEASON_STATUS_LABELS[s.status] || s.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          {new Date(s.start_date).toLocaleDateString('pt-AO')} - {new Date(s.end_date).toLocaleDateString('pt-AO')}
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Users className="h-3.5 w-3.5" />
                          {s.registered_teams}/{s.max_teams} equipas
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <DollarSign className="h-3.5 w-3.5" />
                          {s.prize_pool > 0 ? `${s.prize_pool.toLocaleString()} ${s.currency}` : 'Sem premio'}
                        </div>
                        <div className="text-xs text-muted-foreground">{getGameName(s.game_id)}</div>
                        <div className="flex flex-wrap gap-1.5 pt-2" onClick={(e) => e.stopPropagation()}>
                          {s.status === 'upcoming' && (
                            <Button size="sm" variant="outline" onClick={() => handleSeasonStatus(s.id, 'active')}>
                              <Play className="h-3 w-3 mr-1" /> Iniciar
                            </Button>
                          )}
                          {s.status === 'active' && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => handleSeasonStatus(s.id, 'paused')}>
                                <Pause className="h-3 w-3 mr-1" /> Pausar
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => handleGenerateSchedule(s)}>
                                <Calendar className="h-3 w-3 mr-1" /> Gerar Calendario
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => handleSeasonStatus(s.id, 'completed')}>
                                <CheckCircle className="h-3 w-3 mr-1" /> Concluir
                              </Button>
                            </>
                          )}
                          {s.status === 'paused' && (
                            <Button size="sm" variant="outline" onClick={() => handleSeasonStatus(s.id, 'active')}>
                              <Play className="h-3 w-3 mr-1" /> Retomar
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}

            {selectedSeason && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">{selectedSeason.name} - Classificacao</h3>
                  <Button size="sm" variant="outline" onClick={() => setShowRegisterTeam(true)}>
                    <Plus className="h-4 w-4 mr-1" /> Registar Equipa
                  </Button>
                </div>

                {loadingSeasonDetail ? (
                  <div className="text-center py-8 text-muted-foreground">A carregar classificacao...</div>
                ) : (
                  <Card>
                    <CardContent className="p-4">
                      <div className="max-h-96 overflow-y-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-10">#</TableHead>
                              <TableHead>Equipa</TableHead>
                              <TableHead className="text-center">J</TableHead>
                              <TableHead className="text-center">V</TableHead>
                              <TableHead className="text-center">E</TableHead>
                              <TableHead className="text-center">D</TableHead>
                              <TableHead className="text-center">Kills</TableHead>
                              <TableHead className="text-center font-bold">Pts</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {seasonTeams.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                                  Nenhuma equipa registada
                                </TableCell>
                              </TableRow>
                            ) : (
                              seasonTeams.map((t, idx) => (
                                <TableRow key={t.id}>
                                  <TableCell className="font-medium">{idx + 1}</TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      {t.team_logo && (
                                        <img src={t.team_logo} alt="" className="h-6 w-6 rounded-full object-cover" />
                                      )}
                                      {t.team_name}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-center">{t.matches_played}</TableCell>
                                  <TableCell className="text-center text-green-600">{t.matches_won}</TableCell>
                                  <TableCell className="text-center">{t.matches_drawn}</TableCell>
                                  <TableCell className="text-center text-red-600">{t.matches_lost}</TableCell>
                                  <TableCell className="text-center">{t.total_kills}</TableCell>
                                  <TableCell className="text-center font-bold">{t.points}</TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {seasonMatches.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Jogos da Temporada</h3>
                    <div className="max-h-96 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Rodada</TableHead>
                            <TableHead>Equipa 1</TableHead>
                            <TableHead className="text-center">Resultado</TableHead>
                            <TableHead>Equipa 2</TableHead>
                            <TableHead>Estado</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {seasonMatches.map((m) => (
                            <TableRow key={m.id}>
                              <TableCell>R{m.round_number}</TableCell>
                              <TableCell>{m.team1_name || 'TBD'}</TableCell>
                              <TableCell className="text-center font-mono">
                                {m.status === 'completed' ? (
                                  <span>{m.team1_score} - {m.team2_score}</span>
                                ) : (
                                  <span className="text-muted-foreground">vs</span>
                                )}
                              </TableCell>
                              <TableCell>{m.team2_name || 'TBD'}</TableCell>
                              <TableCell>
                                <Badge variant={m.status === 'completed' ? 'default' : 'secondary'}>
                                  {m.status === 'completed' ? 'Concluido' : 'Pendente'}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </TabsContent>

          <TabsContent value="anticheat" className="space-y-6 mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" /> Submeter Evidencia
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>ID do Utilizador Alvo</Label>
                    <Input
                      placeholder="ID do utilizador"
                      value={evidenceForm.target_user_id}
                      onChange={(e) => setEvidenceForm({ ...evidenceForm, target_user_id: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo de Evidencia</Label>
                    <Select
                      value={evidenceForm.evidence_type}
                      onValueChange={(v) => setEvidenceForm({ ...evidenceForm, evidence_type: v })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(EVIDENCE_TYPE_LABELS).map(([k, label]) => (
                          <SelectItem key={k} value={k}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>URL do Ficheiro</Label>
                    <Input
                      placeholder="https://exemplo.com/evidencia.png"
                      value={evidenceForm.file_url}
                      onChange={(e) => setEvidenceForm({ ...evidenceForm, file_url: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Descricao</Label>
                    <Textarea
                      placeholder="Descreva a evidencia..."
                      value={evidenceForm.description}
                      onChange={(e) => setEvidenceForm({ ...evidenceForm, description: e.target.value })}
                    />
                  </div>
                  <Button onClick={handleSubmitEvidence} className="w-full">
                    <Upload className="h-4 w-4 mr-2" /> Submeter Evidencia
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Ban className="h-5 w-5" /> Aplicar Punicao
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>ID do Utilizador</Label>
                    <Input
                      placeholder="ID do utilizador"
                      value={punishmentForm.user_id}
                      onChange={(e) => setPunishmentForm({ ...punishmentForm, user_id: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo de Punicao</Label>
                    <Select
                      value={punishmentForm.punishment_type}
                      onValueChange={(v) => setPunishmentForm({ ...punishmentForm, punishment_type: v })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(PUNISHMENT_TYPE_LABELS).map(([k, label]) => (
                          <SelectItem key={k} value={k}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Motivo</Label>
                    <Textarea
                      placeholder="Descreva o motivo da punicao..."
                      value={punishmentForm.reason}
                      onChange={(e) => setPunishmentForm({ ...punishmentForm, reason: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Duracao (dias, opcional)</Label>
                    <Input
                      placeholder="Ex: 7"
                      type="number"
                      value={punishmentForm.duration_days}
                      onChange={(e) => setPunishmentForm({ ...punishmentForm, duration_days: e.target.value })}
                    />
                  </div>
                  <Button onClick={handleIssuePunishment} variant="destructive" className="w-full">
                    <Ban className="h-4 w-4 mr-2" /> Aplicar Punicao
                  </Button>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" /> Punicoes Ativas
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingAntiCheat ? (
                  <div className="text-center py-8 text-muted-foreground">A carregar...</div>
                ) : punishments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">Nenhuma punicao registada</div>
                ) : (
                  <div className="max-h-96 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Motivo</TableHead>
                          <TableHead>Ativa</TableHead>
                          <TableHead>Data</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {punishments.map((p) => (
                          <TableRow key={p.id}>
                            <TableCell>
                              <Badge variant={p.is_active ? 'destructive' : 'secondary'}>
                                {PUNISHMENT_TYPE_LABELS[p.punishment_type] || p.punishment_type}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">{p.reason}</TableCell>
                            <TableCell>
                              {p.is_active ? (
                                <span className="flex items-center gap-1 text-red-600"><AlertTriangle className="h-3.5 w-3.5" /> Sim</span>
                              ) : (
                                <span className="flex items-center gap-1 text-green-600"><CheckCircle className="h-3.5 w-3.5" /> Nao</span>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {new Date(p.created_at).toLocaleDateString('pt-AO')}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="patrocinadores" className="space-y-6 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" /> Adicionar Patrocinador
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome da Empresa</Label>
                    <Input
                      placeholder="Nome da empresa patrocinadora"
                      value={sponsorForm.company_name}
                      onChange={(e) => setSponsorForm({ ...sponsorForm, company_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Logo URL</Label>
                    <Input
                      placeholder="https://exemplo.com/logo.png"
                      value={sponsorForm.logo_url}
                      onChange={(e) => setSponsorForm({ ...sponsorForm, logo_url: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo de Patrocinio</Label>
                    <Select
                      value={sponsorForm.sponsorship_type}
                      onValueChange={(v) => setSponsorForm({ ...sponsorForm, sponsorship_type: v })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(SPONSOR_TYPE_LABELS).map(([k, label]) => (
                          <SelectItem key={k} value={k}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Valor</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="0"
                        type="number"
                        value={sponsorForm.value}
                        onChange={(e) => setSponsorForm({ ...sponsorForm, value: e.target.value })}
                      />
                      <Select
                        value={sponsorForm.currency}
                        onValueChange={(v) => setSponsorForm({ ...sponsorForm, currency: v })}
                      >
                        <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="AOA">AOA</SelectItem>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="BRL">BRL</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>URL do Banner</Label>
                    <Input
                      placeholder="https://exemplo.com/banner.png"
                      value={sponsorForm.banner_url}
                      onChange={(e) => setSponsorForm({ ...sponsorForm, banner_url: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>URL do Overlay</Label>
                    <Input
                      placeholder="https://exemplo.com/overlay.png"
                      value={sponsorForm.overlay_url}
                      onChange={(e) => setSponsorForm({ ...sponsorForm, overlay_url: e.target.value })}
                    />
                  </div>
                </div>
                <Button onClick={handleCreateSponsor} className="mt-4">
                  <Plus className="h-4 w-4 mr-2" /> Adicionar Patrocinador
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" /> Patrocinadores
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingSponsors ? (
                  <div className="text-center py-8 text-muted-foreground">A carregar...</div>
                ) : sponsors.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">Nenhum patrocinador registado</div>
                ) : (
                  <div className="max-h-96 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Empresa</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Acoes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sponsors.map((sp) => (
                          <TableRow key={sp.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {sp.logo_url && (
                                  <img src={sp.logo_url} alt="" className="h-8 w-8 rounded object-cover" />
                                )}
                                <span className="font-medium">{sp.company_name}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{SPONSOR_TYPE_LABELS[sp.sponsorship_type] || sp.sponsorship_type}</Badge>
                            </TableCell>
                            <TableCell>
                              {sp.value > 0 ? `${sp.value.toLocaleString()} ${sp.currency}` : '-'}
                            </TableCell>
                            <TableCell>
                              <Badge className={statusColor[sp.status] || 'bg-gray-100'}>
                                {sp.status === 'pending' ? 'Pendente' : sp.status === 'active' ? 'Ativo' : sp.status === 'completed' ? 'Concluido' : 'Cancelado'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {sp.status === 'pending' && (
                                  <>
                                    <Button size="sm" variant="outline" onClick={() => {
                                      updateSponsorStatus(sp.id, 'active').then(() => loadSponsors()).catch((e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }));
                                    }}>
                                      <CheckCircle className="h-3 w-3 mr-1" /> Ativar
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => {
                                      updateSponsorStatus(sp.id, 'cancelled').then(() => loadSponsors()).catch((e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }));
                                    }}>
                                      <Ban className="h-3 w-3 mr-1" /> Rejeitar
                                    </Button>
                                  </>
                                )}
                                {sp.status === 'active' && (
                                  <Button size="sm" variant="outline" onClick={() => {
                                    updateSponsorStatus(sp.id, 'completed').then(() => loadSponsors()).catch((e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }));
                                  }}>
                                    <CheckCircle className="h-3 w-3 mr-1" /> Concluir
                                  </Button>
                                )}
                                <Button size="sm" variant="ghost" onClick={() => {
                                  deleteSponsor(sp.id).then(() => loadSponsors()).catch((e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }));
                                }}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="overlay" className="space-y-6 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" /> Criar Overlay de Stream
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome do Overlay</Label>
                    <Input
                      placeholder="Ex: Overlay Principal"
                      value={overlayForm.name}
                      onChange={(e) => setOverlayForm({ ...overlayForm, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-4">
                    <Label>Visibilidade</Label>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Pontuacoes</span>
                        <Switch
                          checked={overlayForm.show_scores}
                          onCheckedChange={(v) => setOverlayForm({ ...overlayForm, show_scores: v })}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Equipas</span>
                        <Switch
                          checked={overlayForm.show_teams}
                          onCheckedChange={(v) => setOverlayForm({ ...overlayForm, show_teams: v })}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Patrocinadores</span>
                        <Switch
                          checked={overlayForm.show_sponsors}
                          onCheckedChange={(v) => setOverlayForm({ ...overlayForm, show_sponsors: v })}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Brackets</span>
                        <Switch
                          checked={overlayForm.show_bracket}
                          onCheckedChange={(v) => setOverlayForm({ ...overlayForm, show_bracket: v })}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">MVP</span>
                        <Switch
                          checked={overlayForm.show_mvp}
                          onCheckedChange={(v) => setOverlayForm({ ...overlayForm, show_mvp: v })}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Cor de Fundo</Label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={overlayForm.bg_color}
                        onChange={(e) => setOverlayForm({ ...overlayForm, bg_color: e.target.value })}
                        className="h-10 w-14 rounded border cursor-pointer"
                      />
                      <Input
                        value={overlayForm.bg_color}
                        onChange={(e) => setOverlayForm({ ...overlayForm, bg_color: e.target.value })}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Cor de Destaque</Label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={overlayForm.accent_color}
                        onChange={(e) => setOverlayForm({ ...overlayForm, accent_color: e.target.value })}
                        className="h-10 w-14 rounded border cursor-pointer"
                      />
                      <Input
                        value={overlayForm.accent_color}
                        onChange={(e) => setOverlayForm({ ...overlayForm, accent_color: e.target.value })}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Cor do Texto</Label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={overlayForm.text_color}
                        onChange={(e) => setOverlayForm({ ...overlayForm, text_color: e.target.value })}
                        className="h-10 w-14 rounded border cursor-pointer"
                      />
                      <Input
                        value={overlayForm.text_color}
                        onChange={(e) => setOverlayForm({ ...overlayForm, text_color: e.target.value })}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>
                <Button onClick={handleCreateOverlay}>
                  <Plus className="h-4 w-4 mr-2" /> Criar Overlay
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tv className="h-5 w-5" /> Overlays Existentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingOverlays ? (
                  <div className="text-center py-8 text-muted-foreground">A carregar...</div>
                ) : overlays.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">Nenhum overlay criado</div>
                ) : (
                  <div className="max-h-96 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Visibilidade</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Acoes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {overlays.map((ov) => (
                          <TableRow key={ov.id}>
                            <TableCell className="font-medium">{ov.name}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {ov.show_scores && <Badge variant="outline" className="text-xs">Pontos</Badge>}
                                {ov.show_teams && <Badge variant="outline" className="text-xs">Equipas</Badge>}
                                {ov.show_sponsors && <Badge variant="outline" className="text-xs">Patroc.</Badge>}
                                {ov.show_bracket && <Badge variant="outline" className="text-xs">Bracket</Badge>}
                                {ov.show_mvp && <Badge variant="outline" className="text-xs">MVP</Badge>}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={ov.is_active ? 'default' : 'secondary'}>
                                {ov.is_active ? 'Ativo' : 'Inativo'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleToggleOverlay(ov.id, !ov.is_active)}
                                >
                                  {ov.is_active ? (
                                    <><Pause className="h-3 w-3 mr-1" /> Desativar</>
                                  ) : (
                                    <><Play className="h-3 w-3 mr-1" /> Ativar</>
                                  )}
                                </Button>
                                {ov.widget_url && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleCopyWidgetUrl(ov.widget_url || '')}
                                  >
                                    <Eye className="h-3 w-3 mr-1" /> Copiar URL
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="matches" className="space-y-6 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="h-5 w-5" /> Jogos da Temporada
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="space-y-2 flex-1">
                    <Label>Selecionar Temporada</Label>
                    <Select value={matchesSeasonId} onValueChange={handleLoadMatches}>
                      <SelectTrigger><SelectValue placeholder="Escolha uma temporada" /></SelectTrigger>
                      <SelectContent>
                        {seasons.filter(s => s.status === 'active' || s.status === 'paused').map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {loadingMatches ? (
                  <div className="text-center py-8 text-muted-foreground">A carregar jogos...</div>
                ) : allSeasonMatches.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {matchesSeasonId ? 'Nenhum jogo encontrado nesta temporada' : 'Selecione uma temporada para ver os jogos'}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {Object.entries(matchesByRound)
                      .sort(([a], [b]) => Number(a) - Number(b))
                      .map(([round, matches]) => (
                        <motion.div key={round} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                          <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                            <Calendar className="h-4 w-4" /> Rodada {round}
                          </h3>
                          <div className="max-h-96 overflow-y-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>#</TableHead>
                                  <TableHead>Equipa 1</TableHead>
                                  <TableHead className="text-center">Resultado</TableHead>
                                  <TableHead>Equipa 2</TableHead>
                                  <TableHead>Estado</TableHead>
                                  <TableHead>Acoes</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {matches.map((m) => (
                                  <TableRow key={m.id}>
                                    <TableCell className="text-muted-foreground">{m.match_number}</TableCell>
                                    <TableCell className="font-medium">{m.team1_name || 'TBD'}</TableCell>
                                    <TableCell className="text-center font-mono">
                                      {m.status === 'completed' ? (
                                        <span>
                                          {m.team1_score} - {m.team2_score}
                                          {m.mvp_name && (
                                            <span className="ml-2" title={m.mvp_name}>
                                              <Award className="h-3.5 w-3.5 inline text-yellow-500" />
                                            </span>
                                          )}
                                        </span>
                                      ) : (
                                        <span className="text-muted-foreground">vs</span>
                                      )}
                                    </TableCell>
                                    <TableCell className="font-medium">{m.team2_name || 'TBD'}</TableCell>
                                    <TableCell>
                                      <Badge variant={m.status === 'completed' ? 'default' : 'secondary'}>
                                        {m.status === 'completed' ? 'Concluido' : 'Pendente'}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      {m.status !== 'completed' && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => setResultForm({
                                            ...resultForm,
                                            match_id: m.id,
                                            winner_id: m.team1_id || '',
                                          })}
                                        >
                                          <Edit className="h-3 w-3 mr-1" /> Resultado
                                        </Button>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </motion.div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {resultForm.match_id && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Edit className="h-5 w-5" /> Reportar Resultado
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Pontuacao Equipa 1</Label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={resultForm.team1_score}
                          onChange={(e) => setResultForm({ ...resultForm, team1_score: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Pontuacao Equipa 2</Label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={resultForm.team2_score}
                          onChange={(e) => setResultForm({ ...resultForm, team2_score: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Kills Equipa 1</Label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={resultForm.team1_kills}
                          onChange={(e) => setResultForm({ ...resultForm, team1_kills: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Kills Equipa 2</Label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={resultForm.team2_kills}
                          onChange={(e) => setResultForm({ ...resultForm, team2_kills: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Vencedor</Label>
                        <Select
                          value={resultForm.winner_id}
                          onValueChange={(v) => setResultForm({ ...resultForm, winner_id: v })}
                        >
                          <SelectTrigger><SelectValue placeholder="Selecionar vencedor" /></SelectTrigger>
                          <SelectContent>
                            {(() => {
                              const match = allSeasonMatches.find(m => m.id === resultForm.match_id);
                              return match ? (
                                <>
                                  <SelectItem value={match.team1_id || ''}>{match.team1_name || 'Equipa 1'}</SelectItem>
                                  <SelectItem value={match.team2_id || ''}>{match.team2_name || 'Equipa 2'}</SelectItem>
                                  <SelectItem value="draw">Empate</SelectItem>
                                </>
                              ) : null;
                            })()}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>MVP (nome)</Label>
                        <Input
                          placeholder="Nome do jogador MVP"
                          value={resultForm.mvp_name}
                          onChange={(e) => setResultForm({ ...resultForm, mvp_name: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button onClick={handleReportResult}>
                        <CheckCircle className="h-4 w-4 mr-2" /> Submeter Resultado
                      </Button>
                      <Button variant="outline" onClick={() => setResultForm({ match_id: '', team1_score: '', team2_score: '', team1_kills: '', team2_kills: '', winner_id: '', mvp_name: '' })}>
                        Cancelar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showCreateSeason} onOpenChange={setShowCreateSeason}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" /> Criar Nova Temporada
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome da Temporada *</Label>
                <Input
                  placeholder="Ex: Liga Bateu 2025"
                  value={seasonForm.name}
                  onChange={(e) => setSeasonForm({ ...seasonForm, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Jogo</Label>
                <Select
                  value={seasonForm.game_id || ''}
                  onValueChange={(v) => setSeasonForm({ ...seasonForm, game_id: v })}
                >
                  <SelectTrigger><SelectValue placeholder="Selecionar jogo" /></SelectTrigger>
                  <SelectContent>
                    {games.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {GAME_EMOJIS[g.slug] || ''} {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Descricao</Label>
                <Textarea
                  placeholder="Descreva a temporada..."
                  value={seasonForm.description}
                  onChange={(e) => setSeasonForm({ ...seasonForm, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Data de Inicio *</Label>
                <Input
                  type="date"
                  value={seasonForm.start_date}
                  onChange={(e) => setSeasonForm({ ...seasonForm, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Data de Fim *</Label>
                <Input
                  type="date"
                  value={seasonForm.end_date}
                  onChange={(e) => setSeasonForm({ ...seasonForm, end_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Pontos por Vitoria</Label>
                <Input
                  type="number"
                  value={seasonForm.points_win}
                  onChange={(e) => setSeasonForm({ ...seasonForm, points_win: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Pontos por Empate</Label>
                <Input
                  type="number"
                  value={seasonForm.points_draw}
                  onChange={(e) => setSeasonForm({ ...seasonForm, points_draw: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Pontos por Derrota</Label>
                <Input
                  type="number"
                  value={seasonForm.points_loss}
                  onChange={(e) => setSeasonForm({ ...seasonForm, points_loss: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Bonus por Kill</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={seasonForm.bonus_points_per_kill}
                  onChange={(e) => setSeasonForm({ ...seasonForm, bonus_points_per_kill: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Maximo de Equipas</Label>
                <Input
                  type="number"
                  value={seasonForm.max_teams}
                  onChange={(e) => setSeasonForm({ ...seasonForm, max_teams: parseInt(e.target.value) || 2 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Premio Total</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="0"
                    value={seasonForm.prize_pool || ''}
                    onChange={(e) => setSeasonForm({ ...seasonForm, prize_pool: parseFloat(e.target.value) || 0 })}
                  />
                  <Select
                    value={seasonForm.currency}
                    onValueChange={(v) => setSeasonForm({ ...seasonForm, currency: v })}
                  >
                    <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AOA">AOA</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="BRL">BRL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div>
              <Label>Distribuicao de Premios (%)</Label>
              <div className="grid grid-cols-3 gap-3 mt-2">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">1.o Lugar</span>
                  <Input
                    type="number"
                    value={seasonForm.prize_distribution?.[0] || 50}
                    onChange={(e) => {
                      const dist = [...(seasonForm.prize_distribution || [50, 30, 20])];
                      dist[0] = parseInt(e.target.value) || 0;
                      setSeasonForm({ ...seasonForm, prize_distribution: dist });
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">2.o Lugar</span>
                  <Input
                    type="number"
                    value={seasonForm.prize_distribution?.[1] || 30}
                    onChange={(e) => {
                      const dist = [...(seasonForm.prize_distribution || [50, 30, 20])];
                      dist[1] = parseInt(e.target.value) || 0;
                      setSeasonForm({ ...seasonForm, prize_distribution: dist });
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">3.o Lugar</span>
                  <Input
                    type="number"
                    value={seasonForm.prize_distribution?.[2] || 20}
                    onChange={(e) => {
                      const dist = [...(seasonForm.prize_distribution || [50, 30, 20])];
                      dist[2] = parseInt(e.target.value) || 0;
                      setSeasonForm({ ...seasonForm, prize_distribution: dist });
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cor Primaria</Label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={seasonForm.primary_color || '#8B5CF6'}
                    onChange={(e) => setSeasonForm({ ...seasonForm, primary_color: e.target.value })}
                    className="h-10 w-14 rounded border cursor-pointer"
                  />
                  <Input
                    value={seasonForm.primary_color || '#8B5CF6'}
                    onChange={(e) => setSeasonForm({ ...seasonForm, primary_color: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Cor Secundaria</Label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={seasonForm.secondary_color || '#EC4899'}
                    onChange={(e) => setSeasonForm({ ...seasonForm, secondary_color: e.target.value })}
                    className="h-10 w-14 rounded border cursor-pointer"
                  />
                  <Input
                    value={seasonForm.secondary_color || '#EC4899'}
                    onChange={(e) => setSeasonForm({ ...seasonForm, secondary_color: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleCreateSeason}>
                <Plus className="h-4 w-4 mr-2" /> Criar Temporada
              </Button>
              <Button variant="outline" onClick={() => setShowCreateSeason(false)}>Cancelar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showRegisterTeam} onOpenChange={setShowRegisterTeam}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" /> Registar Equipa
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>ID da Equipa</Label>
              <Input
                placeholder="ID da equipa (opcional)"
                value={teamForm.team_id}
                onChange={(e) => setTeamForm({ ...teamForm, team_id: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Nome da Equipa *</Label>
              <Input
                placeholder="Nome da equipa"
                value={teamForm.team_name}
                onChange={(e) => setTeamForm({ ...teamForm, team_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Logo URL</Label>
              <Input
                placeholder="https://exemplo.com/logo.png"
                value={teamForm.team_logo}
                onChange={(e) => setTeamForm({ ...teamForm, team_logo: e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleRegisterTeam}>
                <Plus className="h-4 w-4 mr-2" /> Registar
              </Button>
              <Button variant="outline" onClick={() => setShowRegisterTeam(false)}>Cancelar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
