"use client";

import { useMemo } from "react";
import { isSameMonth, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { dateKeyLocal } from "@/lib/calendar-dates";
import type { RemadaLinha } from "@/lib/remadas-geracao";
import { cn } from "@/lib/utils";

type Props = {
  mes: Date;
  onMesChange: (d: Date) => void;
  filtradas: RemadaLinha[];
};

export function RemadasCalendarioView({
  mes,
  onMesChange,
  filtradas,
}: Props) {
  const diasComRemada = useMemo(() => {
    const set = new Set<string>();
    for (const r of filtradas) {
      set.add(dateKeyLocal(new Date(r.data_hora)));
    }
    return set;
  }, [filtradas]);

  return (
    <div className="space-y-3">
      <Calendar
        mode="single"
        locale={ptBR}
        month={mes}
        onMonthChange={(d) => onMesChange(startOfMonth(d))}
        showOutsideDays
        className={cn(
          "rounded-xl border border-border bg-card p-3 shadow-sm [--cell-size:2.75rem]"
        )}
        classNames={{
          day: cn(
            "relative flex h-(--cell-size) w-full flex-col items-center justify-center p-0 text-center"
          ),
        }}
        modifiers={{
          comRemada: (d) =>
            isSameMonth(d, mes) && diasComRemada.has(dateKeyLocal(d)),
        }}
        modifiersClassNames={{
          comRemada:
            "z-[1] font-semibold ring-2 ring-primary ring-offset-2 ring-offset-card rounded-full",
        }}
      />
      <p className="text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <span className="inline-block size-3 rounded-full ring-2 ring-primary" />
          Dia com ao menos uma remada neste mês
        </span>
      </p>
    </div>
  );
}
