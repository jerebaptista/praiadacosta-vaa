import { listarTurmas } from "@/app/actions/turmas";
import { AdminTurmasClient } from "@/components/admin/turmas/admin-turmas-client";
import { PageShell } from "@/components/PageShell";

export const dynamic = "force-dynamic";

export default async function TurmasPage() {
  const turmas = await listarTurmas();
  return (
    <PageShell>
      <AdminTurmasClient initialTurmas={turmas} />
    </PageShell>
  );
}
