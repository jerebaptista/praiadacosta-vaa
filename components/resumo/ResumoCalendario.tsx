"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  format,
  isBefore,
  isSameMonth,
  startOfDay,
  startOfMonth,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { dateKeyLocal } from "@/lib/calendar-dates";
import { cn } from "@/lib/utils";

type Props = {
  /** Primeiro dia do mês visível */
  mes: Date;
  diasEstudio: string[];
  diasAgendados: string[];
  diasCompareceu: string[];
};

export function ResumoCalendario({
  mes,
  diasEstudio,
  diasAgendados,
  diasCompareceu,
}: Props) {
  const router = useRouter();
  const hoje = startOfDay(new Date());

  const estudio = useMemo(() => new Set(diasEstudio), [diasEstudio]);
  const agendados = useMemo(() => new Set(diasAgendados), [diasAgendados]);
  const compareceu = useMemo(() => new Set(diasCompareceu), [diasCompareceu]);

  function irParaMes(novo: Date) {
    const m = format(startOfMonth(novo), "yyyy-MM");
    router.push(`/?mes=${m}`);
  }

  return (
    <div className="space-y-6">
      <Calendar
        mode="single"
        locale={ptBR}
        month={mes}
        onMonthChange={irParaMes}
        showOutsideDays
        className="rounded-xl border border-border bg-card p-3 shadow-sm [--cell-size:2.75rem]"
        classNames={{
          day: cn(
            "relative flex h-(--cell-size) w-full flex-col items-center justify-center p-0 text-center"
          ),
        }}
        modifiers={{
          emPassado: (d) => isBefore(startOfDay(d), hoje),
          semAulaNoEstudio: (d) =>
            isSameMonth(d, mes) && !estudio.has(dateKeyLocal(d)),
          agendado: (d) => agendados.has(dateKeyLocal(d)),
          compareceu: (d) => compareceu.has(dateKeyLocal(d)),
        }}
        modifiersClassNames={{
          emPassado: "opacity-50",
          semAulaNoEstudio: "opacity-[0.12] text-muted-foreground",
          agendado:
            "z-[1] font-semibold ring-2 ring-primary ring-offset-2 ring-offset-card rounded-full",
          compareceu: "z-[2] bg-emerald-500/25 rounded-full",
        }}
      />

      <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <span className="size-3 rounded-full border-2 border-primary" />
          Dia com sua remada marcada
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="size-3 rounded-full bg-emerald-500/40" />
          Compareceu
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="size-3 rounded bg-foreground/10" />
          Sem remada no estúdio
        </span>
        <span className="inline-flex items-center gap-2 opacity-70">
          <span className="size-3 rounded bg-muted-foreground/40" />
          Dias passados (mais suaves)
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        Dias anteriores a hoje ficam com opacidade reduzida; isso ajuda a focar
        no mês atual. Se preferir outro tratamento (por exemplo cor em vez de
        opacidade), dá para ajustar depois.
      </p>
    </div>
  );
}
