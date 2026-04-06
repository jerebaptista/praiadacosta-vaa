import Link from "next/link";
import { ConfiguracaoSupabase } from "@/components/ConfiguracaoSupabase";
import { PageShell } from "@/components/PageShell";
import { QueryErrorPanel } from "@/components/QueryErrorPanel";
import { STATUS_ALUNO_LABEL } from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";
import { formatPostgrestError } from "@/lib/supabase-error";

export const dynamic = "force-dynamic";

export default async function AlunosPage() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return (
      <PageShell>
        <ConfiguracaoSupabase />
      </PageShell>
    );
  }

  const supabase = await createClient();
  const { data: alunos, error } = await supabase
    .from("alunos")
    .select("id, nome, email, telefone, status")
    .order("nome");

  if (error) {
    return (
      <PageShell>
        <QueryErrorPanel
          message={formatPostgrestError(error)}
          contexto="Operação: leitura (GET) na tabela alunos."
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
          Alunos
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Toque no nome para abrir o perfil, créditos e agendamentos.
        </p>
      </div>

      <ul className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm">
        {(alunos ?? []).map((a) => (
          <li key={a.id} className="border-b border-zinc-100 last:border-0">
            <Link
              href={`/alunos/${a.id}`}
              className="flex flex-wrap items-center justify-between gap-2 px-4 py-4 transition hover:bg-zinc-50/80 sm:px-5"
            >
              <span className="font-medium text-zinc-900">{a.nome}</span>
              <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600">
                {STATUS_ALUNO_LABEL[a.status] ?? a.status}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {alunos?.length === 0 && (
        <div className="mt-8 rounded-2xl border border-dashed border-zinc-300 bg-white/60 px-6 py-10 text-center">
          <p className="text-sm text-zinc-600">Nenhum aluno cadastrado.</p>
        </div>
      )}
    </PageShell>
  );
}
