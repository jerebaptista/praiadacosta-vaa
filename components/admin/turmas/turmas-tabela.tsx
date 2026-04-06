"use client";

import { useState, useTransition } from "react";
import {
  Ban,
  CheckCircle2,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { alterarStatusTurma, apagarTurma } from "@/app/actions/turmas";
import { LABEL_DIA_SEMANA, ORDEM_DIA_SEMANA } from "@/lib/remadas-geracao";
import { labelTurmaAuto, type TurmaLinha } from "@/lib/turmas-tipos";
import { EditarTurmaDialog } from "@/components/admin/turmas/editar-turma-dialog";
import { useRouter } from "next/navigation";

function BadgeStatusTurma({ status }: { status: TurmaLinha["status"] }) {
  if (status === "inativa") {
    return (
      <Badge
        variant="outline"
        className="border-transparent bg-muted/50 text-muted-foreground"
      >
        Inativa
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
      Ativa
    </Badge>
  );
}

function PilasDias({ dias }: { dias: number[] }) {
  const ordenados = ORDEM_DIA_SEMANA.filter((d) => dias.includes(d));
  return (
    <div className="flex flex-wrap gap-1">
      {ordenados.map((d) => (
        <span
          key={d}
          className="inline-flex items-center rounded-sm bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground"
        >
          {LABEL_DIA_SEMANA[d]}
        </span>
      ))}
      {ordenados.length === 0 && (
        <span className="text-xs text-muted-foreground">—</span>
      )}
    </div>
  );
}

type CelulaAcoesProps = {
  turma: TurmaLinha;
  onEditar: () => void;
};

function CelulaAcoes({ turma, onEditar }: CelulaAcoesProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmApagar, setConfirmApagar] = useState(false);

  function toggleStatus() {
    const novo = turma.status === "ativa" ? "inativa" : "ativa";
    startTransition(async () => {
      await alterarStatusTurma(turma.id, novo);
      router.refresh();
    });
  }

  function apagar() {
    startTransition(async () => {
      await apagarTurma(turma.id);
      router.refresh();
    });
    setConfirmApagar(false);
  }

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            disabled={pending}
          >
            <MoreHorizontal className="size-4" />
            <span className="sr-only">Ações</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onEditar}>
            <Pencil className="mr-2 size-4" />
            Editar
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={toggleStatus}>
            {turma.status === "ativa" ? (
              <>
                <Ban className="mr-2 size-4" />
                Desativar
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 size-4" />
                Ativar
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => setConfirmApagar(true)}
          >
            <Trash2 className="mr-2 size-4" />
            Apagar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmApagar} onOpenChange={setConfirmApagar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar turma?</AlertDialogTitle>
            <AlertDialogDescription>
              A turma <strong>{turma.nome || labelTurmaAuto(turma)}</strong>{" "}
              será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={apagar}
            >
              Apagar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

type Props = {
  turmas: TurmaLinha[];
};

export function TurmasTabela({ turmas }: Props) {
  const [turmaEditando, setTurmaEditando] = useState<TurmaLinha | null>(null);

  if (turmas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-muted-foreground">
        <p className="text-sm">Nenhuma turma cadastrada.</p>
        <p className="text-xs">Clique em "Nova turma" para começar.</p>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3 text-left">Nome</th>
              <th className="px-4 py-3 text-left">Dias</th>
              <th className="px-4 py-3 text-left">Horário</th>
              <th className="px-4 py-3 text-center">Vagas</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="min-w-[56px] px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {turmas.map((t, i) => (
              <tr
                key={t.id}
                className={
                  i % 2 === 0
                    ? "border-b border-border/60 bg-transparent"
                    : "border-b border-border/60 bg-muted/20"
                }
              >
                <td className="px-4 py-3 font-medium">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="max-w-[200px] truncate block">
                        {t.nome || labelTurmaAuto(t)}
                      </span>
                    </TooltipTrigger>
                    {t.nome ? (
                      <TooltipContent side="bottom">
                        {labelTurmaAuto(t)}
                      </TooltipContent>
                    ) : null}
                  </Tooltip>
                </td>
                <td className="px-4 py-3">
                  <PilasDias dias={t.dias_semana} />
                </td>
                <td className="px-4 py-3 tabular-nums">{t.hora}</td>
                <td className="px-4 py-3 text-center tabular-nums">
                  {t.vagas}
                </td>
                <td className="px-4 py-3">
                  <BadgeStatusTurma status={t.status} />
                </td>
                <td className="px-4 py-3 text-right">
                  <CelulaAcoes
                    turma={t}
                    onEditar={() => setTurmaEditando(t)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <EditarTurmaDialog
        turma={turmaEditando}
        open={turmaEditando != null}
        onOpenChange={(o) => {
          if (!o) setTurmaEditando(null);
        }}
      />
    </TooltipProvider>
  );
}
