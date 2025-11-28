"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { ASSET_TYPE_LABELS } from "@/modules/finance/lib/constants";
import { formatCurrency } from "@/modules/finance/lib/utils";
import type {
  Account,
  Asset,
  Category,
  InvestmentFormData,
} from "@/modules/finance/types";
import { format } from "date-fns";
import {
  ArrowLeft,
  ArrowUpCircle,
  Check,
  ChevronsUpDown,
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

interface InvestmentDialogProps {
  portfolioId: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
}

export function InvestmentDialog({
  portfolioId,
  trigger,
  open: controlledOpen,
  onOpenChange,
  onSuccess,
}: InvestmentDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<DialogStep>("form");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Asset[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? onOpenChange! : setInternalOpen;

  const [formData, setFormData] = useState<InvestmentFormData>({
    assetId: "",
    quantity: 0,
    price: 0,
    fees: 0,
    date: format(new Date(), "yyyy-MM-dd"),
    notes: "",
  });

  const [linkedTransaction, setLinkedTransaction] =
    useState<LinkedTransactionData>({
      createTransaction: false,
      categoryId: "",
      accountId: "",
      description: "",
    });

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setStep("form");
      setFormData({
        assetId: "",
        quantity: 0,
        price: 0,
        fees: 0,
        date: format(new Date(), "yyyy-MM-dd"),
        notes: "",
      });
      setLinkedTransaction({
        createTransaction: false,
        categoryId: "",
        accountId: "",
        description: "",
      });
      setSelectedAsset(null);
      setCurrentPrice(null);
      setSearchQuery("");
      setSearchResults([]);
    }
  }, [open]);

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

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      // Search in database
      const response = await fetch(
        `/api/investments/assets?search=${encodeURIComponent(query)}`
      );
      if (response.ok) {
        const assets = await response.json();
        setSearchResults(assets);
      }
    } catch (error) {
      console.error("Error searching assets:", error);
    } finally {
      setSearching(false);
    }
  };

  const handleCreateAsset = async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const response = await fetch("/api/investments/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: searchQuery.toUpperCase() }),
      });

      if (response.ok) {
        const asset = await response.json();
        setSelectedAsset(asset);
        setFormData((prev) => ({ ...prev, assetId: asset.id }));
        setSearchOpen(false);
        fetchCurrentPrice(asset.symbol);
      }
    } catch (error) {
      console.error("Error creating asset:", error);
      toast.error("Erro ao criar ativo");
    } finally {
      setSearching(false);
    }
  };

  const handleSelectAsset = async (asset: Asset) => {
    setSelectedAsset(asset);
    setFormData((prev) => ({ ...prev, assetId: asset.id }));
    setSearchOpen(false);
    fetchCurrentPrice(asset.symbol);
  };

  const fetchCurrentPrice = async (symbol: string) => {
    try {
      const response = await fetch(`/api/investments/quotes?symbol=${symbol}`);
      if (response.ok) {
        const quote = await response.json();
        setCurrentPrice(quote.price);
        // Suggest current price
        if (formData.price === 0) {
          setFormData((prev) => ({ ...prev, price: quote.price }));
        }
      }
    } catch (error) {
      console.error("Error fetching price:", error);
    }
  };

  const totalValue = formData.quantity * formData.price;

  // Filter categories by EXPENSE type (buying is always an expense)
  const filteredCategories = categories.filter((cat) => cat.type === "EXPENSE");

  const getDefaultDescription = () => {
    return `Compra de ${formData.quantity}x ${selectedAsset?.symbol || ""}`;
  };

  const validateForm = (): boolean => {
    if (!formData.assetId) {
      toast.error("Selecione um ativo");
      return false;
    }
    if (formData.quantity <= 0) {
      toast.error("Quantidade deve ser maior que zero");
      return false;
    }
    if (formData.price <= 0) {
      toast.error("Preço deve ser maior que zero");
      return false;
    }
    return true;
  };

  const handleNextStep = () => {
    if (!validateForm()) return;

    // Update default description
    setLinkedTransaction((prev) => ({
      ...prev,
      description: getDefaultDescription(),
    }));
    setStep("ask_transaction");
    fetchCategoriesAndAccounts();
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
      // 1. Save investment
      const response = await fetch("/api/investments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          portfolioId,
          ...formData,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao adicionar investimento");
      }

      // 2. Create linked transaction if requested
      if (linkedTransaction.createTransaction) {
        const transactionResponse = await fetch("/api/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "EXPENSE",
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
            "Investimento adicionado, mas houve erro ao criar a transação vinculada"
          );
        }
      }

      toast.success(
        linkedTransaction.createTransaction
          ? "Investimento adicionado com transação vinculada!"
          : "Investimento adicionado!"
      );

      setOpen(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error adding investment:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Erro ao adicionar investimento"
      );
    } finally {
      setLoading(false);
    }
  };

  const renderFormStep = () => (
    <>
      <DialogHeader>
        <DialogTitle>Adicionar Investimento</DialogTitle>
        <DialogDescription>
          Registre uma nova compra de ativo para sua carteira.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 py-4">
        {/* Asset Search */}
        <div className="space-y-2">
          <Label>Ativo *</Label>
          <Popover open={searchOpen} onOpenChange={setSearchOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={searchOpen}
                className="w-full justify-between"
              >
                {selectedAsset ? (
                  <span className="flex items-center gap-2">
                    <span className="font-mono font-bold">
                      {selectedAsset.symbol}
                    </span>
                    <span className="text-muted-foreground">
                      {selectedAsset.name}
                    </span>
                  </span>
                ) : (
                  <span className="text-muted-foreground">Buscar ativo...</span>
                )}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="start">
              <Command>
                <CommandInput
                  placeholder="Digite o símbolo ou nome..."
                  value={searchQuery}
                  onValueChange={handleSearch}
                />
                <CommandList>
                  <CommandEmpty>
                    {searching ? (
                      "Buscando..."
                    ) : searchQuery.length >= 2 ? (
                      <div className="py-3 text-center">
                        <p className="text-sm text-muted-foreground mb-2">
                          Ativo não encontrado
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleCreateAsset}
                        >
                          Criar &quot;{searchQuery.toUpperCase()}&quot;
                        </Button>
                      </div>
                    ) : (
                      "Digite pelo menos 2 caracteres"
                    )}
                  </CommandEmpty>
                  <CommandGroup heading="Resultados">
                    {searchResults.map((asset) => (
                      <CommandItem
                        key={asset.id}
                        value={asset.symbol}
                        onSelect={() => handleSelectAsset(asset)}
                      >
                        <Check
                          className={`mr-2 h-4 w-4 ${
                            selectedAsset?.id === asset.id
                              ? "opacity-100"
                              : "opacity-0"
                          }`}
                        />
                        <div className="flex items-center gap-2 flex-1">
                          <span className="font-mono font-bold">
                            {asset.symbol}
                          </span>
                          <span className="text-muted-foreground text-sm truncate">
                            {asset.name}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {
                            ASSET_TYPE_LABELS[
                              asset.type as keyof typeof ASSET_TYPE_LABELS
                            ]
                          }
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          {selectedAsset && (
            <p className="text-xs text-muted-foreground">
              Tipo:{" "}
              {
                ASSET_TYPE_LABELS[
                  selectedAsset.type as keyof typeof ASSET_TYPE_LABELS
                ]
              }
              {currentPrice && (
                <span className="text-primary">
                  {" "}
                  • Cotação atual: {formatCurrency(currentPrice)}
                </span>
              )}
            </p>
          )}
        </div>

        {/* Quantity and Price */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantidade *</Label>
            <Input
              id="quantity"
              type="number"
              step="any"
              min="0"
              value={formData.quantity || ""}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  quantity: parseFloat(e.target.value) || 0,
                }))
              }
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="price">Preço Unitário *</Label>
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
        </div>

        {/* Total */}
        {totalValue > 0 && (
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                Total da operação
              </span>
              <span className="text-lg font-bold">
                {formatCurrency(totalValue)}
              </span>
            </div>
          </div>
        )}

        {/* Fees and Date */}
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
            <Label htmlFor="date">Data da Compra</Label>
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

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">Observações</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, notes: e.target.value }))
            }
            placeholder="Notas sobre esta compra..."
            rows={2}
          />
        </div>
      </div>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={() => setOpen(false)}
          disabled={loading}
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
          Deseja criar uma transação vinculada a esta compra?
          <br />
          <span className="text-muted-foreground">
            Será criada uma despesa (saída) na sua conta
          </span>
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 py-6">
        <Card
          className="p-4 cursor-pointer hover:bg-accent transition-colors border-2 hover:border-primary"
          onClick={() => handleChooseTransaction(true)}
        >
          <div className="flex items-center gap-4">
            <ArrowUpCircle className="h-8 w-8 text-red-600" />
            <div className="flex-1">
              <p className="font-semibold">Sim, criar transação</p>
              <p className="text-sm text-muted-foreground">
                Registrar despesa de {formatCurrency(totalValue)}
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
              <p className="font-semibold">
                Não, apenas registrar investimento
              </p>
              <p className="text-sm text-muted-foreground">
                Só adicionar o ativo na carteira
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
              <p className="text-xs text-muted-foreground">Tipo: Despesa</p>
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
          {/* Investment Summary */}
          <Card className="p-4">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <ArrowUpCircle className="h-5 w-5 text-green-600" />
              Novo Investimento
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ativo</span>
                <span className="font-mono font-bold">
                  {selectedAsset?.symbol}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Quantidade</span>
                <span>{formData.quantity.toLocaleString("pt-BR")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Preço Unitário</span>
                <span>{formatCurrency(formData.price)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>{formatCurrency(totalValue)}</span>
              </div>
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
                  <span className="text-red-600">Despesa</span>
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
                  <span className="text-red-600">
                    -{formatCurrency(totalValue)}
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
                  : "ask_transaction"
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
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-[500px]">
        {step === "form" && renderFormStep()}
        {step === "ask_transaction" && renderAskTransactionStep()}
        {step === "transaction_form" && renderTransactionFormStep()}
        {step === "summary" && renderSummaryStep()}
      </DialogContent>
    </Dialog>
  );
}
