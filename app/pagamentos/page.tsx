import Link from "next/link";
import { MonthNav } from "@/components/pagamentos/MonthNav";
import { PaymentToggle } from "@/components/pagamentos/PaymentToggle";
import { ConfiguracaoSupabase } from "@/components/ConfiguracaoSupabase";
import { PageShell } from "@/components/PageShell";
import { QueryErrorPanel } from "@/components/QueryErrorPanel";
import { createClient } from "@/lib/supabase/server";
import { mesFromSearchParam } from "@/lib/mes-query";
import { formatPostgrestError } from "@/lib/supabase-error";

export const dynamic = "force-dynamic";

type Search = { mes?: string | string[] };

export default async function PagamentosPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const mes = mesFromSearchParam(sp.mes);

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

  const { data: alunos, error: errAlunos } = await supabase
    .from("alunos")
    .select("id, nome, email, telefone, status")
    .order("nome");

  const { data: pagamentos, error: errPag } = await supabase
    .from("pagamentos_mensais")
    .select("aluno_id, status, pago_em")
    .eq("mes", mes);

  if (errAlunos || errPag) {
    const partes = [
      errAlunos && `Alunos: ${formatPostgrestError(errAlunos)}`,
      errPag && `Pagamentos: ${formatPostgrestError(errPag)}`,
    ].filter(Boolean) as string[];

    return (
      <PageShell>
        <QueryErrorPanel
          message={partes.join("\n\n")}
          contexto="Operação: leitura (GET) nas tabelas alunos e pagamentos_mensais."
        />
      </PageShell>
    );
  }

  const mapa = new Map(
    (pagamentos ?? []).map((p) => [p.aluno_id, p] as const)
  );

  return (
    <PageShell>
      <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Pagamentos
          </h1>
          <p className="mt-1 max-w-md text-sm leading-relaxed text-muted-foreground">
            Mensalidade por aluno no mês selecionado. Interruptor verde =
            pago, vermelho = pendente. Ao marcar pago, a data/hora é gravada
            automaticamente.
          </p>
        </div>
        <MonthNav mesAtual={mes} />
      </div>

      <ul className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {(alunos ?? []).map((a) => {
          const p = mapa.get(a.id);
          const status = (p?.status as "pendente" | "pago") ?? "pendente";
          const isPago = status === "pago";
          return (
            <li
              key={a.id}
              className="flex flex-wrap items-center gap-4 border-b border-border px-4 py-4 transition last:border-0 hover:bg-muted/40 sm:px-5"
            >
              <div
                className={`h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-card ${
                  isPago ? "bg-emerald-500" : "bg-red-500"
                }`}
                title={isPago ? "Pago" : "Pendente"}
              />
              <div className="min-w-0 flex-1">
                <Link
                  href={`/alunos/${a.id}`}
                  className="font-medium underline-offset-2 hover:text-primary hover:underline"
                >
                  {a.nome}
                </Link>
                <p className="truncate text-xs text-muted-foreground">
                  {[a.email, a.telefone].filter(Boolean).join(" · ") || "—"}
                </p>
                {isPago && p?.pago_em && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Pago em{" "}
                    {new Date(p.pago_em).toLocaleString("pt-BR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3 sm:gap-4">
                <span
                  className={`hidden text-xs font-medium sm:inline ${
                    isPago ? "text-emerald-700" : "text-red-600"
                  }`}
                >
                  {isPago ? "Pago" : "Pendente"}
                </span>
                <PaymentToggle
                  alunoId={a.id}
                  mes={mes}
                  initialStatus={status}
                />
              </div>
            </li>
          );
        })}
      </ul>

      {alunos?.length === 0 && (
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-10 text-center">
          <p className="text-sm text-muted-foreground">
            Nenhum aluno cadastrado. Inclua registros na tabela{" "}
            <code className="rounded bg-muted px-1.5 py-0.5">alunos</code> no
            Supabase.
          </p>
        </div>
      )}
    </PageShell>
  );
}
