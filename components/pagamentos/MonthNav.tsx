import Link from "next/link";
import {
  formatarMesPt,
  mesAnterior,
  mesSeguinte,
} from "@/lib/dates";

type Props = { mesAtual: string };

export function MonthNav({ mesAtual }: Props) {
  const prev = mesAnterior(mesAtual);
  const next = mesSeguinte(mesAtual);

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200/80 bg-white p-1.5 shadow-sm">
      <Link
        href={`/pagamentos?mes=${prev}`}
        className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
      >
        ← Anterior
      </Link>
      <span className="min-w-[9.5rem] flex-1 text-center text-sm font-semibold capitalize text-teal-950 sm:flex-none">
        {formatarMesPt(mesAtual)}
      </span>
      <Link
        href={`/pagamentos?mes=${next}`}
        className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
      >
        Próximo →
      </Link>
    </div>
  );
}
