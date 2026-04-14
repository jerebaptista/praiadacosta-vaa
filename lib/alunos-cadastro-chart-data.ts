import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  mesesDoPeriodo,
  type PeriodoGraficoPlanos,
} from "@/lib/planos-alunos-chart-data";

export type LinhaGraficoCadastroAlunos = {
  mesId: string;
  mesRotulo: string;
  /** Novos cadastros naquele mês (com base na data de cadastro). */
  total: number;
};

/**
 * Conta quantos alunos têm data de cadastro em cada mês do período.
 */
export function montarSerieCadastrosPorMes(
  periodo: PeriodoGraficoPlanos,
  cadastroMesIds: (string | null | undefined)[]
): LinhaGraficoCadastroAlunos[] {
  const meses = mesesDoPeriodo(periodo);
  const contagem = new Map<string, number>();
  for (const raw of cadastroMesIds) {
    const m = raw?.trim();
    if (!m || m.length < 7) continue;
    const key = m.slice(0, 7);
    contagem.set(key, (contagem.get(key) ?? 0) + 1);
  }
  return meses.map((data) => {
    const ano = data.getFullYear();
    const mesCal = data.getMonth() + 1;
    const mesId = `${ano}-${String(mesCal).padStart(2, "0")}`;
    return {
      mesId,
      mesRotulo: format(data, "MMMM", { locale: ptBR }).toLowerCase(),
      total: contagem.get(mesId) ?? 0,
    };
  });
}
