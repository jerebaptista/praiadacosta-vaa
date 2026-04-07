"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { alterarStatusTurma, apagarTurma } from "@/app/actions/turmas";
import { LABEL_DIA_SEMANA, ORDEM_DIA_SEMANA } from "@/lib/remadas-geracao";
import { type TurmaAluno, type TurmaLinha } from "@/lib/turmas-tipos";
import { EditarTurmaDialog } from "@/components/admin/turmas/editar-turma-dialog";

function BadgeStatusTurma({ status }: { status: TurmaLinha["status"] }) {
  if (status === "inativa") {
    return (
      <Badge variant="outline" className="border-border bg-muted/60 font-normal text-muted-foreground">
        Inativa
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="border-emerald-200 bg-emerald-50 font-normal text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-400">
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

function iniciais(nome: string): string {
  return nome
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function CelulaAlunos({ alunos }: { alunos: TurmaAluno[] }) {
  if (alunos.length === 0) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  const MAX = 3;
  const visiveis = alunos.slice(0, MAX);
  const extra = alunos.length - MAX;

  return (
    <AvatarGroup>
      {visiveis.map((a) => (
        <Avatar key={a.id} size="sm">
          {a.avatar_url ? (
            <AvatarImage src={a.avatar_url} alt={a.nome} />
          ) : null}
          <AvatarFallback className="text-[10px]">{iniciais(a.nome)}</AvatarFallback>
        </Avatar>
      ))}
      {extra > 0 && (
        <AvatarGroupCount className="size-6 text-xs">+{extra}</AvatarGroupCount>
      )}
    </AvatarGroup>
  );
}

function CelulaAcoes({ turma, onEditar }: { turma: TurmaLinha; onEditar: () => void }) {
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
            className="size-8 opacity-0 transition-opacity group-hover/row:opacity-100 data-[state=open]:opacity-100"
            disabled={pending}
          >
            <MoreHorizontal className="size-4" />
            <span className="sr-only">Ações</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-44">
          <DropdownMenuItem onClick={onEditar}>
            <Pencil className="size-4" />
            Editar
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={toggleStatus}>
            {turma.status === "ativa" ? (
              <>
                <Ban className="size-4" />
                Desativar
              </>
            ) : (
              <>
                <CheckCircle2 className="size-4" />
                Ativar
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setConfirmApagar(true)}
          >
            <Trash2 className="size-4" />
            Apagar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmApagar} onOpenChange={setConfirmApagar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar turma?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta turma será removida permanentemente.
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
  turmasExistentes: TurmaLinha[];
};

export function TurmasTabela({ turmas, turmasExistentes }: Props) {
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
    <>
      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Dias</TableHead>
              <TableHead>Horário</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Vagas</TableHead>
              <TableHead>Alunos</TableHead>
              <TableHead className="w-[1%] min-w-[3rem]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {turmas.map((t) => (
              <TableRow key={t.id} className="group/row">
                <TableCell>
                  <PilasDias dias={t.dias_semana} />
                </TableCell>
                <TableCell>{t.hora}</TableCell>
                <TableCell>
                  <BadgeStatusTurma status={t.status} />
                </TableCell>
                <TableCell>{t.vagas}</TableCell>
                <TableCell>
                  <CelulaAlunos alunos={t.alunos} />
                </TableCell>
                <TableCell className="text-right">
                  <CelulaAcoes
                    turma={t}
                    onEditar={() => setTurmaEditando(t)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <EditarTurmaDialog
        turma={turmaEditando}
        open={turmaEditando != null}
        onOpenChange={(o) => {
          if (!o) setTurmaEditando(null);
        }}
        turmasExistentes={turmasExistentes}
      />
    </>
  );
}
