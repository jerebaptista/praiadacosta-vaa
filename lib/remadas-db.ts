import type { RemadaStatus } from "@/lib/remadas-geracao";
import { REMADA_STATUS_VALORES } from "@/lib/remadas-geracao";

const COL_RE = /^[a-z_][a-z0-9_]*$/i;

const SET_STATUS = new Set<string>(REMADA_STATUS_VALORES);

const STATUS_TEXTO_RE = /^[a-z_]+$/i;

/**
 * Valor gravado em `remadas.status` ao cancelar. O `schema.sql` do repo usa
 * `cancelada`; algumas bases legadas usam só `cancelado`.
 * Se o cancelar falhar com 23514, defina no `.env.local`:
 * `REMADAS_STATUS_AO_CANCELAR=cancelado` (ou o valor que o teu CHECK aceitar).
 */
export function statusValorGravarCancelamentoRemada(): string {
  const raw = process.env.REMADAS_STATUS_AO_CANCELAR?.trim().toLowerCase();
  if (raw && STATUS_TEXTO_RE.test(raw) && raw.length <= 32) {
    return raw;
  }
  return "cancelada";
}

/**
 * Valor gravado ao concluir (sync automática + ação "Concluir").
 * Muitas bases usam `concluido` em vez de `concluida`. Defina no `.env.local`:
 * `REMADAS_STATUS_AO_CONCLUIR=concluida` (ou `realizada`, `finalizada`, etc.).
 */
export function statusValorGravarConcluidaRemada(): string {
  const raw = process.env.REMADAS_STATUS_AO_CONCLUIR?.trim().toLowerCase();
  if (raw && STATUS_TEXTO_RE.test(raw) && raw.length <= 32) {
    return raw;
  }
  return "concluido";
}

export function normalizarStatusRemada(raw: unknown): RemadaStatus {
  const s =
    typeof raw === "string" ? raw.trim().toLowerCase().replace(/\s+/g, "") : "";
  if (
    s === "cancelada" ||
    s === "cancelado" ||
    s === "cancelled" ||
    s === "canceled" ||
    s === "anulada"
  ) {
    return "cancelada";
  }
  if (
    s === "concluida" ||
    s === "concluída" ||
    s === "concluido" ||
    s === "concluído" ||
    s === "realizada" ||
    s === "finalizada" ||
    s === "feita" ||
    s === "completed" ||
    s === "done"
  ) {
    return "concluida";
  }
  if (SET_STATUS.has(s)) return s as RemadaStatus;
  return "agendada";
}

const CANDIDATOS_COLUNA_VAGAS = [
  "vagas",
  "vagas_disponiveis",
  "vagas_totais",
  "capacidade",
  "max_vagas",
  "lotacao",
] as const;

/**
 * Nome da coluna de vagas em `public.remadas` para **insert/update**.
 * Defina `REMADAS_COLUNA_VAGAS` no `.env.local` se o Postgres usar outro nome.
 * Na **leitura**, também se tentam automaticamente os nomes em `CANDIDATOS_COLUNA_VAGAS`.
 */
export function nomeColunaVagasRemada(): string {
  const raw = process.env.REMADAS_COLUNA_VAGAS?.trim();
  if (raw === undefined || raw === "") return "vagas";
  if (!COL_RE.test(raw)) {
    throw new Error(
      "REMADAS_COLUNA_VAGAS deve ser um identificador SQL simples (letras, números, _)."
    );
  }
  return raw;
}

function candidatosVagasOrdenados(): string[] {
  const extra = process.env.REMADAS_COLUNA_VAGAS?.trim();
  const head =
    extra && COL_RE.test(extra) ? [extra] : ([] as string[]);
  const rest = CANDIDATOS_COLUNA_VAGAS.filter((c) => c !== extra);
  return [...head, ...rest];
}

/**
 * Lê `data_hora` em ISO ou combina colunas legadas (data + horário).
 */
export function extrairDataHoraIso(row: Record<string, unknown>): string | null {
  const dh = row.data_hora;
  if (dh != null && String(dh).trim() !== "") {
    const d = new Date(String(dh));
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }

  const data =
    (typeof row.data === "string" && row.data) ||
    (typeof row.data_aula === "string" && row.data_aula) ||
    (typeof row.dia === "string" && row.dia) ||
    null;
  const hora =
    row.horario ?? row.hora_inicio ?? row.hora ?? row.inicio ?? null;

  if (data && hora != null && String(hora).trim() !== "") {
    const dataStr = String(data).slice(0, 10);
    const h = String(hora).trim();
    const hm = h.length >= 5 ? h.slice(0, 5) : h;
    const d = new Date(`${dataStr}T${hm}:00`);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }

  return null;
}

export function extrairVagasDeRow(row: Record<string, unknown>): number {
  for (const k of candidatosVagasOrdenados()) {
    const v = row[k];
    if (typeof v === "number" && Number.isFinite(v)) {
      const n = Math.trunc(v);
      if (n >= 1 && n <= 99) return n;
    }
    if (v != null && v !== "") {
      const n = Number.parseInt(String(v), 10);
      if (Number.isFinite(n) && n >= 1 && n <= 99) return n;
    }
  }
  return 1;
}

/**
 * Mapeia uma linha do PostgREST (ex.: `select('*')`) para o modelo da app.
 * Devolve `null` se não houver `id` ou data/hora utilizável.
 */
/**
 * `agora` é passado externamente para garantir que todos os registos duma
 * listagem usam exactamente o mesmo instante de referência (calculado no servidor).
 */
export function mapearLinhaRemadaAdmin(
  row: Record<string, unknown>,
  agora: Date
): {
  id: string;
  data_hora: string;
  vagas: number;
  status: RemadaStatus;
  passou: boolean;
} | null {
  if (row.id == null) return null;
  const data_hora = extrairDataHoraIso(row);
  if (!data_hora) return null;
  return {
    id: String(row.id),
    data_hora,
    vagas: extrairVagasDeRow(row),
    status: normalizarStatusRemada(row.status),
    passou: new Date(data_hora).getTime() <= agora.getTime(),
  };
}

export function ordenarRemadasPorDataHora<T extends { data_hora: string }>(
  linhas: T[]
): T[] {
  return [...linhas].sort(
    (a, b) =>
      new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime()
  );
}
