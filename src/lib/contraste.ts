// ═══════════════════════════════════════════════════════════════════
// v90 — «DESKTOP AO TOQUE»: MODO ALTO CONTRASTE
// Núcleo PURO (padrão desbloqueios.ts/iaContexto.ts): sem React,
// sem localStorage real, sem DOM — tudo injetável e testável em Node.
// A aplicação mínima no DOM é UM atributo no <html>:
//   html[data-contraste="alto"] → o CSS (index.css §v90) chaveia todo
//   o contraste por esse atributo. Zero classes espalhadas.
// Honestidade: sobe o contraste do TEXTO, BORDAS e FOCO que usam as
// variáveis do tema; cores hard-coded de arte/branding não mudam.
// ═══════════════════════════════════════════════════════════════════

export const CHAVE_CONTRASTE = "bateu_contraste_v1";

export type EstadoContraste = "normal" | "alto";

/** Validador à prova de podre: só os dois valores existem; qualquer
 *  outra coisa (null, string podre, JSON) → null = «nunca escolheu». */
export function estadoLido(v: string | null | undefined): EstadoContraste | null {
  return v === "normal" || v === "alto" ? v : null;
}

/** Leitor injetável (localStorage no browser, fake nos testes Node). */
export function lerContraste(
  storage: { getItem(k: string): string | null },
): EstadoContraste | null {
  try {
    return estadoLido(storage.getItem(CHAVE_CONTRASTE));
  } catch {
    return null;
  }
}

/** Gravação da escolha EXPLÍCITA do utilizador (sempre string simples). */
export function gravarContraste(
  estado: EstadoContraste,
  storage: { setItem(k: string, v: string): void },
): void {
  storage.setItem(CHAVE_CONTRASTE, estado);
}

/** Alternador: recebe o estado EFETIVO atual (explícito ou do sistema)
 *  e devolve o seguinte. A decisão nunca é da IA nem do acaso — é do
 *  utilizador, e fica gravada. */
export function alternarContraste(efetivoAtual: EstadoContraste): EstadoContraste {
  return efetivoAtual === "alto" ? "normal" : "alto";
}

/** Sistema: o SO pode declarar preferência por contraste
 *  (prefers-contrast: more). Só é respeitado se o utilizador ainda
 *  NUNCA tiver escolhido nada na plataforma. */
export function sistemaPedeAltoContraste(
  matchMedia?: (q: string) => { matches: boolean },
): boolean {
  if (typeof matchMedia !== "function") return false;
  try {
    return matchMedia("(prefers-contrast: more)").matches === true;
  } catch {
    return false;
  }
}

/** Aplicação mínima: lê a store → resolve o estado efetivo → UM
 *  atributo no <html>. Devolve o estado aplicado (para o botão do
 *  rodapé mostrar o estado REAL e o aria-pressed bater certo). */
export function aplicarContraste(opts: {
  storage: { getItem(k: string): string | null };
  documentElement: {
    setAttribute(name: string, value: string): void;
    removeAttribute(name: string): void;
  };
  matchMedia?: (q: string) => { matches: boolean };
}): EstadoContraste {
  const explicito = lerContraste(opts.storage);
  const efetivo: EstadoContraste =
    explicito ?? (sistemaPedeAltoContraste(opts.matchMedia) ? "alto" : "normal");
  if (efetivo === "alto") opts.documentElement.setAttribute("data-contraste", "alto");
  else opts.documentElement.removeAttribute("data-contraste");
  return efetivo;
}
