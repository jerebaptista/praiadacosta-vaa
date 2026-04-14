"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import type { AlunoAtivoPlanoLinha, PlanoLinha } from "@/lib/planos-tipos";
import type { PeriodoContrato } from "@/lib/planos-aluno-vigencia";
import {
  periodoIdAPartirDoRotulo,
  periodosDisponiveisDoPlano,
} from "@/lib/planos-periodos-ui";

export type ModoMudancaPlano = "mudarPlano" | "mudarPeriodo";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  aluno: AlunoAtivoPlanoLinha | null;
  planoAtual: PlanoLinha;
  todosPlanos: PlanoLinha[];
  modo: ModoMudancaPlano;
  /** Plano escolhido no submenu (mudar plano). */
  planoIdPreset?: string;
  /** Período escolhido no submenu (mudar período). */
  periodoPreset?: PeriodoContrato;
};

export function AlunoPlanoMudancaDialog({
  open,
  onOpenChange,
  aluno,
  planoAtual,
  todosPlanos,
  modo,
  planoIdPreset,
  periodoPreset,
}: Props) {
  const [planoId, setPlanoId] = useState(planoAtual.id);
  const [periodoId, setPeriodoId] = useState<PeriodoContrato>("mensal");

  const planosAtivos = useMemo(
    () => todosPlanos.filter((p) => p.status === "ativo"),
    [todosPlanos]
  );

  const planoSelecionado = useMemo(
    () => planosAtivos.find((p) => p.id === planoId) ?? planoAtual,
    [planosAtivos, planoId, planoAtual]
  );

  const opcoesPeriodo = useMemo(
    () => periodosDisponiveisDoPlano(planoSelecionado),
    [planoSelecionado]
  );

  useEffect(() => {
    if (!open || !aluno) return;
    if (modo === "mudarPlano") {
      let pid = planoIdPreset ?? planoAtual.id;
      if (!planosAtivos.some((x) => x.id === pid)) {
        pid = planosAtivos[0]?.id ?? planoAtual.id;
      }
      setPlanoId(pid);
      const p = todosPlanos.find((x) => x.id === pid) ?? planoAtual;
      const op = periodosDisponiveisDoPlano(p);
      const atual = periodoIdAPartirDoRotulo(aluno.periodo);
      const valido = op.some((o) => o.id === atual);
      setPeriodoId(valido ? atual : op[0]?.id ?? "mensal");
      if (periodoPreset) {
        const ok = op.some((o) => o.id === periodoPreset);
        if (ok) setPeriodoId(periodoPreset);
      }
    } else {
      setPlanoId(planoAtual.id);
      const op = periodosDisponiveisDoPlano(planoAtual);
      const atual = periodoIdAPartirDoRotulo(aluno.periodo);
      const valido = op.some((o) => o.id === atual);
      let next = valido ? atual : op[0]?.id ?? "mensal";
      if (periodoPreset && op.some((o) => o.id === periodoPreset)) {
        next = periodoPreset;
      }
      setPeriodoId(next);
    }
  }, [
    open,
    aluno,
    modo,
    planoAtual,
    todosPlanos,
    planosAtivos,
    planoIdPreset,
    periodoPreset,
  ]);

  useEffect(() => {
    if (!open || !planoSelecionado) return;
    const op = periodosDisponiveisDoPlano(planoSelecionado);
    if (!op.some((o) => o.id === periodoId)) {
      setPeriodoId(op[0]?.id ?? "mensal");
    }
  }, [open, planoSelecionado, periodoId]);

  function concluir() {
    onOpenChange(false);
  }

  if (!aluno) return null;

  const titulo =
    modo === "mudarPlano" ? "Confirmar mudança de plano" : "Confirmar mudança de período";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton>
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3 text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">{aluno.nome}</span>
              </p>
              <p>
                Confirma esta alteração? Será enviada uma{" "}
                <strong className="font-medium text-foreground">nova cobrança</strong> ao aluno
                para pagamento referente a esta mudança.
              </p>
              <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs">
                <p>
                  <span className="text-muted-foreground">Plano atual: </span>
                  <span className="font-medium text-foreground">{planoAtual.nome}</span>
                </p>
                <p className="mt-1">
                  <span className="text-muted-foreground">Período atual: </span>
                  <span className="font-medium text-foreground">{aluno.periodo}</span>
                </p>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="mudanca-plano">Plano</Label>
            <Select
              value={planoId}
              onValueChange={setPlanoId}
              disabled={modo === "mudarPeriodo"}
            >
              <SelectTrigger id="mudanca-plano" className="w-full">
                <SelectValue placeholder="Selecionar plano" />
              </SelectTrigger>
              <SelectContent>
                {planosAtivos.length === 0 ? (
                  <div className="px-2 py-3 text-center text-sm text-muted-foreground">
                    Nenhum plano ativo disponível
                  </div>
                ) : (
                  planosAtivos.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {modo === "mudarPeriodo" ? (
              <p className="text-xs text-muted-foreground">
                Para mudar o plano, use a opção &quot;Mudar de plano&quot; no menu.
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="mudanca-periodo">Período</Label>
            <Select
              value={periodoId}
              onValueChange={(v) => setPeriodoId(v as PeriodoContrato)}
            >
              <SelectTrigger id="mudanca-periodo" className="w-full">
                <SelectValue placeholder="Selecionar período" />
              </SelectTrigger>
              <SelectContent>
                {opcoesPeriodo.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mudanca-valor">Valor</Label>
            <Input
              id="mudanca-valor"
              readOnly
              disabled
              value=""
              placeholder=""
              className="bg-muted/50"
              aria-readonly
            />
            <p className="text-xs text-muted-foreground">
              O valor a cobrar será calculado automaticamente (incluindo diferenças entre planos e
              períodos) numa próxima etapa.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={concluir}>
            Concluir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
