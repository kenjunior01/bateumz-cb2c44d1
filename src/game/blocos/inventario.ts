// ============================================================
// BATEUCRAFT — Inventário 36 posições + criação + fundição
// ============================================================

import { BLOCOS, B, I, RECEITAS, Receita, NOMES, CORES, ITENS } from "./constants";
import { Mundo } from "./world";
import { Aleatorio } from "./noise";

export interface Slot { id: number; qtd: number }

const MAX_EMPILHA = (id: number) => (id >= 100 && ITENS[id]?.maximo ? ITENS[id].maximo! : 64);

export class Inventario {
  slots: (Slot | null)[] = new Array(36).fill(null);
  selecao = 0;

  limpar() { this.slots.fill(null); this.selecao = 0; }

  /** Adiciona item; devolve quantidade efetivamente guardada */
  adicionar(id: number, qtd: number): number {
    let restante = qtd;
    const max = MAX_EMPILHA(id);
    // 1ª passada: encher pilhas existentes (hotbar primeiro)
    for (let i = 0; i < 36 && restante > 0; i++) {
      const s = this.slots[i];
      if (s && s.id === id && s.qtd < max) {
        const caber = Math.min(max - s.qtd, restante);
        s.qtd += caber; restante -= caber;
      }
    }
    // 2ª passada: slots vazios (hotbar primeiro)
    for (let i = 0; i < 36 && restante > 0; i++) {
      if (!this.slots[i]) {
        const por = Math.min(max, restante);
        this.slots[i] = { id, qtd: por }; restante -= por;
      }
    }
    return qtd - restante;
  }

  contar(id: number): number {
    let n = 0;
    for (const s of this.slots) if (s && s.id === id) n += s.qtd;
    return n;
  }

  remover(id: number, qtd: number): boolean {
    if (this.contar(id) < qtd) return false;
    let falta = qtd;
    for (let i = 0; i < 36 && falta > 0; i++) {
      const s = this.slots[i];
      if (s && s.id === id) {
        const tirar = Math.min(s.qtd, falta);
        s.qtd -= tirar; falta -= tirar;
        if (s.qtd <= 0) this.slots[i] = null;
      }
    }
    return true;
  }

  selecionado(): Slot | null { return this.slots[this.selecao]; }
  consumirSelecionado(n = 1) {
    const s = this.slots[this.selecao];
    if (!s) return;
    s.qtd -= n;
    if (s.qtd <= 0) this.slots[this.selecao] = null;
  }
}

/** Tem jogador uma mesa/fornalha por perto? (raio 4 blocos) */
export function pertoDe(mundo: Mundo, x: number, y: number, z: number, alvo: number, raio = 4): boolean {
  const r = Math.ceil(raio);
  for (let dx = -r; dx <= r; dx++) for (let dy = -2; dy <= 2; dy++) for (let dz = -r; dz <= r; dz++) {
    if (Math.hypot(dx, dy, dz) > raio) continue;
    if (mundo.getBloco(Math.floor(x) + dx, Math.floor(y) + dy, Math.floor(z) + dz) === alvo) return true;
  }
  return false;
}

export interface InfoReceita { receita: Receita; pode: boolean; falta: [string, number][]; motivo: string }

export function avaliarReceitas(inv: Inventario, mesa: boolean, fornalha: boolean): InfoReceita[] {
  return RECEITAS.map((receita) => {
    const falta: [string, number][] = [];
    for (const [id, qtd] of receita.ingredientes) {
      const tem = inv.contar(id);
      if (tem < qtd) falta.push([NOMES[id] ?? "?", qtd - tem]);
    }
    let motivo = "";
    if (receita.categoria === "fundicao" && !fornalha) motivo = "Precisas de uma fornalha por perto";
    else if (receita.mesa && !mesa) motivo = "Precisas de estar perto de uma Mesa de Criação";
    else if (falta.length) motivo = `Falta: ${falta.map(([n, q]) => `${q}× ${n}`).join(", ")}`;
    return { receita, pode: !motivo, falta, motivo };
  });
}

export function criarReceita(inv: Inventario, receita: Receita): boolean {
  for (const [id, qtd] of receita.ingredientes) if (inv.contar(id) < qtd) return false;
  for (const [id, qtd] of receita.ingredientes) inv.remover(id, qtd);
  inv.adicionar(receita.resultado[0], receita.resultado[1]);
  return true;
}

/** Nome/cor para ícones do HUD */
export function infoItem(id: number): { nome: string; cor1: string; cor2: string; bloco: boolean } {
  const c = CORES[id] ?? ["#999", "#666"];
  return { nome: NOMES[id] ?? "?", cor1: c[0], cor2: c[1], bloco: id < 100 };
}

/** Drops de folhas: maçã ocasional (comida no início do jogo) */
export function dropFolhas(rnd: Aleatorio): { id: number; qtd: number } | null {
  if (rnd.chance(0.08)) return { id: I.MACA, qtd: 1 };
  return null;
}

export type { Receita } from "./constants";
export const podeColocar = (id: number) => id > 0 && id < 100 && !!BLOCOS[id] && id !== B.AGUA;
