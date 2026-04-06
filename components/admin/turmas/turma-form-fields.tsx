"use client";

import { useId } from "react";
import { DiasSemanaToggleGroup } from "@/components/admin/remadas/dias-semana-toggle-group";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { normalizarVagas } from "@/lib/remadas-validacao";

const HORAS_00_23 = Array.from({ length: 24 }, (_, i) =>
  String(i).padStart(2, "0")
);
const MINUTOS_5 = [
  "00", "05", "10", "15", "20", "25", "30",
  "35", "40", "45", "50", "55",
] as const;

export type TurmaFormState = {
  nome: string;
  dias_semana: number[];
  horaH: string;
  horaM: string;
  vagasStr: string;
};

type Props = {
  state: TurmaFormState;
  onChange: (patch: Partial<TurmaFormState>) => void;
};

export function TurmaFormFields({ state, onChange }: Props) {
  const idNome = useId();
  const idVagas = useId();
  const idHora = useId();

  return (
    <div className="grid gap-3">
      <div className="space-y-2">
        <Label htmlFor={idNome}>
          Nome{" "}
          <span className="text-xs font-normal text-muted-foreground">
            (opcional)
          </span>
        </Label>
        <Input
          id={idNome}
          type="text"
          autoComplete="off"
          maxLength={120}
          placeholder="Ex.: Turma da manhã"
          className="h-8"
          value={state.nome}
          onChange={(e) => onChange({ nome: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label>Dias da semana</Label>
        <DiasSemanaToggleGroup
          value={state.dias_semana}
          onChange={(dias) => onChange({ dias_semana: dias })}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <span
            className="text-sm font-medium leading-none"
            id={idHora}
          >
            Horário
          </span>
          <div
            className="flex items-center gap-1.5"
            role="group"
            aria-labelledby={idHora}
          >
            <Select
              value={state.horaH}
              onValueChange={(h) => onChange({ horaH: h })}
            >
              <SelectTrigger
                className="h-8 min-w-0 flex-1"
                aria-label="Hora"
                showChevron={false}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[300] max-h-60">
                {HORAS_00_23.map((h) => (
                  <SelectItem key={h} value={h}>
                    {h}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span
              className="shrink-0 text-sm text-muted-foreground"
              aria-hidden
            >
              :
            </span>
            <Select
              value={state.horaM}
              onValueChange={(m) => onChange({ horaM: m })}
            >
              <SelectTrigger
                className="h-8 min-w-0 flex-1"
                aria-label="Minutos"
                showChevron={false}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[300]">
                {MINUTOS_5.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor={idVagas}>Vagas</Label>
          <Input
            id={idVagas}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            maxLength={2}
            className="h-8"
            aria-invalid={
              state.vagasStr !== "" && normalizarVagas(state.vagasStr) == null
            }
            value={state.vagasStr}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "").slice(0, 2);
              onChange({ vagasStr: v });
            }}
            onBlur={() => {
              if (state.vagasStr === "") onChange({ vagasStr: "5" });
            }}
          />
        </div>
      </div>
    </div>
  );
}
