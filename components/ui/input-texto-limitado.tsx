"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type InputTextoLimitadoProps = Omit<
  React.ComponentProps<typeof Input>,
  "maxLength" | "value"
> & {
  value: string;
  maxLength: number;
  /** id do elemento do contador (acessibilidade); se omitido, gera-se com `useId`. */
  contadorId?: string;
  mostrarContador?: boolean;
};

export function InputTextoLimitado({
  maxLength,
  contadorId: contadorIdProp,
  className,
  mostrarContador = true,
  value,
  "aria-describedby": ariaDescribedByProp,
  ...inputProps
}: InputTextoLimitadoProps) {
  const uid = React.useId();
  const contadorId = contadorIdProp ?? `${uid}-contador`;
  const texto = String(value ?? "");
  const ariaDescribedBy = [mostrarContador ? contadorId : null, ariaDescribedByProp]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="relative">
      <Input
        maxLength={maxLength}
        value={value}
        className={cn("pr-14", className)}
        spellCheck={false}
        autoComplete="off"
        {...inputProps}
        aria-describedby={ariaDescribedBy || undefined}
      />
      {mostrarContador ? (
        <span
          id={contadorId}
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs tabular-nums text-muted-foreground"
        >
          {texto.length}/{maxLength}
        </span>
      ) : null}
    </div>
  );
}
