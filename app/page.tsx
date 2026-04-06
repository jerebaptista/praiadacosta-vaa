import { startOfMonth } from "date-fns";
import { ResumoCalendario } from "@/components/resumo/ResumoCalendario";
import { PageShell } from "@/components/PageShell";
import { ConfiguracaoSupabase } from "@/components/ConfiguracaoSupabase";
import { createClient } from "@/lib/supabase/server";
import { mesDoParametro } from "@/lib/mes-query-calendario";
import { carregarDiasResumo } from "@/lib/resumo-dados";

export const dynamic = "force-dynamic";

type Search = { mes?: string | string[] };

export default async function ResumoPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const mes = mesDoParametro(sp.mes);

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return (
      <PageShell>
        <ConfiguracaoSupabase />
      </PageShell>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let alunoId: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("aluno_id")
      .eq("id", user.id)
      .maybeSingle();
    alunoId = (profile?.aluno_id as string | null) ?? null;
  }

  const { diasEstudio, diasAgendados, diasCompareceu } =
    await carregarDiasResumo(supabase, { alunoId, mes });

  return (
    <PageShell>
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        Resumo
      </h1>
      <p className="mt-1 max-w-xl text-sm text-muted-foreground">
        Calendário do mês: remadas no estúdio, dias em que você marcou aula e
        em que compareceu. Use as setas do calendário para mudar o mês.
      </p>
      {!alunoId && user && (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          Seu perfil ainda não está vinculado a um aluno (
          <code className="rounded bg-amber-100 px-1">profiles.aluno_id</code>
          ). Você verá só os dias com remada no estúdio; agendamentos pessoais
          aparecem após o vínculo.
        </p>
      )}
      <div className="mt-8 max-w-md">
        <ResumoCalendario
          mes={startOfMonth(mes)}
          diasEstudio={diasEstudio}
          diasAgendados={diasAgendados}
          diasCompareceu={diasCompareceu}
        />
      </div>
    </PageShell>
  );
}
