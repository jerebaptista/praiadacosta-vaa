import Link from "next/link";
import { notFound } from "next/navigation";
import { DarCreditoModal } from "@/components/alunos/DarCreditoModal";
import { ConfiguracaoSupabase } from "@/components/ConfiguracaoSupabase";
import { PageShell } from "@/components/PageShell";
import { QueryErrorPanel } from "@/components/QueryErrorPanel";
import { saldoCreditosAula } from "@/lib/creditos-aula-saldo";
import {
  creditoSortTime,
  linhasParaSaldo,
} from "@/lib/creditos-normalize";
import { saldoCreditos } from "@/lib/creditos-saldo";
import {
  fetchCreditosDoAluno,
  type FonteCreditos,
} from "@/lib/fetch-creditos-aluno";
import { mesAtualPrimeiroDia } from "@/lib/dates";
import {
  MOTIVO_CREDITO_LABEL,
  STATUS_AGENDAMENTO_LABEL,
  STATUS_ALUNO_LABEL,
  STATUS_CREDITO_LABEL,
} from "@/lib/labels";
import {
  ALUNOS_SELECT_LISTAGEM_ADMIN,
  alunoCriadoEmIso,
} from "@/lib/alunos-form-data";
import { useDataMock } from "@/lib/data-mock";
import { getMockDb } from "@/lib/mock-data/store";
import { pickRemadaDataHora } from "@/lib/remada-display";
import { formatarTelefoneBrasilExibicao } from "@/lib/telefone-br";
import { createClient } from "@/lib/supabase/server";
import { formatPostgrestError, supabaseErroEhRede } from "@/lib/supabase-error";

export const dynamic = "force-dynamic";

type AgRow = {
  id: string;
  remada_id: string;
  status: string;
  criado_em: string | null;
  remadas?: Record<string, unknown> | Record<string, unknown>[] | null;
};

function remadaFromEmbed(ag: AgRow): Record<string, unknown> | null {
  const r = ag.remadas;
  if (r == null) return null;
  if (Array.isArray(r)) {
    const first = r[0];
    return first && typeof first === "object"
      ? (first as Record<string, unknown>)
      : null;
  }
  return typeof r === "object" ? (r as Record<string, unknown>) : null;
}

export default async function AlunoPerfilPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

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

  const mes = mesAtualPrimeiroDia();

  type AlunoCab = {
    id: string;
    nome: string;
    email: string | null;
    telefone: string | null;
    data_nascimento: string | null;
    status: string;
    criado_em: string | null;
  };

  let aluno: AlunoCab;
  let pagamentoMes: { status: string; pago_em: string | null } | null;
  let creditosErro: { message: string } | null;
  let creditosList: Record<string, unknown>[];
  let saldo: { disponiveis: number; usados: number; expirados: number };
  let fonteCreditos: FonteCreditos | null;
  const remadaMap = new Map<string, Record<string, unknown>>();
  let agendamentosRows: AgRow[] = [];

  if (mock) {
    const row = getMockDb().alunos.find((a) => String(a.id) === id);
    if (!row) notFound();
    aluno = {
      id: String(row.id),
      nome: String(row.nome ?? ""),
      email: row.email ? String(row.email) : null,
      telefone: row.telefone ? String(row.telefone) : null,
      data_nascimento: row.data_nascimento ? String(row.data_nascimento) : null,
      status: String(row.status ?? "ativo"),
      criado_em: alunoCriadoEmIso(row as Record<string, unknown>),
    };
    pagamentoMes =
      getMockDb().pagamentos.find((p) => p.aluno_id === id && p.mes === mes) ??
      null;
    creditosErro = null;
    creditosList = [];
    saldo = { disponiveis: 0, usados: 0, expirados: 0 };
    fonteCreditos = "creditos" satisfies FonteCreditos;
  } else {
    const supabase = await createClient();

    const { data: alunoDb, error: errAluno } = await supabase
      .from("alunos")
      .select(ALUNOS_SELECT_LISTAGEM_ADMIN)
      .eq("id", id)
      .maybeSingle();

    if (errAluno) {
      return (
        <PageShell>
          <QueryErrorPanel
            message={formatPostgrestError(errAluno)}
            contexto="Operação: leitura (GET) do aluno por id."
            erroRede={supabaseErroEhRede(errAluno)}
          />
        </PageShell>
      );
    }

    if (!alunoDb) notFound();

    const alunoRaw = alunoDb as Record<string, unknown>;
    aluno = {
      id: String(alunoRaw.id ?? ""),
      nome: String(alunoRaw.nome ?? ""),
      email: alunoRaw.email ? String(alunoRaw.email) : null,
      telefone: alunoRaw.telefone ? String(alunoRaw.telefone) : null,
      data_nascimento: alunoRaw.data_nascimento
        ? String(alunoRaw.data_nascimento)
        : null,
      status: String(alunoRaw.status ?? "ativo"),
      criado_em: alunoCriadoEmIso(alunoRaw),
    };

    const { data: pagMes } = await supabase
      .from("pagamentos_mensais")
      .select("status, pago_em")
      .eq("aluno_id", id)
      .eq("mes", mes)
      .maybeSingle();

    pagamentoMes = pagMes ?? null;

    const {
      rows: creditosRaw,
      erro: creditosErroObj,
      fonte: fc,
    } = await fetchCreditosDoAluno(supabase, id);

    creditosErro = creditosErroObj;
    creditosList = [...creditosRaw].sort((a, b) =>
      creditoSortTime(b) - creditoSortTime(a)
    );
    saldo =
      fc === "creditos_aula"
        ? saldoCreditosAula(creditosList)
        : saldoCreditos(linhasParaSaldo(creditosList));
    fonteCreditos = fc;

    const agRes = await supabase
      .from("agendamentos")
      .select("id, remada_id, status, criado_em, remadas(*)")
      .eq("aluno_id", id)
      .order("criado_em", { ascending: false, nullsFirst: false });

    if (!agRes.error && agRes.data) {
      agendamentosRows = agRes.data as AgRow[];
    } else {
      const plain = await supabase
        .from("agendamentos")
        .select("id, remada_id, status, criado_em")
        .eq("aluno_id", id)
        .order("criado_em", { ascending: false, nullsFirst: false });

      agendamentosRows = (plain.data ?? []) as AgRow[];
      const ids = [
        ...new Set(
          agendamentosRows.map((a) => a.remada_id).filter(Boolean) as string[]
        ),
      ];
      if (ids.length) {
        const { data: rems } = await supabase
          .from("remadas")
          .select("*")
          .in("id", ids);
        rems?.forEach((row) => {
          remadaMap.set(String(row.id), row as Record<string, unknown>);
        });
      }
    }
  }

  const statusPag =
    (pagamentoMes?.status as "pendente" | "pago") ?? "pendente";
  const pagPago = statusPag === "pago";

  return (
    <PageShell>
      <Link
        href="/alunos"
        className="inline-flex text-sm font-medium text-teal-700 hover:text-teal-900 hover:underline"
      >
        ← Voltar aos alunos
      </Link>

      <header className="mt-6 rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
              {aluno.nome}
            </h1>
            <p className="mt-1 text-sm text-zinc-600">
              {STATUS_ALUNO_LABEL[aluno.status] ?? aluno.status}
            </p>
          </div>
          {!creditosErro ? (
            <DarCreditoModal alunoId={id} />
          ) : (
            <p className="max-w-xs text-right text-xs text-amber-800">
              Créditos indisponíveis: não foi possível ler{" "}
              <code className="rounded bg-amber-100 px-1">creditos</code> nem{" "}
              <code className="rounded bg-amber-100 px-1">creditos_aula</code>{" "}
              ({creditosErro.message}).
            </p>
          )}
        </div>

        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase text-zinc-500">
              E-mail
            </dt>
            <dd className="text-sm text-zinc-900">{aluno.email ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-zinc-500">
              Telefone
            </dt>
            <dd className="text-sm text-zinc-900">
              {aluno.telefone
                ? formatarTelefoneBrasilExibicao(aluno.telefone)
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-zinc-500">
              Nascimento
            </dt>
            <dd className="text-sm text-zinc-900">
              {aluno.data_nascimento
                ? new Date(
                    aluno.data_nascimento + "T12:00:00"
                  ).toLocaleDateString("pt-BR")
                : "—"}
            </dd>
          </div>
          {aluno.criado_em && (
            <div>
              <dt className="text-xs font-medium uppercase text-zinc-500">
                Cadastro
              </dt>
              <dd className="text-sm text-zinc-900">
                {new Date(aluno.criado_em).toLocaleString("pt-BR", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </dd>
            </div>
          )}
        </dl>

        <section className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <h2 className="text-sm font-semibold text-zinc-900">Plano atual</h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600">
            No seu banco, a tabela{" "}
            <code className="rounded bg-zinc-100 px-1 text-zinc-800">alunos</code>{" "}
            não tem{" "}
            <code className="rounded bg-zinc-100 px-1 text-zinc-800">
              plano_id
            </code>
            . Os planos estão em{" "}
            <code className="rounded bg-zinc-100 px-1 text-zinc-800">planos</code>{" "}
            (<code className="rounded bg-zinc-100 px-1">preco_mensal</code>,{" "}
            <code className="rounded bg-zinc-100 px-1">remadas_por_semana</code>
            ). Quando você ligar aluno → plano com{" "}
            <code className="rounded bg-zinc-100 px-1">plano_id</code>, dá para
            exibir o plano aqui automaticamente.
          </p>
        </section>

        <section className="mt-4 flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-zinc-700">
            Mensalidade (
            {new Date(mes + "T12:00:00").toLocaleDateString("pt-BR", {
              month: "long",
              year: "numeric",
            })}
            ):
          </span>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
              pagPago
                ? "bg-emerald-100 text-emerald-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {pagPago ? "Pago" : "Pendente"}
          </span>
          {pagPago && pagamentoMes?.pago_em && (
            <span className="text-xs text-zinc-500">
              Registrado em{" "}
              {new Date(pagamentoMes.pago_em).toLocaleString("pt-BR", {
                dateStyle: "short",
                timeStyle: "short",
              })}
            </span>
          )}
        </section>
      </header>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-zinc-900">
          Saldo de créditos
        </h2>
        {creditosErro ? (
          <p className="mt-2 text-sm text-zinc-500">
            Não foi possível carregar créditos.
          </p>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm">
              <p className="text-xs text-zinc-500">Disponíveis</p>
              <p className="text-2xl font-semibold text-emerald-700">
                {saldo.disponiveis}
              </p>
            </div>
            <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm">
              <p className="text-xs text-zinc-500">Usados</p>
              <p className="text-2xl font-semibold text-zinc-800">
                {saldo.usados}
              </p>
            </div>
            <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm">
              <p className="text-xs text-zinc-500">Expirados</p>
              <p className="text-2xl font-semibold text-red-700">
                {saldo.expirados}
              </p>
            </div>
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-zinc-900">
          Histórico de agendamentos
        </h2>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-zinc-200/80 bg-white shadow-sm">
          <table className="w-full min-w-[320px] text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-2">Data</th>
                <th className="px-4 py-2">Horário</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {agendamentosRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-6 text-center text-zinc-500"
                  >
                    Nenhum agendamento.
                  </td>
                </tr>
              ) : (
                agendamentosRows.map((ag) => {
                  const emb = remadaFromEmbed(ag);
                  const remada =
                    emb ?? remadaMap.get(ag.remada_id) ?? null;
                  const { data, horario } = pickRemadaDataHora(remada);
                  return (
                    <tr key={ag.id} className="border-b border-zinc-100">
                      <td className="px-4 py-2">{data}</td>
                      <td className="px-4 py-2">{horario}</td>
                      <td className="px-4 py-2">
                        {STATUS_AGENDAMENTO_LABEL[ag.status] ?? ag.status}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-zinc-900">
          Histórico de créditos
          {fonteCreditos === "creditos_aula" && (
            <span className="ml-2 text-xs font-normal text-zinc-500">
              (1 linha = 1 crédito)
            </span>
          )}
        </h2>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-zinc-200/80 bg-white shadow-sm">
          {fonteCreditos === "creditos_aula" ? (
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-4 py-2">Tipo</th>
                  <th className="px-4 py-2">Motivo / nota</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Disponível de</th>
                  <th className="px-4 py-2">Expira</th>
                  <th className="px-4 py-2">Usado em</th>
                </tr>
              </thead>
              <tbody>
                {creditosErro ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-6 text-center text-zinc-500"
                    >
                      Tabela de créditos indisponível.
                    </td>
                  </tr>
                ) : creditosList.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-6 text-center text-zinc-500"
                    >
                      Nenhum crédito registrado.
                    </td>
                  </tr>
                ) : (
                  creditosList.map((c) => {
                    const vid = c.id != null ? String(c.id) : "";
                    const exp = c.expira_em;
                    const desde = c.disponivel_a_partir_de;
                    const ue = c.usado_em;
                    return (
                      <tr key={vid} className="border-b border-zinc-100">
                        <td className="px-4 py-2">
                          {MOTIVO_CREDITO_LABEL[String(c.tipo)] ??
                            String(c.tipo ?? "—")}
                        </td>
                        <td className="px-4 py-2">
                          {c.motivo != null ? String(c.motivo) : "—"}
                        </td>
                        <td className="px-4 py-2">
                          {STATUS_CREDITO_LABEL[String(c.status)] ??
                            String(c.status ?? "—")}
                        </td>
                        <td className="px-4 py-2">
                          {desde
                            ? new Date(
                                String(desde) + "T12:00:00"
                              ).toLocaleDateString("pt-BR")
                            : "—"}
                        </td>
                        <td className="px-4 py-2">
                          {exp
                            ? new Date(
                                String(exp) + "T12:00:00"
                              ).toLocaleDateString("pt-BR")
                            : "—"}
                        </td>
                        <td className="px-4 py-2">
                          {ue
                            ? new Date(String(ue)).toLocaleString("pt-BR", {
                                dateStyle: "short",
                                timeStyle: "short",
                              })
                            : "—"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-4 py-2">Origem</th>
                  <th className="px-4 py-2">Motivo</th>
                  <th className="px-4 py-2">Qtd</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Vencimento</th>
                </tr>
              </thead>
              <tbody>
                {creditosErro ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-6 text-center text-zinc-500"
                    >
                      Tabela de créditos indisponível.
                    </td>
                  </tr>
                ) : creditosList.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-6 text-center text-zinc-500"
                    >
                      Nenhum crédito registrado.
                    </td>
                  </tr>
                ) : (
                  creditosList.map((c) => {
                    const vid = c.id != null ? String(c.id) : "";
                    const dv = c.data_vencimento;
                    return (
                      <tr key={vid} className="border-b border-zinc-100">
                        <td className="px-4 py-2">
                          {c.origem != null ? String(c.origem) : "—"}
                        </td>
                        <td className="px-4 py-2">
                          {MOTIVO_CREDITO_LABEL[String(c.motivo)] ??
                            String(c.motivo ?? "—")}
                        </td>
                        <td className="px-4 py-2">
                          {String(c.quantidade ?? "—")}
                        </td>
                        <td className="px-4 py-2">
                          {STATUS_CREDITO_LABEL[String(c.status)] ??
                            String(c.status ?? "—")}
                        </td>
                        <td className="px-4 py-2">
                          {dv
                            ? new Date(
                                String(dv) + "T12:00:00"
                              ).toLocaleDateString("pt-BR")
                            : "—"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </PageShell>
  );
}
