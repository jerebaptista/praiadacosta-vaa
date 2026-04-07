"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Cake,
  IdCard,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
} from "@/components/ui/drawer";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  apagarAluno,
  buscarAlunoPerfil,
  type AlunoPerfil,
} from "@/app/actions/alunos";
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
import { formatarTelefoneBrasilExibicao } from "@/lib/telefone-br";
import {
  Card,
  CardContent,
} from "@/components/ui/card";

function iniciais(nome: string) {
  return nome
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function BadgeStatus({ status }: { status: string }) {
  if (status === "ativo")
    return (
      <Badge
        variant="outline"
        className="border-emerald-200 bg-emerald-50 font-normal text-emerald-700"
      >
        Ativo
      </Badge>
    );
  if (status === "pendente")
    return (
      <Badge
        variant="outline"
        className="border-amber-200 bg-amber-50 font-normal text-amber-700"
      >
        Pendente
      </Badge>
    );
  if (status === "inativo")
    return (
      <Badge
        variant="outline"
        className="border-red-200 bg-red-50 font-normal text-red-600"
      >
        Inativo
      </Badge>
    );
  if (status === "cancelado")
    return (
      <Badge
        variant="outline"
        className="border-border bg-muted/60 font-normal text-muted-foreground"
      >
        Cancelado
      </Badge>
    );
  return (
    <Badge
      variant="outline"
      className="border-border bg-muted/60 font-normal text-muted-foreground"
    >
      {status}
    </Badge>
  );
}

function NaoInformado() {
  return <span className="text-muted-foreground">Não informado</span>;
}

/** Ex.: "01 de maio de 2024" */
function formatarClienteDesde(isoYmd: string): string {
  const d = new Date(isoYmd + "T12:00:00");
  if (Number.isNaN(d.getTime())) return isoYmd;
  const dia = String(d.getDate()).padStart(2, "0");
  const mes = d.toLocaleDateString("pt-BR", { month: "long" });
  const ano = d.getFullYear();
  return `${dia} de ${mes} de ${ano}`;
}

function LinhaIcone({
  icon: Icon,
  tituloTooltip,
  children,
}: {
  icon: LucideIcon;
  tituloTooltip: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 text-sm">
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className="mt-0.5 inline-flex size-4 shrink-0 cursor-default items-center justify-center text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
            tabIndex={0}
          >
            <Icon className="size-4" aria-hidden />
            <span className="sr-only">{tituloTooltip}</span>
          </span>
        </TooltipTrigger>
        <TooltipContent side="left" sideOffset={4}>
          {tituloTooltip}
        </TooltipContent>
      </Tooltip>
      <div className="min-w-0 flex-1 leading-snug text-foreground">{children}</div>
    </div>
  );
}

function PerfilConteudo({
  perfil,
  onEditar,
  onApagado,
}: {
  perfil: AlunoPerfil;
  onEditar?: () => void;
  onApagado: () => void;
}) {
  const router = useRouter();
  const [confirmApagar, setConfirmApagar] = useState(false);
  const [erroApagar, setErroApagar] = useState<string | null>(null);
  const [apagando, startApagar] = useTransition();

  const mensalidadeEmDia = perfil.pagamento?.status === "pago";
  const remadasSemanaTexto =
    perfil.plano_remadas_semana == null
      ? "—"
      : perfil.plano_remadas_semana === 1
        ? "1 remada por semana"
        : `${perfil.plano_remadas_semana} remadas por semana`;

  const nascimentoFmt = perfil.data_nascimento
    ? new Date(perfil.data_nascimento + "T12:00:00").toLocaleDateString("pt-BR")
    : null;

  const clienteDesdeFmt = perfil.cliente_desde
    ? formatarClienteDesde(perfil.cliente_desde)
    : null;

  const disponiveisFmt = perfil.creditos_extras_erro
    ? "—"
    : String(perfil.creditos_extras_disponiveis).padStart(2, "0");

  function confirmarApagar() {
    setErroApagar(null);
    startApagar(async () => {
      try {
        await apagarAluno(perfil.id);
        router.refresh();
        setConfirmApagar(false);
        onApagado();
      } catch (e) {
        setErroApagar(
          e instanceof Error ? e.message : "Não foi possível apagar o aluno."
        );
      }
    });
  }

  return (
    <TooltipProvider delayDuration={250}>
    <div className="flex flex-col gap-6 px-6 pb-8 pt-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex flex-col items-start">
          <Avatar className="size-20 shrink-0">
            {perfil.avatar_url ? (
              <AvatarImage src={perfil.avatar_url} alt={perfil.nome} />
            ) : null}
            <AvatarFallback className="text-lg font-medium">
              {iniciais(perfil.nome)}
            </AvatarFallback>
          </Avatar>
          <h2 className="mt-4 text-xl font-semibold leading-tight tracking-tight">
            {perfil.nome}
          </h2>
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-sm text-muted-foreground">
              {perfil.plano_nome ?? "Sem plano"}
            </span>
            <BadgeStatus status={perfil.status} />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {onEditar && (
            <Button
              variant="ghost"
              size="default"
              className="text-primary hover:bg-muted hover:text-primary"
              onClick={onEditar}
            >
              <Pencil />
              Editar
            </Button>
          )}
          <DrawerClose asChild>
            <Button variant="ghost" size="icon" className="size-8 shrink-0">
              <X className="size-4" />
              <span className="sr-only">Fechar</span>
            </Button>
          </DrawerClose>
        </div>
      </div>

      <div className="space-y-3.5">
        <LinhaIcone icon={IdCard} tituloTooltip="CPF">
          {perfil.cpf ?? <NaoInformado />}
        </LinhaIcone>
        <LinhaIcone icon={Cake} tituloTooltip="Nascimento">
          {nascimentoFmt ?? <NaoInformado />}
        </LinhaIcone>
        <LinhaIcone icon={Phone} tituloTooltip="Telefone">
          {perfil.telefone ? (
            formatarTelefoneBrasilExibicao(perfil.telefone)
          ) : (
            <NaoInformado />
          )}
        </LinhaIcone>
        <LinhaIcone icon={Mail} tituloTooltip="E-mail">
          {perfil.email ?? <NaoInformado />}
        </LinhaIcone>
        <LinhaIcone icon={MapPin} tituloTooltip="Endereço">
          {perfil.endereco_linha ?? <NaoInformado />}
        </LinhaIcone>
      </div>

      <div className="flex flex-col gap-3">
        <Card size="sm" className="gap-0 py-3">
          <CardContent className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="text-sm font-medium text-foreground">Remadas extras</p>
              <p className="text-sm text-muted-foreground">
                Disponíveis:{" "}
                <span className="tabular-nums text-foreground">{disponiveisFmt}</span>
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="default"
              className="shrink-0 text-primary hover:bg-muted hover:text-primary"
            >
              Editar
            </Button>
          </CardContent>
        </Card>

        <Card size="sm" className="gap-0 py-3">
          <CardContent className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="text-sm font-medium leading-snug text-foreground">
                {perfil.plano_nome ?? "Sem plano"}
              </p>
              <p className="text-sm text-muted-foreground">{remadasSemanaTexto}</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="default"
              className="shrink-0 text-primary hover:bg-muted hover:text-primary"
            >
              Editar
            </Button>
          </CardContent>
        </Card>

        <Card size="sm" className="gap-0 py-3">
          <CardContent className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="text-sm font-medium text-foreground">Turma</p>
              <p className="text-sm text-muted-foreground">
                {perfil.turma_resumo?.trim() ? (
                  perfil.turma_resumo
                ) : (
                  <NaoInformado />
                )}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="default"
              className="shrink-0 text-primary hover:bg-muted hover:text-primary"
            >
              Editar
            </Button>
          </CardContent>
        </Card>

        <Card size="sm" className="gap-0 py-3">
          <CardContent className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="text-sm font-medium text-foreground">Pagamento</p>
              <p className="text-sm text-muted-foreground">
                Status ·{" "}
                <span className="font-medium text-foreground">
                  {mensalidadeEmDia ? "Em dia" : "Em aberto"}
                </span>
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="default"
              className="shrink-0 text-primary hover:bg-muted hover:text-primary"
            >
              Histórico
            </Button>
          </CardContent>
        </Card>

        <Card size="sm" className="gap-0 py-3">
          <CardContent className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="text-sm font-medium text-foreground">Remadas</p>
              <p className="text-sm text-muted-foreground">
                Próxima remada:{" "}
                {perfil.proxima_remada &&
                perfil.proxima_remada.data !== "—" &&
                perfil.proxima_remada.horario !== "—" ? (
                  <span className="text-foreground">
                    {perfil.proxima_remada.data} · {perfil.proxima_remada.horario}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="default"
              className="shrink-0 text-primary hover:bg-muted hover:text-primary"
            >
              Histórico
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col items-start gap-1">
        {clienteDesdeFmt ? (
          <p className="text-xs text-muted-foreground">
            Aluno desde {clienteDesdeFmt}
          </p>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          disabled={apagando}
          className="h-auto justify-start gap-1 px-0 py-0 text-xs font-normal text-muted-foreground hover:bg-transparent hover:text-destructive"
          onClick={() => {
            setErroApagar(null);
            setConfirmApagar(true);
          }}
        >
          <X className="size-3 shrink-0" aria-hidden />
          Apagar dados
        </Button>
      </div>

      <AlertDialog open={confirmApagar} onOpenChange={setConfirmApagar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar aluno?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  Esta ação remove <strong className="text-foreground">{perfil.nome}</strong>{" "}
                  e os dados associados. Não pode ser desfeita.
                </p>
                {erroApagar ? (
                  <p className="text-destructive">{erroApagar}</p>
                ) : null}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={apagando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={apagando}
              onClick={(e) => {
                e.preventDefault();
                confirmarApagar();
              }}
            >
              {apagando ? "A apagar…" : "Apagar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </TooltipProvider>
  );
}

type Props = {
  alunoId: string | null;
  onClose: () => void;
  onEditar?: (id: string) => void;
};

export function AlunoDrawer({ alunoId, onClose, onEditar }: Props) {
  const [perfil, setPerfil] = useState<AlunoPerfil | null>(null);
  const [carregando, startTransition] = useTransition();

  useEffect(() => {
    if (!alunoId) {
      setPerfil(null);
      return;
    }
    setPerfil(null);
    startTransition(async () => {
      const dados = await buscarAlunoPerfil(alunoId);
      setPerfil(dados);
    });
  }, [alunoId]);

  return (
    <Drawer
      open={alunoId !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      direction="right"
    >
      <DrawerContent>
        <div className="flex-1 overflow-y-auto">
          {carregando ? (
            <>
              <div className="flex justify-end px-6 pt-4">
                <DrawerClose asChild>
                  <Button variant="ghost" size="icon" className="size-8">
                    <X className="size-4" />
                    <span className="sr-only">Fechar</span>
                  </Button>
                </DrawerClose>
              </div>
              <div className="flex items-center justify-center py-20">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            </>
          ) : perfil ? (
            <PerfilConteudo
              perfil={perfil}
              onEditar={onEditar ? () => onEditar(perfil.id) : undefined}
              onApagado={onClose}
            />
          ) : (
            <>
              <div className="flex justify-end px-6 pt-4">
                <DrawerClose asChild>
                  <Button variant="ghost" size="icon" className="size-8">
                    <X className="size-4" />
                    <span className="sr-only">Fechar</span>
                  </Button>
                </DrawerClose>
              </div>
              <div className="flex items-center justify-center px-6 py-20">
                <p className="text-sm text-muted-foreground">
                  Não foi possível carregar o perfil.
                </p>
              </div>
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
