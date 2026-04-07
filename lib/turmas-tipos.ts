import { LABEL_DIA_SEMANA, ORDEM_DIA_SEMANA } from "@/lib/remadas-geracao";

export type TurmaStatus = "ativa" | "inativa";

export type TurmaAluno = {
  id: string;
  nome: string;
  avatar_url?: string | null;
};

export type TurmaLinha = {
  id: string;
  nome: string;
  /** Array de valores de `Date.getDay()` (0=Dom…6=Sáb). */
  dias_semana: number[];
  /** Formato `HH:mm` (ex.: "07:00"). */
  hora: string;
  vagas: number;
  status: TurmaStatus;
  /** Alunos inscritos nesta turma (populated quando disponível). */
  alunos: TurmaAluno[];
  created_at: string;
};

export const TURMA_VAGAS_MIN = 1;
export const TURMA_VAGAS_MAX = 99;

/** Converte uma linha crua do Supabase para `TurmaLinha`. */
export function mapearLinhaTurma(
  row: Record<string, unknown>
): TurmaLinha | null {
  if (row.id == null) return null;

  const diasRaw = row.dias_semana;
  let dias: number[] = [];
  if (Array.isArray(diasRaw)) {
    dias = diasRaw
      .map((d) => Number(d))
      .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
  }
  dias = ORDEM_DIA_SEMANA.filter((d) => dias.includes(d));

  const hora =
    typeof row.hora === "string"
      ? row.hora.trim().slice(0, 5)
      : typeof row.hora_inicio === "string"
        ? row.hora_inicio.trim().slice(0, 5)
        : "00:00";

  const vagasRaw = Number(row.vagas);
  const vagas =
    Number.isFinite(vagasRaw) &&
    vagasRaw >= TURMA_VAGAS_MIN &&
    vagasRaw <= TURMA_VAGAS_MAX
      ? Math.trunc(vagasRaw)
      : TURMA_VAGAS_MIN;

  const statusRaw =
    typeof row.status === "string" ? row.status.trim().toLowerCase() : "";
  const status: TurmaStatus = statusRaw === "inativa" ? "inativa" : "ativa";

  const nome =
    typeof row.nome === "string" && row.nome.trim()
      ? row.nome.trim()
      : labelTurmaAuto({ dias_semana: dias, hora });

  return {
    id: String(row.id),
    nome,
    dias_semana: dias,
    hora,
    vagas,
    status,
    alunos: [],
    created_at:
      typeof row.created_at === "string"
        ? row.created_at
        : new Date().toISOString(),
  };
}

/** Gera uma label legível a partir dos dados da turma (para nome automático). */
export function labelTurmaAuto({
  dias_semana,
  hora,
}: {
  dias_semana: number[];
  hora: string;
}): string {
  const dias = ORDEM_DIA_SEMANA.filter((d) => dias_semana.includes(d))
    .map((d) => LABEL_DIA_SEMANA[d])
    .join(", ");
  return dias ? `${dias} — ${hora}` : hora;
}
