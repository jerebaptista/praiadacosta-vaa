export function ConfiguracaoSupabase() {
  return (
    <div className="mx-auto max-w-lg rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-950">
      <h1 className="text-lg font-semibold">Configurar Supabase</h1>
      <p className="mt-2 text-sm leading-relaxed">
        Copie{" "}
        <code className="rounded bg-amber-100 px-1">.env.local.example</code>{" "}
        para{" "}
        <code className="rounded bg-amber-100 px-1">.env.local</code> e
        preencha a URL e a chave anon do projeto. Execute o SQL em{" "}
        <code className="rounded bg-amber-100 px-1">supabase/schema.sql</code>{" "}
        no editor SQL do Supabase.
      </p>
    </div>
  );
}
