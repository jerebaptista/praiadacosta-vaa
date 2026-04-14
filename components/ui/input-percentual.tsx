"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { normalizarPercentInput } from "@/lib/plano-form";

export type InputPercentualProps = Omit<
  React.ComponentProps<typeof Input>,
  "type" | "value" | "onChange" | "inputMode"
> & {
  value: string;
  onValueChange: (valorNormalizado: string) => void;
  /** Mostrar o símbolo % à direita (predefinição: verdadeiro). */
  mostrarSimbolo?: boolean;
};

export function InputPercentual({
  value,
  onValueChange,
  className,
  mostrarSimbolo = true,
  ...inputProps
}: InputPercentualProps) {
  const input = (
    <Input
      type="text"
      inputMode="decimal"
      autoComplete="off"
      placeholder="0,00"
      value={value}
      className={cn("tabular-nums", mostrarSimbolo && "pr-7", className)}
      onChange={(e) => onValueChange(normalizarPercentInput(e.target.value))}
      {...inputProps}
    />
  );

  if (!mostrarSimbolo) return input;

  return (
    <div className="relative">
      {input}
      <span
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
        aria-hidden
      >
        %
      </span>
    </div>
  );
}
