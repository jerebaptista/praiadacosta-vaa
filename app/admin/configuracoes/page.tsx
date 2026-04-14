import { obterPrecoPorAula } from "@/app/actions/configuracoes";
import { PrecoAulaForm } from "@/components/admin/configuracoes/preco-aula-form";
import { ConfiguracaoSupabase } from "@/components/ConfiguracaoSupabase";
import { PageShell } from "@/components/PageShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { QueryErrorPanel } from "@/components/QueryErrorPanel";
import { useDataMock } from "@/lib/data-mock";

export const dynamic = "force-dynamic";

export default async function AdminConfiguracoesPage() {
  const mock = useDataMock();

  if (
    !mock &&
    (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  ) {
    return (
      <PageShell>
        <ConfiguracaoSupabase />
      </PageShell>
    );
  }

  try {
    const precoPorAula = await obterPrecoPorAula();
    return (
      <PageShell>
        <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Preferências do estúdio usadas nos planos e na aplicação.
        </p>
        <Card className="mt-8 max-w-lg">
          <CardHeader>
            <CardTitle className="text-base">Preço por aula</CardTitle>
            <CardDescription>
              Valor de referência para calcular descontos no preço mensal e para exibir totais por aulas
              por semana na edição do plano.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PrecoAulaForm valorInicial={precoPorAula} />
          </CardContent>
        </Card>
      </PageShell>
    );
  } catch (e) {
    const err = e as { message?: string };
    return (
      <PageShell>
        <QueryErrorPanel
          message={err.message ?? "Não foi possível carregar as configurações."}
          contexto="Operação: leitura na tabela estudio_config."
          erroRede={false}
        />
      </PageShell>
    );
  }
}
