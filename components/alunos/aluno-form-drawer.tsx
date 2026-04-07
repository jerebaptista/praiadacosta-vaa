"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { buscarAlunoFormData, criarAluno, atualizarAluno } from "@/app/actions/alunos";
import type { AlunoFormData } from "@/lib/alunos-form-data";
import { LABEL_DIA_SEMANA, ORDEM_DIA_SEMANA } from "@/lib/remadas-geracao";
import { cn } from "@/lib/utils";
import type { PlanoOpcao, TurmaSlot } from "@/components/alunos/criar-aluno-dialog";
import {
  digitosNacionaisTelefoneBr,
  formatarTelefoneNacionalInput,
  telefoneBrasilParaArmazenar,
  TELEFONE_DDI_BR,
} from "@/lib/telefone-br";

/* ── Formatadores ── */
function formatarCpf(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function formatarCep(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

/* ── Helpers UI ── */
function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{titulo}</p>
      {children}
    </div>
  );
}

function Campo({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}

/* ── Estado do formulário ── */
type TurmaSlotSelecionado = { turmaId: string; dia: number };

const VAZIO = {
  avatarPreview: null as string | null,
  avatarFile: null as File | null,
  nome: "",
  cpf: "",
  telefone: "",
  email: "",
  dataNascimento: "",
  sexo: "" as "masculino" | "feminino" | "",
  cep: "",
  logradouro: "",
  bairro: "",
  cidade: "",
  estado: "",
  numero: "",
  complemento: "",
  cepCarregado: false,
  planoId: "",
  turmasSelecionadas: [] as TurmaSlotSelecionado[],
};
type Form = typeof VAZIO;

/* ── Props ── */
type Props = {
  /** null = criar novo; string = editar aluno com esse id */
  alunoId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planos: PlanoOpcao[];
  turmaSlots: TurmaSlot[];
  /** Quando vem da listagem SSR, o formulário abre já preenchido (sem esperar o server action). */
  initialFormData?: AlunoFormData | null;
};

function formStateFromAlunoFormData(dados: AlunoFormData): Form {
  return {
    avatarPreview: dados.avatar_url ?? null,
    avatarFile: null,
    nome: dados.nome,
    cpf: dados.cpf ? formatarCpf(dados.cpf) : "",
    telefone: dados.telefone
      ? formatarTelefoneNacionalInput(digitosNacionaisTelefoneBr(dados.telefone))
      : "",
    email: dados.email ?? "",
    dataNascimento: dados.data_nascimento?.slice(0, 10) ?? "",
    sexo: (dados.sexo as "masculino" | "feminino" | "") ?? "",
    cep: dados.cep ? formatarCep(dados.cep) : "",
    logradouro: dados.logradouro ?? "",
    bairro: dados.bairro ?? "",
    cidade: dados.cidade ?? "",
    estado: dados.estado ?? "",
    numero: dados.numero ?? "",
    complemento: dados.complemento ?? "",
    cepCarregado: !!(dados.logradouro || dados.bairro || dados.cidade),
    planoId: dados.plano_id ?? "",
    turmasSelecionadas: [],
  };
}

export function AlunoFormDrawer({
  alunoId,
  open,
  onOpenChange,
  planos,
  turmaSlots,
  initialFormData = null,
}: Props) {
  const router = useRouter();
  const modo = alunoId ? "editar" : "criar";
  const [form, setForm] = useState<Form>(VAZIO);
  const [carregando, setCarregando] = useState(false);
  const [cepBuscando, setCepBuscando] = useState(false);
  const [cepErro, setCepErro] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const initialFormRef = useRef(initialFormData);
  initialFormRef.current = initialFormData;

  function patch(p: Partial<Form>) {
    setForm((f) => ({ ...f, ...p }));
  }

  /* Sempre buscar o aluno no servidor ao editar: `initialFormData` da listagem é parcial e fica
   * desatualizado após salvar (props do cliente não mudam só com revalidate até haver refresh). */
  useEffect(() => {
    if (!open) {
      setForm(VAZIO);
      setCepErro(null);
      setErro(null);
      return;
    }
    if (!alunoId) {
      setForm(VAZIO);
      return;
    }

    const snap = initialFormRef.current;
    if (snap && snap.id === alunoId) {
      setForm(formStateFromAlunoFormData(snap));
      setCarregando(false);
    } else {
      setCarregando(true);
    }

    let cancelado = false;
    buscarAlunoFormData(alunoId)
      .then((dados) => {
        if (cancelado || !dados) return;
        setForm(formStateFromAlunoFormData(dados));
      })
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });

    return () => {
      cancelado = true;
    };
  }, [open, alunoId]);

  /* Avatar */
  function onAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    patch({ avatarFile: file, avatarPreview: URL.createObjectURL(file) });
  }

  /* CEP */
  async function buscarCep() {
    const digits = form.cep.replace(/\D/g, "");
    if (digits.length !== 8) { setCepErro("CEP deve ter 8 dígitos."); return; }
    setCepErro(null);
    setCepBuscando(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (data.erro) { setCepErro("CEP não encontrado."); return; }
      patch({ logradouro: data.logradouro ?? "", bairro: data.bairro ?? "", cidade: data.localidade ?? "", estado: data.uf ?? "", cepCarregado: true });
    } catch {
      setCepErro("Não foi possível consultar o CEP.");
    } finally {
      setCepBuscando(false);
    }
  }

  function limparCep() {
    patch({ cep: "", logradouro: "", bairro: "", cidade: "", estado: "", cepCarregado: false });
    setCepErro(null);
  }

  /* Plano / turmas */
  const planoSelecionado = planos.find((p) => p.id === form.planoId) ?? null;
  const limiteturmas = planoSelecionado?.remadas_por_semana ?? 0;

  function toggleSlot(slot: TurmaSlot) {
    const jaEsta = form.turmasSelecionadas.some((s) => s.turmaId === slot.turmaId && s.dia === slot.dia);
    if (jaEsta) {
      patch({ turmasSelecionadas: form.turmasSelecionadas.filter((s) => !(s.turmaId === slot.turmaId && s.dia === slot.dia)) });
    } else if (form.turmasSelecionadas.length < limiteturmas) {
      patch({ turmasSelecionadas: [...form.turmasSelecionadas, { turmaId: slot.turmaId, dia: slot.dia }] });
    }
  }

  const slotsOrdenados = [...turmaSlots].sort((a, b) => {
    const ia = ORDEM_DIA_SEMANA.indexOf(a.dia as (typeof ORDEM_DIA_SEMANA)[number]);
    const ib = ORDEM_DIA_SEMANA.indexOf(b.dia as (typeof ORDEM_DIA_SEMANA)[number]);
    return ia !== ib ? ia - ib : a.hora.localeCompare(b.hora);
  });

  /* Salvar */
  function handleSalvar() {
    setErro(null);
    if (!form.nome.trim()) { setErro("O nome é obrigatório."); return; }

    startTransition(async () => {
      try {
        const input = {
          nome: form.nome.trim(),
          cpf: form.cpf.replace(/\D/g, "") || undefined,
          telefone: telefoneBrasilParaArmazenar(form.telefone),
          email: form.email || undefined,
          data_nascimento: form.dataNascimento || undefined,
          sexo: (form.sexo || undefined) as "masculino" | "feminino" | undefined,
          cep: form.cep.replace(/\D/g, "") || undefined,
          logradouro: form.logradouro || undefined,
          bairro: form.bairro || undefined,
          cidade: form.cidade || undefined,
          estado: form.estado || undefined,
          numero: form.numero || undefined,
          complemento: form.complemento || undefined,
          plano_id: form.planoId || undefined,
        };
        if (modo === "editar" && alunoId) {
          await atualizarAluno(alunoId, input);
          router.refresh();
          onOpenChange(false);
        } else {
          await criarAluno(input);
          router.refresh();
          onOpenChange(false);
        }
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Ocorreu um erro.");
      }
    });
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent>
        {/* Header fixo */}
        <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
          <p className="text-base font-semibold">
            {modo === "criar" ? "Novo aluno" : "Editar aluno"}
          </p>
          <DrawerClose asChild>
            <Button variant="ghost" size="icon" className="size-8 shrink-0">
              <X className="size-4" />
              <span className="sr-only">Fechar</span>
            </Button>
          </DrawerClose>
        </div>

        {/* Conteúdo com scroll */}
        {carregando ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">

            {/* Foto */}
            <Secao titulo="Foto">
              <div className="flex items-center gap-4">
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-border bg-muted/40 transition-colors hover:bg-muted"
                >
                  {form.avatarPreview
                    ? <img src={form.avatarPreview} alt="Prévia" className="size-full object-cover" />
                    : <Camera className="size-6 text-muted-foreground" />}
                </button>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Clique para escolher uma foto</p>
                  {form.avatarPreview && (
                    <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 text-xs text-muted-foreground"
                      onClick={() => patch({ avatarPreview: null, avatarFile: null })}>
                      <X className="size-3" /> Remover foto
                    </Button>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onAvatarChange} />
              </div>
            </Secao>

            {/* Dados pessoais */}
            <Secao titulo="Dados pessoais">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Campo label="Nome" required>
                    <Input className="h-8" placeholder="Nome completo" value={form.nome}
                      onChange={(e) => patch({ nome: e.target.value })} maxLength={120} />
                  </Campo>
                </div>
                <Campo label="CPF">
                  <Input className="h-8" placeholder="000.000.000-00" value={form.cpf}
                    onChange={(e) => patch({ cpf: formatarCpf(e.target.value) })} />
                </Campo>
                <Campo label="Telefone">
                  <div className="flex h-8 items-stretch overflow-hidden rounded-md border border-input bg-background ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                    <span
                      className="flex shrink-0 items-center border-r border-input bg-muted/50 px-2.5 text-sm tabular-nums text-muted-foreground"
                      title={`DDI +${TELEFONE_DDI_BR} (Brasil)`}
                    >
                      +{TELEFONE_DDI_BR}
                    </span>
                    <Input
                      className="h-8 min-w-0 flex-1 rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                      placeholder="(00) 00000-0000"
                      inputMode="numeric"
                      autoComplete="tel-national"
                      value={form.telefone}
                      onChange={(e) =>
                        patch({ telefone: formatarTelefoneNacionalInput(e.target.value) })
                      }
                    />
                  </div>
                </Campo>
                <div className="sm:col-span-2">
                  <Campo label="E-mail">
                    <Input type="email" className="h-8" placeholder="nome@exemplo.com"
                      value={form.email} onChange={(e) => patch({ email: e.target.value })} />
                  </Campo>
                </div>
                <Campo label="Data de nascimento">
                  <Input type="date" className="h-8" value={form.dataNascimento}
                    onChange={(e) => patch({ dataNascimento: e.target.value })} />
                </Campo>
                <Campo label="Sexo">
                  <Select value={form.sexo} onValueChange={(v) => patch({ sexo: v as "masculino" | "feminino" })}>
                    <SelectTrigger className="h-8"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="masculino">Masculino</SelectItem>
                      <SelectItem value="feminino">Feminino</SelectItem>
                    </SelectContent>
                  </Select>
                </Campo>
              </div>
            </Secao>

            {/* Endereço */}
            <Secao titulo="Endereço">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Campo label="CEP">
                    <div className="flex gap-2">
                      <Input className="h-8 max-w-[140px]" placeholder="00000-000" value={form.cep}
                        disabled={form.cepCarregado}
                        onChange={(e) => patch({ cep: formatarCep(e.target.value) })}
                        onKeyDown={(e) => { if (e.key === "Enter") void buscarCep(); }} />
                      {!form.cepCarregado ? (
                        <Button type="button" variant="outline" size="sm" className="h-8"
                          disabled={cepBuscando || form.cep.replace(/\D/g, "").length !== 8}
                          onClick={() => void buscarCep()}>
                          {cepBuscando ? <Loader2 className="size-3.5 animate-spin" /> : "Buscar"}
                        </Button>
                      ) : (
                        <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 text-muted-foreground" onClick={limparCep}>
                          <X className="size-3.5" /> Limpar CEP
                        </Button>
                      )}
                    </div>
                    {cepErro && <p className="mt-1 text-xs text-destructive">{cepErro}</p>}
                  </Campo>
                </div>
                <div className="sm:col-span-2">
                  <Campo label="Logradouro">
                    <Input className="h-8" placeholder="Rua, Avenida…" value={form.logradouro}
                      disabled={form.cepCarregado} onChange={(e) => patch({ logradouro: e.target.value })} />
                  </Campo>
                </div>
                <Campo label="Número">
                  <Input className="h-8" placeholder="Nº" value={form.numero}
                    onChange={(e) => patch({ numero: e.target.value })} />
                </Campo>
                <Campo label="Complemento">
                  <Input className="h-8" placeholder="Apto, bloco…" value={form.complemento}
                    onChange={(e) => patch({ complemento: e.target.value })} />
                </Campo>
                <Campo label="Bairro">
                  <Input className="h-8" value={form.bairro} disabled={form.cepCarregado}
                    onChange={(e) => patch({ bairro: e.target.value })} />
                </Campo>
                <Campo label="Cidade">
                  <Input className="h-8" value={form.cidade} disabled={form.cepCarregado}
                    onChange={(e) => patch({ cidade: e.target.value })} />
                </Campo>
                <Campo label="Estado">
                  <Input className="h-8 max-w-[80px] uppercase" value={form.estado}
                    disabled={form.cepCarregado} maxLength={2}
                    onChange={(e) => patch({ estado: e.target.value.toUpperCase() })} />
                </Campo>
              </div>
            </Secao>

            {/* Plano & turmas */}
            <Secao titulo="Plano & turmas">
              <Campo label="Plano">
                <Select value={form.planoId} onValueChange={(v) => patch({ planoId: v, turmasSelecionadas: [] })}>
                  <SelectTrigger className="h-8"><SelectValue placeholder="Escolher plano" /></SelectTrigger>
                  <SelectContent>
                    {planos.length === 0 && <SelectItem value="_none" disabled>Nenhum plano</SelectItem>}
                    {planos.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome}
                        <span className="ml-1 text-xs text-muted-foreground">
                          · {p.remadas_por_semana}×/sem · {p.preco_mensal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Campo>

              {planoSelecionado && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Turmas</Label>
                    <span className={cn("text-xs", form.turmasSelecionadas.length >= limiteturmas ? "font-medium text-emerald-700" : "text-muted-foreground")}>
                      {form.turmasSelecionadas.length}/{limiteturmas} selecionadas
                    </span>
                  </div>
                  {slotsOrdenados.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhuma turma ativa disponível.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {slotsOrdenados.map((slot) => {
                        const sel = form.turmasSelecionadas.some((s) => s.turmaId === slot.turmaId && s.dia === slot.dia);
                        const cheio = !sel && form.turmasSelecionadas.length >= limiteturmas;
                        return (
                          <button key={`${slot.turmaId}-${slot.dia}`} type="button" disabled={cheio}
                            onClick={() => toggleSlot(slot)}
                            className={cn(
                              "inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                              sel ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : cheio ? "cursor-not-allowed border-border bg-muted/40 text-muted-foreground/50"
                                  : "border-border bg-background text-foreground hover:bg-muted"
                            )}>
                            {sel && <Check className="size-3 shrink-0" />}
                            {LABEL_DIA_SEMANA[slot.dia]}
                            <span className="text-muted-foreground">{sel ? "" : " ·"} {slot.hora}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </Secao>
          </div>
        )}

        {/* Footer fixo */}
        <div className="shrink-0 border-t border-border px-6 py-4">
          {erro && <p className="mb-3 text-sm text-destructive" role="alert">{erro}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" disabled={salvando} onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="button" disabled={salvando || carregando} onClick={() => void handleSalvar()}>
              {salvando ? <><Loader2 className="size-4 animate-spin" /> Salvando…</> : modo === "criar" ? "Adicionar" : "Salvar alterações"}
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
