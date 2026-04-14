"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowDownUp,
  ArrowRightLeft,
  ArrowUp,
  Ban,
  CalendarClock,
  Check,
  Eye,
  Loader2,
  MoreHorizontal,
  Trash2,
  X,
} from "lucide-react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import {
  alterarStatusPlano,
  apagarPlano,
  atualizarPlano,
  listarAlunosAtivosDoPlano,
  listarPlanos,
} from "@/app/actions/planos";
import { NOME_PLANO_MAX_LEN, sanitizarNomePlano } from "@/lib/input-sanitize";
import { AlunoPlanoMudancaDialog } from "@/components/admin/planos/aluno-plano-mudanca-dialog";
import { ConfirmarMudancaPrecosDialog } from "@/components/admin/planos/confirmar-mudanca-precos-dialog";
import {
  PlanoFormFields,
  type PeriodoCobrancaFormId,
} from "@/components/admin/planos/plano-form-fields";
import { AlunoDrawer } from "@/components/alunos/aluno-drawer";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
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
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
} from "@/components/ui/drawer";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  montarPrecosPlanoParaPersistir,
  planoLinhaParaFormEstado,
  PLANO_FORM_VAZIO,
  reduzirPlanoForm,
  type PlanoFormEstado,
} from "@/lib/plano-form";
import {
  existeOutroPlanoComMesmoNome,
  MSG_NOME_PLANO_DUPLICADO,
} from "@/lib/planos-nome";
import type { PeriodoContrato } from "@/lib/planos-aluno-vigencia";
import {
  periodoIdAPartirDoRotulo,
  periodosDisponiveisDoPlano,
} from "@/lib/planos-periodos-ui";
import {
  listarMudancasPrecoPlano,
  precosSnapshotDePlanoLinha,
  PRECO_SNAPSHOT_VAZIO,
  type LinhaMudancaPrecoPlano,
} from "@/lib/planos-preco-mudanca";
import {
  DESCRICAO_ALERT_REMOVER_PLANO,
  MSG_NAO_PODE_REMOVER_PLANO_ALUNOS_TOOLTIP,
  type AlunoAtivoPlanoLinha,
  type PlanoLinha,
  type PlanoStatus,
} from "@/lib/planos-tipos";
import { cn } from "@/lib/utils";

function CabecalhoOrdenavel({
  title,
  titleTooltip,
  sorted,
  onSort,
}: {
  title: string;
  /** Tooltip ao pairar no título quando o texto do cabeçalho for abreviado. */
  titleTooltip?: string;
  sorted: false | "asc" | "desc";
  onSort: () => void;
}) {
  const ativo = sorted === "asc" || sorted === "desc";
  const titulo =
    titleTooltip != null && titleTooltip !== "" ? (
      <Tooltip>
        <TooltipTrigger asChild>
          <span>{title}</span>
        </TooltipTrigger>
        <TooltipContent side="top">{titleTooltip}</TooltipContent>
      </Tooltip>
    ) : (
      title
    );
  return (
    <Button
      type="button"
      variant="ghost"
      className="group/cab -ml-2 h-8 gap-1 px-2 font-medium hover:bg-muted"
      onClick={onSort}
      aria-sort={ativo ? (sorted === "asc" ? "ascending" : "descending") : "none"}
    >
      {titulo}
      <span
        className="inline-flex size-3.5 shrink-0 items-center justify-center"
        aria-hidden
      >
        {ativo ? (
          sorted === "asc" ? (
            <ArrowUp className="size-3.5 opacity-80" />
          ) : (
            <ArrowDown className="size-3.5 opacity-80" />
          )
        ) : (
          <ArrowDownUp className="size-3.5 opacity-0 transition-opacity group-hover/cab:opacity-45 group-focus-visible/cab:opacity-45" />
        )}
      </span>
    </Button>
  );
}

function iniciais(nome: string): string {
  return nome
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function formatarDataPt(isoYmd: string): string {
  const d = new Date(isoYmd + "T12:00:00");
  if (Number.isNaN(d.getTime())) return isoYmd;
  return d.toLocaleDateString("pt-BR");
}

type Props = {
  plano: PlanoLinha | null;
  onFechar: () => void;
  /** Lista completa (para validar nome único ao editar). */
  todosPlanos: PlanoLinha[];
  precoPorAula: number | null;
};

export function PlanoEdicaoDrawer({ plano, onFechar, todosPlanos, precoPorAula }: Props) {
  const router = useRouter();
  const open = plano !== null;
  const [form, setForm] = useState<PlanoFormEstado>(PLANO_FORM_VAZIO);
  const [alunos, setAlunos] = useState<AlunoAtivoPlanoLinha[]>([]);
  const [carregandoAlunos, setCarregandoAlunos] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, startTransition] = useTransition();
  const [sorting, setSorting] = useState<SortingState>([
    { id: "nome", desc: false },
  ]);
  const [alunoDrawerId, setAlunoDrawerId] = useState<string | null>(null);
  const [mudancaDialog, setMudancaDialog] = useState<{
    open: boolean;
    aluno: AlunoAtivoPlanoLinha | null;
    modo: "mudarPlano" | "mudarPeriodo";
    planoIdPreset?: string;
    periodoPreset?: PeriodoContrato;
  }>({ open: false, aluno: null, modo: "mudarPlano" });
  const [cancelarAluno, setCancelarAluno] = useState<AlunoAtivoPlanoLinha | null>(null);
  /** Lista fresca do servidor para submenus (planos e períodos ativos); `null` até a 1.ª consulta. */
  const [planosConsultados, setPlanosConsultados] = useState<PlanoLinha[] | null>(null);
  const [confirmarPrecosOpen, setConfirmarPrecosOpen] = useState(false);
  const [linhasMudancaPreco, setLinhasMudancaPreco] = useState<LinhaMudancaPrecoPlano[]>([]);
  /** Preços persistidos ao abrir o plano (comparação antes de guardar). */
  const precosBaselineRef = useRef(PRECO_SNAPSHOT_VAZIO);
  const pendenteSalvarRef = useRef<{
    nome: string;
    remadas_por_semana: number;
    preco_mensal: number | null;
    preco_trimestral: number | null;
    preco_semestral: number | null;
    preco_anual: number | null;
    valor_equivalente_mensal: number;
    status: PlanoStatus;
  } | null>(null);
  /** Formulário a aplicar após `atualizarPlano` (ex.: toggle de período antes da confirmação de preços). */
  const pendenteFormAposSalvarRef = useRef<PlanoFormEstado | null>(null);
  /** Se a confirmação de preços veio do botão Salvar (fecha o drawer ao concluir). */
  const fecharDrawerAposSalvarConfirmacaoRef = useRef(false);
  const [confirmarInativarPlano, setConfirmarInativarPlano] = useState(false);
  const [confirmarRemoverPlano, setConfirmarRemoverPlano] = useState(false);
  /** Contagem regressiva (5→0) antes de habilitar «Remover» no alerta. */
  const [segundosConfirmarRemocao, setSegundosConfirmarRemocao] = useState(0);
  const [confirmarInativarPeriodo, setConfirmarInativarPeriodo] = useState<{
    periodo: PeriodoCobrancaFormId;
    nextForm: PlanoFormEstado;
  } | null>(null);

  const listaPlanosFonte = planosConsultados ?? todosPlanos;

  /** Plano em edição conforme última consulta a `listarPlanos` (preços/períodos ativos alinhados ao servidor). */
  const planoAtualConsultado = useMemo(() => {
    if (!plano) return null;
    return listaPlanosFonte.find((p) => p.id === plano.id) ?? plano;
  }, [plano, listaPlanosFonte]);

  /** Todos os planos ativos (inclui o plano atual do aluno — marcado com check no submenu). */
  const planosAtivosOrdenados = useMemo(
    () =>
      plano
        ? listaPlanosFonte
            .filter((p) => p.status === "ativo")
            .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
        : [],
    [plano, listaPlanosFonte]
  );

  /** Períodos ativos do plano atual (só recorrências com preço definido e plano ativo). */
  const periodosDoPlanoAtual = useMemo(
    () =>
      planoAtualConsultado ? periodosDisponiveisDoPlano(planoAtualConsultado) : [],
    [planoAtualConsultado]
  );

  useLayoutEffect(() => {
    if (!confirmarRemoverPlano) {
      setSegundosConfirmarRemocao(0);
      return;
    }
    setSegundosConfirmarRemocao(5);
  }, [confirmarRemoverPlano]);

  useEffect(() => {
    if (!confirmarRemoverPlano) return;
    let restante = 5;
    const id = window.setInterval(() => {
      restante -= 1;
      setSegundosConfirmarRemocao(restante);
      if (restante <= 0) window.clearInterval(id);
    }, 1000);
    return () => window.clearInterval(id);
  }, [confirmarRemoverPlano]);

  useEffect(() => {
    if (!plano) {
      precosBaselineRef.current = PRECO_SNAPSHOT_VAZIO;
      setForm(PLANO_FORM_VAZIO);
      setAlunos([]);
      setPlanosConsultados(null);
      return;
    }
    precosBaselineRef.current = precosSnapshotDePlanoLinha(plano);
    const inicial = planoLinhaParaFormEstado(plano);
    setForm(
      reduzirPlanoForm(inicial, { precoMensal: inicial.precoMensal }, { precoPorAula })
    );
    setErro(null);
    let cancelado = false;
    setCarregandoAlunos(true);
    setPlanosConsultados(null);
    listarPlanos()
      .then((rows) => {
        if (!cancelado) setPlanosConsultados(rows);
      })
      .catch(() => {
        if (!cancelado) setPlanosConsultados(null);
      });
    listarAlunosAtivosDoPlano(plano.id)
      .then((rows) => {
        if (!cancelado) setAlunos(rows);
      })
      .catch(() => {
        if (!cancelado) setAlunos([]);
      })
      .finally(() => {
        if (!cancelado) setCarregandoAlunos(false);
      });
    return () => {
      cancelado = true;
    };
  }, [plano?.id]);

  useEffect(() => {
    if (!plano) return;
    setForm((f) =>
      reduzirPlanoForm(f, { precoMensal: f.precoMensal }, { precoPorAula })
    );
  }, [plano?.id, precoPorAula]);

  function patch(p: Partial<PlanoFormEstado>) {
    setForm((f) => reduzirPlanoForm(f, p, { precoPorAula }));
  }

  function patchAtivoPeriodo(
    periodo: PeriodoCobrancaFormId,
    ativo: boolean
  ): Partial<PlanoFormEstado> {
    switch (periodo) {
      case "mensal":
        return { periodoMensalAtivo: ativo };
      case "trimestral":
        return { periodoTrimestralAtivo: ativo };
      case "semestral":
        return { periodoSemestralAtivo: ativo };
      case "anual":
        return { periodoAnualAtivo: ativo };
    }
  }

  function tituloInativarCobranca(periodo: PeriodoCobrancaFormId): string {
    const m: Record<PeriodoCobrancaFormId, string> = {
      mensal: "Inativar cobrança mensal?",
      trimestral: "Inativar cobrança trimestral?",
      semestral: "Inativar cobrança semestral?",
      anual: "Inativar cobrança anual?",
    };
    return m[periodo];
  }

  function tentarPersistirFormularioAposMudanca(
    nextForm: PlanoFormEstado,
    fecharDrawerAposSucesso: boolean,
    /** Inativar/ativar período pelo switch — sem diálogo de preços (gravar direto). */
    pularConfirmacaoPrecos = false
  ) {
    if (!plano) return;
    setErro(null);
    const nome = sanitizarNomePlano(nextForm.nome);
    if (!nome) {
      setErro("O nome é obrigatório.");
      return;
    }
    if (nome.length > NOME_PLANO_MAX_LEN) {
      setErro(`O nome deve ter no máximo ${NOME_PLANO_MAX_LEN} caracteres.`);
      return;
    }
    if (existeOutroPlanoComMesmoNome(todosPlanos, nome, plano.id)) {
      setErro(MSG_NOME_PLANO_DUPLICADO);
      return;
    }

    let precos: ReturnType<typeof montarPrecosPlanoParaPersistir>;
    try {
      precos = montarPrecosPlanoParaPersistir(nextForm);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Valores inválidos.");
      return;
    }

    const remadas_por_semana = Number(nextForm.remadasPorSemana);
    if (!Number.isInteger(remadas_por_semana) || remadas_por_semana < 1 || remadas_por_semana > 7) {
      setErro("As aulas por semana devem ser entre 1 e 7.");
      return;
    }

    const status: PlanoStatus = nextForm.planoAtivo ? "ativo" : "inativo";
    pendenteSalvarRef.current = {
      nome,
      remadas_por_semana,
      preco_mensal: precos.preco_mensal,
      preco_trimestral: precos.preco_trimestral,
      preco_semestral: precos.preco_semestral,
      preco_anual: precos.preco_anual,
      valor_equivalente_mensal: precos.valor_equivalente_mensal,
      status,
    };
    pendenteFormAposSalvarRef.current = nextForm;
    fecharDrawerAposSalvarConfirmacaoRef.current = fecharDrawerAposSucesso;

    const mudancas = listarMudancasPrecoPlano(precosBaselineRef.current, precos);
    if (!pularConfirmacaoPrecos && mudancas.length > 0) {
      setLinhasMudancaPreco(mudancas);
      setConfirmarPrecosOpen(true);
      return;
    }

    void executarGravacaoPlano();
  }

  function handlePlanoAtivoCheckedChange(checked: boolean) {
    if (!plano) return;
    if (checked) {
      startTransition(async () => {
        try {
          setErro(null);
          await alterarStatusPlano(plano.id, "ativo");
          patch({ planoAtivo: true });
          router.refresh();
          const rows = await listarPlanos();
          setPlanosConsultados(rows);
        } catch (e) {
          setErro(
            e instanceof Error ? e.message : "Não foi possível ativar o plano."
          );
        }
      });
      return;
    }
    setConfirmarInativarPlano(true);
  }

  function confirmarInativarPlanoExecutar() {
    if (!plano) return;
    startTransition(async () => {
      try {
        setErro(null);
        await alterarStatusPlano(plano.id, "inativo");
        patch({ planoAtivo: false });
        setConfirmarInativarPlano(false);
        router.refresh();
        const rows = await listarPlanos();
        setPlanosConsultados(rows);
      } catch (e) {
        setErro(
          e instanceof Error
            ? e.message
            : "Não foi possível inativar o plano."
        );
      }
    });
  }

  function executarRemoverPlano() {
    if (!plano) return;
    setConfirmarRemoverPlano(false);
    startTransition(async () => {
      try {
        setErro(null);
        await apagarPlano(plano.id);
        router.refresh();
        onFechar();
      } catch (e) {
        setErro(
          e instanceof Error ? e.message : "Não foi possível remover o plano."
        );
      }
    });
  }

  const removerPlanoDesabilitado =
    !plano ||
    salvando ||
    carregandoAlunos ||
    alunos.length > 0;

  function handlePeriodoAtivoCheckedChange(
    periodo: PeriodoCobrancaFormId,
    checked: boolean
  ) {
    if (!plano) return;
    const nextForm = reduzirPlanoForm(
      form,
      patchAtivoPeriodo(periodo, checked),
      { precoPorAula }
    );
    if (!checked) {
      setConfirmarInativarPeriodo({ periodo, nextForm });
      return;
    }
    tentarPersistirFormularioAposMudanca(nextForm, false, true);
  }

  function confirmarInativarPeriodoExecutar() {
    const ctx = confirmarInativarPeriodo;
    if (!ctx) return;
    setConfirmarInativarPeriodo(null);
    tentarPersistirFormularioAposMudanca(ctx.nextForm, false, true);
  }

  const nomeNormalizado = useMemo(
    () => sanitizarNomePlano(form.nome),
    [form.nome]
  );
  const nomeDuplicado =
    plano != null &&
    nomeNormalizado !== "" &&
    existeOutroPlanoComMesmoNome(todosPlanos, nomeNormalizado, plano.id);

  const podeSalvar = useMemo(() => {
    if (!plano) return false;
    if (nomeNormalizado.length === 0 || nomeNormalizado.length > NOME_PLANO_MAX_LEN)
      return false;
    if (existeOutroPlanoComMesmoNome(todosPlanos, nomeNormalizado, plano.id))
      return false;
    try {
      montarPrecosPlanoParaPersistir(form);
      return true;
    } catch {
      return false;
    }
  }, [plano, nomeNormalizado, form, todosPlanos]);

  function executarGravacaoPlano() {
    const payload = pendenteSalvarRef.current;
    const formAplicar = pendenteFormAposSalvarRef.current;
    const fecharDrawer = fecharDrawerAposSalvarConfirmacaoRef.current;
    if (!plano || !payload) return;
    startTransition(async () => {
      try {
        await atualizarPlano(plano.id, {
          nome: payload.nome,
          remadas_por_semana: payload.remadas_por_semana,
          preco_mensal: payload.preco_mensal,
          preco_trimestral: payload.preco_trimestral,
          preco_semestral: payload.preco_semestral,
          preco_anual: payload.preco_anual,
          valor_equivalente_mensal: payload.valor_equivalente_mensal,
          status: payload.status,
        });
        precosBaselineRef.current = {
          preco_mensal: payload.preco_mensal,
          preco_trimestral: payload.preco_trimestral,
          preco_semestral: payload.preco_semestral,
          preco_anual: payload.preco_anual,
          valor_equivalente_mensal: payload.valor_equivalente_mensal,
        };
        if (formAplicar) {
          setForm(formAplicar);
        }
        pendenteFormAposSalvarRef.current = null;
        fecharDrawerAposSalvarConfirmacaoRef.current = false;
        router.refresh();
        setConfirmarPrecosOpen(false);
        pendenteSalvarRef.current = null;
        try {
          const rowsAlunos = await listarAlunosAtivosDoPlano(plano.id);
          setAlunos(rowsAlunos);
        } catch {
          /* mantém lista atual */
        }
        try {
          const rowsPlanos = await listarPlanos();
          setPlanosConsultados(rowsPlanos);
        } catch {
          /* ignora */
        }
        if (fecharDrawer) {
          onFechar();
        }
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Não foi possível guardar o plano.");
      }
    });
  }

  function handleSalvar() {
    if (!plano) return;
    setErro(null);
    const nome = sanitizarNomePlano(form.nome);
    if (!nome) {
      setErro("O nome é obrigatório.");
      return;
    }
    if (nome.length > NOME_PLANO_MAX_LEN) {
      setErro(`O nome deve ter no máximo ${NOME_PLANO_MAX_LEN} caracteres.`);
      return;
    }

    let precos: ReturnType<typeof montarPrecosPlanoParaPersistir>;
    try {
      precos = montarPrecosPlanoParaPersistir(form);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Valores inválidos.");
      return;
    }

    const remadas_por_semana = Number(form.remadasPorSemana);
    if (!Number.isInteger(remadas_por_semana) || remadas_por_semana < 1 || remadas_por_semana > 7) {
      setErro("As aulas por semana devem ser entre 1 e 7.");
      return;
    }

    const status: PlanoStatus = form.planoAtivo ? "ativo" : "inativo";
    pendenteSalvarRef.current = {
      nome,
      remadas_por_semana,
      preco_mensal: precos.preco_mensal,
      preco_trimestral: precos.preco_trimestral,
      preco_semestral: precos.preco_semestral,
      preco_anual: precos.preco_anual,
      valor_equivalente_mensal: precos.valor_equivalente_mensal,
      status,
    };
    pendenteFormAposSalvarRef.current = null;
    fecharDrawerAposSalvarConfirmacaoRef.current = true;

    const mudancas = listarMudancasPrecoPlano(precosBaselineRef.current, precos);
    if (mudancas.length > 0) {
      setLinhasMudancaPreco(mudancas);
      setConfirmarPrecosOpen(true);
      return;
    }

    executarGravacaoPlano();
  }

  const colunasAlunos = useMemo<ColumnDef<AlunoAtivoPlanoLinha>[]>(
    () => {
      if (!plano) return [];
      return [
      {
        id: "avatar",
        accessorKey: "nome",
        header: () => <span className="sr-only">Avatar</span>,
        cell: ({ row }) => (
          <div className="flex justify-center">
            <Avatar size="sm" className="shrink-0">
              {row.original.avatar_url ? (
                <AvatarImage src={row.original.avatar_url} alt={row.original.nome} />
              ) : null}
              <AvatarFallback className="text-[10px]">
                {iniciais(row.original.nome)}
              </AvatarFallback>
            </Avatar>
          </div>
        ),
        enableSorting: false,
      },
      {
        id: "nome",
        accessorKey: "nome",
        header: ({ column }) => (
          <CabecalhoOrdenavel
            title="Nome"
            sorted={column.getIsSorted()}
            onSort={() => column.toggleSorting(column.getIsSorted() === "asc")}
          />
        ),
        cell: ({ row }) => (
          <span className="min-w-0 truncate font-medium">{row.original.nome}</span>
        ),
        sortingFn: (a, b) =>
          a.original.nome.localeCompare(b.original.nome, "pt-BR"),
      },
      {
        id: "pagamento",
        accessorKey: "pagamento",
        header: ({ column }) => (
          <CabecalhoOrdenavel
            title="Pagamento"
            sorted={column.getIsSorted()}
            onSort={() => column.toggleSorting(column.getIsSorted() === "asc")}
          />
        ),
        cell: ({ row }) => {
          const ok = row.original.pagamento === "pago";
          return (
            <Badge
              variant={ok ? "secondary" : "outline"}
              className={
                ok
                  ? "h-auto min-h-0 border-emerald-200/80 bg-emerald-50 px-2 py-0.5 text-xs font-medium leading-tight text-emerald-900 dark:bg-emerald-950/35 dark:text-emerald-100"
                  : "h-auto min-h-0 border-amber-200/80 bg-amber-50 px-2 py-0.5 text-xs font-medium leading-tight text-amber-950 dark:bg-amber-950/35 dark:text-amber-100"
              }
            >
              {ok ? "Pago" : "Pendente"}
            </Badge>
          );
        },
        sortingFn: (a, b) =>
          a.original.pagamento.localeCompare(b.original.pagamento, "pt-BR"),
      },
      {
        id: "periodo",
        accessorKey: "periodo",
        header: ({ column }) => (
          <CabecalhoOrdenavel
            title="Período"
            sorted={column.getIsSorted()}
            onSort={() => column.toggleSorting(column.getIsSorted() === "asc")}
          />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.periodo}</span>
        ),
        sortingFn: (a, b) =>
          a.original.periodo.localeCompare(b.original.periodo, "pt-BR"),
      },
      {
        id: "vencimento",
        accessorKey: "vencimento",
        header: ({ column }) => (
          <CabecalhoOrdenavel
            title="Vencimento"
            sorted={column.getIsSorted()}
            onSort={() => column.toggleSorting(column.getIsSorted() === "asc")}
          />
        ),
        cell: ({ row }) => (
          <span className="tabular-nums text-muted-foreground">
            {formatarDataPt(row.original.vencimento)}
          </span>
        ),
        sortingFn: (a, b) =>
          a.original.vencimento.localeCompare(b.original.vencimento),
      },
      {
        id: "menu",
        header: () => <span className="sr-only">Menu</span>,
        cell: ({ row }) => (
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 opacity-0 transition-opacity focus-visible:opacity-100 data-[state=open]:opacity-100 max-sm:opacity-100 sm:group-hover:opacity-100"
                aria-label={`Ações para ${row.original.nome}`}
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-52">
              <DropdownMenuItem
                onSelect={() => {
                  setAlunoDrawerId(row.original.id);
                }}
              >
                <Eye className="size-4 opacity-70" />
                Ver aluno
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="gap-2">
                  <ArrowRightLeft className="size-4 opacity-70" />
                  Mudar de plano
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="min-w-[12rem]">
                  {planosAtivosOrdenados.length === 0 ? (
                    <DropdownMenuItem disabled>
                      Nenhum plano ativo disponível
                    </DropdownMenuItem>
                  ) : (
                    planosAtivosOrdenados.map((p) => {
                      const planoAtualDoAluno = p.id === plano.id;
                      return (
                        <DropdownMenuItem
                          key={p.id}
                          className="gap-2"
                          onSelect={() => {
                            if (planoAtualDoAluno) return;
                            setMudancaDialog({
                              open: true,
                              aluno: row.original,
                              modo: "mudarPlano",
                              planoIdPreset: p.id,
                            });
                          }}
                        >
                          <span
                            className="flex size-4 shrink-0 items-center justify-center"
                            aria-hidden
                          >
                            {planoAtualDoAluno ? (
                              <Check className="size-4 opacity-90" />
                            ) : null}
                          </span>
                          <span className="min-w-0 flex-1 truncate">{p.nome}</span>
                        </DropdownMenuItem>
                      );
                    })
                  )}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="gap-2">
                  <CalendarClock className="size-4 opacity-70" />
                  Mudar período
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="min-w-[10rem]">
                  {periodosDoPlanoAtual.length === 0 ? (
                    <DropdownMenuItem disabled>
                      Nenhum período disponível neste plano
                    </DropdownMenuItem>
                  ) : (
                    periodosDoPlanoAtual.map((op) => {
                      const periodoAtualDoAluno =
                        op.id === periodoIdAPartirDoRotulo(row.original.periodo);
                      return (
                        <DropdownMenuItem
                          key={op.id}
                          className="gap-2"
                          onSelect={() => {
                            if (periodoAtualDoAluno) return;
                            setMudancaDialog({
                              open: true,
                              aluno: row.original,
                              modo: "mudarPeriodo",
                              periodoPreset: op.id,
                            });
                          }}
                        >
                          <span
                            className="flex size-4 shrink-0 items-center justify-center"
                            aria-hidden
                          >
                            {periodoAtualDoAluno ? (
                              <Check className="size-4 opacity-90" />
                            ) : null}
                          </span>
                          <span className="min-w-0 flex-1">{op.label}</span>
                        </DropdownMenuItem>
                      );
                    })
                  )}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                className="gap-2"
                onSelect={() => setCancelarAluno(row.original)}
              >
                <Ban className="size-4 opacity-90" />
                Cancelar plano
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
        enableSorting: false,
      },
    ];
    },
    [plano, planosAtivosOrdenados, periodosDoPlanoAtual]
  );

  const tabelaAlunos = useReactTable({
    data: alunos,
    columns: colunasAlunos,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableSortingRemoval: false,
  });

  return (
    <>
    <Drawer
      open={open}
      onOpenChange={(o) => {
        if (!o) onFechar();
      }}
      direction="right"
    >
      <DrawerContent className="sm:max-w-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
          <p className="text-base font-semibold">Editar plano</p>
          <DrawerClose asChild>
            <Button variant="ghost" size="icon" className="size-8 shrink-0">
              <X className="size-4" />
              <span className="sr-only">Fechar</span>
            </Button>
          </DrawerClose>
        </div>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-6">
          {plano ? (
            <>
              <PlanoFormFields
                form={form}
                patch={patch}
                nomeContadorId="plano-edicao-nome-contador"
                erroNome={nomeDuplicado ? MSG_NOME_PLANO_DUPLICADO : null}
                mostrarStatusPlano
                precoPorAula={precoPorAula}
                onPlanoAtivoCheckedChange={handlePlanoAtivoCheckedChange}
                onPeriodoAtivoCheckedChange={handlePeriodoAtivoCheckedChange}
                acoesDesabilitadas={salvando}
              />

              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Alunos ativos
                </p>
                {carregandoAlunos ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="size-6 animate-spin text-muted-foreground" />
                  </div>
                ) : alunos.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border bg-muted/20 px-3 py-6 text-center text-sm text-muted-foreground">
                    Nenhum aluno ativo.
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <Table className="table-fixed">
                      <colgroup>
                        <col className="w-9" />
                        <col />
                        <col className="w-[7rem]" />
                        <col className="w-[6rem]" />
                        <col className="w-[7.5rem]" />
                        <col className="w-9" />
                      </colgroup>
                      <TableHeader>
                        {tabelaAlunos.getHeaderGroups().map((hg) => (
                          <TableRow key={hg.id}>
                            {hg.headers.map((h) => (
                              <TableHead
                                key={h.id}
                                className={cn(
                                  h.column.id === "avatar" && "w-9 px-1.5 text-center",
                                  h.column.id === "nome" && "max-w-0",
                                  (h.column.id === "pagamento" ||
                                    h.column.id === "periodo" ||
                                    h.column.id === "vencimento") &&
                                    "px-1.5",
                                  h.column.id === "menu" && "w-9 px-1"
                                )}
                              >
                                {h.isPlaceholder
                                  ? null
                                  : flexRender(h.column.columnDef.header, h.getContext())}
                              </TableHead>
                            ))}
                          </TableRow>
                        ))}
                      </TableHeader>
                      <TableBody>
                        {tabelaAlunos.getRowModel().rows.map((row) => (
                          <TableRow key={row.id} className="group">
                            {row.getVisibleCells().map((cell) => (
                              <TableCell
                                key={cell.id}
                                className={cn(
                                  cell.column.id === "avatar" &&
                                    "w-9 px-1.5 py-2 text-center",
                                  cell.column.id === "nome" &&
                                    "max-w-0 min-w-0 px-2 py-2",
                                  cell.column.id === "menu" &&
                                    "w-9 px-1 py-2 text-right",
                                  (cell.column.id === "pagamento" ||
                                    cell.column.id === "periodo" ||
                                    cell.column.id === "vencimento") &&
                                    "px-1.5 py-2 whitespace-nowrap"
                                )}
                              >
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              {plano ? (
                <div className="flex flex-wrap items-start gap-2 pt-1">
                  {removerPlanoDesabilitado ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex">
                          <Button
                            type="button"
                            variant="ghost"
                            className="gap-2 border-0 text-destructive shadow-none hover:bg-destructive/10 hover:text-destructive focus-visible:text-destructive active:bg-destructive/15 active:text-destructive dark:hover:bg-destructive/10 dark:hover:text-destructive"
                            disabled
                          >
                            <Trash2 className="size-4 shrink-0" />
                            Remover plano
                          </Button>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[280px]">
                        {carregandoAlunos
                          ? "A carregar alunos…"
                          : salvando
                            ? "Aguarde a conclusão da gravação."
                            : MSG_NAO_PODE_REMOVER_PLANO_ALUNOS_TOOLTIP}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      className="gap-2 border-0 text-destructive shadow-none hover:bg-destructive/10 hover:text-destructive focus-visible:text-destructive active:bg-destructive/15 active:text-destructive dark:hover:bg-destructive/10 dark:hover:text-destructive"
                      onClick={() => setConfirmarRemoverPlano(true)}
                    >
                      <Trash2 className="size-4 shrink-0" />
                      Remover plano
                    </Button>
                  )}
                </div>
              ) : null}
            </>
          ) : null}
        </div>

        <div className="shrink-0 border-t border-border px-6 py-4">
          {erro ? (
            <p className="mb-3 text-sm text-destructive" role="alert">
              {erro}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={salvando}
              onClick={() => onFechar()}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={salvando || !plano || !podeSalvar}
              onClick={() => void handleSalvar()}
            >
              {salvando ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Salvando...
                </>
              ) : (
                "Salvar"
              )}
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>

    <ConfirmarMudancaPrecosDialog
      open={confirmarPrecosOpen}
      onOpenChange={(v) => {
        setConfirmarPrecosOpen(v);
        if (!v) {
          pendenteSalvarRef.current = null;
          pendenteFormAposSalvarRef.current = null;
          fecharDrawerAposSalvarConfirmacaoRef.current = false;
        }
      }}
      linhas={linhasMudancaPreco}
      onConfirmar={() => void executarGravacaoPlano()}
      salvando={salvando}
    />

    <AlunoDrawer alunoId={alunoDrawerId} onClose={() => setAlunoDrawerId(null)} />

    {plano ? (
      <AlunoPlanoMudancaDialog
        open={mudancaDialog.open}
        onOpenChange={(v) => {
          setMudancaDialog((s) => ({
            ...s,
            open: v,
            aluno: v ? s.aluno : null,
          }));
        }}
        aluno={mudancaDialog.aluno}
        planoAtual={planoAtualConsultado ?? plano}
        todosPlanos={listaPlanosFonte}
        modo={mudancaDialog.modo}
        planoIdPreset={mudancaDialog.planoIdPreset}
        periodoPreset={mudancaDialog.periodoPreset}
      />
    ) : null}

    <AlertDialog open={confirmarInativarPlano} onOpenChange={setConfirmarInativarPlano}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Inativar plano?</AlertDialogTitle>
          <AlertDialogDescription>
            O plano deixará de estar disponível para novas matrículas enquanto estiver inativo.
            Deseja continuar?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={salvando}>Voltar</AlertDialogCancel>
          <AlertDialogAction
            disabled={salvando}
            onClick={(e) => {
              e.preventDefault();
              void confirmarInativarPlanoExecutar();
            }}
          >
            {salvando ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Salvando...
              </>
            ) : (
              "Inativar"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <AlertDialog open={confirmarRemoverPlano} onOpenChange={setConfirmarRemoverPlano}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remover plano?</AlertDialogTitle>
          <AlertDialogDescription>{DESCRICAO_ALERT_REMOVER_PLANO}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={salvando}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            className="bg-destructive text-destructive-foreground hover:bg-destructive/10 hover:text-destructive active:bg-destructive active:text-destructive-foreground dark:bg-destructive dark:text-destructive-foreground dark:hover:bg-destructive/10 dark:hover:text-destructive dark:active:bg-destructive dark:active:text-destructive-foreground"
            disabled={salvando || segundosConfirmarRemocao > 0}
            onClick={(e) => {
              e.preventDefault();
              void executarRemoverPlano();
            }}
          >
            {salvando ? (
              <>
                <Loader2 className="size-4 animate-spin" /> A remover…
              </>
            ) : segundosConfirmarRemocao > 0 ? (
              "Aguarde..."
            ) : (
              "Remover"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <AlertDialog
      open={confirmarInativarPeriodo !== null}
      onOpenChange={(v) => {
        if (!v) setConfirmarInativarPeriodo(null);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {confirmarInativarPeriodo
              ? tituloInativarCobranca(confirmarInativarPeriodo.periodo)
              : ""}
          </AlertDialogTitle>
          <AlertDialogDescription>
            Este período deixará de ser ofertado aos alunos. Deseja continuar?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={salvando}>Voltar</AlertDialogCancel>
          <AlertDialogAction
            disabled={salvando}
            onClick={(e) => {
              e.preventDefault();
              void confirmarInativarPeriodoExecutar();
            }}
          >
            {salvando ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Salvando...
              </>
            ) : (
              "Inativar"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <AlertDialog
      open={cancelarAluno !== null}
      onOpenChange={(v) => {
        if (!v) setCancelarAluno(null);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancelar plano do aluno?</AlertDialogTitle>
          <AlertDialogDescription>
            {cancelarAluno ? (
              <>
                Confirma cancelar o plano de <strong>{cancelarAluno.nome}</strong> neste
                vínculo? Esta ação será registada quando a integração estiver disponível.
              </>
            ) : null}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Voltar</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => setCancelarAluno(null)}
          >
            Confirmar cancelamento
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
