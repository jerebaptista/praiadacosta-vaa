"use client";

import { useEffect, useMemo, useState } from "react";
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
  turmasExistentes: TurmaLinha[];
};

function turmaParaForm(t: TurmaLinha): TurmaFormState {
  const [h, m] = t.hora.split(":");
  return {
    dias_semana: t.dias_semana,
    horaH: (h ?? "07").padStart(2, "0"),
    horaM: (m ?? "00").padStart(2, "0"),
    vagasStr: String(t.vagas),
  };
}

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

export function EditarTurmaDialog({
  turma,
  open,
  onOpenChange,
  turmasExistentes,
}: Props) {
  const [form, setForm] = useState<TurmaFormState>({
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

  const diasBloqueados = useMemo(
    () => diasOcupadosParaHora(`${form.horaH}:${form.horaM}`, turmasExistentes, turma?.id),
    [form.horaH, form.horaM, turmasExistentes, turma?.id]
  );

  function patch(p: Partial<TurmaFormState>) {
    setForm((f) => {
      const novo = { ...f, ...p };
      // quando o horário muda, remove os dias que ficam bloqueados
      if (p.horaH !== undefined || p.horaM !== undefined) {
        const hora = `${novo.horaH}:${novo.horaM}`;
        const bloqueados = diasOcupadosParaHora(hora, turmasExistentes, turma?.id);
        novo.dias_semana = novo.dias_semana.filter((d) => !bloqueados.includes(d));
      }
      return novo;
    });
  }

  async function handleSalvar() {
    if (!turma) return;
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
      await atualizarTurma(turma.id, {
        dias_semana: diasValidos,
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
