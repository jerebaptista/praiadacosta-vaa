"use client";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { LABEL_DIA_SEMANA, ORDEM_DIA_SEMANA } from "@/lib/remadas-geracao";

type Props = {
  value: number[];
  onChange: (dias: number[]) => void;
  /** Dias que não podem ser seleccionados (já ocupados por outro horário). */
  diasBloqueados?: number[];
  className?: string;
};

export function DiasSemanaToggleGroup({ value, onChange, diasBloqueados = [], className }: Props) {
  return (
    <ToggleGroup
      type="multiple"
      variant="outline"
      spacing={0}
      className={cn("w-full min-w-0 flex-nowrap overflow-x-auto", className)}
      value={ORDEM_DIA_SEMANA.filter((d) => value.includes(d)).map(String)}
      onValueChange={(vals) => {
        const nums = vals.map(Number);
        onChange(ORDEM_DIA_SEMANA.filter((d) => nums.includes(d) && !diasBloqueados.includes(d)));
      }}
    >
      {ORDEM_DIA_SEMANA.map((dia) => {
        const bloqueado = diasBloqueados.includes(dia);
        return (
          <ToggleGroupItem
            key={dia}
            value={String(dia)}
            disabled={bloqueado}
            title={bloqueado ? "Horário já ocupado neste dia" : undefined}
            className="min-w-10 flex-1 px-2 data-[state=on]:bg-secondary data-[state=on]:text-secondary-foreground disabled:cursor-not-allowed disabled:opacity-100"
          >
            <span className={cn(bloqueado && "text-muted-foreground/40")}>
              {LABEL_DIA_SEMANA[dia]}
            </span>
          </ToggleGroupItem>
        );
      })}
    </ToggleGroup>
  );
}
