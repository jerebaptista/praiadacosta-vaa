import { AdminRemadasClient } from "@/components/admin/remadas/admin-remadas-client";
import { PageShell } from "@/components/PageShell";
import { listarRemadasAdmin } from "@/app/actions/remadas";
import { previsaoDemoMeteoJanela } from "@/lib/meteo-demo-7d";
import { listarPrevisaoMeteoDiaria } from "@/lib/meteo";
import { createClient } from "@/lib/supabase/server";

export default async function AdminRemadasPage() {
  const [remadasIniciais, supabase] = await Promise.all([
    listarRemadasAdmin(),
    createClient(),
  ]);
  const doSupabase = await listarPrevisaoMeteoDiaria(supabase);
  const demo =
    process.env.NODE_ENV === "development" &&
    Object.keys(doSupabase).length === 0
      ? previsaoDemoMeteoJanela()
      : {};
  const previsaoMeteoBruta = { ...demo, ...doSupabase };

  return (
    <PageShell>
      <AdminRemadasClient
        initialRemadas={remadasIniciais}
        previsaoMeteoBruta={previsaoMeteoBruta}
      />
    </PageShell>
  );
}
