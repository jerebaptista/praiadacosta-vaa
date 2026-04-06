"use client";

import { useState } from "react";
import { criarTurma } from "@/app/actions/turmas";
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
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCriada: (t: TurmaLinha) => void;
};

const ESTADO_INICIAL: TurmaFormState = {
  nome: "",
  dias_semana: [],
  horaH: "07",
  horaM: "00",
  vagasStr: "5",
};

export function CriarTurmaDialog({ open, onOpenChange, onCriada }: Props) {
  const [form, setForm] = useState<TurmaFormState>(ESTADO_INICIAL);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  function patch(p: Partial<TurmaFormState>) {
    setForm((f) => ({ ...f, ...p }));
  }

  function resetar() {
    setForm(ESTADO_INICIAL);
    setErro(null);
  }

  async function handleSalvar() {
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
      const turma = await criarTurma({
        nome: form.nome,
        dias_semana: form.dias_semana,
        hora: `${form.horaH}:${form.horaM}`,
        vagas,
      });
      onCriada(turma);
      resetar();
      onOpenChange(false);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível criar turma.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) resetar();
        onOpenChange(o);
      }}
    >
      <DialogContent className="gap-4 sm:max-w-lg" showCloseButton>
        <DialogHeader>
          <DialogTitle>Nova turma</DialogTitle>
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
            onClick={() => { resetar(); onOpenChange(false); }}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={salvando}
            onClick={() => void handleSalvar()}
          >
            {salvando ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
