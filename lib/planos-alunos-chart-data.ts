import {
  eachMonthOfInterval,
  endOfYear,
  format,
  startOfMonth,
  startOfYear,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";

export type PeriodoGraficoPlanos = "rolling12" | "2025" | "2024" | "2023";

/** Chave estável por índice do plano (dataKey no Recharts). */
export function chaveSeriePlano(indice: number): string {
  return `plano_${indice}`;
}

/** Meses do período (início de cada mês). */
export function mesesDoPeriodo(periodo: PeriodoGraficoPlanos): Date[] {
  if (periodo === "rolling12") {
    const fim = startOfMonth(new Date());
    const inicio = subMonths(fim, 11);
    return eachMonthOfInterval({ start: inicio, end: fim });
  }
  const ano = Number(periodo);
  const ref = new Date(ano, 5, 15);
  return eachMonthOfInterval({
    start: startOfYear(ref),
    end: endOfYear(ref),
  });
}

/**
 * Contagem fictícia de alunos por plano e mês (visual suave e empilhável).
 * Determinístico: mesmo período e planos geram sempre a mesma série.
 */
export function contagemFicticiaAlunos(
  indicePlano: number,
  mesNoPeriodo: number,
  ano: number,
  mesCalendario: number
): number {
  const fase = indicePlano * 1.7 + ano * 0.01 + mesCalendario * 0.15;
  const onda = Math.sin(mesNoPeriodo * 0.55 + fase) * 4;
  const base = 6 + indicePlano * 4 + (ano % 5) * 2;
  const sasonal = (mesCalendario + indicePlano) % 3;
  return Math.max(
    0,
    Math.round(base + onda + sasonal + (mesNoPeriodo % 4))
  );
}

export type LinhaGraficoPlanos = {
  /** yyyy-MM para tooltip */
  mesId: string;
  /** Rótulo curto no eixo X */
  mesRotulo: string;
} & Record<string, number | string>;

export function montarLinhasGraficoAlunosPorPlano(
  periodo: PeriodoGraficoPlanos,
  quantidadePlanos: number
): LinhaGraficoPlanos[] {
  const meses = mesesDoPeriodo(periodo);
  return meses.map((data, mesIdx) => {
    const ano = data.getFullYear();
    const mesCal = data.getMonth() + 1;
    const row: LinhaGraficoPlanos = {
      mesId: `${ano}-${String(mesCal).padStart(2, "0")}`,
      mesRotulo: format(data, "MMMM", { locale: ptBR }).toLowerCase(),
    };
    for (let p = 0; p < quantidadePlanos; p++) {
      row[chaveSeriePlano(p)] = contagemFicticiaAlunos(
        p,
        mesIdx,
        ano,
        mesCal
      );
    }
    return row;
  });
}
