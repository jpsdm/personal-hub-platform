"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  INVESTMENT_TRANSACTION_TYPE_LABELS,
  INVESTMENT_TRANSACTION_TYPES,
} from "@/modules/finance/lib/constants";
import { formatCurrency } from "@/modules/finance/lib/utils";
import type {
  Account,
  Category,
  InvestmentTransactionFormData,
  InvestmentTransactionType,
  InvestmentWithAsset,
  MarketQuote,
} from "@/modules/finance/types";
import { format } from "date-fns";
import {
  ArrowDownCircle,
  ArrowLeft,
  ArrowUpCircle,
  Check,
  FileText,
  Wallet,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type DialogStep = "form" | "ask_transaction" | "transaction_form" | "summary";

interface LinkedTransactionData {
  createTransaction: boolean;
  categoryId: string;
  accountId: string;
  description: string;
}

interface InvestmentTransactionDialogProps {
  investment: InvestmentWithAsset;
  currentQuote?: MarketQuote | null;
  defaultType?: InvestmentTransactionType;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
}

export function InvestmentTransactionDialog({
  investment,
  currentQuote,
  defaultType = "BUY",
  open,
  onOpenChange,
  onSuccess,
}: InvestmentTransactionDialogProps) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<DialogStep>("form");
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  const [formData, setFormData] = useState<InvestmentTransactionFormData>({
    type: defaultType,
    quantity: 0,
    price: currentQuote?.price || 0,
    fees: 0,
    date: format(new Date(), "yyyy-MM-dd"),
    notes: "",
  });

  // Estado separado para controlar o input de quantidade como string
  const [quantityInput, setQuantityInput] = useState("");

  const [linkedTransaction, setLinkedTransaction] =
    useState<LinkedTransactionData>({
      createTransaction: false,
      categoryId: "",
      accountId: "",
      description: "",
    });

  // Update price when quote changes or type changes
  useEffect(() => {
    if (
      currentQuote?.price &&
      (formData.type === "BUY" || formData.type === "SELL") &&
      formData.price === 0
    ) {
      setFormData((prev) => ({ ...prev, price: currentQuote.price }));
    }
  }, [currentQuote, formData.type, formData.price]);

  // Update default type when prop changes
  useEffect(() => {
    setFormData((prev) => ({ ...prev, type: defaultType }));
  }, [defaultType]);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setStep("form");
      setFormData({
        type: defaultType,
        quantity: 0,
        price: currentQuote?.price || 0,
        fees: 0,
        date: format(new Date(), "yyyy-MM-dd"),
        notes: "",
      });
      setQuantityInput("");
      setLinkedTransaction({
        createTransaction: false,
        categoryId: "",
        accountId: "",
        description: "",
      });
    }
  }, [open, defaultType, currentQuote]);

  const fetchCategoriesAndAccounts = useCallback(async () => {
    setLoadingData(true);
    try {
      const [categoriesRes, accountsRes] = await Promise.all([
        fetch("/api/categories"),
        fetch("/api/accounts"),
      ]);

      if (categoriesRes.ok) {
        const data = await categoriesRes.json();
        setCategories(data);
      }

      if (accountsRes.ok) {
        const data = await accountsRes.json();
        setAccounts(data);
        // Pre-select default account
        const defaultAccount = data.find((acc: Account) => acc.isDefault);
        if (defaultAccount) {
          setLinkedTransaction((prev) => ({
            ...prev,
            accountId: defaultAccount.id,
          }));
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoadingData(false);
    }
  }, []);

  const totalValue = formData.quantity * formData.price;
  const isSplit = formData.type === "SPLIT" || formData.type === "BONUS";
  const transactionType = formData.type === "SELL" ? "INCOME" : "EXPENSE";

  // Filter categories by type
  const filteredCategories = categories.filter(
    (cat) => cat.type === transactionType
  );

  const getDefaultDescription = () => {
    const action = formData.type === "SELL" ? "Venda" : "Compra";
    return `${action} de ${formData.quantity}x ${investment.asset.symbol}`;
  };

  const validateForm = (): boolean => {
    if (formData.quantity <= 0) {
      toast.error("Quantidade deve ser maior que zero");
      return false;
    }
    if (
      formData.price <= 0 &&
      formData.type !== "SPLIT" &&
      formData.type !== "BONUS"
    ) {
      toast.error("Preço deve ser maior que zero");
      return false;
    }
    if (formData.type === "SELL" && formData.quantity > investment.quantity) {
      toast.error(`Você só possui ${investment.quantity} unidades deste ativo`);
      return false;
    }
    return true;
  };

  const handleNextStep = () => {
    if (!validateForm()) return;

    if (formData.type === "BUY" || formData.type === "SELL") {
      // Update default description
      setLinkedTransaction((prev) => ({
        ...prev,
        description: getDefaultDescription(),
      }));
      setStep("ask_transaction");
      fetchCategoriesAndAccounts();
    } else {
      // For other types, go directly to summary
      setStep("summary");
    }
  };

  const handleChooseTransaction = (create: boolean) => {
    setLinkedTransaction((prev) => ({
      ...prev,
      createTransaction: create,
    }));

    if (create) {
      setStep("transaction_form");
    } else {
      setStep("summary");
    }
  };

  const handleTransactionFormNext = () => {
    if (!linkedTransaction.categoryId) {
      toast.error("Selecione uma categoria");
      return;
    }
    if (!linkedTransaction.accountId) {
      toast.error("Selecione uma conta");
      return;
    }
    setStep("summary");
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // 1. Save investment transaction
      const response = await fetch(`/api/investments/${investment.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao registrar operação");
      }

      // 2. Create linked transaction if requested
      if (linkedTransaction.createTransaction) {
        const transactionResponse = await fetch("/api/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: transactionType,
            categoryId: linkedTransaction.categoryId,
            accountId: linkedTransaction.accountId,
            description: linkedTransaction.description,
            amount: totalValue,
            dueDate: formData.date,
            status: "PAID",
            isFixed: false,
            tagIds: [],
          }),
        });

        if (!transactionResponse.ok) {
          console.error("Failed to create linked transaction");
          toast.warning(
            "Operação de investimento salva, mas houve erro ao criar a transação vinculada"
          );
        }
      }

      const typeLabels: Record<string, string> = {
        BUY: "Compra registrada",
        SELL: "Venda registrada",
        DIVIDEND: "Dividendo registrado",
        SPLIT: "Desdobramento registrado",
        BONUS: "Bonificação registrada",
      };

      toast.success(
        linkedTransaction.createTransaction
          ? `${typeLabels[formData.type]} com transação vinculada!`
          : typeLabels[formData.type] || "Operação registrada!"
      );

      onOpenChange?.(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error:", error);
      toast.error(
        error instanceof Error ? error.message : "Erro ao registrar operação"
      );
    } finally {
      setLoading(false);
    }
  };

  const renderFormStep = () => (
    <>
      <DialogHeader>
        <DialogTitle>Nova Operação - {investment.asset.symbol}</DialogTitle>
        <DialogDescription>
          Registre uma nova operação para este investimento.
          <br />
          <span className="text-muted-foreground">
            Posição atual: {investment.quantity.toLocaleString("pt-BR")}{" "}
            unidades @ {formatCurrency(investment.averagePrice)}
          </span>
          {currentQuote && (
            <>
              <br />
              <span className="text-primary">
                Cotação atual: {formatCurrency(currentQuote.price)}{" "}
                <span
                  className={
                    currentQuote.changePercent >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }
                >
                  ({currentQuote.changePercent >= 0 ? "+" : ""}
                  {currentQuote.changePercent.toFixed(2)}%)
                </span>
              </span>
            </>
          )}
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 py-4">
        {/* Transaction Type */}
        <div className="space-y-2">
          <Label>Tipo de Operação *</Label>
          <Select
            value={formData.type}
            onValueChange={(value: InvestmentTransactionType) => {
              setFormData((prev) => ({
                ...prev,
                type: value,
                price:
                  (value === "BUY" || value === "SELL") && currentQuote?.price
                    ? currentQuote.price
                    : prev.price,
              }));
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(INVESTMENT_TRANSACTION_TYPES).map(
                ([key, value]) => (
                  <SelectItem key={key} value={value}>
                    {
                      INVESTMENT_TRANSACTION_TYPE_LABELS[
                        value as keyof typeof INVESTMENT_TRANSACTION_TYPE_LABELS
                      ]
                    }
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Quantity and Price */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="quantity">
              {isSplit ? "Quantidade Recebida *" : "Quantidade *"}
            </Label>
            <Input
              id="quantity"
              type="text"
              inputMode="decimal"
              value={quantityInput}
              onChange={(e) => {
                const value = e.target.value;
                // Permite string vazia, números e ponto decimal
                if (value === "" || /^\d*\.?\d*$/.test(value)) {
                  const numValue = value === "" ? 0 : parseFloat(value) || 0;
                  // Validação de máximo para venda
                  if (
                    formData.type === "SELL" &&
                    numValue > investment.quantity
                  ) {
                    return;
                  }
                  setQuantityInput(value);
                  setFormData((prev) => ({
                    ...prev,
                    quantity: numValue,
                  }));
                }
              }}
              placeholder="0"
            />
          </div>
          {!isSplit && (
            <div className="space-y-2">
              <Label htmlFor="price">
                {formData.type === "DIVIDEND"
                  ? "Valor por Ação *"
                  : "Preço Unitário *"}
              </Label>
              <CurrencyInput
                id="price"
                value={formData.price}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    price: value,
                  }))
                }
              />
            </div>
          )}
        </div>

        {/* Total for Buy/Sell */}
        {!isSplit && totalValue > 0 && (
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                {formData.type === "DIVIDEND"
                  ? "Total recebido"
                  : "Total da operação"}
              </span>
              <span className="text-lg font-bold">
                {formatCurrency(totalValue)}
              </span>
            </div>
          </div>
        )}

        {/* Fees (only for Buy/Sell) */}
        {(formData.type === "BUY" || formData.type === "SELL") && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fees">Taxas/Corretagem</Label>
              <CurrencyInput
                id="fees"
                value={formData.fees}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    fees: value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Data</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, date: e.target.value }))
                }
              />
            </div>
          </div>
        )}

        {/* Date only for other types */}
        {formData.type !== "BUY" && formData.type !== "SELL" && (
          <div className="space-y-2">
            <Label htmlFor="date">Data</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, date: e.target.value }))
              }
            />
          </div>
        )}

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">Observações</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, notes: e.target.value }))
            }
            placeholder="Notas sobre esta operação..."
            rows={2}
          />
        </div>

        {/* Sell warning */}
        {formData.type === "SELL" && formData.quantity > 0 && (
          <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-lg text-sm">
            <p className="text-orange-800 dark:text-orange-200">
              Após a venda, você terá{" "}
              <strong>
                {(investment.quantity - formData.quantity).toLocaleString(
                  "pt-BR"
                )}
              </strong>{" "}
              unidades restantes.
            </p>
          </div>
        )}
      </div>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange?.(false)}
        >
          Cancelar
        </Button>
        <Button type="button" onClick={handleNextStep}>
          Continuar
        </Button>
      </DialogFooter>
    </>
  );

  const renderAskTransactionStep = () => (
    <>
      <DialogHeader>
        <DialogTitle>Registrar Transação Financeira?</DialogTitle>
        <DialogDescription>
          Deseja criar uma transação vinculada a esta operação?
          <br />
          <span className="text-muted-foreground">
            {formData.type === "SELL"
              ? "Será criada uma receita (entrada) na sua conta"
              : "Será criada uma despesa (saída) na sua conta"}
          </span>
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 py-6">
        <Card
          className="p-4 cursor-pointer hover:bg-accent transition-colors border-2 hover:border-primary"
          onClick={() => handleChooseTransaction(true)}
        >
          <div className="flex items-center gap-4">
            {formData.type === "SELL" ? (
              <ArrowDownCircle className="h-8 w-8 text-green-600" />
            ) : (
              <ArrowUpCircle className="h-8 w-8 text-red-600" />
            )}
            <div className="flex-1">
              <p className="font-semibold">Sim, criar transação</p>
              <p className="text-sm text-muted-foreground">
                {formData.type === "SELL"
                  ? `Registrar receita de ${formatCurrency(totalValue)}`
                  : `Registrar despesa de ${formatCurrency(totalValue)}`}
              </p>
            </div>
          </div>
        </Card>

        <Card
          className="p-4 cursor-pointer hover:bg-accent transition-colors border-2 hover:border-primary"
          onClick={() => handleChooseTransaction(false)}
        >
          <div className="flex items-center gap-4">
            <FileText className="h-8 w-8 text-muted-foreground" />
            <div className="flex-1">
              <p className="font-semibold">Não, apenas registrar operação</p>
              <p className="text-sm text-muted-foreground">
                Só registrar a {formData.type === "SELL" ? "venda" : "compra"}{" "}
                no investimento
              </p>
            </div>
          </div>
        </Card>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => setStep("form")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
      </DialogFooter>
    </>
  );

  const renderTransactionFormStep = () => (
    <>
      <DialogHeader>
        <DialogTitle>Dados da Transação</DialogTitle>
        <DialogDescription>
          Preencha os dados da transação vinculada.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 py-4">
        {loadingData ? (
          <div className="flex items-center justify-center py-8">
            <span className="text-muted-foreground">Carregando...</span>
          </div>
        ) : (
          <>
            {/* Category */}
            <div className="space-y-2">
              <Label>Categoria *</Label>
              <Select
                value={linkedTransaction.categoryId}
                onValueChange={(value) =>
                  setLinkedTransaction((prev) => ({
                    ...prev,
                    categoryId: value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {filteredCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: cat.color }}
                        />
                        {cat.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Tipo: {transactionType === "INCOME" ? "Receita" : "Despesa"}
              </p>
            </div>

            {/* Account */}
            <div className="space-y-2">
              <Label>Conta *</Label>
              <Select
                value={linkedTransaction.accountId}
                onValueChange={(value) =>
                  setLinkedTransaction((prev) => ({
                    ...prev,
                    accountId: value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma conta" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      <div className="flex items-center gap-2">
                        <Wallet className="h-4 w-4" />
                        {acc.name}
                        {acc.isDefault && (
                          <span className="text-xs text-muted-foreground">
                            (padrão)
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                value={linkedTransaction.description}
                onChange={(e) =>
                  setLinkedTransaction((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Descrição da transação"
              />
            </div>

            {/* Summary */}
            <div className="p-3 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Valor</span>
                <span className="font-medium">
                  {formatCurrency(totalValue)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Data</span>
                <span className="font-medium">
                  {format(new Date(formData.date), "dd/MM/yyyy")}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <span className="font-medium text-green-600">Pago</span>
              </div>
            </div>
          </>
        )}
      </div>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={() => setStep("ask_transaction")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <Button
          type="button"
          onClick={handleTransactionFormNext}
          disabled={loadingData}
        >
          Continuar
        </Button>
      </DialogFooter>
    </>
  );

  const renderSummaryStep = () => {
    const selectedCategory = categories.find(
      (c) => c.id === linkedTransaction.categoryId
    );
    const selectedAccount = accounts.find(
      (a) => a.id === linkedTransaction.accountId
    );

    return (
      <>
        <DialogHeader>
          <DialogTitle>Confirmar Operação</DialogTitle>
          <DialogDescription>
            Revise os dados antes de confirmar.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Investment Operation Summary */}
          <Card className="p-4">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              {formData.type === "SELL" ? (
                <ArrowDownCircle className="h-5 w-5 text-red-600" />
              ) : (
                <ArrowUpCircle className="h-5 w-5 text-green-600" />
              )}
              Operação de Investimento
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ativo</span>
                <span className="font-mono font-bold">
                  {investment.asset.symbol}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tipo</span>
                <span>
                  {
                    INVESTMENT_TRANSACTION_TYPE_LABELS[
                      formData.type as keyof typeof INVESTMENT_TRANSACTION_TYPE_LABELS
                    ]
                  }
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Quantidade</span>
                <span>{formData.quantity.toLocaleString("pt-BR")}</span>
              </div>
              {!isSplit && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Preço Unitário
                    </span>
                    <span>{formatCurrency(formData.price)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span>{formatCurrency(totalValue)}</span>
                  </div>
                </>
              )}
              {(formData.fees ?? 0) > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Taxas</span>
                  <span>{formatCurrency(formData.fees ?? 0)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Data</span>
                <span>{format(new Date(formData.date), "dd/MM/yyyy")}</span>
              </div>
            </div>
          </Card>

          {/* Linked Transaction Summary */}
          {linkedTransaction.createTransaction && (
            <Card className="p-4 border-primary">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                Transação Vinculada
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tipo</span>
                  <span
                    className={
                      transactionType === "INCOME"
                        ? "text-green-600"
                        : "text-red-600"
                    }
                  >
                    {transactionType === "INCOME" ? "Receita" : "Despesa"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Categoria</span>
                  <div className="flex items-center gap-2">
                    {selectedCategory && (
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: selectedCategory.color }}
                      />
                    )}
                    <span>{selectedCategory?.name || "-"}</span>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Conta</span>
                  <span>{selectedAccount?.name || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Descrição</span>
                  <span className="truncate max-w-[200px]">
                    {linkedTransaction.description}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span>Valor</span>
                  <span
                    className={
                      transactionType === "INCOME"
                        ? "text-green-600"
                        : "text-red-600"
                    }
                  >
                    {transactionType === "INCOME" ? "+" : "-"}
                    {formatCurrency(totalValue)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className="text-green-600 flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    Pago
                  </span>
                </div>
              </div>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setStep(
                linkedTransaction.createTransaction
                  ? "transaction_form"
                  : formData.type === "BUY" || formData.type === "SELL"
                  ? "ask_transaction"
                  : "form"
              )
            }
            disabled={loading}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={loading}>
            {loading ? "Salvando..." : "Confirmar"}
          </Button>
        </DialogFooter>
      </>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        {step === "form" && renderFormStep()}
        {step === "ask_transaction" && renderAskTransactionStep()}
        {step === "transaction_form" && renderTransactionFormStep()}
        {step === "summary" && renderSummaryStep()}
      </DialogContent>
    </Dialog>
  );
}
