import { obterPrecoPorAula } from "@/app/actions/configuracoes";
import { listarPlanos } from "@/app/actions/planos";
import { AdminPlanosClient } from "@/components/admin/planos/admin-planos-client";
import { ConfiguracaoSupabase } from "@/components/ConfiguracaoSupabase";
import { PageShell } from "@/components/PageShell";
import { QueryErrorPanel } from "@/components/QueryErrorPanel";
import { useDataMock } from "@/lib/data-mock";

export const dynamic = "force-dynamic";

export default async function AdminPlanosPage() {
  const mock = useDataMock();

  if (
    !mock &&
    (!process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  ) {
    return (
      <PageShell className="max-w-7xl">
        <ConfiguracaoSupabase />
      </PageShell>
    );
  }

  try {
    const [planos, precoPorAula] = await Promise.all([
      listarPlanos(),
      obterPrecoPorAula(),
    ]);
    return (
      <PageShell className="max-w-7xl">
        <AdminPlanosClient initialPlanos={planos} precoPorAula={precoPorAula} />
      </PageShell>
    );
  } catch (e) {
    const err = e as { message?: string; code?: string; details?: string | null };
    return (
      <PageShell className="max-w-7xl">
        <QueryErrorPanel
          message={err.message ?? "Não foi possível carregar os planos."}
          contexto="Operação: leitura (GET) na tabela planos."
          erroRede={false}
        />
      </PageShell>
    );
  }
}
