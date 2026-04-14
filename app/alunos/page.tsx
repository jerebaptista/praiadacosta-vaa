import { ConfiguracaoSupabase } from "@/components/ConfiguracaoSupabase";
import { PageShell } from "@/components/PageShell";
import { QueryErrorPanel } from "@/components/QueryErrorPanel";
import { AlunosClient } from "@/components/alunos/alunos-client";
import type { AlunoLinha } from "@/components/alunos/alunos-tabela";
import type { PlanoOpcao, TurmaSlot } from "@/components/alunos/criar-aluno-dialog";
import {
  ALUNOS_SELECT_LISTAGEM_ADMIN,
  alunoCriadoEmIso,
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
  let planosRows: {
    id: string;
    nome: string;
    remadas_por_semana: unknown;
    preco_mensal: unknown;
    preco_trimestral?: unknown;
    preco_semestral?: unknown;
    preco_anual?: unknown;
    status?: unknown;
  }[];
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
        .select(
          "id, nome, status, remadas_por_semana, preco_mensal, preco_trimestral, preco_semestral, preco_anual"
        )
        .order("nome"),
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
    const criadoIso = alunoCriadoEmIso(row);
    const cadastroMesId =
      criadoIso && criadoIso.length >= 7 ? criadoIso.slice(0, 7) : null;
    return {
      id: String(a.id),
      nome: String(a.nome ?? ""),
      telefone: a.telefone ? String(a.telefone) : null,
      status: String(a.status ?? "ativo"),
      plano: null,
      turmas: [],
      avatar_url: a.avatar_url ? String(a.avatar_url) : null,
      dadosEdicao: rowToAlunoFormData(row),
      cadastroMesId,
    };
  });

  /* Opções para o filtro de turma na barra de pesquisa */
  const turmasOpcoes = (turmasRows ?? []).map((t) => ({
    dias: Array.isArray(t.dias_semana) ? (t.dias_semana as number[]) : [],
    hora: String(t.hora ?? "").slice(0, 5),
  }));

  /* Só planos ativos: novos alunos não podem escolher plano inativo (alunos atuais mantêm o vínculo). */
  const planosRowsAtivos = (planosRows ?? []).filter((p) => {
    const s = String(p.status ?? "ativo").toLowerCase();
    return s !== "inativo";
  });

  /* Planos completos para o dialog */
  const planos: PlanoOpcao[] = planosRowsAtivos.map((p) => ({
    id: String(p.id),
    nome: String(p.nome ?? ""),
    remadas_por_semana: Number(p.remadas_por_semana ?? 1),
    preco_mensal:
      p.preco_mensal != null && String(p.preco_mensal).trim() !== ""
        ? Number(p.preco_mensal)
        : null,
    preco_trimestral:
      p.preco_trimestral != null && String(p.preco_trimestral).trim() !== ""
        ? Number(p.preco_trimestral)
        : null,
    preco_semestral:
      p.preco_semestral != null && String(p.preco_semestral).trim() !== ""
        ? Number(p.preco_semestral)
        : null,
    preco_anual:
      p.preco_anual != null && String(p.preco_anual).trim() !== ""
        ? Number(p.preco_anual)
        : null,
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
