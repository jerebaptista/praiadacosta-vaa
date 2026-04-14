/** Semanas usadas para estimar o valor mensal de referência a partir do total semanal (aula × aulas/semana). */
export const SEMANAS_REFERENCIA_MENSAL_PRECO_AULA = 4;

/**
 * Total semanal: preço da aula × quantidade de aulas por semana (ex.: R$ 50 × 2).
 */
export function valorSemanalAulas(precoPorAula: number, aulasPorSemana: number): number {
  if (precoPorAula <= 0 || aulasPorSemana < 1) return 0;
  return Math.round(precoPorAula * aulasPorSemana * 100) / 100;
}

/**
 * Referência mensal para cálculo do % de desconto do preço mensal (total semanal × semanas).
 */
export function referenciaMensalPrecoAula(
  precoPorAula: number,
  aulasPorSemana: number
): number {
  const sem = valorSemanalAulas(precoPorAula, aulasPorSemana);
  return Math.round(sem * SEMANAS_REFERENCIA_MENSAL_PRECO_AULA * 100) / 100;
}
