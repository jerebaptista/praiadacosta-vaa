import { PageShell } from "@/components/PageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AlunoHomePage() {
  return (
    <PageShell>
      <h1 className="text-2xl font-semibold tracking-tight">Olá</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Em breve: suas remadas, créditos e agendamentos nesta área.
      </p>
      <Card className="mt-8 max-w-md">
        <CardHeader>
          <CardTitle className="text-base">Em construção</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          O portal do aluno ficará separado do admin. Podemos vincular o login ao
          registro em <code className="rounded bg-muted px-1">profiles.aluno_id</code>.
        </CardContent>
      </Card>
    </PageShell>
  );
}
