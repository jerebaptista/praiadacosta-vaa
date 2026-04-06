import { PageShell } from "@/components/PageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminPlanosPage() {
  return (
    <PageShell>
      <h1 className="text-2xl font-semibold tracking-tight">Planos</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Editar planos (preço, remadas por semana, ativo) — em construção.
      </p>
      <Card className="mt-8 max-w-lg">
        <CardHeader>
          <CardTitle className="text-base">Próximo passo</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          CRUD em <code className="rounded bg-muted px-1">planos</code> e, quando
          existir <code className="rounded bg-muted px-1">plano_id</code> em{" "}
          <code className="rounded bg-muted px-1">alunos</code>, vínculo no perfil.
        </CardContent>
      </Card>
    </PageShell>
  );
}
