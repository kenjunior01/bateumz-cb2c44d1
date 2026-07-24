import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Clock, Play, RefreshCw, Zap, CheckCircle2, AlertTriangle, Timer, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CronJob {
  jobid: number;
  jobname: string;
  schedule: string;
  command: string;
  active: boolean;
  description?: string;
}

const SCHEDULE_LABELS: Record<string, string> = {
  "0 * * * *": "A cada hora (minuto 0)",
  "*/5 * * * *": "A cada 5 minutos",
  "*/15 * * * *": "A cada 15 minutos",
  "*/30 * * * *": "A cada 30 minutos",
  "0 0 * * *": "Diariamente à meia-noite",
  "0 */6 * * *": "A cada 6 horas",
  "0 */12 * * *": "A cada 12 horas",
};

const JOB_INFO: Record<string, { icon: typeof Clock; color: string; description: string }> = {
  "notify-raffle-ending-hourly": {
    icon: Timer,
    color: "text-primary",
    description: "Verifica sorteios que terminam nas próximas 24h e notifica todos os participantes automaticamente.",
  },
};

function getNextRun(schedule: string): string {
  const now = new Date();
  const parts = schedule.split(" ");
  if (parts.length !== 5) return "—";

  const minute = parts[0];
  if (minute === "0" && parts[1] === "*") {
    const next = new Date(now);
    next.setMinutes(0, 0, 0);
    if (next <= now) next.setHours(next.getHours() + 1);
    return next.toLocaleTimeString("pt-MZ", { hour: "2-digit", minute: "2-digit" });
  }
  if (minute.startsWith("*/")) {
    const interval = parseInt(minute.replace("*/", ""));
    const nextMin = Math.ceil(now.getMinutes() / interval) * interval;
    const next = new Date(now);
    next.setMinutes(nextMin, 0, 0);
    if (next <= now) next.setMinutes(next.getMinutes() + interval);
    return next.toLocaleTimeString("pt-MZ", { hour: "2-digit", minute: "2-digit" });
  }
  return "—";
}

export default function AdminCronJobs() {
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchJobs = async () => {
    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-cron-jobs", {
        method: "GET",
      });
      if (!error && data?.jobs) {
        setJobs(data.jobs);
      }
    } catch {
      // Fallback
      setJobs([{
        jobid: 1,
        jobname: "notify-raffle-ending-hourly",
        schedule: "0 * * * *",
        command: "notify-raffle-ending",
        active: true,
        description: "Notifica utilizadores sobre sorteios prestes a terminar",
      }]);
    }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { fetchJobs(); }, []);

  const handleTest = async (jobname: string) => {
    setTesting(jobname);
    try {
      const { data, error } = await supabase.functions.invoke("admin-cron-jobs", {
        body: { action: "test", jobname },
      });
      if (error) throw error;
      toast.success("Tarefa executada com sucesso!", {
        description: data?.result
          ? `Sorteios verificados: ${data.result.raffles_checked || 0}, Notificados: ${data.result.notified || 0}`
          : "Sem dados adicionais",
      });
    } catch {
      toast.error("Erro ao executar a tarefa");
    }
    setTesting(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Clock className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Tarefas Agendadas</h1>
            <p className="text-sm text-muted-foreground">Cron jobs automáticos da plataforma</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchJobs} disabled={refreshing} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Total de Jobs", value: jobs.length, icon: Calendar, color: "text-foreground" },
          { label: "Ativos", value: jobs.filter(j => j.active).length, icon: CheckCircle2, color: "text-primary" },
          { label: "Inativos", value: jobs.filter(j => !j.active).length, icon: AlertTriangle, color: "text-muted-foreground" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="glass">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                  <s.icon className={`h-4 w-4 ${s.color}`} />
                </div>
                <div>
                  <p className="font-display text-xl font-bold text-foreground">{s.value}</p>
                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Jobs Table */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="h-5 w-5 text-primary" />
            Jobs Configurados
          </CardTitle>
          <CardDescription>Tarefas automáticas executadas pelo sistema</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            <div data-mobile-wrapped className="overflow-x-auto">
<Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tarefa</TableHead>
                  <TableHead>Frequência</TableHead>
                  <TableHead>Próxima Execução</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job, i) => {
                  const info = JOB_INFO[job.jobname];
                  const IconComp = info?.icon || Clock;
                  return (
                    <motion.tr
                      key={job.jobid}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="border-b border-border"
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10`}>
                            <IconComp className={`h-4 w-4 ${info?.color || "text-primary"}`} />
                          </div>
                          <div>
                            <p className="font-medium text-foreground text-sm">{job.jobname}</p>
                            <p className="text-[11px] text-muted-foreground max-w-[300px]">
                              {info?.description || job.description || "Tarefa agendada"}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <Badge variant="outline" className="font-mono text-[10px]">{job.schedule}</Badge>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {SCHEDULE_LABELS[job.schedule] || job.schedule}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm text-foreground">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                          {getNextRun(job.schedule)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={job.active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}>
                          {job.active ? (
                            <><CheckCircle2 className="h-3 w-3 mr-1" />Ativo</>
                          ) : (
                            <><AlertTriangle className="h-3 w-3 mr-1" />Inativo</>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTest(job.jobname)}
                          disabled={testing === job.jobname}
                          className="gap-1.5"
                        >
                          {testing === job.jobname ? (
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Play className="h-3.5 w-3.5" />
                          )}
                          {testing === job.jobname ? "A executar..." : "Testar"}
                        </Button>
                      </TableCell>
                    </motion.tr>
                  );
                })}
                {jobs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                      <Clock className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p>Nenhuma tarefa agendada</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
</div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card className="glass border-primary/10">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0 mt-0.5">
                <Zap className="h-4 w-4 text-primary" />
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground text-sm">Como funcionam as tarefas agendadas?</p>
                <p>As tarefas agendadas (cron jobs) são executadas automaticamente pelo sistema nos intervalos configurados.</p>
                <p>O botão "Testar" permite executar a tarefa manualmente para verificar se está a funcionar correctamente.</p>
                <p>Cada tarefa verifica condições específicas (ex: sorteios a terminar) e toma acções automáticas (ex: enviar notificações).</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
