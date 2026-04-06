import { PageShell } from "@/components/PageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ContaPage() {
  return (
    <PageShell>
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        Conta
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Dados da sua conta e preferências — em construção.
      </p>
      <Card className="mt-8 max-w-lg">
        <CardHeader>
          <CardTitle className="text-base">Próximo passo</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Alteração de senha, e-mail e vínculo com cadastro de aluno.
        </CardContent>
      </Card>
    </PageShell>
  );
}
