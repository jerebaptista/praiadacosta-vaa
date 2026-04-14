"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, X } from "lucide-react";
import { criarPlano } from "@/app/actions/planos";
import { NOME_PLANO_MAX_LEN, sanitizarNomePlano } from "@/lib/input-sanitize";
import {
  existeOutroPlanoComMesmoNome,
  MSG_NOME_PLANO_DUPLICADO,
} from "@/lib/planos-nome";
import {
  listarMudancasPrecoPlano,
  PRECO_SNAPSHOT_VAZIO,
  type LinhaMudancaPrecoPlano,
} from "@/lib/planos-preco-mudanca";
import type { PlanoLinha } from "@/lib/planos-tipos";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
} from "@/components/ui/drawer";
import { ConfirmarMudancaPrecosDialog } from "@/components/admin/planos/confirmar-mudanca-precos-dialog";
import { PlanoFormFields } from "@/components/admin/planos/plano-form-fields";
import {
  montarPrecosPlanoParaPersistir,
  PLANO_FORM_VAZIO,
  reduzirPlanoForm,
  type PlanoFormEstado,
} from "@/lib/plano-form";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Planos já cadastrados (para nome único). */
  planosExistentes: PlanoLinha[];
  precoPorAula: number | null;
};

export function PlanoCadastroDrawer({
  open,
  onOpenChange,
  planosExistentes,
  precoPorAula,
}: Props) {
  const router = useRouter();
  const [form, setForm] = useState<PlanoFormEstado>(PLANO_FORM_VAZIO);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, startTransition] = useTransition();
  const [confirmarPrecosOpen, setConfirmarPrecosOpen] = useState(false);
  const [linhasMudancaPreco, setLinhasMudancaPreco] = useState<LinhaMudancaPrecoPlano[]>([]);
  const pendenteCriarRef = useRef<{
    nome: string;
    remadas_por_semana: number;
    preco_mensal: number | null;
    preco_trimestral: number | null;
    preco_semestral: number | null;
    preco_anual: number | null;
    valor_equivalente_mensal: number;
  } | null>(null);

  useEffect(() => {
    if (!open) return;
    setErro(null);
    const base = reduzirPlanoForm(
      PLANO_FORM_VAZIO,
      { precoMensal: PLANO_FORM_VAZIO.precoMensal },
      { precoPorAula }
    );
    setForm(base);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setForm((f) =>
      reduzirPlanoForm(f, { precoMensal: f.precoMensal }, { precoPorAula })
    );
  }, [precoPorAula]);

  function patch(p: Partial<PlanoFormEstado>) {
    setForm((f) => reduzirPlanoForm(f, p, { precoPorAula }));
  }

  const nomeNormalizado = useMemo(
    () => sanitizarNomePlano(form.nome),
    [form.nome]
  );
  const nomeDuplicado = useMemo(
    () =>
      nomeNormalizado !== "" &&
      existeOutroPlanoComMesmoNome(planosExistentes, nomeNormalizado),
    [nomeNormalizado, planosExistentes]
  );

  const podeAdicionar = useMemo(() => {
    if (nomeNormalizado.length === 0 || nomeNormalizado.length > NOME_PLANO_MAX_LEN)
      return false;
    if (existeOutroPlanoComMesmoNome(planosExistentes, nomeNormalizado)) {
      return false;
    }
    try {
      montarPrecosPlanoParaPersistir(form);
      return true;
    } catch {
      return false;
    }
  }, [nomeNormalizado, form, planosExistentes]);

  function executarGravacaoCriar() {
    const payload = pendenteCriarRef.current;
    if (!payload) return;
    startTransition(async () => {
      try {
        await criarPlano({
          nome: payload.nome,
          remadas_por_semana: payload.remadas_por_semana,
          preco_mensal: payload.preco_mensal,
          preco_trimestral: payload.preco_trimestral,
          preco_semestral: payload.preco_semestral,
          preco_anual: payload.preco_anual,
          valor_equivalente_mensal: payload.valor_equivalente_mensal,
        });
        router.refresh();
        setConfirmarPrecosOpen(false);
        pendenteCriarRef.current = null;
        onOpenChange(false);
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Não foi possível criar o plano.");
      }
    });
  }

  function handleSalvar() {
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

    pendenteCriarRef.current = {
      nome,
      remadas_por_semana,
      preco_mensal: precos.preco_mensal,
      preco_trimestral: precos.preco_trimestral,
      preco_semestral: precos.preco_semestral,
      preco_anual: precos.preco_anual,
      valor_equivalente_mensal: precos.valor_equivalente_mensal,
    };

    const mudancas = listarMudancasPrecoPlano(PRECO_SNAPSHOT_VAZIO, precos);
    if (mudancas.length > 0) {
      setLinhasMudancaPreco(mudancas);
      setConfirmarPrecosOpen(true);
      return;
    }

    executarGravacaoCriar();
  }

  return (
    <>
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent>
        <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
          <p className="text-base font-semibold">Novo plano</p>
          <DrawerClose asChild>
            <Button variant="ghost" size="icon" className="size-8 shrink-0">
              <X className="size-4" />
              <span className="sr-only">Fechar</span>
            </Button>
          </DrawerClose>
        </div>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-6">
          <PlanoFormFields
            form={form}
            patch={patch}
            nomeContadorId="plano-novo-nome-contador"
            erroNome={nomeDuplicado ? MSG_NOME_PLANO_DUPLICADO : null}
            precoPorAula={precoPorAula}
          />
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
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={salvando || !podeAdicionar}
              onClick={() => void handleSalvar()}
            >
              {salvando ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Salvando...
                </>
              ) : (
                "Adicionar plano"
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
        if (!v) pendenteCriarRef.current = null;
      }}
      linhas={linhasMudancaPreco}
      onConfirmar={() => void executarGravacaoCriar()}
      salvando={salvando}
    />
    </>
  );
}
