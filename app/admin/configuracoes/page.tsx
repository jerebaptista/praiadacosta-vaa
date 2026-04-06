import { PageShell } from "@/components/PageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminConfiguracoesPage() {
  return (
    <PageShell>
      <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Preferências do estúdio e da aplicação — em construção.
      </p>
      <Card className="mt-8 max-w-lg">
        <CardHeader>
          <CardTitle className="text-base">Próximo passo</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Definir o que entra aqui (horários, notificações, integrações, etc.).
        </CardContent>
      </Card>
    </PageShell>
  );
}
