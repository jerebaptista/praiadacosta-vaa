"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { LinhaMudancaPrecoPlano } from "@/lib/planos-preco-mudanca";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  linhas: LinhaMudancaPrecoPlano[];
  /** Gravar após confirmação. */
  onConfirmar: () => void;
  salvando: boolean;
};

export function ConfirmarMudancaPrecosDialog({
  open,
  onOpenChange,
  linhas,
  onConfirmar,
  salvando,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Confirmar novos preços</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg border border-border">
            <Table containerClassName="overflow-x-auto">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-3">Período</TableHead>
                  <TableHead className="text-muted-foreground">Atual</TableHead>
                  <TableHead className="pr-3">Novo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhas.length > 0 ? (
                  linhas.map((l) => (
                    <TableRow key={l.rotulo} className="hover:bg-muted/30">
                      <TableCell className="pl-3 font-medium">{l.rotulo}</TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">
                        {l.anteriorTexto}
                      </TableCell>
                      <TableCell className="pr-3 tabular-nums font-medium">{l.novoTexto}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={3} className="py-6 text-center text-muted-foreground">
                      Nenhuma alteração de preço.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <p className="text-sm text-muted-foreground">
            Os novos preços serão aplicados aos alunos na próxima cobrança.
          </p>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={salvando}
            onClick={() => onOpenChange(false)}
          >
            Voltar
          </Button>
          <Button
            type="button"
            disabled={salvando || linhas.length === 0}
            onClick={() => onConfirmar()}
          >
            {salvando ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Salvando...
              </>
            ) : (
              "Confirmar preços"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
