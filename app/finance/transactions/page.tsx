"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  TransactionFilters as Filters,
  TransactionDialog,
  TransactionsList,
} from "@/modules/finance";
import { Plus } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

export interface TransactionFilters {
  startDate?: string;
  endDate?: string;
  type?: string;
  status?: string;
  categoryId?: string;
  accountId?: string;
  tagId?: string;
  month?: string;
  year?: string;
}

function TransactionsPageContent() {
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  const searchParams = useSearchParams();
  const router = useRouter();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [defaultType, setDefaultType] = useState<"income" | "expense">(
    "expense"
  );
  const [refreshKey, setRefreshKey] = useState(0);
  const [filters, setFilters] = useState<TransactionFilters>({});
  const [selectedMonth, setSelectedMonth] = useState(
    `${currentYear}-${String(currentMonth).padStart(2, "0")}`
  );

  // Verificar parâmetros da URL para abrir dialog automaticamente
  useEffect(() => {
    const action = searchParams.get("action");
    const type = searchParams.get("type");

    if (action === "new") {
      if (type === "income" || type === "expense") {
        setDefaultType(type);
      }
      setDialogOpen(true);
      // Limpar os parâmetros da URL após abrir o dialog
      router.replace("/finance/transactions", { scroll: false });
    }
  }, [searchParams, router]);

  const handleSuccess = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const handleFiltersChange = (newFilters: TransactionFilters) => {
    setFilters(newFilters);
    setRefreshKey((prev) => prev + 1);
  };

  const handleMonthChange = (value: string) => {
    setSelectedMonth(value);
    setRefreshKey((prev) => prev + 1);
  };

  const handleOpenDialog = (type: "income" | "expense" = "expense") => {
    setDefaultType(type);
    setDialogOpen(true);
  };

  // Verificar se há filtros ativos (exceto datas)
  const hasNonDateFilters = !!(
    filters.type ||
    filters.status ||
    filters.categoryId ||
    filters.accountId ||
    filters.tagId
  );

  // Se há filtros não-data ativos e não há data explícita, não enviar mês/ano
  // Isso permite buscar todas as transações que correspondem ao filtro
  const effectiveFilters: TransactionFilters = {
    ...filters,
  };

  // Só adicionar mês/ano se:
  // 1. Não há filtros não-data ativos, OU
  // 2. Há data explícita definida (startDate/endDate)
  if (!hasNonDateFilters && !filters.startDate && !filters.endDate) {
    effectiveFilters.month = selectedMonth.split("-")[1];
    effectiveFilters.year = selectedMonth.split("-")[0];
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Lançamentos
          </h2>
          <p className="text-muted-foreground">
            Gerencie suas receitas e despesas
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div>
            <Label
              htmlFor="month-selector"
              className="text-sm font-medium mb-1 block"
            >
              Período
            </Label>
            <Input
              id="month-selector"
              type="month"
              value={selectedMonth}
              onChange={(e) => handleMonthChange(e.target.value)}
              className="w-[200px]"
            />
          </div>
          <Button className="gap-2 mt-5" onClick={() => handleOpenDialog()}>
            <Plus className="w-4 h-4" />
            Novo Lançamento
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Filters onFiltersChange={handleFiltersChange} />

      {/* Transactions List */}
      <TransactionsList key={refreshKey} filters={effectiveFilters} />

      <TransactionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultType={defaultType}
        onSuccess={handleSuccess}
      />
    </div>
  );
}

export default function TransactionsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="h-24 bg-muted/50 animate-pulse rounded-lg" />
          <div className="h-64 bg-muted/50 animate-pulse rounded-lg" />
        </div>
      }
    >
      <TransactionsPageContent />
    </Suspense>
  );
}
