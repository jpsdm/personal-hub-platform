"use client";

import type React from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/finance-utils";
import { useEffect, useState } from "react";

interface Account {
  id: string;
  name: string;
  isDefault: boolean;
  initialBalance: number;
  currentBalance: number;
}

interface AccountDialogProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  account?: Account | null;
  onSuccess?: () => void;
}

export function AccountDialog({
  trigger,
  open: controlledOpen,
  onOpenChange,
  account,
  onSuccess,
}: AccountDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
  });
  const [initialBalance, setInitialBalance] = useState<number>(0);
  const [balanceAdjustment, setBalanceAdjustment] = useState<number>(0);
  const [createCorrectionTransaction, setCreateCorrectionTransaction] =
    useState(true);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? onOpenChange! : setInternalOpen;

  const isEditing = !!account;

  // Reset form when dialog opens/closes or account changes
  useEffect(() => {
    if (open && account) {
      setFormData({
        name: account.name,
      });
      setInitialBalance(account.initialBalance);
      setBalanceAdjustment(account.currentBalance);
      setCreateCorrectionTransaction(true);
    } else if (!open) {
      setFormData({ name: "" });
      setInitialBalance(0);
      setBalanceAdjustment(0);
      setCreateCorrectionTransaction(true);
    }
  }, [open, account]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isEditing && account) {
        // Calcular a diferença do saldo
        const balanceDifference = balanceAdjustment - account.currentBalance;

        const response = await fetch(`/api/accounts/${account.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.name,
            initialBalance: initialBalance,
            balanceAdjustment: balanceDifference,
            createCorrectionTransaction:
              balanceDifference !== 0 && createCorrectionTransaction,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Erro ao atualizar conta");
        }
      } else {
        const response = await fetch("/api/accounts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.name,
            initialBalance: initialBalance,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Erro ao criar conta");
        }
      }

      setOpen(false);
      setFormData({ name: "" });
      setInitialBalance(0);
      setBalanceAdjustment(0);
      onSuccess?.();
    } catch (error: any) {
      console.error("Error saving account:", error);
      alert(error.message || "Erro ao salvar conta");
    } finally {
      setLoading(false);
    }
  };

  // Calcular a diferença para mostrar ao usuário
  const currentBalanceDiff =
    account && balanceAdjustment
      ? balanceAdjustment - account.currentBalance
      : 0;

  const content = (
    <DialogContent className="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>{isEditing ? "Editar Conta" : "Nova Conta"}</DialogTitle>
        {isEditing && (
          <DialogDescription>
            Edite os dados da conta. Você pode ajustar o saldo atual e
            opcionalmente criar uma transação de correção.
          </DialogDescription>
        )}
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nome da Conta</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Ex: Banco Inter, Nubank..."
            required
          />
        </div>

        {!isEditing && (
          <div className="space-y-2">
            <Label htmlFor="initialBalance">Saldo Inicial</Label>
            <CurrencyInput
              id="initialBalance"
              value={initialBalance}
              onValueChange={setInitialBalance}
              required
            />
          </div>
        )}

        {isEditing && account && (
          <>
            <div className="space-y-2">
              <Label htmlFor="currentBalance">Saldo Atual</Label>
              <CurrencyInput
                id="currentBalance"
                value={balanceAdjustment}
                onValueChange={setBalanceAdjustment}
              />
              {currentBalanceDiff !== 0 && (
                <p
                  className={`text-sm ${
                    currentBalanceDiff > 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {currentBalanceDiff > 0 ? "+" : ""}
                  {formatCurrency(currentBalanceDiff)} de ajuste
                </p>
              )}
            </div>

            {currentBalanceDiff !== 0 && (
              <div className="flex items-start space-x-3 p-3 bg-muted rounded-lg">
                <Checkbox
                  id="createCorrection"
                  checked={createCorrectionTransaction}
                  onCheckedChange={(checked) =>
                    setCreateCorrectionTransaction(checked === true)
                  }
                />
                <div className="space-y-1">
                  <Label
                    htmlFor="createCorrection"
                    className="text-sm font-medium cursor-pointer"
                  >
                    Criar transação de correção
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {createCorrectionTransaction ? (
                      currentBalanceDiff > 0 ? (
                        <>
                          Será criada uma <strong>receita</strong> de correção
                          no valor de{" "}
                          <strong>
                            {formatCurrency(Math.abs(currentBalanceDiff))}
                          </strong>
                        </>
                      ) : (
                        <>
                          Será criada uma <strong>despesa</strong> de correção
                          no valor de{" "}
                          <strong>
                            {formatCurrency(Math.abs(currentBalanceDiff))}
                          </strong>
                        </>
                      )
                    ) : (
                      "O saldo será ajustado diretamente sem criar transação"
                    )}
                  </p>
                </div>
              </div>
            )}

            <div className="pt-2 border-t">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Saldo inicial registrado:</span>
                <span>{formatCurrency(account.initialBalance)}</span>
              </div>
            </div>
          </>
        )}

        <div className="flex gap-2 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </form>
    </DialogContent>
  );

  if (trigger) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        {content}
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {content}
    </Dialog>
  );
}
