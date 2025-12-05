"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ReceiptGenerator,
  TransactionFilters as Filters,
  TransactionDialog,
  TransactionsList,
  useReceiptGenerator,
} from "@/modules/finance";
import { Plus, ReceiptText } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

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
  const {
    selectedTransactions: receiptTransactions,
    toggleTransaction: toggleReceiptTransaction,
    clearSelection: clearReceiptSelection,
    isSelected: isReceiptSelected,
    syncSelection: syncReceiptSelection,
  } = useReceiptGenerator();
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);

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

  useEffect(() => {
    if (receiptTransactions.length === 0) {
      setReceiptDialogOpen(false);
    }
  }, [receiptTransactions.length]);

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
  const effectiveFilters = useMemo(() => {
    const base: TransactionFilters = { ...filters };
    const hasNonDateFilters = !!(
      base.type ||
      base.status ||
      base.categoryId ||
      base.accountId ||
      base.tagId
    );

    if (!hasNonDateFilters && !base.startDate && !base.endDate) {
      base.month = selectedMonth.split("-")[1];
      base.year = selectedMonth.split("-")[0];
    }

    return base;
  }, [filters, selectedMonth]);

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
        <div className="flex w-full flex-col gap-4 sm:w-auto sm:flex-row sm:items-end">
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
          <div className="flex items-center gap-2 sm:pb-0">
            <Button className="gap-2" onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4" />
              Novo Lançamento
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              disabled={receiptTransactions.length === 0}
              onClick={() => setReceiptDialogOpen(true)}
            >
              <ReceiptText className="w-4 h-4" />
              Emitir recibo
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Filters onFiltersChange={handleFiltersChange} />

      {/* Transactions List */}
      <TransactionsList
        key={refreshKey}
        filters={effectiveFilters}
        receiptSelection={{
          selectedTransactions: receiptTransactions,
          toggleTransaction: toggleReceiptTransaction,
          clearSelection: clearReceiptSelection,
          isSelected: isReceiptSelected,
          syncSelection: syncReceiptSelection,
        }}
      />

      <TransactionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultType={defaultType}
        onSuccess={handleSuccess}
      />

      <ReceiptGenerator
        open={receiptDialogOpen}
        onOpenChange={setReceiptDialogOpen}
        selectedTransactions={receiptTransactions}
        onClearSelection={clearReceiptSelection}
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
