import { AdminRemadasClient } from "@/components/admin/remadas/admin-remadas-client";
import { PageShell } from "@/components/PageShell";
import { listarRemadasAdmin } from "@/app/actions/remadas";

export default async function AdminRemadasPage() {
  const remadasIniciais = await listarRemadasAdmin();

  return (
    <PageShell>
      <AdminRemadasClient initialRemadas={remadasIniciais} />
    </PageShell>
  );
}
