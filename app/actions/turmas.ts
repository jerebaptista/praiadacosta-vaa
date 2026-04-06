"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { formatPostgrestError } from "@/lib/supabase-error";
import {
  mapearLinhaTurma,
  TURMA_VAGAS_MAX,
  TURMA_VAGAS_MIN,
  type TurmaLinha,
  type TurmaStatus,
} from "@/lib/turmas-tipos";
import { normalizarHoraHm } from "@/lib/remadas-validacao";

const ORDEM_DIA_SEMANA = [1, 2, 3, 4, 5, 6, 0] as const;
const SET_DIAS = new Set(ORDEM_DIA_SEMANA);

function sanitizarDias(input: unknown): number[] {
  if (!Array.isArray(input)) return [];
  const vistos = new Set<number>();
  const out: number[] = [];
  for (const x of input) {
    const n = typeof x === "number" ? x : Number(x);
    if (!Number.isInteger(n) || !SET_DIAS.has(n as (typeof ORDEM_DIA_SEMANA)[number])) continue;
    if (!vistos.has(n)) { vistos.add(n); out.push(n); }
  }
  return ORDEM_DIA_SEMANA.filter((d) => out.includes(d));
}

function sanitizarVagas(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number(String(v).replace(/\D/g, ""));
  if (!Number.isInteger(n) || n < TURMA_VAGAS_MIN || n > TURMA_VAGAS_MAX) return null;
  return n;
}

export type CriarTurmaInput = {
  nome?: string;
  dias_semana: number[];
  hora: string;
  vagas: number | string;
};

export async function listarTurmas(): Promise<TurmaLinha[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("turmas")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    // Tabela ainda não existe (42P01) — retorna vazio enquanto a migração não é executada.
    if ((error as { code?: string }).code === "42P01") return [];
    throw new Error(formatPostgrestError(error));
  }

  return (data ?? [])
    .map((r) => mapearLinhaTurma(r as Record<string, unknown>))
    .filter((r): r is TurmaLinha => r != null);
}

export async function criarTurma(input: CriarTurmaInput): Promise<TurmaLinha> {
  const dias = sanitizarDias(input.dias_semana);
  if (dias.length === 0)
    throw new Error("Selecione pelo menos um dia da semana.");

  const hora = normalizarHoraHm(input.hora);
  if (!hora) throw new Error("Horário inválido.");

  const vagas = sanitizarVagas(input.vagas);
  if (vagas == null)
    throw new Error(`Vagas deve ser entre ${TURMA_VAGAS_MIN} e ${TURMA_VAGAS_MAX}.`);

  const nome =
    typeof input.nome === "string" && input.nome.trim()
      ? input.nome.trim().slice(0, 120)
      : "";

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("turmas")
    .insert({ nome, dias_semana: dias, hora, vagas, status: "ativa" })
    .select("*")
    .single();

  if (error) throw new Error(formatPostgrestError(error));

  const linha = mapearLinhaTurma(data as Record<string, unknown>);
  if (!linha) throw new Error("Erro ao mapear turma criada.");

  revalidatePath("/admin/turmas");
  return linha;
}

export async function atualizarTurma(
  id: string,
  input: CriarTurmaInput
): Promise<void> {
  const tid = id?.trim();
  if (!tid) throw new Error("Turma inválida.");

  const dias = sanitizarDias(input.dias_semana);
  if (dias.length === 0)
    throw new Error("Selecione pelo menos um dia da semana.");

  const hora = normalizarHoraHm(input.hora);
  if (!hora) throw new Error("Horário inválido.");

  const vagas = sanitizarVagas(input.vagas);
  if (vagas == null)
    throw new Error(`Vagas deve ser entre ${TURMA_VAGAS_MIN} e ${TURMA_VAGAS_MAX}.`);

  const nome =
    typeof input.nome === "string" && input.nome.trim()
      ? input.nome.trim().slice(0, 120)
      : "";

  const supabase = await createClient();
  const { error } = await supabase
    .from("turmas")
    .update({ nome, dias_semana: dias, hora, vagas })
    .eq("id", tid);

  if (error) throw new Error(formatPostgrestError(error));
  revalidatePath("/admin/turmas");
}

export async function alterarStatusTurma(
  id: string,
  status: TurmaStatus
): Promise<void> {
  const tid = id?.trim();
  if (!tid) throw new Error("Turma inválida.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("turmas")
    .update({ status })
    .eq("id", tid);

  if (error) throw new Error(formatPostgrestError(error));
  revalidatePath("/admin/turmas");
}

export async function apagarTurma(id: string): Promise<void> {
  const tid = id?.trim();
  if (!tid) throw new Error("Turma inválida.");

  const supabase = await createClient();
  const { error } = await supabase.from("turmas").delete().eq("id", tid);

  if (error) throw new Error(formatPostgrestError(error));
  revalidatePath("/admin/turmas");
}
