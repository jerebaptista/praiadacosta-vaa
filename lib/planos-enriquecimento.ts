import type { PlanoLinha } from "@/lib/planos-tipos";

/** Plano já vindo do banco/mock, antes de juntar contagem e pré-visualização de alunos. */
export type PlanoSemAlunosAgregados = Omit<
  PlanoLinha,
  "alunos_total" | "alunos_ativos_no_plano" | "alunos_preview"
>;

/**
 * Conta alunos por plano e devolve até 3 avatares (ordenados por nome) por plano.
 */
export function enriquecerPlanosComAlunos(
  planos: PlanoSemAlunosAgregados[],
  alunos: Array<{
    id: string;
    nome: string;
    avatar_url: string | null;
    plano_id: string | null;
    /** Se omitido, assume-se ativo (ex.: dados antigos). */
    status?: string | null;
  }>
): PlanoLinha[] {
  const counts = new Map<string, number>();
  const ativosPorPlano = new Map<string, number>();
  const porPlano = new Map<string, typeof alunos>();

  for (const a of alunos) {
    if (a.plano_id == null || String(a.plano_id).trim() === "") continue;
    const pid = String(a.plano_id);
    counts.set(pid, (counts.get(pid) ?? 0) + 1);
    const st = String(a.status ?? "ativo").toLowerCase();
    if (st === "ativo") {
      ativosPorPlano.set(pid, (ativosPorPlano.get(pid) ?? 0) + 1);
    }
    const arr = porPlano.get(pid) ?? [];
    arr.push(a);
    porPlano.set(pid, arr);
  }

  return planos.map((p) => {
    const lista = porPlano.get(p.id) ?? [];
    const ordenados = [...lista].sort((x, y) =>
      x.nome.localeCompare(y.nome, "pt-BR")
    );
    const preview = ordenados.slice(0, 3).map((a) => ({
      id: a.id,
      nome: a.nome,
      avatar_url: a.avatar_url,
    }));
    return {
      ...p,
      alunos_total: counts.get(p.id) ?? 0,
      alunos_ativos_no_plano: ativosPorPlano.get(p.id) ?? 0,
      alunos_preview: preview,
    };
  });
}
