"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { normalizarValorMoedaInput } from "@/lib/plano-form";

export type InputMoedaBrlProps = Omit<
  React.ComponentProps<typeof Input>,
  "type" | "value" | "onChange" | "inputMode"
> & {
  value: string;
  onValueChange: (valorNormalizado: string) => void;
};

export function InputMoedaBrl({
  value,
  onValueChange,
  className,
  ...inputProps
}: InputMoedaBrlProps) {
  return (
    <Input
      type="text"
      inputMode="decimal"
      autoComplete="off"
      placeholder="R$ 0,00"
      value={value}
      className={cn("tabular-nums", className)}
      onChange={(e) => onValueChange(normalizarValorMoedaInput(e.target.value))}
      {...inputProps}
    />
  );
}
