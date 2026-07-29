import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Share2, ExternalLink, Gamepad2, Trophy, Users, Clock, Flame, Calendar, Star, Zap, Award, ChevronRight, MapPin, Globe, CheckCircle2, Copy, Check, ArrowRight, Heart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import Footer from "@/components/Footer";

interface CompanyInfo {
  user_id: string;
  display_name: string | null;
  company_name: string | null;
  avatar_url: string | null;
  is_verified: boolean | null;
  city: string | null;
  province: string | null;
  created_at: string | null;
  phone: string | null;
}

interface CompanyBranding {
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_color: string;
  text_color: string;
  company_logo_url: string | null;
  background_image_url: string | null;
  company_name: string | null;
  company_slogan: string | null;
}

interface GameItem {
  id: string;
  name: string;
  type: 'wheel' | 'millionaire' | 'custom';
  is_published?: boolean;
  segment_count?: number;
  created_at: string;
  is_active?: boolean;
}

interface GameSession {
  id: string;
  game_name: string;
  game_type: string;
  player_name: string;
  score: number;
  prize?: string;
  created_at: string;
  is_winner?: boolean;
}

interface LiveSession {
  code: string;
  title?: string;
  started_at: number;
  ended_at: number;
  duration_sec: number;
  players_count: number;
  games_count: number;
  winners: string[];
}

const CompanyPublicProfile = () => {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [branding, setBranding] = useState<CompanyBranding | null>(null);
  const [games, setGames] = useState<GameItem[]>([]);
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [hasJoined, setHasJoined] = useState(false);
  const [activeTab, setActiveTab] = useState("games");

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      try {
        const { data: profile } = await supabase.from("profiles").select("*").eq("id", id).single();
        if (profile) {
          setCompany({
            user_id: profile.id, display_name: profile.display_name, company_name: profile.company_name,
            avatar_url: profile.avatar_url, is_verified: profile.is_verified, city: profile.city,
            province: profile.province, created_at: profile.created_at, phone: profile.phone,
          });
        }
        const { data: brand } = await supabase.from("company_branding").select("*").eq("user_id", id).single();
        if (brand) setBranding(brand as any);
        const { data: wheels } = await supabase.from("spin_wheel_games").select("*").eq("business_user_id", id).order("created_at", { ascending: false });
        const { data: mils } = await supabase.from("millionaire_games").select("*").eq("business_user_id", id).order("created_at", { ascending: false });
        const allGames: GameItem[] = [];
        (wheels || []).forEach((w: any) => allGames.push({ id: w.id, name: w.name, type: 'wheel', is_published: w.is_published, segment_count: w.segment_count, created_at: w.created_at, is_active: w.is_active }));
        (mils || []).forEach((m: any) => allGames.push({ id: m.id, name: m.name || 'Quem Quer Ser Milionario', type: 'millionaire', is_published: m.is_active, created_at: m.created_at, is_active: m.is_active }));
        setGames(allGames);
        const { data: lives } = await supabase.from("scheduled_lives").select("*").eq("business_user_id", id).neq("status", "draft").order("scheduled_at", { ascending: false }).limit(20);
        if (lives) {
          const mapped: LiveSession[] = lives.map((l: any) => ({
            code: l.live_code || l.slug || l.id, title: l.title, started_at: new Date(l.scheduled_at).getTime(),
            ended_at: l.ends_at ? new Date(l.ends_at).getTime() : Date.now(), duration_sec: l.ends_at ? Math.round((new Date(l.ends_at).getTime() - new Date(l.scheduled_at).getTime()) / 1000) : 0,
            players_count: 0, games_count: 0, winners: [],
          }));
          setSessions(mapped);
        }
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    load();
  }, [id]);

  const joinGame = useCallback(() => {
    if (!playerName.trim()) return;
    setHasJoined(true);
    try {
      const key = `companyPlayer:${id}`;
      const existing = JSON.parse(localStorage.getItem(key) || "[]");
      if (!existing.includes(playerName.trim())) {
        existing.push(playerName.trim());
        localStorage.setItem(key, JSON.stringify(existing));
      }
      toast({ title: `Bem-vindo, ${playerName.trim()}!`, description: "Agora podes participar nos jogos desta empresa." });
    } catch {}
  }, [playerName, id, toast]);

  useEffect(() => {
    if (!id) return;
    try {
      const key = `companyPlayer:${id}`;
      const existing = JSON.parse(localStorage.getItem(key) || "[]");
      if (existing.length > 0) { setPlayerName(existing[0]); setHasJoined(true); }
    } catch {}
  }, [id]);

  const copyProfileLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const primary = branding?.primary_color || '#fbbf24';
  const secondary = branding?.secondary_color || '#3b82f6';
  const accent = branding?.accent_color || '#8b5cf6';
  const bg = branding?.background_color || undefined;
  const companyName = company?.company_name || company?.display_name || 'Empresa';
  const totalGames = games.length;
  const publishedGames = games.filter(g => g.is_published || g.is_active).length;
  const totalLives = sessions.length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={bg ? { backgroundColor: bg } : {}}>
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
          <Gamepad2 className="h-10 w-10" style={{ color: primary }} />
        </motion.div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Gamepad2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
          <h2 className="text-xl font-bold">Empresa nao encontrada</h2>
          <p className="text-sm text-muted-foreground mt-2">O perfil desta empresa nao existe ou foi removido.</p>
          <Link to="/empresas" className="inline-flex items-center gap-2 mt-4 text-sm font-bold" style={{ color: primary }}>
            <ArrowRight className="h-4 w-4" /> Ver todas as empresas
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={bg ? { backgroundColor: bg } : {}}>
      {branding?.background_image_url && (
        <div className="fixed inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${branding.background_image_url})` }} />
      )}

      <div className="relative">
        <div className="h-48 md:h-64 relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${primary}30, ${secondary}30, ${accent}20)` }}>
          <div className="absolute inset-0" style={{ background: `radial-gradient(circle at 30% 50%, ${primary}20, transparent 50%), radial-gradient(circle at 70% 50%, ${accent}15, transparent 50%)` }} />
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
        </div>

        <div className="container mx-auto px-4 -mt-16 relative z-10">
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 25 }}>
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
              <div className="relative group">
                <div className="h-28 w-28 md:h-36 md:w-36 rounded-3xl border-4 overflow-hidden shadow-2xl" style={{ borderColor: primary, backgroundColor: 'rgba(0,0,0,0.2)' }}>
                  {(branding?.company_logo_url || company.avatar_url) ? (
                    <img src={branding?.company_logo_url || company.avatar_url || ''} alt={companyName} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <span className="text-4xl font-black" style={{ color: primary }}>{companyName.charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                </div>
                {company.is_verified && (
                  <div className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-background flex items-center justify-center shadow-lg">
                    <CheckCircle2 className="h-5 w-5" style={{ color: primary }} />
                  </div>
                )}
              </div>
              <div className="flex-1 pb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl md:text-4xl font-black font-display">{companyName}</h1>
                  {company.is_verified && <CheckCircle2 className="h-5 w-5" style={{ color: primary }} />}
                </div>
                {branding?.company_slogan && <p className="text-sm mt-1 opacity-70">{branding.company_slogan}</p>}
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                  {(company.city || company.province) && (
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{[company.city, company.province].filter(Boolean).join(', ')}</span>
                  )}
                  {company.created_at && (
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Membro desde {new Date(company.created_at).toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })}</span>
                  )}
                </div>
              </div>
              <div className="flex gap-2 pb-2">
                <Button variant="outline" size="sm" onClick={copyProfileLink} className="gap-1.5">
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
                  {copied ? 'Copiado!' : 'Partilhar'}
                </Button>
              </div>
            </div>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
            {[
              { icon: Gamepad2, label: 'Jogos Configurados', value: totalGames, sub: `${publishedGames} publicados`, color: primary },
              { icon: Radio, label: 'Lives Realizadas', value: totalLives, color: secondary },
              { icon: Users, label: 'Seguidores', value: '-', color: accent },
              { icon: Zap, label: 'Estado', value: 'Ativo', color: '#10b981' },
            ].map((s, i) => (
              <motion.div key={i} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 + i * 0.05 }}>
                <Card className="border-border/50">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="p-2 rounded-xl" style={{ backgroundColor: `${s.color}15` }}>
                      <s.icon className="h-4 w-4" style={{ color: s.color }} />
                    </div>
                    <div>
                      <p className="text-lg font-black">{s.value}</p>
                      <p className="text-[10px] text-muted-foreground">{s.label}{s.sub ? ` (${s.sub})` : ''}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {!hasJoined && (
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="mt-6">
              <Card className="border-2 overflow-hidden" style={{ borderColor: `${primary}40`, background: `linear-gradient(135deg, ${primary}08, ${accent}05)` }}>
                <CardContent className="p-6">
                  <div className="text-center mb-4">
                    <div className="inline-flex p-3 rounded-2xl mb-3" style={{ backgroundColor: `${primary}15` }}>
                      <Gamepad2 className="h-8 w-8" style={{ color: primary }} />
                    </div>
                    <h3 className="text-xl font-black">Junta-te aos jogos!</h3>
                    <p className="text-sm text-muted-foreground mt-1">Coloca o teu nome para participar nos jogos e ver o teu historico</p>
                  </div>
                  <div className="flex gap-2 max-w-md mx-auto">
                    <Input placeholder="O teu nome..." value={playerName} onChange={e => setPlayerName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && joinGame()} className="flex-1" />
                    <Button onClick={joinGame} disabled={!playerName.trim()} style={{ backgroundColor: primary, color: '#000' }} className="font-bold">
                      Entrar <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {hasJoined && (
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mt-6">
              <Card style={{ background: `linear-gradient(135deg, ${primary}08, transparent)` }} className="border-border/50">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full flex items-center justify-center font-black text-lg" style={{ backgroundColor: primary, color: '#000' }}>
                    {playerName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold">Ola, {playerName}!</p>
                    <p className="text-xs text-muted-foreground">Pronto para jogar. O teu nome sera usado em todos os jogos.</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => { setHasJoined(false); setPlayerName(''); }}>Trocar</Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          <div className="mt-8 pb-12">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full">
                <TabsTrigger value="games" className="flex-1 gap-1.5"><Gamepad2 className="h-3.5 w-3.5" /> Jogos</TabsTrigger>
                <TabsTrigger value="lives" className="flex-1 gap-1.5"><Radio className="h-3.5 w-3.5" /> Lives</TabsTrigger>
                <TabsTrigger value="about" className="flex-1 gap-1.5"><Globe className="h-3.5 w-3.5" /> Sobre</TabsTrigger>
              </TabsList>

              <TabsContent value="games" className="mt-4">
                {games.length > 0 ? (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {games.map((game, i) => (
                      <motion.div key={game.id} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.05 }}>
                        <Card className="border-border/50 hover:border-primary/30 transition-all group cursor-pointer">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                <div className="h-12 w-12 rounded-2xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${primary}30, ${accent}20)` }}>
                                  {game.type === 'wheel' ? <span className="text-2xl">🎰</span> : <span className="text-2xl">💰</span>}
                                </div>
                                <div>
                                  <p className="font-bold text-sm group-hover:text-primary transition-colors">{game.name}</p>
                                  <p className="text-[10px] text-muted-foreground">{game.type === 'wheel' ? 'Roda de Premios' : 'Quem Quer Ser Milionario'}</p>
                                </div>
                              </div>
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${game.is_published || game.is_active ? 'bg-emerald-500/15 text-emerald-600' : 'bg-muted text-muted-foreground'}`}>
                                {game.is_published || game.is_active ? 'Ativo' : 'Rascunho'}
                              </span>
                            </div>
                            <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground">
                              <span>{game.segment_count ? `${game.segment_count} segmentos` : 'Configurado'}</span>
                              <span>{new Date(game.created_at).toLocaleDateString('pt-PT')}</span>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Gamepad2 className="h-12 w-12 mx-auto mb-3 text-muted-foreground/20" />
                    <p className="text-sm text-muted-foreground">Nenhum jogo configurado ainda</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="lives" className="mt-4">
                {sessions.length > 0 ? (
                  <div className="space-y-3">
                    {sessions.map((s, i) => (
                      <motion.div key={`${s.code}-${i}`} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.03 }}>
                        <Card className="border-border/50 hover:border-primary/20 transition-colors">
                          <CardContent className="p-4 flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl flex flex-col items-center justify-center" style={{ backgroundColor: `${primary}15` }}>
                              <Radio className="h-4 w-4" style={{ color: primary }} />
                              <span className="text-[8px] font-bold mt-0.5">LIVE</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-sm truncate">{s.title || `Live ${s.code}`}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(s.started_at).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                              {s.duration_sec > 0 && <p className="text-[10px] text-muted-foreground">Duracao: {Math.round(s.duration_sec / 60)} min</p>}
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Radio className="h-12 w-12 mx-auto mb-3 text-muted-foreground/20" />
                    <p className="text-sm text-muted-foreground">Nenhuma live realizada ainda</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="about" className="mt-4">
                <Card className="border-border/50">
                  <CardContent className="p-6 space-y-4">
                    <h3 className="font-bold text-lg">Sobre {companyName}</h3>
                    <div className="grid sm:grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2"><Globe className="h-4 w-4 text-muted-foreground" /><span>{company.display_name || company.company_name}</span></div>
                      {(company.city || company.province) && <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" /><span>{[company.city, company.province].filter(Boolean).join(', ')}</span></div>}
                      {company.created_at && <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground" /><span>Membro desde {new Date(company.created_at).toLocaleDateString('pt-PT')}</span></div>}
                    </div>
                    <div className="pt-4 border-t border-border">
                      <h4 className="font-bold text-sm mb-3">Identidade Visual</h4>
                      {branding ? (
                        <div className="grid grid-cols-5 gap-2">
                          {[['Cor Principal', branding.primary_color], ['Cor Secundaria', branding.secondary_color], ['Cor de Acento', branding.accent_color], ['Cor de Fundo', branding.background_color], ['Cor do Texto', branding.text_color]].map(([label, color]) => (
                            <div key={label as string} className="text-center">
                              <div className="h-10 rounded-xl border border-border mb-1" style={{ backgroundColor: color }} />
                              <p className="text-[9px] text-muted-foreground">{label as string}</p>
                            </div>
                          ))}
                        </div>
                      ) : <p className="text-xs text-muted-foreground">Sem identidade visual configurada</p>}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

function Radio(props: any) { return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M19.1 4.9C23 8.8 23 15.1 19.1 19"/></svg>; }

export default CompanyPublicProfile;
