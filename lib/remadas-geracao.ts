import {
  addMonths,
  eachDayOfInterval,
  endOfDay,
  isAfter,
  startOfDay,
} from "date-fns";

export const REMADA_STATUS_VALORES = [
  "agendada",
  "concluida",
  "cancelada",
] as const;

export type RemadaStatus = (typeof REMADA_STATUS_VALORES)[number];

export type RemadaLinha = {
  id: string;
  data_hora: string;
  vagas: number;
  /** Número de agendamentos confirmados para esta remada. */
  preenchidas: number;
  status: RemadaStatus;
  /** Calculado no servidor: `data_hora <= now()` na hora em que a listagem foi gerada. */
  passou: boolean;
};

/** Meses à frente quando não há data fim (repetição). */
export const MESES_SEM_FIM_PADRAO = 12;

/** Máximo de linhas por operação de geração (alinhado a `remadas-validacao`). */
export const REMADA_MAX_OCORRENCIAS_POR_LOTE = 400;

/** Ordem de exibição: seg → dom (valores de `Date.getDay()`). */
export const ORDEM_DIA_SEMANA = [1, 2, 3, 4, 5, 6, 0] as const;

export const LABEL_DIA_SEMANA: Record<number, string> = {
  0: "Dom",
  1: "Seg",
  2: "Ter",
  3: "Qua",
  4: "Qui",
  5: "Sex",
  6: "Sáb",
};

/**
 * Combina data e hora locais; rejeita datas inexistentes no calendário.
 */
export function combinarDataHoraLocal(
  dataYmd: string,
  horaHm: string
): Date | null {
  if (!dataYmd || !horaHm) return null;
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dataYmd.trim());
  const hm = /^(\d{2}):(\d{2})$/.exec(horaHm.trim());
  if (!dm || !hm) return null;
  const y = Number(dm[1]);
  const mo = Number(dm[2]);
  const d = Number(dm[3]);
  const hh = Number(hm[1]);
  const mm = Number(hm[2]);
  if (
    [y, mo, d, hh, mm].some(
      (n) => !Number.isInteger(n) || Number.isNaN(n)
    )
  ) {
    return null;
  }
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  const dt = new Date(y, mo - 1, d, hh, mm, 0, 0);
  if (
    dt.getFullYear() !== y ||
    dt.getMonth() !== mo - 1 ||
    dt.getDate() !== d
  ) {
    return null;
  }
  return dt;
}

export type GerarRemadasInput = {
  dataInicio: string;
  hora: string;
  vagas: number;
  repete: boolean;
  diasSemana: number[];
  dataFim: string | null;
};

export function contarOcorrenciasRepeticao(
  dataInicio: string,
  diasSemana: number[],
  dataFim: string | null,
  repete: boolean
): number {
  if (!repete) return 1;
  const diasSet = new Set(diasSemana);
  if (diasSet.size === 0) return 0;
  const [yi, mi, di] = dataInicio.split("-").map(Number);
  if ([yi, mi, di].some((n) => Number.isNaN(n))) return 0;
  const inicioDia = startOfDay(new Date(yi, mi - 1, di));
  let fimDia: Date;
  if (dataFim && dataFim.trim() !== "") {
    const [yf, mf, df] = dataFim.split("-").map(Number);
    if ([yf, mf, df].some((n) => Number.isNaN(n))) return 0;
    fimDia = endOfDay(new Date(yf, mf - 1, df));
    if (isAfter(inicioDia, fimDia)) return 0;
  } else {
    fimDia = endOfDay(addMonths(inicioDia, MESES_SEM_FIM_PADRAO));
  }
  let n = 0;
  for (const dia of eachDayOfInterval({ start: inicioDia, end: fimDia })) {
    if (diasSet.has(dia.getDay())) n++;
  }
  return n;
}

export function gerarLinhasRemada(input: GerarRemadasInput): RemadaLinha[] {
  const base = combinarDataHoraLocal(input.dataInicio, input.hora);
  if (!base || input.vagas < 1 || input.vagas > 99) return [];

  if (!input.repete) {
    return [
      {
        id: crypto.randomUUID(),
        data_hora: base.toISOString(),
        vagas: input.vagas,
        preenchidas: 0,
        status: "agendada" as const,
        passou: base.getTime() <= Date.now(),
      },
    ];
  }

  const diasSet = new Set(input.diasSemana);
  if (diasSet.size === 0) return [];

  const nPrevistas = contarOcorrenciasRepeticao(
    input.dataInicio,
    input.diasSemana,
    input.dataFim,
    true
  );
  if (nPrevistas > REMADA_MAX_OCORRENCIAS_POR_LOTE) return [];

  const [yi, mi, di] = input.dataInicio.split("-").map(Number);
  const inicioDia = startOfDay(new Date(yi, mi - 1, di));
  let fimDia: Date;
  if (input.dataFim && input.dataFim.trim() !== "") {
    const [yf, mf, df] = input.dataFim.split("-").map(Number);
    fimDia = endOfDay(new Date(yf, mf - 1, df));
    if (isAfter(inicioDia, fimDia)) return [];
  } else {
    fimDia = endOfDay(addMonths(inicioDia, MESES_SEM_FIM_PADRAO));
  }

  const intervalo = eachDayOfInterval({ start: inicioDia, end: fimDia });
  const [hh, mm] = input.hora.split(":").map(Number);
  if ([hh, mm].some((n) => Number.isNaN(n))) return [];
  const linhas: RemadaLinha[] = [];

  for (const dia of intervalo) {
    if (!diasSet.has(dia.getDay())) continue;
    const dt = new Date(dia);
    dt.setHours(hh, mm, 0, 0);
    linhas.push({
      id: crypto.randomUUID(),
      data_hora: dt.toISOString(),
      vagas: input.vagas,
      preenchidas: 0,
      status: "agendada" as const,
      passou: dt.getTime() <= Date.now(),
    });
  }

  return linhas;
}
