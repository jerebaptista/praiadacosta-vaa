"use client";

import { useMemo, useState } from "react";
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
  turmasExistentes: TurmaLinha[];
};

const ESTADO_INICIAL: TurmaFormState = {
  dias_semana: [],
  horaH: "07",
  horaM: "00",
  vagasStr: "5",
};

/** Devolve os dias da semana já ocupados por outra turma com o mesmo horário. */
function diasOcupadosParaHora(
  hora: string,
  turmas: TurmaLinha[],
  excluirId?: string
): number[] {
  const ocupados = new Set<number>();
  for (const t of turmas) {
    if (excluirId && t.id === excluirId) continue;
    if (t.hora.slice(0, 5) === hora.slice(0, 5)) {
      t.dias_semana.forEach((d) => ocupados.add(d));
    }
  }
  return Array.from(ocupados);
}

export function CriarTurmaDialog({
  open,
  onOpenChange,
  onCriada,
  turmasExistentes,
}: Props) {
  const [form, setForm] = useState<TurmaFormState>(ESTADO_INICIAL);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const diasBloqueados = useMemo(
    () => diasOcupadosParaHora(`${form.horaH}:${form.horaM}`, turmasExistentes),
    [form.horaH, form.horaM, turmasExistentes]
  );

  function patch(p: Partial<TurmaFormState>) {
    setForm((f) => {
      const novo = { ...f, ...p };
      // quando o horário muda, remove os dias que ficam bloqueados
      if (p.horaH !== undefined || p.horaM !== undefined) {
        const hora = `${novo.horaH}:${novo.horaM}`;
        const bloqueados = diasOcupadosParaHora(hora, turmasExistentes);
        novo.dias_semana = novo.dias_semana.filter((d) => !bloqueados.includes(d));
      }
      return novo;
    });
  }

  function resetar() {
    setForm(ESTADO_INICIAL);
    setErro(null);
  }

  async function handleSalvar() {
    setErro(null);
    const diasValidos = form.dias_semana.filter((d) => !diasBloqueados.includes(d));
    if (diasValidos.length === 0) {
      setErro("Selecione pelo menos um dia da semana disponível.");
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
        dias_semana: diasValidos,
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

        <TurmaFormFields state={form} onChange={patch} diasBloqueados={diasBloqueados} />

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
