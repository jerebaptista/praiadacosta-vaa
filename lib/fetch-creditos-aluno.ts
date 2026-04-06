import type { SupabaseClient } from "@supabase/supabase-js";

export type FonteCreditos = "creditos" | "creditos_aula";

export async function fetchCreditosDoAluno(
  supabase: SupabaseClient,
  alunoId: string
): Promise<{
  rows: Record<string, unknown>[];
  erro: { message: string } | null;
  fonte: FonteCreditos | null;
}> {
  const r1 = await supabase.from("creditos").select("*").eq("aluno_id", alunoId);

  if (!r1.error) {
    return {
      rows: (r1.data ?? []) as Record<string, unknown>[],
      erro: null,
      fonte: "creditos",
    };
  }

  const r2 = await supabase
    .from("creditos_aula")
    .select("*")
    .eq("aluno_id", alunoId);

  if (!r2.error) {
    return {
      rows: (r2.data ?? []) as Record<string, unknown>[],
      erro: null,
      fonte: "creditos_aula",
    };
  }

  return {
    rows: [],
    erro: r2.error ?? r1.error,
    fonte: null,
  };
}
