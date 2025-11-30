"use client";

import type React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
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
  ArrowDownCircle,
  ArrowUpCircle,
  Calendar,
  ChevronDown,
  CreditCard,
  DollarSign,
  FileText,
  Hash,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  Account,
  Category,
  Tag,
  TransactionWithRelations,
  VirtualOccurrence,
} from "../types";

type EditableTransaction = (TransactionWithRelations | VirtualOccurrence) & {
  editScope?: string;
};

interface TransactionSuggestion {
  id: string;
  description: string;
  categoryId: string;
  accountId: string;
  amount: number;
  type: string;
  category: {
    id: string;
    name: string;
    color: string;
  } | null;
}

interface TransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultType?: "income" | "expense";
  onSuccess?: () => void;
  transaction?: EditableTransaction | null;
}

export function TransactionDialog({
  open,
  onOpenChange,
  defaultType = "expense",
  onSuccess,
  transaction,
}: TransactionDialogProps) {
  const isEditMode = !!transaction;
  // Verificar se é transação parcelada ou fixa (não pode mudar recorrência/data)
  const isRecurringOrFixed = Boolean(
    isEditMode &&
      (transaction?.isFixed ||
        (transaction?.installments && transaction?.installments > 1))
  );
  const [type, setType] = useState<"income" | "expense">(defaultType);
  const [isRecurring, setIsRecurring] = useState(false);
  const [isFixed, setIsFixed] = useState(false);
  const [installments, setInstallments] = useState("");
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [amount, setAmount] = useState<number>(0);
  const [description, setDescription] = useState<string>("");
  const [suggestions, setSuggestions] = useState<TransactionSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const descriptionInputRef = useRef<HTMLInputElement>(null);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const continueAddingRef = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (transaction) {
      setType(transaction.type.toLowerCase() as "income" | "expense");
      setIsFixed(transaction.isFixed || false);
      setInstallments(transaction.installments?.toString() || "");
      setIsRecurring((transaction.installments ?? 0) > 1);
      setSelectedAccount(transaction.accountId || "");
      setSelectedCategory(transaction.categoryId || "");
      setAmount(transaction.amount || 0);
      setDescription(transaction.description || "");
      // Carregar tags da transação
      if (transaction.tags && transaction.tags.length > 0) {
        setSelectedTags(transaction.tags.map((t: any) => t.tag?.id || t.tagId));
      } else {
        setSelectedTags([]);
      }
      // Abrir mais opções se houver dados preenchidos
      const hasExtraData =
        transaction.isFixed ||
        (transaction.installments && transaction.installments > 1) ||
        (transaction.tags && transaction.tags.length > 0) ||
        transaction.notes;
      setShowMoreOptions(!!hasExtraData);
    } else {
      // Reset quando abrir para criar novo
      setType(defaultType);
      setIsFixed(false);
      setInstallments("");
      setIsRecurring(false);
      setSelectedTags([]);
      setSelectedAccount("");
      setSelectedCategory("");
      setAmount(0);
      setDescription("");
      setShowMoreOptions(false);
    }
    setSuggestions([]);
    setShowSuggestions(false);
  }, [transaction, open, defaultType]);

  useEffect(() => {
    if (open) {
      fetchAccounts();
      fetchCategories();
      fetchTags();
    }
  }, [open]);

  const fetchAccounts = async () => {
    try {
      const res = await fetch("/api/accounts");
      const data = await res.json();
      setAccounts(data);
    } catch (error) {
      console.error("Error fetching accounts:", error);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/categories");
      const data = await res.json();
      setCategories(data);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchTags = async () => {
    try {
      const res = await fetch("/api/tags");
      const data = await res.json();
      setTags(data);
    } catch (error) {
      console.error("Error fetching tags:", error);
    }
  };

  const fetchSuggestions = useCallback(
    async (query: string) => {
      if (query.length < 2) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      try {
        const params = new URLSearchParams({ query });
        if (type) params.append("type", type.toUpperCase());

        const res = await fetch(`/api/transactions/suggestions?${params}`);
        const data = await res.json();
        setSuggestions(data);
        setShowSuggestions(data.length > 0);
        setSelectedSuggestionIndex(-1);
      } catch (error) {
        console.error("Error fetching suggestions:", error);
      }
    },
    [type]
  );

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDescription(value);
    fetchSuggestions(value);
  };

  const handleSelectSuggestion = (suggestion: TransactionSuggestion) => {
    setDescription(suggestion.description);
    if (suggestion.categoryId) {
      setSelectedCategory(suggestion.categoryId);
    }
    // Mudar o tipo se for diferente
    if (suggestion.type) {
      setType(suggestion.type.toLowerCase() as "income" | "expense");
    }
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleDescriptionKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedSuggestionIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedSuggestionIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        if (selectedSuggestionIndex >= 0) {
          e.preventDefault();
          handleSelectSuggestion(suggestions[selectedSuggestionIndex]);
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        break;
    }
  };

  // Fechar sugestões ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        descriptionInputRef.current &&
        !descriptionInputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  };

  const handleCreateCategory = async (name: string, color?: string) => {
    try {
      const colors = {
        income: ["#22c55e", "#10b981", "#059669", "#14b8a6"],
        expense: ["#ef4444", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4"],
      };
      const colorList = colors[type];
      const selectedColor =
        color || colorList[Math.floor(Math.random() * colorList.length)];

      const response = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          type: type.toUpperCase(),
          color: selectedColor,
        }),
      });

      if (!response.ok) throw new Error("Failed to create category");

      const newCategory = await response.json();
      setCategories((prev) => [...prev, newCategory]);
      return { id: newCategory.id, name: newCategory.name };
    } catch (error) {
      console.error("Error creating category:", error);
      return null;
    }
  };

  const handleCreateAccount = async (name: string) => {
    try {
      const response = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          initialBalance: 0,
        }),
      });

      if (!response.ok) throw new Error("Failed to create account");

      const newAccount = await response.json();
      setAccounts((prev) => [...prev, newAccount]);
      return { id: newAccount.id, name: newAccount.name };
    } catch (error) {
      console.error("Error creating account:", error);
      return null;
    }
  };

  const resetForm = () => {
    setType(defaultType);
    setIsFixed(false);
    setInstallments("");
    setIsRecurring(false);
    setSelectedTags([]);
    setAmount(0);
    // Manter conta e categoria selecionadas para facilitar o registro contínuo
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const continueAdding = continueAddingRef.current;
    continueAddingRef.current = false;

    setLoading(true);

    const formData = new FormData(e.target as HTMLFormElement);

    // Quando o campo de data está desabilitado (parcelada/fixa), usar a data original
    const dateFromForm = formData.get("date");
    const dateToSend =
      dateFromForm ||
      (transaction?.dueDate
        ? new Date(transaction.dueDate).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0]);

    const data: any = {
      accountId: selectedAccount,
      categoryId: selectedCategory,
      type: type.toUpperCase(),
      description: description,
      amount: amount,
      dueDate: dateToSend,
      status: formData.get("status")?.toString().toUpperCase() || "PAID",
      notes: formData.get("notes") || "",
      isFixed: isFixed,
      installments: isRecurring && installments ? parseInt(installments) : null,
      tagIds: selectedTags,
    };

    // Se estiver editando com escopo, adicionar ao payload
    if (isEditMode && transaction?.editScope) {
      data.scope = transaction.editScope;
    }

    try {
      const url = isEditMode
        ? `/api/transactions/${transaction.id}`
        : "/api/transactions";
      const method = isEditMode ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(
          `Failed to ${isEditMode ? "update" : "create"} transaction`
        );
      }

      await response.json();

      if (continueAdding && !isEditMode) {
        // Resetar o formulário para continuar registrando
        resetForm();
        // Limpar os campos do formulário manualmente
        const form = e.target as HTMLFormElement;
        form.reset();
        // Restaurar a data para hoje
        const dateInput = form.querySelector(
          'input[name="date"]'
        ) as HTMLInputElement;
        if (dateInput) {
          dateInput.value = new Date().toISOString().split("T")[0];
        }
        if (onSuccess) onSuccess();
      } else {
        onOpenChange(false);
        if (onSuccess) onSuccess();
      }
    } catch (error) {
      console.error("Error saving transaction:", error);
      alert("Erro ao salvar lançamento. Por favor, tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = categories.filter(
    (cat) => cat.type === type.toUpperCase()
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            {type === "income" ? (
              <ArrowUpCircle className="w-6 h-6 text-green-600" />
            ) : (
              <ArrowDownCircle className="w-6 h-6 text-red-600" />
            )}
            {isEditMode ? "Editar" : "Novo"}{" "}
            {type === "income" ? "Receita" : "Despesa"}
          </DialogTitle>
          <DialogDescription>
            Preencha as informações do lançamento. Campos com * são
            obrigatórios.
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
          {/* Tipo e Valor */}
          <div className="grid grid-cols-[140px_1fr] gap-4">
            <div className="space-y-2">
              <Label htmlFor="type" className="flex items-center gap-1">
                <Hash className="w-3.5 h-3.5" />
                Tipo *
              </Label>
              <Select
                name="type"
                value={type}
                onValueChange={(v) => {
                  setType(v as "income" | "expense");
                  setSelectedCategory(""); // Reset category when type changes
                }}
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">💰 Receita</SelectItem>
                  <SelectItem value="expense">💸 Despesa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount" className="flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5" />
                Valor *
              </Label>
              <CurrencyInput
                id="amount"
                value={amount}
                onValueChange={setAmount}
                required
                className="text-lg font-semibold"
              />
            </div>
          </div>

          <Separator />

          {/* Descrição com Autocomplete */}
          <div className="space-y-2 relative">
            <Label htmlFor="description" className="flex items-center gap-1">
              <FileText className="w-3.5 h-3.5" />
              Descrição *
            </Label>
            <Input
              ref={descriptionInputRef}
              id="description"
              name="description"
              placeholder="Ex: Salário do mês, Almoço, Conta de luz..."
              value={description}
              onChange={handleDescriptionChange}
              onKeyDown={handleDescriptionKeyDown}
              onFocus={() => {
                if (suggestions.length > 0) setShowSuggestions(true);
              }}
              required
              className="text-base"
              autoComplete="off"
            />
            {/* Sugestões dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div
                ref={suggestionsRef}
                className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-[200px] overflow-y-auto"
              >
                {suggestions.map((suggestion, index) => (
                  <div
                    key={suggestion.id}
                    className={`flex items-center justify-between px-3 py-2 cursor-pointer transition-colors ${
                      index === selectedSuggestionIndex
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent/50"
                    }`}
                    onClick={() => handleSelectSuggestion(suggestion)}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="truncate font-medium">
                        {suggestion.description}
                      </span>
                    </div>
                    {suggestion.category && (
                      <Badge
                        variant="secondary"
                        className="ml-2 shrink-0 text-xs"
                        style={{
                          backgroundColor: suggestion.category.color + "20",
                          color: suggestion.category.color,
                          borderColor: suggestion.category.color,
                        }}
                      >
                        {suggestion.category.name}
                      </Badge>
                    )}
                  </div>
                ))}
                <div className="px-3 py-1.5 text-xs text-muted-foreground border-t bg-muted/30">
                  💡 Selecione para preencher automaticamente
                </div>
              </div>
            )}
          </div>

          {/* Categoria e Conta */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category" className="flex items-center gap-1">
                Categoria *
              </Label>
              <SearchableSelect
                value={selectedCategory}
                onValueChange={setSelectedCategory}
                options={filteredCategories.map((cat) => ({
                  value: cat.id,
                  label: cat.name,
                  color: cat.color,
                }))}
                placeholder="Selecione uma categoria..."
                emptyText="Nenhuma categoria encontrada"
                createText="Criar nova categoria"
                onCreate={handleCreateCategory}
                showColorPicker={true}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="account" className="flex items-center gap-1">
                <CreditCard className="w-3.5 h-3.5" />
                Conta *
              </Label>
              <SearchableSelect
                value={selectedAccount}
                onValueChange={setSelectedAccount}
                options={accounts.map((acc) => ({
                  value: acc.id,
                  label: acc.name,
                }))}
                placeholder="Selecione uma conta..."
                emptyText="Nenhuma conta encontrada"
                createText="Criar nova conta"
                onCreate={handleCreateAccount}
              />
            </div>
          </div>

          {/* Data e Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date" className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Data de Vencimento *
              </Label>
              <Input
                id="date"
                name="date"
                type="date"
                defaultValue={
                  transaction?.dueDate
                    ? new Date(transaction.dueDate).toISOString().split("T")[0]
                    : new Date().toISOString().split("T")[0]
                }
                required
                disabled={isRecurringOrFixed}
              />
              {isRecurringOrFixed && (
                <p className="text-xs text-muted-foreground">
                  💡 A data não pode ser alterada em transações parceladas ou
                  fixas
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select
                name="status"
                defaultValue={transaction?.status?.toLowerCase() || "paid"}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">✅ Pago</SelectItem>
                  <SelectItem value="pending">⏳ Pendente</SelectItem>
                  <SelectItem value="overdue">⚠️ Atrasado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Mais Opções - Seção Colapsável */}
          <Collapsible open={showMoreOptions} onOpenChange={setShowMoreOptions}>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 w-full text-left group"
              >
                <span className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
                  Mais opções
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-blue-600 dark:text-blue-400 transition-transform duration-200 ${
                    showMoreOptions ? "rotate-180" : ""
                  }`}
                />
              </button>
            </CollapsibleTrigger>
            <p className="text-xs text-muted-foreground mt-1">
              Adicionar tags, parcelamento, notas...
            </p>

            <CollapsibleContent className="mt-4 space-y-6">
              {/* Opções de Recorrência - Desabilitado no modo edição de parceladas/fixas */}
              {isRecurringOrFixed ? (
                <div className="space-y-4 bg-muted/50 p-4 rounded-lg opacity-60">
                  <h3 className="text-sm font-semibold">
                    Opções de Recorrência
                  </h3>
                  <div className="text-sm text-muted-foreground">
                    {transaction?.isFixed ? (
                      <p>
                        📌 Este é um lançamento <strong>fixo</strong> (mensal).
                        Não é possível alterar o tipo de recorrência.
                      </p>
                    ) : (
                      <p>
                        🔄 Este é um lançamento <strong>parcelado</strong> (
                        {transaction?.currentInstallment || 1}/
                        {transaction?.installments}). Não é possível alterar o
                        número de parcelas.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4 bg-muted/50 p-4 rounded-lg">
                  <h3 className="text-sm font-semibold">
                    Opções de Recorrência
                  </h3>

                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="recurring"
                      checked={isRecurring}
                      onCheckedChange={(checked) => {
                        setIsRecurring(checked as boolean);
                        if (!checked) {
                          setInstallments("");
                        }
                      }}
                      disabled={isFixed}
                    />
                    <div className="flex-1">
                      <Label
                        htmlFor="recurring"
                        className="cursor-pointer font-medium"
                      >
                        Lançamento parcelado
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Divide o valor em várias parcelas mensais
                      </p>
                    </div>
                  </div>

                  {isRecurring && (
                    <div className="ml-7 space-y-2">
                      <Label htmlFor="installments">Número de Parcelas *</Label>
                      <Input
                        id="installments"
                        name="installments"
                        type="number"
                        min="2"
                        max="48"
                        placeholder="Ex: 12"
                        value={installments}
                        onChange={(e) => setInstallments(e.target.value)}
                        required
                        className="max-w-[200px]"
                      />
                      <p className="text-xs text-muted-foreground">
                        💡 Serão criadas <strong>{installments || "N"}</strong>{" "}
                        parcelas mensais consecutivas
                      </p>
                    </div>
                  )}

                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="fixed"
                      checked={isFixed}
                      onCheckedChange={(checked) => {
                        setIsFixed(checked as boolean);
                        if (checked) {
                          setIsRecurring(false);
                          setInstallments("");
                        }
                      }}
                      disabled={isRecurring}
                    />
                    <div className="flex-1">
                      <Label
                        htmlFor="fixed"
                        className="cursor-pointer font-medium"
                      >
                        Lançamento fixo (mensal)
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Aparece automaticamente todos os meses (ex: aluguel,
                        salário)
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Tags */}
              <div className="space-y-2">
                <Label>Tags (opcional)</Label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <SearchableSelect
                      value=""
                      onValueChange={(tagId) => {
                        if (!selectedTags.includes(tagId)) {
                          setSelectedTags((prev) => [...prev, tagId]);
                        }
                      }}
                      options={tags
                        .filter((tag) => !selectedTags.includes(tag.id))
                        .map((tag) => ({
                          value: tag.id,
                          label: tag.name,
                        }))}
                      placeholder="Adicionar tag..."
                      emptyText="Nenhuma tag disponível"
                      createText="Criar nova tag"
                      onCreate={async (name) => {
                        try {
                          const response = await fetch("/api/tags", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ name }),
                          });
                          if (!response.ok)
                            throw new Error("Failed to create tag");
                          const newTag = await response.json();
                          setTags((prev) => [...prev, newTag]);
                          return { id: newTag.id, name: newTag.name };
                        } catch (error) {
                          console.error("Error creating tag:", error);
                          return null;
                        }
                      }}
                      className="flex-1"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2 p-3 border rounded-md min-h-[50px] bg-background">
                    {selectedTags.length === 0 ? (
                      <span className="text-sm text-muted-foreground">
                        Nenhuma tag selecionada. Use o campo acima para
                        adicionar ou criar tags.
                      </span>
                    ) : (
                      selectedTags.map((tagId) => {
                        const tag = tags.find((t) => t.id === tagId);
                        if (!tag) return null;
                        return (
                          <Badge
                            key={tag.id}
                            variant="default"
                            className="bg-primary text-primary-foreground shadow-sm cursor-pointer hover:bg-primary/90"
                            onClick={() => toggleTag(tag.id)}
                          >
                            {tag.name}
                            <X className="w-3 h-3 ml-1" />
                          </Badge>
                        );
                      })
                    )}
                  </div>
                  {selectedTags.length > 0 && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      ✓ <strong>{selectedTags.length}</strong> tag(s)
                      selecionada(s)
                    </p>
                  )}
                </div>
              </div>

              {/* Observações */}
              <div className="space-y-2">
                <Label htmlFor="notes">Observações (opcional)</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  placeholder="Adicione informações extras sobre este lançamento..."
                  className="resize-none"
                  rows={3}
                  defaultValue={transaction?.notes ?? ""}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Separator />

          {/* Botões de Ação */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            {!isEditMode && (
              <Button
                type="button"
                variant="secondary"
                disabled={loading || !selectedAccount || !selectedCategory}
                onClick={() => {
                  continueAddingRef.current = true;
                  formRef.current?.requestSubmit();
                }}
              >
                {loading ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Salvando...
                  </>
                ) : (
                  <>Salvar e Continuar</>
                )}
              </Button>
            )}
            <Button
              type="submit"
              disabled={loading || !selectedAccount || !selectedCategory}
              className={
                type === "income"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              }
            >
              {loading ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Salvando...
                </>
              ) : (
                <>{isEditMode ? "Atualizar" : "Salvar"}</>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
