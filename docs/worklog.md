
---
Task ID: 19
Agent: Super Z (main)
Task: v11-RPG — "o melhor jogo RPG já feito": câmaras Minecraft/GTA, ecrã inteiro, música original, clima, NPCs, oficina, montaria, elites + catálogo aparado (fundido com a v12 remota: Bounce)

Work Log:
- Estado à entrada: main local = v10 (677fe21); REMOTE tinha avanço paralelo: 95d5347 (APK v2.11), aad72cc (home mobile nativa), b1975ef (worklog v11), 4276985 (v12: catálogo 84→16 + NOVO jogo Bounce + visuais limpos + 3 câmaras + fullscreen + música PD)
- ESTRATÉGIA DE FUSÃO: backup da minha v11 (branch v11-rpg-backup) → reset a origin/main (v12, com BounceGame.tsx + catálogo) → restaurei os MEUS ficheiros testados: worldEngine.ts (câmaras+RPG), BateuWorld.tsx (HUD v11), worldAudio.ts (5 faixas), GameFullscreenWrapper.tsx (hideChrome), LoadingScreen.tsx (copy), test-world.mjs (164 asserts)
- CÂMARAS: camMode 0/1/2 — orbital (clássica) · 1ª pessoa estilo Minecraft (olhos do herói, bob ao andar, mão+arma por classe com golpe animado, FOV 74) · 3ª pessoa ombro estilo San Andreas (pivot+right vector, raycast contra edifícios, FOV 64); troca por botões (bw-cam-0/1/2), tecla C e evento camchange; FOV interpolado suave
- ECRÃ INTEIRO: botão próprio (bw-fs) com requestFullscreen+webkit, lock landscape opcional, FALLBACK VISUAL (classe fixed inset-0) quando a API falha; fix headless que engaja-e-sai (verificação diferida 450ms)
- MÚSICA: worldAudio reescrito — 5 FAIXAS ORIGINAIS compostas em código (scheduler de colcheias com lookahead): Amanhecer no Vale, Blocos ao Vento, Corrida do Ouro (chiptune), Neon da Metrópole (synthwave), Coração da Floresta; leitor no HUD (bw-music, ⏮⏭, slider de volume persistido, faixa persistida)
- CLIMA: chuva (720 gotas) e tempestade com relâmpagos (PointLight flash + trovão) — névoa densifica, luz escurece (weatherLight), setRain no áudio; primeiro evento só aos 110s (E2E estável)
- RPG: 26 nós de recolha (erva/minério/cristal) com respawn 90s; OFICINA na mochila (3 receitas: Vida 3🌿+1💎, Força 2🌿+2⛏️, Vento 1🌿+1⛏️+2💎) + uso de poções (usePotion no motor); 3 NPCs com diálogo e máquina de escrever + bênçãos diárias (ouro/XP/poção/pontos); mobs ELITE (9%, x1.85 HP, x1.4 atk, x2.4 recompensas, loot tier+1 garantido, aura roxa); CRÍTICOS automáticos 10% (x1.85, texto laranja); ESQUIVA por agilidade (spd*0.006, máx 16%); MONTARIA Lobo Veloz Nv8 (+75% velocidade, galope animado, sela, botão bw-mount + tecla V)
- VISUAL LIMPO: bloom 0.42→0.18, vinheta 0.62→0.3, saturação 1.07→1.02, névoa clara (0xb2d8ea/0.0042), céu mais suave, aurora −45%, nuvens 0.85→0.72, terreno dessaturado+luminoso (offsetHSL)
- CATÁLOGO: fundido — 16 clássicos + Bounce NOVO + Bateu World destaque (base v12); LoadingScreen "68+ jogos"→"melhores jogos da plataforma"
- BUG CRÍTICO corrigido: GameFullscreenWrapper (botão "Tela Cheia" do hub em top-2 right-2 z-20) SOBREPUNHA o fim do nav do jogo e CEGAVA o modo foto/fs/música → prop hideChrome para o mmorpg; modo foto janela 900ms→2600ms + resgate de clique no E2E
- E2E: +23 asserts v11/v12 (câmaras, fp weapon, fs, leitor, NPC+diálogo+bênção, montaria bloqueada, oficina, catálogo, Bounce); suite final 164/164 ✅ (várias rondas de endurecimento: waits sondados em música/diálogo/bússola/chips; reload valida no mundo, não em /jogos)
- tsc 0 erros; build produção OK; ANDROID: JDK 21.0.12 + SDK 36 reinstalados (rollback perdeu-os de novo), cap sync, limpeza .gz/.br, assembleDebug+assembleRelease+bundleRelease BUILD SUCCESSFUL
- APK v2.12 verificado por chunks: Amanhecer no Vale ✓ getCamMode/setCamMode ✓ toggleMount/usePotion ✓ Oficina ✓ Mestre Gomas ✓ Tempestade ✓ bw-fs/bw-music/bw-cam-/bw-mount/bw-dialogue ✓ CRÍTICO ✓ Bounce ✓ (versionCode 12, versionName 2.12)
- Publicados: download/Bateu-v2.12-rpg-{debug,release}.apk + Bateu-v2.12-rpg.aab (sha256 57b3f1a4…)
- Commits: 345d3c1 (v11, suplantado pela fusão) → ead5bd0 (v11-RPG fundida) pushado para origin/main

Stage Summary:
- Bateu World transforma-se num RPG de mundo aberto completo: 3 câmaras, clima, montaria, NPCs com diálogo, oficina/poções, elites, críticos/esquiva — tudo com estética limpa e banda sonora 100% original
- Plataforma com catálogo enxuto de clássicos + Bounce novo; APK/AAB v2.12 publicados e verificados
- Suite E2E: 164/164 verdes
