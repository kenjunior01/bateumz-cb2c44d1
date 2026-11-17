#!/usr/bin/env python3
# v62 — BATEU RPG liga ao i18n da plataforma (roadmap item 3): todas as
# strings visíveis do componente passam por t("rpg.*") / helpers puros do
# nomes.ts. Cada substituição é VERIFICADA (deve ocorrer exatamente N vezes).
# PT canónico preservado: os valores PT das chaves são o MESMO texto que
# estava no componente — o jogo em PT fica byte-a-byte igual na tela.
import sys

CAMINHO = "src/components/livegames/BateuRPG.tsx"

src = open(CAMINHO, encoding="utf-8").read()

# (old, new, contagem esperada)
R = []

# ── 1. imports ────────────────────────────────────────────────
R.append((
 'import { procurarCidade, getClimaAtual, wmoDescricaoPt, wmoParaMeteo, wmoEhNeve, OPENMETEO_ATTRIBUTION, type CidadeEncontrada, type ClimaAtual } from "@/lib/openMeteo";',
 'import { procurarCidade, getClimaAtual, wmoDescricaoPt, wmoDescricaoEn, wmoParaMeteo, wmoEhNeve, OPENMETEO_ATTRIBUTION, type CidadeEncontrada, type ClimaAtual } from "@/lib/openMeteo";\nimport { useLanguage } from "@/contexts/LanguageContext";\nimport { linguaValida, nomeDificuldade, descDificuldade, nomeRegiao, descRegiao, nomePoi, descPoi, tituloMissaoPorId, textoObjetivoPorId, textoObjetivoPorTexto, tituloDiaria, nomeRamo, efeitosRamo, causaMorte, nomeItem, nomePorTexto, rotuloMapa } from "@/game/rpg/nomes";',
 1))

# ── 2. estado da língua + efeito de sincronização ─────────────
R.append((
 '  const [fase, setFase] = useState<"inicio" | "jogando" | "morto">("inicio");',
 '  const { lang, t } = useLanguage();\n  const lingua = linguaValida(lang);\n  const [fase, setFase] = useState<"inicio" | "jogando" | "morto">("inicio");',
 1))
R.append((
 '  const capturarRato = useCallback(() => {',
 '  // v62 — a língua da plataforma manda no texto do mundo (PT canónico no\n  // motor): sincroniza o sistema e refresca a captura (diárias regeneram\n  // os textos com a língua corrente).\n  useEffect(() => {\n    sistemaRef.current.lingua = lingua;\n    setRpg(sistemaRef.current.captura());\n  }, [lingua]);\n\n  const capturarRato = useCallback(() => {',
 1))

# ── 3. canvas do mapa ─────────────────────────────────────────
R.append(('    ctx.fillText("Terras Selvagens", px(-98), pz(-6));', '    ctx.fillText(RL.selvagens, px(-98), pz(-6));', 1))
R.append(('    ctx.fillText("Terras Selvagens", px(96), pz(-84));', '    ctx.fillText(RL.selvagens, px(96), pz(-84));', 1))
R.append(('      ctx.fillText(descoberta ? r.nome : "???", px(r.cx), pz(r.cz) - 4);', '      ctx.fillText(descoberta ? nomeRegiao(r, lingua) : "???", px(r.cx), pz(r.cz) - 4);', 1))
R.append(('      ctx.fillText(`Nv ${r.nivel}`, px(r.cx), pz(r.cz) + 12);', '      ctx.fillText(RL.nv(r.nivel), px(r.cx), pz(r.cz) + 12);', 1))
R.append(('        ctx.fillText(p.nome, px(p.x), pz(p.z) - 9);', '        ctx.fillText(nomePoi(p, lingua), px(p.x), pz(p.z) - 9);', 1))
R.append(('    ctx.fillText("N", T - 20, 22);\n  }, []);', '    ctx.fillText(RL.norte, T - 20, 22);\n  }, [lingua]);', 1))
R.append(('  const desenharMapa = useCallback(() => {\n    const cv = mapaCanvasRef.current;',
 '  const desenharMapa = useCallback(() => {\n    const RL = rotuloMapa(lingua);\n    const cv = mapaCanvasRef.current;', 1))

# ── 4. MENU ───────────────────────────────────────────────────
R.append(('data-testid="rpg-titulo">BATEU RPG: LENDAS</h1>', 'data-testid="rpg-titulo">{t("rpg.titulo")}</h1>', 1))
R.append(('<p className="text-white/60 text-sm mt-1">Explora 6 regiões, derrota as criaturas da noite e escreve a tua lenda.</p>',
          '<p className="text-white/60 text-sm mt-1">{t("rpg.menu.subtitulo")}</p>', 1))
R.append(('<p className="text-white/35 text-[11px] mt-1">Mundo voxel único (semente fixa) · progresso guardado neste aparelho</p>',
          '<p className="text-white/35 text-[11px] mt-1">{t("rpg.menu.semente")}</p>', 1))
R.append((' /> DIFICULDADE (afeta inimigos e recompensas)</p>', ' /> {t("rpg.dificuldade.titulo")}</p>', 1))
R.append(('<p className={`text-[11px] font-black ${ativo ? "text-amber-300" : "text-white/70"}`}>{regras.nome}</p>',
          '<p className={`text-[11px] font-black ${ativo ? "text-amber-300" : "text-white/70"}`}>{nomeDificuldade(d, lingua)}</p>', 1))
R.append(('<p className="text-[9px] text-white/50 leading-tight mt-0.5">Inimigos ×{regras.multHpMob} · XP ×{regras.multXP}</p>',
          '<p className="text-[9px] text-white/50 leading-tight mt-0.5">{t("rpg.dificuldade.regras", { hp: String(regras.multHpMob), xp: String(regras.multXP) })}</p>', 1))
R.append(('<p className="text-white/45 text-[10px] mt-2" data-testid="rpg-dif-desc">{DIFICULDADES_RPG[difMenu].desc}</p>',
          '<p className="text-white/45 text-[10px] mt-2" data-testid="rpg-dif-desc">{descDificuldade(difMenu, lingua)}</p>', 1))
R.append(('<Play size={18} /> NOVA LENDA', '<Play size={18} /> {t("rpg.jogar")}', 1))
R.append(('<ChevronUp size={17} className="rotate-90" /> CONTINUAR A LENDA', '<ChevronUp size={17} className="rotate-90" /> {t("rpg.continuar")}', 1))
R.append(('<HelpCircle size={14} /> COMO JOGAR', '<HelpCircle size={14} /> {t("rpg.comoJogar")}', 1))
R.append(('className="flex-1 py-2 rounded-xl font-black text-white bg-rose-700 hover:bg-rose-600 transition text-[11px]">APAGAR E RECOMEÇAR</button>',
          'className="flex-1 py-2 rounded-xl font-black text-white bg-rose-700 hover:bg-rose-600 transition text-[11px]">{t("rpg.recomecarApagar")}</button>', 1))
R.append(('className="flex-1 py-2 rounded-xl font-bold text-white/70 bg-white/10 hover:bg-white/15 transition text-[11px]">manter o save</button>',
          'className="flex-1 py-2 rounded-xl font-bold text-white/70 bg-white/10 hover:bg-white/15 transition text-[11px]">{t("rpg.recomecarManter")}</button>', 1))
R.append(('className="text-white/35 underline text-[11px]">recomeçar do zero (apaga o save)</button>',
          'className="text-white/35 underline text-[11px]">{t("rpg.recomecar")}</button>', 1))
R.append((' /> CLIMA REAL (opcional)</p>', ' /> {t("rpg.clima.titulo")}</p>', 1))
R.append(('placeholder="A tua cidade (ex.: Maputo)"', 'placeholder={t("rpg.clima.cidadePlaceholder")}', 1))
R.append(('{buscando ? "…" : "aplicar"}', '{buscando ? "…" : t("rpg.clima.aplicar")}', 1))
R.append(('data-testid="rpg-clima-desativar">desativar</button>', 'data-testid="rpg-clima-desativar">{t("rpg.clima.desativar")}</button>', 1))
R.append(('{climaReal.clima\n                        ? `${wmoDescricaoPt(climaReal.clima.codigoWmo)}${climaReal.clima.temperatura !== null ? ` · ${climaReal.clima.temperatura}°C` : ""}${wmoEhNeve(climaReal.clima.codigoWmo) ? " · neve" : ""}`\n                        : "a obter o clima…"}',
          '{climaReal.clima\n                        ? `${(lingua === "en" ? wmoDescricaoEn : wmoDescricaoPt)(climaReal.clima.codigoWmo)}${climaReal.clima.temperatura !== null ? ` · ${climaReal.clima.temperatura}\u00b0C` : ""}${wmoEhNeve(climaReal.clima.codigoWmo) ? ` · ${t("rpg.clima.neve")}` : ""}`\n                        : t("rpg.clima.aObter")}', 1))
R.append(('{somMudo ? "SOM: DESLIGADO" : "SOM: LIGADO"}', '{somMudo ? t("rpg.som.off") : t("rpg.som.on")}', 2))
R.append(('{camaraModo === "primeira" ? "1ª PESSOA" : camaraModo === "terceira" ? "3ª PESSOA" : "OMBRO"}',
          '{camaraModo === "primeira" ? t("rpg.camara.primeira") : camaraModo === "terceira" ? t("rpg.camara.terceira") : t("rpg.camara.ombro")}', 1))
R.append(('<button onClick={sair} className="text-white/60 underline text-sm">Voltar à plataforma</button>',
          '<button onClick={sair} className="text-white/60 underline text-sm">{t("rpg.voltarPlataforma")}</button>', 1))
R.append(('<p className="text-white/35 text-[11px] text-center max-w-xs">Joga sem registo · o progresso (XP, missões, descobertas) fica neste aparelho — sobrevive a limpezas do localStorage via IndexedDB</p>',
          '<p className="text-white/35 text-[11px] text-center max-w-xs">{t("rpg.menu.semRegisto")}</p>', 1))
R.append(('<Camera size={14} /> CÂMARA', '<Camera size={14} /> {t("rpg.camara.titulo")}', 1))
R.append(('                ? `Armazenamento: ${mbLegivel(espacoEst.uso)} MB usados de ${mbLegivel(espacoEst.quota)} MB`\n                : "Armazenamento: quota não revelada pelo navegador"}',
          '                ? t("rpg.armazenamento.uso", { uso: mbLegivel(espacoEst.uso), quota: mbLegivel(espacoEst.quota) })\n                : t("rpg.armazenamento.semQuota")}', 1))
R.append(('v42 · clima real por Open-Meteo.com · arquitetura aberta estudada de Veloren (GPLv3 — só a forma, código próprio) · motor voxel partilhado com a CIDADE BATEU\n            </p>',
          '{t("rpg.menu.atribuicao")}\n            </p>', 1))
R.append(('<p className="text-white font-bold">A forjar a lenda…</p>', '<p className="text-white font-bold">{t("rpg.carregar")}</p>', 1))

# ── 5. HUD ────────────────────────────────────────────────────
R.append(('title="Minimapa — clique para o mapa do mundo (M)"', 'title={t("rpg.minimapa.titulo")}', 1))
R.append(('<p className="text-white text-[11px] font-bold leading-none">{rpg.regiao.nome}</p>',
          '<p className="text-white text-[11px] font-bold leading-none">{nomeRegiao(rpg.regiao, lingua)}</p>', 1))
R.append(('<p className="text-white/50 text-[9px] mt-0.5">nível recomendado {rpg.regiao.nivel}</p>',
          '<p className="text-white/50 text-[9px] mt-0.5">{t("rpg.nivel.recomendado", { n: String(rpg.regiao.nivel) })}</p>', 1))
R.append(('<span className="text-white text-[11px] font-bold">Dia {cap.dia} · {relogio(cap.horaFrac)}</span>',
          '<span className="text-white text-[11px] font-bold">{t("rpg.dia", { d: String(cap.dia), h: relogio(cap.horaFrac) })}</span>', 1))
R.append(('<span className="text-white text-[11px] font-bold">{rpg.creditos} créditos</span>',
          '<span className="text-white text-[11px] font-bold">{t("rpg.creditos.hud", { n: String(rpg.creditos) })}</span>', 1))
R.append(('<span className="text-white/80 text-[9px] max-w-[110px] truncate">{rpg.objetivo.texto}</span>',
          '<span className="text-white/80 text-[9px] max-w-[110px] truncate">{textoObjetivoPorTexto(rpg.objetivo.texto, lingua)}</span>', 1))
R.append(('<p className="text-fuchsia-300 text-[9px] font-black tracking-wider">CAPÍTULO {rpg.capitulo.id.replace("h", "")}</p>',
          '<p className="text-fuchsia-300 text-[9px] font-black tracking-wider">{t("rpg.capitulo.hud", { n: rpg.capitulo.id.replace("h", "") })}</p>', 1))
R.append(('              <p className="text-white text-xs font-bold">{rpg.capitulo.titulo}</p>',
          '              <p className="text-white text-xs font-bold">{tituloMissaoPorId(rpg.capitulo.id, lingua)}</p>', 1))
R.append(('                  {o.prog >= o.qtd ? "✓" : "○"} {o.texto} ({o.prog}/{o.qtd})',
          '                  {o.prog >= o.qtd ? "✓" : "○"} {textoObjetivoPorId(rpg.capitulo.id, i, lingua)} ({o.prog}/{o.qtd})', 1))
R.append(('<p className="text-center text-rose-300 text-xs font-black tracking-widest">GUARDIÃO DAS RUÍNAS</p>',
          '<p className="text-center text-rose-300 text-xs font-black tracking-widest">{t("rpg.boss.barra")}</p>', 1))
R.append(('{rpg.itensChao.total} item{rpg.itensChao.total > 1 ? "s" : ""} no chão\n                {rpg.itensChao.expiradosTTL + rpg.itensChao.expiradosCap > 0 ? ` · ${rpg.itensChao.expiradosTTL + rpg.itensChao.expiradosCap} saíram` : ""}',
          '{t("rpg.chao.itens", { n: String(rpg.itensChao.total), s: rpg.itensChao.total > 1 ? "s" : "" })}\n                {rpg.itensChao.expiradosTTL + rpg.itensChao.expiradosCap > 0 ? t("rpg.chao.sairam", { n: String(rpg.itensChao.expiradosTTL + rpg.itensChao.expiradosCap) }) : ""}', 1))

# ── 6. botões do HUD e móveis ────────────────────────────────
R.append(('<BookOpen size={13} /> MISSÕES</button>', '<BookOpen size={13} /> {t("rpg.btn.missoes")}</button>', 1))
R.append(('<MapIcon size={13} /> DIÁRIO</button>', '<MapIcon size={13} /> {t("rpg.btn.diario")}</button>', 1))
R.append(('<Compass size={13} /> MAPA</button>', '<Compass size={13} /> {t("rpg.btn.mapa")}</button>', 1))
R.append(('<Sparkles size={13} /> HAB.</button>', '<Sparkles size={13} /> {t("rpg.btn.habilidades")}</button>', 1))
R.append(('<Backpack size={13} /> MOCHILA</button>', '<Backpack size={13} /> {t("rpg.btn.mochila")}</button>', 1))
R.append(('<Hammer size={13} /> FORJA</button>', '<Hammer size={13} /> {t("rpg.btn.forja")}</button>', 1))
R.append(('justify-center">ATACAR</button>', 'justify-center">{t("rpg.btn.atacar")}</button>', 1))
R.append(('text-[10px]">SALTAR</button>', 'text-[10px]">{t("rpg.btn.saltar")}</button>', 1))
R.append(('text-[10px]">COMER</button>', 'text-[10px]">{t("rpg.btn.comer")}</button>', 1))
R.append(('<p className="text-white/90 text-xs font-bold">{cap.mirando.nome}</p>',
          '<p className="text-white/90 text-xs font-bold">{nomeItem(cap.mirando.id, lingua)}</p>', 1))

# ── 7. MODAIS (títulos) ──────────────────────────────────────
R.append(('{modal === "diario" && <><MapIcon size={18} className="text-emerald-400" /> DIÁRIO DE EXPLORAÇÃO</>}',
          '{modal === "diario" && <><MapIcon size={18} className="text-emerald-400" /> {t("rpg.modal.diario")}</>}', 1))
R.append(('{modal === "habilidades" && <><Sparkles size={18} className="text-violet-400" /> HABILIDADES</>}',
          '{modal === "habilidades" && <><Sparkles size={18} className="text-violet-400" /> {t("rpg.modal.habilidades")}</>}', 1))
R.append(('{modal === "mapa" && <><MapIcon size={18} className="text-amber-300" /> MAPA DO MUNDO</>}',
          '{modal === "mapa" && <><MapIcon size={18} className="text-amber-300" /> {t("rpg.modal.mapa")}</>}', 1))
R.append(('{modal === "pausa" && <><Pause size={18} className="text-white" /> PAUSA</>}',
          '{modal === "pausa" && <><Pause size={18} className="text-white" /> {t("rpg.modal.pausa")}</>}', 1))

# ── 8. MISSÕES (modal) ───────────────────────────────────────
R.append(('<p className="text-fuchsia-300 text-[9px] font-black tracking-wider">HISTÓRIA · CAPÍTULO {rpg.capitulo.id.replace("h", "")} DE {HISTORIA_TOTAL}</p>',
          '<p className="text-fuchsia-300 text-[9px] font-black tracking-wider">{t("rpg.missoes.historia", { n: rpg.capitulo.id.replace("h", ""), total: String(HISTORIA_TOTAL) })}</p>', 1))
R.append(('<p className="text-white font-black">{rpg.capitulo.titulo}</p>',
          '<p className="text-white font-black">{tituloMissaoPorId(rpg.capitulo.id, lingua)}</p>', 1))
R.append(('<span className={o.prog >= o.qtd ? "text-emerald-300 line-through" : "text-white/80"}>{o.texto}</span>',
          '<span className={o.prog >= o.qtd ? "text-emerald-300 line-through" : "text-white/80"}>{textoObjetivoPorId(rpg.capitulo.id, i, lingua)}</span>', 1))
R.append(('<p className="text-white/45 text-[10px] mt-2">Recompensa: +{HISTORIA_RECOMPENSAS[rpg.capitulo.id]?.xp ?? "—"} XP · +{HISTORIA_RECOMPENSAS[rpg.capitulo.id]?.creditos ?? "—"} créditos</p>',
          '<p className="text-white/45 text-[10px] mt-2">{t("rpg.missoes.recompensa", { xp: String(HISTORIA_RECOMPENSAS[rpg.capitulo.id]?.xp ?? "—"), cred: String(HISTORIA_RECOMPENSAS[rpg.capitulo.id]?.creditos ?? "—") })}</p>', 1))
R.append(('<p className="text-amber-300 font-black text-sm">A lenda está escrita.</p>',
          '<p className="text-amber-300 font-black text-sm">{t("rpg.missoes.feita.titulo")}</p>', 1))
R.append(('<p className="text-white/60 text-[11px] mt-0.5">Os 6 capítulos da história estão concluídos. As Terras Selvagens continuam tuas — caça, explora, vive.</p>',
          '<p className="text-white/60 text-[11px] mt-0.5">{t("rpg.missoes.feita.corpo")}</p>', 1))
R.append(('<p className="text-white/70 text-[11px] font-bold flex items-center gap-1"><Sun size={12} /> DIÁRIAS DE HOJE (renovam à meia-noite)</p>',
          '<p className="text-white/70 text-[11px] font-bold flex items-center gap-1"><Sun size={12} /> {t("rpg.missoes.diariasHoje")}</p>', 1))
R.append(('<p className={`text-xs font-bold ${d.feita ? "text-emerald-300 line-through" : "text-white"}`}>{d.titulo}</p>',
          '<p className={`text-xs font-bold ${d.feita ? "text-emerald-300 line-through" : "text-white"}`}>{tituloDiaria(d.titulo, lingua)}</p>', 1))
R.append(('<p className="text-white/40 text-[9px] mt-0.5">+{d.xp} XP · +{d.creditos} créditos</p>',
          '<p className="text-white/40 text-[9px] mt-0.5">+{d.xp} XP · +{d.creditos} {t("rpg.creditos.hud", { n: "" }).trim()}</p>', 1))

# ── 9. DIÁRIO (modal) ────────────────────────────────────────
R.append(('<p className="text-white/70 text-[11px]">Regiões: <b className="text-white" data-testid="rpg-regioes-cont">{rpg.descobertas.regioes}/{rpg.totalRegioes}</b> · Locais: <b className="text-white">{rpg.descobertas.pois}/{rpg.totalPois}</b> · Baús: <b className="text-white">{rpg.descobertas.baus}/{rpg.totalBaus}</b></p>',
          '<p className="text-white/70 text-[11px]">{t("rpg.diario.regioes")} <b className="text-white" data-testid="rpg-regioes-cont">{rpg.descobertas.regioes}/{rpg.totalRegioes}</b> {t("rpg.diario.locais")} <b className="text-white">{rpg.descobertas.pois}/{rpg.totalPois}</b> {t("rpg.diario.baus")} <b className="text-white">{rpg.descobertas.baus}/{rpg.totalBaus}</b></p>', 1))
R.append(('<p className={`text-xs font-black ${descoberta ? "text-white" : "text-white/35"}`}>{descoberta ? r.nome : "???"}</p>',
          '<p className={`text-xs font-black ${descoberta ? "text-white" : "text-white/35"}`}>{descoberta ? nomeRegiao(r, lingua) : "???"}</p>', 1))
R.append(('{descoberta && <p className="text-white/55 text-[10px] mt-0.5">{r.desc}</p>}',
          '{descoberta && <p className="text-white/55 text-[10px] mt-0.5">{descRegiao(r, lingua)}</p>}', 1))
R.append(('<p className="text-white/70 text-[11px] font-bold mt-1">LOCAIS</p>',
          '<p className="text-white/70 text-[11px] font-bold mt-1">{t("rpg.diario.locaisTitulo")}</p>', 1))
R.append(('<p className={`text-[11px] font-bold ${descoberto ? "text-white" : "text-white/35"}`}>{descoberto ? p.nome : "???"}</p>',
          '<p className={`text-[11px] font-bold ${descoberto ? "text-white" : "text-white/35"}`}>{descoberto ? nomePoi(p, lingua) : "???"}</p>', 1))
R.append(('{descoberto && <p className="text-white/50 text-[10px] mt-0.5">{p.desc}</p>}',
          '{descoberto && <p className="text-white/50 text-[10px] mt-0.5">{descPoi(p, lingua)}</p>}', 1))
R.append(('{[["Hostis", rpg.kills.hostil], ["Mortes", rpg.mortes], ["Blocos", rpg.blocos], ["Nível", rpg.nivel]].map(([k, v]) => (',
          '{[[t("rpg.diario.hostis"), rpg.kills.hostil], [t("rpg.diario.mortes"), rpg.mortes], [t("rpg.diario.blocos"), rpg.blocos], [t("rpg.diario.nivel"), rpg.nivel]].map(([k, v]) => (', 1))

# ── 10. HABILIDADES (modal) ──────────────────────────────────
R.append(('Pontos disponíveis: <b className="text-violet-300 font-black">{rpg.pontos}</b> · cada nível ganho dá 1 ponto (máx. {NIVEL_MAX} níveis)',
          '{t("rpg.hab.pontos", { n: String(rpg.pontos), max: String(NIVEL_MAX) })}', 1))
R.append(('<p className="text-white font-black text-sm">{NOMES_RAMO[r]} <span className="text-white/50 font-bold">· nível {nivel}/{NIVEL_MAX_RAMO_RPG}</span></p>',
          '<p className="text-white font-black text-sm">{nomeRamo(r, lingua)} <span className="text-white/50 font-bold">{t("rpg.hab.nivel", { n: String(nivel), max: String(NIVEL_MAX_RAMO_RPG) })}</span></p>', 1))
R.append(('{max ? "MÁXIMO" : "APRENDER (1 pt)"}', '{max ? t("rpg.hab.maximo") : t("rpg.hab.aprender")}', 1))
R.append(('{EFEITO_RAMO[r].map((e, i) => (', '{efeitosRamo(r, lingua).map((e, i) => (', 1))
R.append(('<p className="text-white/35 text-[10px]">Curva de XP com a forma logística estudada do skillset do Veloren (v38) — fórmula própria, zero código GPL.</p>',
          '<p className="text-white/35 text-[10px]">{t("rpg.hab.velorenNota")}</p>', 1))

# ── 11. MOCHILA (modal) ──────────────────────────────────────
R.append(('Equipado: {armEq.nome} <span className="text-emerald-300">(−{Math.round(armEq.reducao * 100)}% do dano recebido)</span>',
          '{t("rpg.mochila.equipado", { nome: nomeItem(armEq.id, lingua), pct: String(Math.round(armEq.reducao * 100)) })}', 1))
R.append(('shrink-0">DESPIN</button>', 'shrink-0">{t("rpg.mochila.despir")}</button>', 1))
R.append(('<p className="text-white/50 text-[11px]">Sem peitoral equipado — seleciona um peitoral na mochila para equipar.</p>',
          '<p className="text-white/50 text-[11px]">{t("rpg.mochila.semArmadura")}</p>', 1))
R.append(('<p className="text-white/60 text-[10px] font-bold">HOTBAR (1–9) — clique seleciona</p>',
          '<p className="text-white/60 text-[10px] font-bold">{t("rpg.mochila.hotbarTitulo")}</p>', 1))
R.append(('<p className="text-white/60 text-[10px] font-bold">MOCHILA (27) — clique move o item para a hotbar</p>',
          '<p className="text-white/60 text-[10px] font-bold">{t("rpg.mochila.mochilaTitulo")}</p>', 1))
R.append(('<p className="text-white text-[11px] font-bold">{infoItem(selSlot.id).nome} <span className="text-white/40">×{selSlot.qtd}</span></p>',
          '<p className="text-white text-[11px] font-bold">{nomeItem(selSlot.id, lingua)} <span className="text-white/40">×{selSlot.qtd}</span></p>', 1))
R.append(("{defSel?.dano ? `dano ${defSel.dano}` : defSel?.comida ? `comida +${defSel.comida}` : defSel?.armadura ? `absorve ${Math.round(defSel.armadura * 100)}% do dano` : \"material/bloco — colocar ou minerar\"}",
          '{defSel?.dano ? t("rpg.mochila.dano", { n: String(defSel.dano) }) : defSel?.comida ? t("rpg.mochila.comida", { n: String(defSel.comida) }) : defSel?.armadura ? t("rpg.mochila.armadura", { pct: String(Math.round(defSel.armadura * 100)) }) : t("rpg.mochila.material")}', 1))
R.append(('shrink-0">EQUIPAR</button>', 'shrink-0">{t("rpg.mochila.equipar")}</button>', 1))
R.append(('shrink-0">LARGAR 1</button>', 'shrink-0">{t("rpg.mochila.largar")}</button>', 1))
R.append(('<p className="text-white/40 text-[10px]">Slot selecionado vazio — escolhe na hotbar ou na mochila.</p>',
          '<p className="text-white/40 text-[10px]">{t("rpg.mochila.vazio")}</p>', 1))
R.append(('<p className="text-white/45 text-[10px]">Posições ocupadas: <b className="text-white">{ocupadas}/36</b> · comida come-se da hotbar (clique direito / botão COMER).</p>',
          '<p className="text-white/45 text-[10px]">{t("rpg.mochila.ocupadas", { n: String(ocupadas) })}</p>', 1))
R.append(('A mochila é a do motor partilhado (36 posições — CIDADE BATEU e RPG são o mesmo inventário de dados). Os baús dos locais entregam espólio real — a mesma mesa para todos os jogadores, determinística como a semente do mundo.\n                      </p>',
          '{t("rpg.mochila.fonte")}\n                      </p>', 1))

# ── 12. FORJA (modal) ────────────────────────────────────────
R.append(('<p className="text-white text-[11px] font-bold">{info.receita.nome}{info.receita.desc ? <span className="text-white/45 font-normal"> — {info.receita.desc}</span> : null}</p>',
          '<p className="text-white text-[11px] font-bold">{nomePorTexto(info.receita.nome, lingua)}{info.receita.desc ? <span className="text-white/45 font-normal"> — {info.receita.desc}</span> : null}</p>', 1))
R.append(('{info.receita.ingredientes.map(([id, qtd]) => `${qtd}× ${infoItem(id).nome} (${m.inv.contar(id)})`).join(" · ")}',
          '{info.receita.ingredientes.map(([id, qtd]) => `${qtd}× ${nomeItem(id, lingua)} (${m.inv.contar(id)})`).join(" · ")}', 1))
R.append(('if (criarReceita(m.inv, info.receita)) { setForjaMsg(`CRIADO: ${info.receita.nome}`); setCap(m.captura()); }',
          'if (criarReceita(m.inv, info.receita)) { setForjaMsg(t("rpg.forja.criado", { nome: nomePorTexto(info.receita.nome, lingua) })); setCap(m.captura()); }', 1))
R.append(('else setForjaMsg("Falhou — os ingredientes mudaram. Tenta de novo.");', 'else setForjaMsg(t("rpg.forja.falhou"));', 1))
R.append(('shrink-0">CRIAR</button>', 'shrink-0">{t("rpg.forja.criar")}</button>', 1))
R.append(('data-testid="rpg-forja-mesa">MESA: {mesa ? "AQUI" : "NÃO"}</span>', 'data-testid="rpg-forja-mesa">{t("rpg.forja.mesa", { v: mesa ? t("rpg.forja.aqui") : t("rpg.forja.nao") })}</span>', 1))
R.append(('data-testid="rpg-forja-fornalha">FORNALHA: {fornalha ? "AQUI" : "NÃO"}</span>', 'data-testid="rpg-forja-fornalha">{t("rpg.forja.fornalha", { v: fornalha ? t("rpg.forja.aqui") : t("rpg.forja.nao") })}</span>', 1))
R.append(('<span className="text-white/40 text-[10px]">Forja Perdida a ~{distForja} blocos (ver o MAPA)</span>',
          '<span className="text-white/40 text-[10px]">{t("rpg.forja.distancia", { n: String(distForja) })}</span>', 1))
R.append(('<p className="text-white/60 text-[10px] font-bold">CRIAÇÃO — simples em qualquer sítio; as de mesa só junto de uma Mesa de Criação</p>',
          '<p className="text-white/60 text-[10px] font-bold">{t("rpg.forja.criacao")}</p>', 1))
R.append(('<p className="text-white/60 text-[10px] font-bold">FUNDIÇÃO — minérios e cozinhados, só junto de uma fornalha</p>',
          '<p className="text-white/60 text-[10px] font-bold">{t("rpg.forja.fundicao")}</p>', 1))
R.append(('<p className="text-white/45 text-[10px]">Posições ocupadas: <b className="text-white">{cap.slots.filter(Boolean).length}/36</b> — o que crias entra pela mesma mochila do motor.</p>',
          '<p className="text-white/45 text-[10px]">{t("rpg.forja.ocupadas", { n: String(cap.slots.filter(Boolean).length) })}</p>', 1))
R.append(('As receitas são as do motor partilhado (constants.ts — as mesmas do BateuCraft, zero receita inventada); avaliarReceitas/criarReceita/pertoDe são as funções reais. No RPG nada se deita: a Forja Perdida é o único sítio do mundo com MESA e FORNALHA reais.\n                      </p>',
          '{t("rpg.forja.fonte")}\n                      </p>', 1))

# ── 13. MAPA DO MUNDO (modal) ────────────────────────────────
R.append(('<span className={descoberta ? "text-white/80" : "text-white/35"}>{descoberta ? r.nome : "???"}</span>',
          '<span className={descoberta ? "text-white/80" : "text-white/35"}>{descoberta ? nomeRegiao(r, lingua) : "???"}</span>', 1))
R.append(('★ objetivo atual · ◆ locais com baú · seta branca = tu. Descobertas: {rpg.descobertas.regioes}/{rpg.totalRegioes} regiões · {rpg.descobertas.pois}/{rpg.totalPois} locais · {rpg.descobertas.baus}/{rpg.totalBaus} baús',
          '{t("rpg.mapa.legenda", { r: String(rpg.descobertas.regioes), rt: String(rpg.totalRegioes), p: String(rpg.descobertas.pois), pt: String(rpg.totalPois), b: String(rpg.descobertas.baus), bt: String(rpg.totalBaus) })}', 1))
R.append(('Terreno real amostrado do mundo (semente fixa — água, costa, serra e miombo são os mesmos dados que geram os blocos) · regiões não descobertas ficam cobertas até lá chegares.\n                    </p>',
          '{t("rpg.mapa.fonte")}\n                    </p>', 1))

# ── 14. AJUDA (renderAjuda) ──────────────────────────────────
R.append(('<Trophy size={13} /> O OBJETIVO DA LENDA</p>', '<Trophy size={13} /> {t("rpg.ajuda.objetivo.titulo")}</p>', 1))
R.append(('Explora 6 regiões (Nv 1–5) e 8 locais, abre os 9 baús de tesouro, vive 6 capítulos de história e derrota o GUARDIÃO nas Ruínas de Kivulivuli. Cada baú rende créditos para a plataforma; cada caçada, noite sobrevivida e capítulo rende XP até ao nível 30.</p>',
          '{t("rpg.ajuda.objetivo.corpo")}</p>', 1))
R.append(('<p className="text-white/80 text-xs font-bold mb-1">CONTROLOS — COMPUTADOR</p>', '<p className="text-white/80 text-xs font-bold mb-1">{t("rpg.ajuda.pc.titulo")}</p>', 1))
R.append(('<li>WASD — mover</li>', '<li>{t("rpg.ajuda.wasd")}</li>', 1))
R.append(('<li>Espaço — saltar</li>', '<li>{t("rpg.ajuda.espaco")}</li>', 1))
R.append(('<li>Shift — correr</li>', '<li>{t("rpg.ajuda.shift")}</li>', 1))
R.append(('<li>Z — zoom</li>', '<li>{t("rpg.ajuda.zoom")}</li>', 1))
R.append(('<li>Rato — olhar</li>', '<li>{t("rpg.ajuda.rato")}</li>', 1))
R.append(('<li>Clique esq. — minerar/atacar</li>', '<li>{t("rpg.ajuda.cliqueEsq")}</li>', 1))
R.append(('<li>Clique dir. — comer</li>', '<li>{t("rpg.ajuda.cliqueDir")}</li>', 1))
R.append(('<li>1–9 / roda — hotbar</li>', '<li>{t("rpg.ajuda.hotbarTecla")}</li>', 1))
R.append(('<li>I — mochila (36 posições; clique na mochila move para a hotbar; peitoral equipa no slot selecionado)</li>', '<li>{t("rpg.ajuda.mochilaTecla")}</li>', 1))
R.append(('<li>Q — largar 1 do item selecionado (fica no chão; recolhe ao aproximar-te)</li>', '<li>{t("rpg.ajuda.q")}</li>', 1))
R.append(('<li>F — forja: criar e fundir (mesa/fornalha reais só na Forja Perdida)</li>', '<li>{t("rpg.ajuda.f")}</li>', 1))
R.append(('<li>J — missões</li>', '<li>{t("rpg.ajuda.j")}</li>', 1))
R.append(('<li>K — habilidades</li>', '<li>{t("rpg.ajuda.k")}</li>', 1))
R.append(('<li>M — mapa do mundo</li>', '<li>{t("rpg.ajuda.m")}</li>', 1))
R.append(('<li>Minimapa no canto (bordos da cor da região) — clique abre o mapa do mundo; ◆ dourado = baú descoberto perto de ti</li>', '<li>{t("rpg.ajuda.minimapaTecla")}</li>', 1))
R.append(('<li>ESC — pausa</li>', '<li>{t("rpg.ajuda.esc")}</li>', 1))
R.append(('<li>F5 — câmara</li>', '<li>{t("rpg.ajuda.f5")}</li>', 1))
R.append(('<p className="text-white/80 text-xs font-bold mb-1">CONTROLOS — TELEMÓVEL</p>', '<p className="text-white/80 text-xs font-bold mb-1">{t("rpg.ajuda.telemovel.titulo")}</p>', 1))
R.append(('<li>Joystick (canto inferior esquerdo) para andar; arrasta o ecrã para olhar</li>', '<li>{t("rpg.ajuda.joystick")}</li>', 1))
R.append(('<li>Botões ATACAR · SALTAR · COMER; toca nos itens da hotbar</li>', '<li>{t("rpg.ajuda.botoes")}</li>', 1))
R.append(('<li>Botões MISSÕES · DIÁRIO · MAPA · MOCHILA · FORJA · HAB. · pausa no topo do HUD</li>', '<li>{t("rpg.ajuda.botoesHud")}</li>', 1))
R.append(('<p className="text-white/80 text-xs font-bold mb-1">COMO SE PROGRESSA</p>', '<p className="text-white/80 text-xs font-bold mb-1">{t("rpg.ajuda.progressa.titulo")}</p>', 1))
R.append(('<li>XP vem de caçadas, noites sobrevividas, baús, capítulos e diárias (3 por dia, iguais para todos)</li>', '<li>{t("rpg.ajuda.progressa.xp")}</li>', 1))
R.append(('<li>Os inimigos derrotados deixam o loot NO CHÃO onde caíram — aproxima-te e ele desliza até ti (magnete a 3 blocos); o que não couber na mochila FICA onde está, nada desaparece por decisão silenciosa</li>', '<li>{t("rpg.ajuda.progressa.loot")}</li>', 1))
R.append(('<li>Itens no chão duram 120 s e o mundo guarda até 48 (o mais velho sai primeiro — as saídas são contadas no chip do HUD); o chão guarda-se com a lenda no save</li>', '<li>{t("rpg.ajuda.progressa.chao")}</li>', 1))
R.append(('<li>Os baús dos locais entregam também ESPÓLIO real — comida, tochas, barras e peitorais; a mesma mesa para todos, determinística como a semente</li>', '<li>{t("rpg.ajuda.progressa.baus")}</li>', 1))
R.append(('<li>Morrer não apaga a lenda: renasces na Aldeia com XP, missões e descobertas</li>', '<li>{t("rpg.ajuda.progressa.morte")}</li>', 1))
R.append(('Fontes: clima real por {OPENMETEO_ATTRIBUTION} · arquitetura de mundo aberto estudada de Veloren (GPLv3) — só a forma do skillset e a separação mundo/estado inspiraram o código, que é próprio · motor voxel partilhado com a CIDADE BATEU.\n        </p>',
          '{t("rpg.ajuda.fontes", { attr: OPENMETEO_ATTRIBUTION })}\n        </p>', 1))

# ── 15. PAUSA (modal) ────────────────────────────────────────
R.append(('bg-emerald-700 hover:bg-emerald-600">RETOMAR</button>', 'bg-emerald-700 hover:bg-emerald-600">{t("rpg.pausa.retomar")}</button>', 1))
R.append(('<span>Dificuldade: <b className="text-white" data-testid="rpg-pausa-dif">{rpg.dificuldade.nome}</b></span>',
          '<span>{t("rpg.pausa.dificuldade")} <b className="text-white" data-testid="rpg-pausa-dif">{nomeDificuldade(rpg.dificuldade.id, lingua)}</b></span>', 1))
R.append(('<span>Nível: <b className="text-white">{rpg.nivel}/{NIVEL_MAX}</b></span>',
          '<span>{t("rpg.pausa.nivel")} <b className="text-white">{rpg.nivel}/{NIVEL_MAX}</b></span>', 1))
R.append(('<span>Créditos: <b className="text-white">{rpg.creditos}</b></span>',
          '<span>{t("rpg.pausa.creditos")} <b className="text-white">{rpg.creditos}</b></span>', 1))
R.append(('<span>Mortes: <b className="text-white">{rpg.mortes}</b></span>',
          '<span>{t("rpg.pausa.mortes")} <b className="text-white">{rpg.mortes}</b></span>', 1))
R.append(('<span>Descobertas: <b className="text-white">{rpg.descobertas.regioes}/{rpg.totalRegioes} · {rpg.descobertas.pois}/{rpg.totalPois}</b></span>',
          '<span>{t("rpg.pausa.descobertas")} <b className="text-white">{rpg.descobertas.regioes}/{rpg.totalRegioes} · {rpg.descobertas.pois}/{rpg.totalPois}</b></span>', 1))
R.append(('<span>História: <b className="text-white">{rpg.historiaFeita ? "completa" : `capítulo ${rpg.capitulo?.id.replace("h", "")}/6`}</b></span>',
          '<span>{t("rpg.pausa.historia")} <b className="text-white">{rpg.historiaFeita ? t("rpg.pausa.historia.completa") : t("rpg.pausa.historia.capitulo", { n: rpg.capitulo?.id.replace("h", "") ?? "" })}</b></span>', 1))
R.append(('<MapIcon size={14} /> MAPA</button>', '<MapIcon size={14} /> {t("rpg.btn.mapa")}</button>', 1))
R.append(('<Backpack size={14} /> MOCHILA</button>', '<Backpack size={14} /> {t("rpg.btn.mochila")}</button>', 1))
R.append(('<Hammer size={14} /> FORJA</button>', '<Hammer size={14} /> {t("rpg.btn.forja")}</button>', 1))
R.append(('<HelpCircle size={14} /> AJUDA</button>', '<HelpCircle size={14} /> {t("rpg.comoJogar")}</button>', 1))
R.append(('text-xs">GUARDAR AGORA</button>', 'text-xs">{t("rpg.pausa.guardar")}</button>', 1))
R.append(('text-xs">SAIR PARA A PLATAFORMA</button>', 'text-xs">{t("rpg.pausa.sair")}</button>', 1))
R.append(('<p className="text-white/40 text-[10px] text-center">O progresso guarda-se automaticamente a cada 8 segundos.</p>',
          '<p className="text-white/40 text-[10px] text-center">{t("rpg.pausa.autoSave")}</p>', 1))

# ── 16. MORTE ────────────────────────────────────────────────
R.append(('<h2 className="text-rose-200 font-display text-3xl font-black">A lenda pausou-se…</h2>',
          '<h2 className="text-rose-200 font-display text-3xl font-black">{t("rpg.morte.titulo")}</h2>', 1))
R.append(('{cap.causaMorte || "O mundo da lenda é duro"} · {rpg?.mortes ?? 0}ª morte<br />',
          '{cap.causaMorte ? causaMorte(cap.causaMorte, lingua) : t("rpg.morte.causaDefault")} · {t("rpg.morte.morte", { n: String((rpg?.mortes ?? 0) + 1) })}<br />', 1))
R.append(('<span className="text-white/45 text-[11px]">O XP, as missões e as descobertas ficam — renasces na Aldeia Inicial.</span>',
          '<span className="text-white/45 text-[11px]">{t("rpg.morte.nota")}</span>', 1))
R.append(('<Swords size={17} /> RENASCER NA ALDEIA', '<Swords size={17} /> {t("rpg.morte.renascer")}', 1))
R.append(('<button onClick={sair} className="text-white/60 underline text-sm">Sair da lenda</button>',
          '<button onClick={sair} className="text-white/60 underline text-sm">{t("rpg.morte.sair")}</button>', 1))

falhas = 0
for old, new, esperado in R:
    n = src.count(old)
    if n != esperado:
        print(f"ERRO ({n} ocorrências, esperava {esperado}): {old[:110]!r}")
        falhas += 1
        continue
    src = src.replace(old, new)

if falhas:
    print(f"FALHAS: {falhas} — nada gravado")
    sys.exit(1)

open(CAMINHO, "w", encoding="utf-8").write(src)
print(f"OK — {len(R)} substituições aplicadas")
