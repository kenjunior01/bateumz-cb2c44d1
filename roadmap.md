# Bateu corrections

- [x] Fix underlying 3D World execution/type errors without disabling checks. (v60 — docs/REA-world-fixes-v60.md: teclas presas no blur, PCFSoftShadowMap removido do three, Motor.destruir() para o contexto WebGL, dados externos validados via jogosLive.ts, ganchos E2E tipados, ZERO casts/eslint-disable novos; test-world-v60.mjs 28/28 ×2, regressão 157+39+37+37+62+54+54+76+52, tsc 0, build OK)
- [x] Make 3D World playable without registration; keep account-only rewards protected. (v61 — docs/REA-mundo-convidado-v61.md: mundo já era jogável sem registo por desenho — agora PROVADO ponta a ponta; banner do hub HONESTO ×6 idiomas; núcleo mundoConvidado.ts com o perímetro conta-apenas (4 tabelas + 10 edge functions JWT); E2E com ledger: ZERO escritas rest/tabelas conta/funções JWT para o convidado; /wallet e /my-points → /login; test-mundo-convidado-v61.mjs 65/65 ×2, regressão 157+39+37+28+37+62+54+54+76+52, tsc -b + tsc app 0, build OK)
- [ ] Translate 3D World visible text into English.
- [ ] Fix fullscreen entry, exit, resizing and mobile use.
- [ ] Verify and correct managed Google/Apple registration and signup errors.
- [ ] Replace homepage with shop/raffle discovery and top stories after visual direction selection.
- [ ] Use four mobile navigation destinations plus a central World action.
- [ ] Improve readability and colors in the selected public design.
- [ ] Verify guest gameplay and available registration flows end to end.
- [ ] Add audit P0 loading recovery: render app shell promptly, cap blocking startup waits, and provide navigable retry/fallback states.
- [ ] Surface only verifiable trust and responsible-play information; do not invent licensing, operators, support contacts, payment terms, odds, or audit claims.
