import { ConfiguracaoSupabase } from "@/components/ConfiguracaoSupabase";
import { PageShell } from "@/components/PageShell";
import { QueryErrorPanel } from "@/components/QueryErrorPanel";
import { AlunosClient } from "@/components/alunos/alunos-client";
import type { AlunoLinha } from "@/components/alunos/alunos-tabela";
import type { PlanoOpcao, TurmaSlot } from "@/components/alunos/criar-aluno-dialog";
import {
  ALUNOS_SELECT_LISTAGEM_ADMIN,
  rowToAlunoFormData,
} from "@/lib/alunos-form-data";
import { useDataMock } from "@/lib/data-mock";
import {
  mockAlunosParaPaginaListagem,
  mockPlanosOrdenadosPreco,
  mockTurmasAtivasRaw,
} from "@/lib/mock-data/server";
import { createClient } from "@/lib/supabase/server";
import { formatPostgrestError, supabaseErroEhRede } from "@/lib/supabase-error";
import { ORDEM_DIA_SEMANA } from "@/lib/remadas-geracao";

export const dynamic = "force-dynamic";

export default async function AlunosPage() {
  const mock = useDataMock();

  if (
    !mock &&
    (!process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  ) {
    return (
      <PageShell>
        <ConfiguracaoSupabase />
      </PageShell>
    );
  }

  let rows: Record<string, unknown>[] | null;
  let turmasRows: { id: string; dias_semana: unknown; hora: unknown; vagas?: unknown; status: string }[];
  let planosRows: { id: string; nome: string; remadas_por_semana: unknown; preco_mensal: unknown }[];
  let error: { message: string; code?: string; details?: string | null } | null = null;

  if (mock) {
    rows = mockAlunosParaPaginaListagem() as Record<string, unknown>[];
    turmasRows = mockTurmasAtivasRaw();
    planosRows = mockPlanosOrdenadosPreco();
  } else {
    const supabase = await createClient();
    const [alRes, turRes, planRes] = await Promise.all([
      supabase.from("alunos").select(ALUNOS_SELECT_LISTAGEM_ADMIN).order("nome"),
      supabase
        .from("turmas")
        .select("id, dias_semana, hora, vagas, status")
        .eq("status", "ativa"),
      supabase
        .from("planos")
        .select("id, nome, remadas_por_semana, preco_mensal")
        .order("preco_mensal"),
    ]);
    error = alRes.error;
    rows = (alRes.data ?? []) as Record<string, unknown>[];
    turmasRows = (turRes.data ?? []) as typeof turmasRows;
    planosRows = (planRes.data ?? []) as typeof planosRows;
  }

  if (error) {
    return (
      <PageShell>
        <QueryErrorPanel
          message={formatPostgrestError(error)}
          contexto="Operação: leitura (GET) na tabela alunos."
          erroRede={supabaseErroEhRede(error)}
        />
      </PageShell>
    );
  }

  const alunos: AlunoLinha[] = (rows ?? []).map((a) => {
    const row = a as Record<string, unknown>;
    return {
      id: String(a.id),
      nome: String(a.nome ?? ""),
      telefone: a.telefone ? String(a.telefone) : null,
      status: String(a.status ?? "ativo"),
      plano: null,
      turmas: [],
      avatar_url: a.avatar_url ? String(a.avatar_url) : null,
      dadosEdicao: rowToAlunoFormData(row),
    };
  });

  /* Opções para o filtro de turma na barra de pesquisa */
  const turmasOpcoes = (turmasRows ?? []).map((t) => ({
    dias: Array.isArray(t.dias_semana) ? (t.dias_semana as number[]) : [],
    hora: String(t.hora ?? "").slice(0, 5),
  }));

  /* Planos completos para o dialog */
  const planos: PlanoOpcao[] = (planosRows ?? []).map((p) => ({
    id: String(p.id),
    nome: String(p.nome ?? ""),
    remadas_por_semana: Number(p.remadas_por_semana ?? 1),
    preco_mensal: Number(p.preco_mensal ?? 0),
  }));

  /* Slots individuais de turma (turma × dia) para o dialog */
  const turmaSlots: TurmaSlot[] = [];
  for (const t of turmasRows ?? []) {
    const dias = Array.isArray(t.dias_semana) ? (t.dias_semana as number[]) : [];
    const hora = String(t.hora ?? "").slice(0, 5);
    const ordenados = ORDEM_DIA_SEMANA.filter((d) => dias.includes(d));
    for (const dia of ordenados) {
      turmaSlots.push({ turmaId: String(t.id), dia, hora });
    }
  }

  return (
    <PageShell>
      <AlunosClient
        initialAlunos={alunos}
        turmasOpcoes={turmasOpcoes}
        planosOpcoes={[]}
        planos={planos}
        turmaSlots={turmaSlots}
      />
    </PageShell>
  );
}
