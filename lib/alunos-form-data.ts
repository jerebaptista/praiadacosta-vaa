/** Tipos e helpers compartilhados — não podem ficar em arquivo `"use server"`. */

export type AlunoFormData = {
  id: string;
  nome: string;
  cpf: string | null;
  telefone: string | null;
  email: string | null;
  data_nascimento: string | null;
  sexo: string | null;
  cep: string | null;
  logradouro: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  numero: string | null;
  complemento: string | null;
  plano_id: string | null;
  avatar_url: string | null;
};

/**
 * Leitura mínima compatível com `schema.sql` base (sem migrações extras em `alunos`).
 * Colunas como `cpf`, `avatar_url`, `plano_id`, endereço, etc. não são pedidas aqui —
 * bases sem elas geram 42703 no PostgREST. Campos extra no formulário ficam `null` até
 * correres `supabase/migrations/20260407000000_alunos_colunas_extras.sql` (e afins).
 */
export const ALUNOS_SELECT_LISTAGEM_ADMIN =
  "id, nome, email, telefone, data_nascimento, status";

/** Mesmo núcleo que a listagem — evita 42703 se `created_at` / `criado_em` tiver outro nome na base. */
export const ALUNOS_SELECT_PERFIL = ALUNOS_SELECT_LISTAGEM_ADMIN;

/** Data de cadastro quando a linha incluir `criado_em` ou `created_at` (ex.: outro `select`). */
export function alunoCriadoEmIso(row: Record<string, unknown>): string | null {
  const v = row.criado_em ?? row.created_at;
  return v != null && String(v).trim() !== "" ? String(v) : null;
}

export function rowToAlunoFormData(row: Record<string, unknown>): AlunoFormData {
  const str = (v: unknown) => (v != null ? String(v) : null);
  return {
    id: String(row.id ?? ""),
    nome: String(row.nome ?? ""),
    cpf: str(row.cpf),
    telefone: str(row.telefone),
    email: str(row.email),
    data_nascimento: str(row.data_nascimento),
    sexo: str(row.sexo),
    cep: str(row.cep),
    logradouro: str(row.logradouro),
    bairro: str(row.bairro),
    cidade: str(row.cidade),
    estado: str(row.estado),
    numero: str(row.numero),
    complemento: str(row.complemento),
    plano_id: str(row.plano_id),
    avatar_url: str(row.avatar_url),
  };
}
