"use client";

import { useEffect, useState } from "react";
import { atualizarTurma } from "@/app/actions/turmas";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  TurmaFormFields,
  type TurmaFormState,
} from "@/components/admin/turmas/turma-form-fields";
import { normalizarVagas } from "@/lib/remadas-validacao";
import type { TurmaLinha } from "@/lib/turmas-tipos";

type Props = {
  turma: TurmaLinha | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function turmaParaForm(t: TurmaLinha): TurmaFormState {
  const [h, m] = t.hora.split(":");
  return {
    nome: t.nome,
    dias_semana: t.dias_semana,
    horaH: (h ?? "07").padStart(2, "0"),
    horaM: (m ?? "00").padStart(2, "0"),
    vagasStr: String(t.vagas),
  };
}

export function EditarTurmaDialog({ turma, open, onOpenChange }: Props) {
  const [form, setForm] = useState<TurmaFormState>({
    nome: "",
    dias_semana: [],
    horaH: "07",
    horaM: "00",
    vagasStr: "5",
  });
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (open && turma) {
      setForm(turmaParaForm(turma));
      setErro(null);
    }
  }, [open, turma]);

  function patch(p: Partial<TurmaFormState>) {
    setForm((f) => ({ ...f, ...p }));
  }

  async function handleSalvar() {
    if (!turma) return;
    setErro(null);
    if (form.dias_semana.length === 0) {
      setErro("Selecione pelo menos um dia da semana.");
      return;
    }
    const vagas = normalizarVagas(form.vagasStr);
    if (vagas == null) {
      setErro("Vagas inválidas (1–99).");
      return;
    }

    setSalvando(true);
    try {
      await atualizarTurma(turma.id, {
        nome: form.nome,
        dias_semana: form.dias_semana,
        hora: `${form.horaH}:${form.horaM}`,
        vagas,
      });
      onOpenChange(false);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível guardar.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-4 sm:max-w-lg" showCloseButton>
        <DialogHeader>
          <DialogTitle>Editar turma</DialogTitle>
        </DialogHeader>

        <TurmaFormFields state={form} onChange={patch} />

        {erro ? (
          <p className="text-sm text-destructive" role="alert">
            {erro}
          </p>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={salvando}
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={salvando || !turma}
            onClick={() => void handleSalvar()}
          >
            {salvando ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
