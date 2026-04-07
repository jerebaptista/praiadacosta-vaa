"use client";

import { useEffect, useMemo, useState } from "react";
import { format, isValid, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { criarRemadasLote } from "@/app/actions/remadas";
import type { RemadaLinha } from "@/lib/remadas-geracao";
import {
  normalizarVagas,
  validarPayloadCriacaoRemadas,
} from "@/lib/remadas-validacao";

function dataLocalHoje(): string {
  const n = new Date();
  const y = n.getFullYear();
  const m = String(n.getMonth() + 1).padStart(2, "0");
  const d = String(n.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const HORAS_00_23 = Array.from({ length: 24 }, (_, i) =>
  String(i).padStart(2, "0")
);
const MINUTOS_5 = [
  "00", "05", "10", "15", "20", "25", "30",
  "35", "40", "45", "50", "55",
] as const;

function partesHora(hhmm: string): { hh: string; mm: string } {
  const [a, b] = hhmm.split(":");
  const h = Number.parseInt(a ?? "", 10);
  const hh = Number.isFinite(h)
    ? String(Math.min(23, Math.max(0, h))).padStart(2, "0")
    : "04";
  const mm = MINUTOS_5.includes((b ?? "") as (typeof MINUTOS_5)[number])
    ? b!
    : "00";
  return { hh, mm };
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSalvar: (linhas: RemadaLinha[]) => void | Promise<void>;
};

export function CriarRemadaDialog({ open, onOpenChange, onSalvar }: Props) {
  const [dataInicio, setDataInicio] = useState(dataLocalHoje);
  const [hora, setHora] = useState("04:45");
  const [vagasStr, setVagasStr] = useState("5");
  const [erro, setErro] = useState<string | null>(null);
  const [dataPopoverAberto, setDataPopoverAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const dataSelecionada = useMemo(() => {
    if (!dataInicio) return undefined;
    const d = parse(dataInicio, "yyyy-MM-dd", new Date());
    return isValid(d) ? d : undefined;
  }, [dataInicio]);

  const { hh: horaH, mm: horaM } = useMemo(() => partesHora(hora), [hora]);

  useEffect(() => {
    if (!open) return;
    setErro(null);
    setDataInicio(dataLocalHoje());
    setHora("04:45");
    setVagasStr("5");
    setDataPopoverAberto(false);
    setSalvando(false);
  }, [open]);

  async function handleSalvar() {
    setErro(null);
    const validado = validarPayloadCriacaoRemadas({
      dataInicio,
      hora,
      vagas: vagasStr,
      repete: false,
      diasSemana: [],
      dataFim: null,
    });
    if (!validado.ok) {
      setErro(validado.erro);
      return;
    }

    setSalvando(true);
    try {
      const criadas = await criarRemadasLote({
        dataInicio: validado.payload.dataInicio,
        hora: validado.payload.hora,
        vagas: validado.payload.vagas,
        repete: false,
        diasSemana: [],
        dataFim: null,
      });
      await Promise.resolve(onSalvar(criadas));
      onOpenChange(false);
    } catch (e) {
      setErro(
        e instanceof Error ? e.message : "Não foi possível salvar a remada."
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-4 sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>Nova remada</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:items-end">
            <div className="space-y-2">
              <Label>Data</Label>
              <Popover
                open={dataPopoverAberto}
                onOpenChange={setDataPopoverAberto}
              >
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 w-full justify-start gap-2 font-normal"
                  >
                    <CalendarIcon className="size-4 opacity-60" />
                    {dataSelecionada
                      ? format(dataSelecionada, "dd/MM/yyyy", { locale: ptBR })
                      : "Escolher data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="z-[300] w-auto p-0 data-open:duration-100 data-closed:duration-100 data-open:zoom-in-100"
                  align="start"
                >
                  <Calendar
                    mode="single"
                    showOutsideDays={false}
                    locale={ptBR}
                    selected={dataSelecionada}
                    onSelect={(d) => {
                      if (d) {
                        setDataInicio(format(d, "yyyy-MM-dd"));
                        setDataPopoverAberto(false);
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <span
                className="text-sm font-medium leading-none"
                id="hora-remada"
              >
                Horário
              </span>
              <div
                className="flex items-center gap-1.5"
                role="group"
                aria-labelledby="hora-remada"
              >
                <Select
                  value={horaH}
                  onValueChange={(h) => setHora(`${h}:${horaM}`)}
                >
                  <SelectTrigger
                    className="h-8 min-w-0 flex-1"
                    aria-label="Hora"
                    showChevron={false}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[300] max-h-60">
                    {HORAS_00_23.map((h) => (
                      <SelectItem key={h} value={h}>
                        {h}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span
                  className="shrink-0 text-sm text-muted-foreground"
                  aria-hidden
                >
                  :
                </span>
                <Select
                  value={horaM}
                  onValueChange={(m) => setHora(`${horaH}:${m}`)}
                >
                  <SelectTrigger
                    className="h-8 min-w-0 flex-1"
                    aria-label="Minutos"
                    showChevron={false}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[300]">
                    {MINUTOS_5.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vagas-remada">Vagas</Label>
              <Input
                id="vagas-remada"
                type="text"
                name="vagas-remada"
                inputMode="numeric"
                autoComplete="off"
                maxLength={2}
                className="h-8"
                aria-invalid={
                  vagasStr !== "" && normalizarVagas(vagasStr) == null
                }
                value={vagasStr}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "").slice(0, 2);
                  setVagasStr(v);
                }}
                onBlur={() => {
                  if (vagasStr === "") setVagasStr("5");
                }}
              />
            </div>
          </div>

          {erro ? (
            <p className="text-sm text-destructive" role="alert">
              {erro}
            </p>
          ) : null}
        </div>

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
            disabled={salvando}
            onClick={() => void handleSalvar()}
          >
            {salvando ? "Salvando…" : "Criar remada"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
