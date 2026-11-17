#!/usr/bin/env python3
# v62 — AETHERIA liga ao i18n da plataforma (roadmap item 3): strings
# visíveis → t("aeth.*") com deps honestos nos callbacks. Verificado.
import sys

CAMINHO = "src/components/livegames/AetheriaGame.tsx"
src = open(CAMINHO, encoding="utf-8").read()

R = []
R.append((
 'import "./AetheriaGame.css";',
 'import "./AetheriaGame.css";\nimport { useLanguage } from "@/contexts/LanguageContext";',
 1))
R.append((
 '  const saved = useRef(loadCharacter()).current;',
 '  const { lang, t } = useLanguage();\n  const saved = useRef(loadCharacter()).current;',
 1))
# notices nos callbacks
R.append(('      setNotice("Aproxima-te de uma criatura para atacar.");', '      setNotice(t("aeth.nota.aproximar"));', 1))
R.append(('      setNotice("Ataque certeiro · a criatura perdeu energia.");', '      setNotice(t("aeth.nota.ataque"));', 1))
R.append(('      setNotice("Missão concluída! Recebeste 100 EXP e 80 moedas.");', '      setNotice(t("aeth.nota.missao"));', 1))
R.append(('      setNotice("Criatura derrotada · +35 EXP");', '      setNotice(t("aeth.nota.kill"));', 1))
R.append(('      setNotice("Precisas de pelo menos 20 de energia para usar esta habilidade.");', '      setNotice(t("aeth.nota.mana"));', 1))
R.append(('    setNotice("Luz restauradora · recuperaste saúde.");', '    setNotice(t("aeth.nota.curar"));', 1))
R.append(('    setNotice("A missão começou: derrota três criaturas nas ilhas.");', '    setNotice(t("aeth.nota.missaoComecou"));', 1))
# deps honestos dos callbacks que agora usam t
R.append(('  }, [enemyHp, kills, onScore, phase, questAccepted, questComplete]);',
          '  }, [enemyHp, kills, onScore, phase, questAccepted, questComplete, t]);', 1))
R.append(('    setNotice(t("aeth.nota.curar"));\n  }, [mana]);', '    setNotice(t("aeth.nota.curar"));\n  }, [mana, t]);', 1))
# intro
R.append(('<div className="aetheria-overline"><Sparkles size={14} /> UM NOVO HORIZONTE</div>',
          '<div className="aetheria-overline"><Sparkles size={14} /> {t("aeth.intro.overline")}</div>', 1))
R.append(('<h1>Ilhas de <span>Aetheria</span></h1>', '<h1>{t("aeth.intro.ilhas")} <span>Aetheria</span></h1>', 1))
R.append(('<p>Um mundo aberto entre as nuvens. Escolhe o teu caminho, conhece as ilhas e escreve a tua própria aventura.</p>',
          '<p>{t("aeth.intro.corpo")}</p>', 1))
R.append(('<div className="aetheria-class-picker" aria-label="Escolhe uma classe">',
          '<div className="aetheria-class-picker" aria-label={t("aeth.intro.escolherClasse")}>', 1))
R.append(('<span><strong>{item.name}</strong><small>{item.role}</small></span>',
          '<span><strong>{t("aeth.classe." + item.id + ".nome")}</strong><small>{t("aeth.classe." + item.id + ".role")}</small></span>', 1))
R.append(('            Explorar Aetheria <Wind size={17} />', '            {t("aeth.intro.entrar")} <Wind size={17} />', 1))
R.append(('<div className="aetheria-intro-controls">WASD para andar · F para voar · 1 para atacar · 2 para curar</div>',
          '<div className="aetheria-intro-controls">{t("aeth.intro.controlos")}</div>', 1))
R.append(('<ArrowLeft size={16} /> Voltar aos jogos</button>', '<ArrowLeft size={16} /> {t("aeth.intro.voltar")}</button>', 1))
# mundo
R.append(('<canvas ref={canvasRef} aria-label="Mundo 3D de Aetheria" />', '<canvas ref={canvasRef} aria-label={t("aeth.mundo.canvas")} />', 1))
R.append(('<strong>Ilhas do Alvorecer</strong><small>Região segura · Céu limpo</small>',
          '<strong>{t("aeth.mundo.titulo")}</strong><small>{t("aeth.mundo.sub")}</small>', 1))
R.append(('<strong>Viajante <span>Nv. {level}</span></strong>', '<strong>{t("aeth.mundo.viajante")} <span>Nv. {level}</span></strong>', 1))
R.append(('<small>{selectedClass.name}</small>', '<small>{t("aeth.classe." + selectedClass.id + ".nome")}</small>', 1))
R.append(('aria-label="Sair do mundo">', 'aria-label={t("aeth.mundo.sair")}>', 1))
R.append(('<div><Heart size={14} /><span>SAÚDE</span>', '<div><Heart size={14} /><span>{t("aeth.mundo.saude")}</span>', 1))
R.append(('<div><Zap size={14} /><span>ENERGIA</span>', '<div><Zap size={14} /><span>{t("aeth.mundo.energia")}</span>', 1))
R.append(('<div className="aetheria-region"><Compass size={13} /> PLANÍCIE DAS BRISAS <span>•</span> {coins} <span>✦</span></div>',
          '<div className="aetheria-region"><Compass size={13} /> {t("aeth.mundo.regiao")} <span>•</span> {coins} <span>✦</span></div>', 1))
R.append(('<div className="aetheria-quest-heading"><Map size={15} /><span>DIÁRIO DE VIAGEM</span></div>',
          '<div className="aetheria-quest-heading"><Map size={15} /><span>{t("aeth.mundo.diario")}</span></div>', 1))
R.append(('<strong>{questComplete ? "A guardiã das brisas" : questAccepted ? "Ecos na pradaria" : "Uma nova jornada"}</strong>',
          '<strong>{questComplete ? t("aeth.quest.feita.titulo") : questAccepted ? t("aeth.quest.aceite.titulo") : t("aeth.quest.nova.titulo")}</strong>', 1))
R.append(('<p>{questComplete ? "As criaturas acalmaram. A ilha está em paz." : questAccepted ? "Afasta as criaturas que rondam a ilha." : "Fala com a guia para descobrir o que ameaça a ilha."}</p>',
          '<p>{questComplete ? t("aeth.quest.feita.corpo") : questAccepted ? t("aeth.quest.aceite.corpo") : t("aeth.quest.nova.corpo")}</p>', 1))
R.append(('<div className="aetheria-quest-progress"><span>Criaturas</span>', '<div className="aetheria-quest-progress"><span>{t("aeth.quest.criaturas")}</span>', 1))
R.append(('<div className="aetheria-quest-done">✓ Jornada concluída</div>', '<div className="aetheria-quest-done">{t("aeth.quest.concluida")}</div>', 1))
R.append(('className="aetheria-quest-accept" onClick={acceptQuest}>Falar com Nara <span>›</span></button>',
          'className="aetheria-quest-accept" onClick={acceptQuest}>{t("aeth.quest.falar")} <span>›</span></button>', 1))
R.append(('<section className="aetheria-minimap" aria-label="Mapa da região">', '<section className="aetheria-minimap" aria-label={t("aeth.minimapa.aria")}>', 1))
R.append(('<span className="aetheria-map-label">BRISAS</span>', '<span className="aetheria-map-label">{t("aeth.minimapa.rotulo")}</span>', 1))
R.append(('aria-label="Ataque básico"><span className="aetheria-key">1</span><Sword size={19} /><small>Ataque</small></button>',
          'aria-label={t("aeth.atacar.aria")}><span className="aetheria-key">1</span><Sword size={19} /><small>{t("aeth.atacar.rotulo")}</small></button>', 1))
R.append(('aria-label="Luz restauradora"><span className="aetheria-key">2</span><Heart size={19} /><small>Restaurar</small></button>',
          'aria-label={t("aeth.restaurar.aria")}><span className="aetheria-key">2</span><Heart size={19} /><small>{t("aeth.restaurar.rotulo")}</small></button>', 1))
R.append(('aria-label="Alternar voo" className={flying ? "is-active" : ""}><span className="aetheria-key">F</span><Wind size={19} /><small>{flying ? "Planar" : "Voar"}</small></button>',
          'aria-label={t("aeth.voo.aria")} className={flying ? "is-active" : ""}><span className="aetheria-key">F</span><Wind size={19} /><small>{flying ? t("aeth.voo.planar") : t("aeth.voo.voar")}</small></button>', 1))
R.append(('aria-label="Abrir mochila"><span className="aetheria-key">I</span><Backpack size={19} /><small>Mochila</small></button>',
          'aria-label={t("aeth.mochila.abrir")}><span className="aetheria-key">I</span><Backpack size={19} /><small>{t("aeth.mochila.rotulo")}</small></button>', 1))
R.append(('<div className="aetheria-controls-hint">WASD mover <span>·</span> SHIFT correr <span>·</span> F planar <span>·</span> 1 atacar <span>·</span> 2 restaurar</div>',
          '<div className="aetheria-controls-hint">{t("aeth.controlos.hint")}</div>', 1))
R.append(('<div><strong><Backpack size={16} /> Mochila de viagem</strong><button type="button" onClick={() => setInventoryOpen(false)} aria-label="Fechar mochila">×</button></div>',
          '<div><strong><Backpack size={16} /> {t("aeth.mochila.titulo")}</strong><button type="button" onClick={() => setInventoryOpen(false)} aria-label={t("aeth.mochila.fechar")}>×</button></div>', 1))
R.append(('<p>Os teus achados acompanham-te pelas ilhas.</p>', '<p>{t("aeth.mochila.corpo")}</p>', 1))
R.append(('<span className="aetheria-item"><Sparkles size={17} /> Fragmento de brisa <b>{Math.max(kills, 0)}</b></span>',
          '<span className="aetheria-item"><Sparkles size={17} /> {t("aeth.mochila.item1")} <b>{Math.max(kills, 0)}</b></span>', 1))
R.append(('<span className="aetheria-item"><span>✦</span> Moedas de Aetheria <b>{coins}</b></span>',
          '<span className="aetheria-item"><span>✦</span> {t("aeth.mochila.item2")} <b>{coins}</b></span>', 1))
R.append(('<div><strong>Faísca errante</strong><small>Criatura das nuvens · Nv. 1</small></div>',
          '<div><strong>{t("aeth.target.nome")}</strong><small>{t("aeth.target.sub")}</small></div>', 1))

falhas = 0
for old, new, esperado in R:
    n = src.count(old)
    if n != esperado:
        print(f"ERRO ({n} ocorrências, esperava {esperado}): {old[:100]!r}")
        falhas += 1
        continue
    src = src.replace(old, new)

if falhas:
    print(f"FALHAS: {falhas} — nada gravado")
    sys.exit(1)

open(CAMINHO, "w", encoding="utf-8").write(src)
print(f"OK — {len(R)} substituições aplicadas")
