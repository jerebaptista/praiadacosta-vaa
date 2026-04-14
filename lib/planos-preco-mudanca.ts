import { valorMensalReferenciaDePlanoLinha } from "@/lib/plano-form";
import { formatarPrecoBrl } from "@/lib/planos-tipos";
import type { PlanoLinha } from "@/lib/planos-tipos";

/** Mesmo formato que `montarPrecosPlanoParaPersistir`. */
export type PrecosPlanoSnapshot = {
  preco_mensal: number | null;
  preco_trimestral: number | null;
  preco_semestral: number | null;
  preco_anual: number | null;
  valor_equivalente_mensal: number | null;
};

const CHAVES: (keyof PrecosPlanoSnapshot)[] = [
  "preco_mensal",
  "preco_trimestral",
  "preco_semestral",
  "preco_anual",
  "valor_equivalente_mensal",
];

const ROTULOS: Record<keyof PrecosPlanoSnapshot, string> = {
  preco_mensal: "Mensal",
  preco_trimestral: "Trimestral",
  preco_semestral: "Semestral",
  preco_anual: "Anual",
  valor_equivalente_mensal: "Referência mensal",
};

function norm(v: number | null): number | null {
  if (v == null || Number.isNaN(v)) return null;
  return Math.round(v * 100) / 100;
}

function igual(a: number | null, b: number | null): boolean {
  return norm(a) === norm(b);
}

export function precosSnapshotDePlanoLinha(plano: PlanoLinha): PrecosPlanoSnapshot {
  return {
    preco_mensal: plano.preco_mensal,
    preco_trimestral: plano.preco_trimestral,
    preco_semestral: plano.preco_semestral,
    preco_anual: plano.preco_anual,
    valor_equivalente_mensal: valorMensalReferenciaDePlanoLinha(plano) ?? null,
  };
}

export const PRECO_SNAPSHOT_VAZIO: PrecosPlanoSnapshot = {
  preco_mensal: null,
  preco_trimestral: null,
  preco_semestral: null,
  preco_anual: null,
  valor_equivalente_mensal: null,
};

export type LinhaMudancaPrecoPlano = {
  rotulo: string;
  /** Texto para exibição (BRL, "Inativo" se o período estava sem preço, ou "—"). */
  anteriorTexto: string;
  /** Texto para exibição (BRL, "Inativo" se o período fica sem preço, ou "—"). */
  novoTexto: string;
};

function textoColunaAtual(antes: number | null, depois: number | null): string {
  if (antes == null && depois != null) return "Inativo";
  return formatarPrecoBrl(antes);
}

function textoColunaNovo(depois: number | null): string {
  if (depois == null) return "Inativo";
  return formatarPrecoBrl(depois);
}

/**
 * Lista períodos cujo valor persistido mudou (comparação em centavos).
 */
export function listarMudancasPrecoPlano(
  antes: PrecosPlanoSnapshot,
  depois: PrecosPlanoSnapshot
): LinhaMudancaPrecoPlano[] {
  const out: LinhaMudancaPrecoPlano[] = [];
  for (const k of CHAVES) {
    if (igual(antes[k], depois[k])) continue;
    out.push({
      rotulo: ROTULOS[k],
      anteriorTexto: textoColunaAtual(antes[k], depois[k]),
      novoTexto: textoColunaNovo(depois[k]),
    });
  }
  return out;
}
