import { adicionarMesesDataYmd } from "@/lib/dates";

/** Período de cobrança usado para calcular o vencimento (início + N meses). */
export type PeriodoContrato = "mensal" | "trimestral" | "semestral" | "anual";

const ORDEM_PERIODOS: PeriodoContrato[] = [
  "mensal",
  "trimestral",
  "semestral",
  "anual",
];

const MESES: Record<PeriodoContrato, number> = {
  mensal: 1,
  trimestral: 3,
  semestral: 6,
  anual: 12,
};

const ROTULO: Record<PeriodoContrato, string> = {
  mensal: "Mensal",
  trimestral: "Trimestral",
  semestral: "Semestral",
  anual: "Anual",
};

/** Até existir campo na base, usa o id para variar o período de forma estável (mock / fallback). */
export function periodoContratoParaAluno(alunoId: string): PeriodoContrato {
  let h = 0;
  for (let i = 0; i < alunoId.length; i++) h += alunoId.charCodeAt(i);
  return ORDEM_PERIODOS[Math.abs(h) % ORDEM_PERIODOS.length];
}

export function rotuloPeriodoContrato(p: PeriodoContrato): string {
  return ROTULO[p];
}

export function mesesDoPeriodo(p: PeriodoContrato): number {
  return MESES[p];
}

/** Data fim da vigência: `desde` + duração do período (ex.: anual → +12 meses). */
export function vencimentoAposInicio(
  desdeYmd: string,
  periodo: PeriodoContrato
): string {
  return adicionarMesesDataYmd(desdeYmd, mesesDoPeriodo(periodo));
}
