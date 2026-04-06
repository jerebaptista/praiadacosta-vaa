import {
  addMonths,
  eachDayOfInterval,
  endOfDay,
  isAfter,
  isValid,
  parse,
  startOfDay,
} from "date-fns";
import {
  MESES_SEM_FIM_PADRAO,
  ORDEM_DIA_SEMANA,
  REMADA_MAX_OCORRENCIAS_POR_LOTE,
  contarOcorrenciasRepeticao,
  type GerarRemadasInput,
} from "@/lib/remadas-geracao";

/** Espelha `public.remadas` (check constraints). */
export const REMADA_VAGAS_MIN = 1;
export const REMADA_VAGAS_MAX = 99;

export { REMADA_MAX_OCORRENCIAS_POR_LOTE } from "@/lib/remadas-geracao";

/** Com data fim explícita, não aceitar intervalo maior (meses). */
export const REMADA_REPETICAO_MAX_MESES = 24;

const DATA_YMD = /^\d{4}-\d{2}-\d{2}$/;

const SET_DIA_SEMANA_VALIDO = new Set<number>(ORDEM_DIA_SEMANA);

export type PayloadCriarRemadasBruto = {
  dataInicio?: unknown;
  hora?: unknown;
  vagas?: unknown;
  repete?: unknown;
  diasSemana?: unknown;
  dataFim?: unknown;
};

/**
 * Data `yyyy-MM-dd` real (rejeita 31/02, strings com lixo, etc.).
 */
export function normalizarDataYmd(s: unknown): string | null {
  if (typeof s !== "string") return null;
  const t = s.trim();
  if (!DATA_YMD.test(t)) return null;
  const d = parse(t, "yyyy-MM-dd", new Date());
  if (!isValid(d)) return null;
  const [y, mo, day] = t.split("-").map(Number);
  if (
    d.getFullYear() !== y ||
    d.getMonth() !== mo - 1 ||
    d.getDate() !== day
  ) {
    return null;
  }
  return t;
}

/**
 * Hora `HH:mm` com minutos alinhados ao UI (de 5 em 5) e hora 00–23.
 */
export function normalizarHoraHm(s: unknown): string | null {
  if (typeof s !== "string") return null;
  const t = s.trim();
  const m = /^(\d{2}):(\d{2})$/.exec(t);
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isInteger(hh) || hh < 0 || hh > 23) return null;
  if (!Number.isInteger(mm) || mm < 0 || mm > 59 || mm % 5 !== 0) {
    return null;
  }
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

export function sanitizarDiasSemana(input: unknown): number[] {
  if (!Array.isArray(input)) return [];
  const vistos = new Set<number>();
  const escolhidos: number[] = [];
  for (const x of input) {
    const n = typeof x === "number" ? x : Number(x);
    if (!Number.isInteger(n) || !SET_DIA_SEMANA_VALIDO.has(n)) continue;
    if (vistos.has(n)) continue;
    vistos.add(n);
    escolhidos.push(n);
  }
  return ORDEM_DIA_SEMANA.filter((d) => escolhidos.includes(d));
}

export function normalizarVagas(input: unknown): number | null {
  if (typeof input === "number" && Number.isInteger(input)) {
    if (input < REMADA_VAGAS_MIN || input > REMADA_VAGAS_MAX) return null;
    return input;
  }
  if (typeof input !== "string") return null;
  const digits = input.replace(/\D/g, "");
  if (digits === "") return null;
  const n = Number.parseInt(digits, 10);
  if (!Number.isFinite(n) || n < REMADA_VAGAS_MIN || n > REMADA_VAGAS_MAX) {
    return null;
  }
  return n;
}

function fimIntervaloGeracao(
  dataInicioYmd: string,
  dataFimYmd: string | null,
  repete: boolean
): Date | null {
  const inicioNorm = normalizarDataYmd(dataInicioYmd);
  if (!inicioNorm || !repete) return null;
  const [yi, mi, di] = inicioNorm.split("-").map(Number);
  const inicioDia = startOfDay(new Date(yi, mi - 1, di));
  if (!isValid(inicioDia)) return null;

  if (dataFimYmd && dataFimYmd.trim() !== "") {
    const fimNorm = normalizarDataYmd(dataFimYmd);
    if (!fimNorm) return null;
    const [yf, mf, df] = fimNorm.split("-").map(Number);
    const fimDia = endOfDay(new Date(yf, mf - 1, df));
    if (!isValid(fimDia) || isAfter(inicioDia, fimDia)) return null;

    const teto = endOfDay(addMonths(inicioDia, REMADA_REPETICAO_MAX_MESES));
    if (isAfter(fimDia, teto)) return null;
    return fimDia;
  }

  return endOfDay(addMonths(inicioDia, MESES_SEM_FIM_PADRAO));
}

/**
 * Conta dias no intervalo de geração (repetição), para limitar tamanho do lote.
 */
export function contarDiasNoIntervaloGeracao(
  dataInicioYmd: string,
  dataFimYmd: string | null,
  repete: boolean
): number {
  if (!repete) return 1;
  const fim = fimIntervaloGeracao(dataInicioYmd, dataFimYmd, true);
  if (!fim) return 0;
  const inicioNorm = normalizarDataYmd(dataInicioYmd);
  if (!inicioNorm) return 0;
  const [yi, mi, di] = inicioNorm.split("-").map(Number);
  const inicioDia = startOfDay(new Date(yi, mi - 1, di));
  if (!isValid(inicioDia) || isAfter(inicioDia, fim)) return 0;
  return eachDayOfInterval({ start: inicioDia, end: fim }).length;
}

export function validarPayloadCriacaoRemadas(
  raw: PayloadCriarRemadasBruto
):
  | { ok: true; payload: GerarRemadasInput }
  | { ok: false; erro: string } {
  const dataInicio = normalizarDataYmd(raw.dataInicio);
  if (!dataInicio) {
    return { ok: false, erro: "Data inválida." };
  }

  const hora = normalizarHoraHm(raw.hora);
  if (!hora) {
    return { ok: false, erro: "Horário inválido." };
  }

  const vagas = normalizarVagas(raw.vagas);
  if (vagas == null) {
    return {
      ok: false,
      erro: `Vagas deve ser um número entre ${REMADA_VAGAS_MIN} e ${REMADA_VAGAS_MAX}.`,
    };
  }

  const repete = raw.repete === true;

  let diasSemana: number[] = [];
  let dataFim: string | null = null;

  if (repete) {
    diasSemana = sanitizarDiasSemana(raw.diasSemana);
    if (diasSemana.length < 1) {
      return {
        ok: false,
        erro: "Com repetição, selecione pelo menos um dia da semana.",
      };
    }

    if (raw.dataFim != null && raw.dataFim !== "") {
      if (typeof raw.dataFim !== "string") {
        return { ok: false, erro: "Data fim inválida." };
      }
      const f = normalizarDataYmd(raw.dataFim);
      if (!f) {
        return { ok: false, erro: "Data fim inválida." };
      }
      const inicioD = startOfDay(parse(dataInicio, "yyyy-MM-dd", new Date()));
      const fimD = startOfDay(parse(f, "yyyy-MM-dd", new Date()));
      if (!isValid(inicioD) || !isValid(fimD) || isAfter(inicioD, fimD)) {
        return {
          ok: false,
          erro: "Data fim deve ser igual ou posterior à data inicial.",
        };
      }
      const teto = endOfDay(addMonths(inicioD, REMADA_REPETICAO_MAX_MESES));
      if (isAfter(fimD, teto)) {
        return {
          ok: false,
          erro: `Data fim não pode ultrapassar ${REMADA_REPETICAO_MAX_MESES} meses após a data inicial.`,
        };
      }
      dataFim = f;
    }

    const diasNoIntervalo = contarDiasNoIntervaloGeracao(
      dataInicio,
      dataFim,
      true
    );
    if (diasNoIntervalo < 1) {
      return { ok: false, erro: "Intervalo de datas inválido." };
    }

    const ocorrencias = contarOcorrenciasRepeticao(
      dataInicio,
      diasSemana,
      dataFim,
      true
    );
    if (ocorrencias > REMADA_MAX_OCORRENCIAS_POR_LOTE) {
      return {
        ok: false,
        erro: `Este período geraria mais de ${REMADA_MAX_OCORRENCIAS_POR_LOTE} remadas. Reduza o intervalo ou os dias.`,
      };
    }
    if (ocorrencias < 1) {
      return {
        ok: false,
        erro: "Não há ocorrências no intervalo para os dias selecionados.",
      };
    }
  }

  return {
    ok: true,
    payload: {
      dataInicio,
      hora,
      vagas,
      repete,
      diasSemana: repete ? diasSemana : [],
      dataFim: repete ? dataFim : null,
    },
  };
}

/** Formato aceite pelo insert em `public.remadas` (sem `id`). */
export function linhaParaInsertRemada(l: {
  data_hora: string;
  vagas: number;
}): { data_hora: string; vagas: number; status: "agendada" } {
  return {
    data_hora: l.data_hora,
    vagas: l.vagas,
    status: "agendada",
  };
}
