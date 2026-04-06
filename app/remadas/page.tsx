import { PageShell } from "@/components/PageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function RemadasPessoalPage() {
  return (
    <PageShell>
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        Remadas
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Lista e gestão das suas remadas — em construção.
      </p>
      <Card className="mt-8 max-w-lg">
        <CardHeader>
          <CardTitle className="text-base">Próximo passo</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Aqui podemos listar agendamentos futuros, cancelamentos e histórico
          recente, separado da visão admin de{" "}
          <code className="rounded bg-muted px-1">/admin/remadas</code>.
        </CardContent>
      </Card>
    </PageShell>
  );
}
