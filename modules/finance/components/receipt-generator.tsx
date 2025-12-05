"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { toPng } from "html-to-image";
import { Download, Eye, ReceiptText, Trash2 } from "lucide-react";
import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { formatCurrency, formatDate } from "../lib/utils";
import type { VirtualOccurrence } from "../types";

interface ReceiptGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedTransactions: VirtualOccurrence[];
  onClearSelection?: () => void;
}

interface ReceiptDocumentProps {
  title: string;
  transactions: VirtualOccurrence[];
  totalLabel: string;
  className?: string;
}

const ReceiptDocument = forwardRef<HTMLDivElement, ReceiptDocumentProps>(
  ({ title, transactions, totalLabel, className }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-xl border bg-linear-to-b from-background to-muted p-5 space-y-4",
          className
        )}
      >
        <div className="text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Recibo
          </p>
          <p className="text-xl font-semibold">{title}</p>
        </div>
        <Separator />
        {transactions.length ? (
          <div className="space-y-2">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between text-sm"
              >
                <div>
                  <p className="font-medium text-foreground">
                    {tx.description}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {tx.installments && tx.currentInstallment
                      ? `Parcela ${tx.currentInstallment}/${tx.installments}`
                      : "Pagamento único"}
                  </p>
                </div>
                <p className="font-semibold">{formatCurrency(tx.amount)}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-center text-muted-foreground py-6">
            Nenhuma despesa selecionada.
          </p>
        )}
        <Separator />
        <div className="flex items-center justify-between text-sm font-semibold">
          <span>Total Pago</span>
          <span>{totalLabel}</span>
        </div>
      </div>
    );
  }
);

ReceiptDocument.displayName = "ReceiptDocument";

export function ReceiptGenerator({
  open,
  onOpenChange,
  selectedTransactions,
  onClearSelection,
}: ReceiptGeneratorProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [title, setTitle] = useState("Recibo de Pagamentos");
  const [previewOpen, setPreviewOpen] = useState(false);
  const hasSelection = selectedTransactions.length > 0;

  useEffect(() => {
    if (!open) {
      setPreviewOpen(false);
    }
  }, [open]);

  const totalText = useMemo(
    () =>
      formatCurrency(
        selectedTransactions.reduce((sum, tx) => sum + tx.amount, 0)
      ),
    [selectedTransactions]
  );

  const handleDownload = async () => {
    if (!receiptRef.current || !hasSelection) {
      return;
    }

    try {
      const dataUrl = await toPng(receiptRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#0b0b0b",
      });
      const link = document.createElement("a");
      link.download = `${title.replace(/\s+/g, "-")}-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error("Erro ao gerar imagem do recibo", error);
      toast({
        title: "Erro ao gerar recibo",
        description: "Não foi possível criar a imagem do recibo.",
        variant: "destructive",
      });
    }
  };

  const handleDialogChange = (next: boolean) => {
    if (!next) {
      setPreviewOpen(false);
    }
    onOpenChange(next);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleDialogChange}>
        <DialogContent className="min-w-6xl space-y-6">
          <DialogHeader className="space-y-1">
            <div className="flex items-center gap-2 text-foreground">
              <ReceiptText className="w-5 h-5 text-primary" />
              <DialogTitle className="text-2xl">Gerador de Recibos</DialogTitle>
            </div>
            <DialogDescription>
              Consolide despesas pagas e compartilhe um comprovante elegante.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <p className="text-sm text-muted-foreground">
              {hasSelection
                ? `${selectedTransactions.length} despesa(s) incluídas — total de ${totalText}.`
                : "Selecione despesas pagas na tabela para montar o recibo."}
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => setPreviewOpen(true)}
                disabled={!hasSelection}
              >
                <Eye className="w-4 h-4" />
                Pré-visualizar
              </Button>
              <Button
                className="gap-2"
                onClick={handleDownload}
                disabled={!hasSelection}
              >
                <Download className="w-4 h-4" />
                Baixar PNG
              </Button>
              {onClearSelection && (
                <Button
                  type="button"
                  variant="ghost"
                  className="gap-2"
                  disabled={!hasSelection}
                  onClick={onClearSelection}
                >
                  <Trash2 className="w-4 h-4" />
                  Limpar seleção
                </Button>
              )}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            <div className="rounded-lg border">
              <div className="flex items-center justify-between px-4 py-3 border-b text-sm font-medium">
                <span>Itens para o recibo</span>
                <span>Total: {totalText}</span>
              </div>
              {hasSelection ? (
                <div className="max-h-80 divide-y overflow-y-auto">
                  {selectedTransactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-start justify-between gap-4 px-4 py-3 text-sm"
                    >
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">
                          {tx.description}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(new Date(tx.dueDate))}
                          {tx.installments && tx.currentInstallment
                            ? ` · Parcela ${tx.currentInstallment}/${tx.installments}`
                            : " · Pagamento único"}
                        </p>
                      </div>
                      <p className="font-semibold text-foreground">
                        {formatCurrency(tx.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Nenhuma despesa selecionada até o momento.
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <Label
                  htmlFor="receipt-title"
                  className="text-sm text-muted-foreground"
                >
                  Nome do recibo
                </Label>
                <Input
                  id="receipt-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Recibo Projeto X"
                  className="mt-2"
                />
              </div>
              <ReceiptDocument
                ref={receiptRef}
                title={title}
                transactions={selectedTransactions}
                totalLabel={totalText}
              />
              <p className="text-xs text-muted-foreground text-center">
                Este cartão é exportado como imagem quando você baixa o recibo.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Pré-visualização do recibo</DialogTitle>
            <DialogDescription>
              Revise o recibo antes de compartilhar com seus contatos.
            </DialogDescription>
          </DialogHeader>
          <ReceiptDocument
            title={title}
            transactions={selectedTransactions}
            totalLabel={totalText}
            className="shadow-lg"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
