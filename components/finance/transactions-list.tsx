"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatCurrency, formatDate } from "@/lib/finance-utils";
import {
  AlertCircle,
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle,
  Clock,
  Edit,
  FileText,
  HelpCircle,
  Pin,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { TransactionDialog } from "./transaction-dialog";

interface Transaction {
  id: string;
  realId?: string | null; // ID real (null se for virtual pura)
  parentId?: string; // ID da transação raiz
  description: string;
  type: string;
  amount: number;
  dueDate: string;
  paidDate: string | null;
  status: string;
  notes?: string;
  isFixed?: boolean;
  isRecurring?: boolean;
  installments?: number;
  currentInstallment?: number | null;
  parentTransactionId?: string;
  isVirtual?: boolean; // True se é ocorrência virtual
  isOverride?: boolean; // True se é um override
  accountId?: string;
  categoryId?: string;
  account: { name: string };
  category: { name: string };
  tags: Array<{ tag: { name: string } }>;
}

type ActionScope = "single" | "future" | "all";
type ActionType = "edit" | "delete";

interface TransactionsListProps {
  filters?: {
    startDate?: string;
    endDate?: string;
    type?: string;
    status?: string;
    categoryId?: string;
    accountId?: string;
    tagId?: string;
    month?: string;
    year?: string;
  };
}

function StatusBadge({ status }: { status: string }) {
  const variants = {
    PAID: {
      icon: CheckCircle,
      text: "Pago",
      className:
        "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    },
    PENDING: {
      icon: Clock,
      text: "Pendente",
      className:
        "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    },
    OVERDUE: {
      icon: AlertCircle,
      text: "Atrasado",
      className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    },
  };

  const variant = variants[status as keyof typeof variants];
  const Icon = variant.icon;

  return (
    <Badge variant="outline" className={variant.className}>
      <Icon className="w-3 h-3 mr-1" />
      {variant.text}
    </Badge>
  );
}

export function TransactionsList({ filters = {} }: TransactionsListProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(
    null
  );

  // Dialog para escolher escopo de edição/exclusão (recorrente/parcelado)
  const [scopeDialogOpen, setScopeDialogOpen] = useState(false);
  const [scopeAction, setScopeAction] = useState<ActionType>("delete");
  const [scopeTransaction, setScopeTransaction] = useState<Transaction | null>(
    null
  );

  // Calcular totais baseado no tipo de filtro
  const totals = useMemo(() => {
    // Receitas
    const incomeTransactions = transactions.filter((t) => t.type === "INCOME");
    const income = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);
    const incomePending = incomeTransactions
      .filter((t) => t.status === "PENDING" || t.status === "OVERDUE")
      .reduce((sum, t) => sum + t.amount, 0);
    const incomeReceived = incomeTransactions
      .filter((t) => t.status === "PAID")
      .reduce((sum, t) => sum + t.amount, 0);

    // Despesas
    const expenseTransactions = transactions.filter(
      (t) => t.type === "EXPENSE"
    );
    const expenses = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);
    const expensesPending = expenseTransactions
      .filter((t) => t.status === "PENDING" || t.status === "OVERDUE")
      .reduce((sum, t) => sum + t.amount, 0);
    const expensesPaid = expenseTransactions
      .filter((t) => t.status === "PAID")
      .reduce((sum, t) => sum + t.amount, 0);

    const balance = income - expenses;

    return {
      income,
      incomePending,
      incomeReceived,
      expenses,
      expensesPending,
      expensesPaid,
      balance,
    };
  }, [transactions]);

  // Determinar qual visualização de cards mostrar
  const cardView = useMemo(() => {
    if (filters.type === "INCOME") return "income";
    if (filters.type === "EXPENSE") return "expense";
    return "all";
  }, [filters.type]);

  useEffect(() => {
    fetchTransactions();
  }, [filters]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);
      if (filters.type) params.append("type", filters.type);
      if (filters.status) params.append("status", filters.status);
      if (filters.categoryId) params.append("categoryId", filters.categoryId);
      if (filters.accountId) params.append("accountId", filters.accountId);
      if (filters.tagId) params.append("tagId", filters.tagId);
      if (filters.month) params.append("month", filters.month);
      if (filters.year) params.append("year", filters.year);

      const response = await fetch(`/api/transactions?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setTransactions(data);
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (transaction: Transaction) => {
    // Transações fixas ou parceladas (virtuais): pode editar individualmente ou em lote
    const isFixedOrInstallment =
      transaction.isFixed ||
      (transaction.installments && transaction.installments > 1) ||
      transaction.parentId ||
      transaction.isVirtual;

    if (isFixedOrInstallment) {
      setScopeTransaction(transaction);
      setScopeAction("edit");
      setScopeDialogOpen(true);
    } else {
      // Transação normal
      setSelectedTransaction(transaction);
      setEditDialogOpen(true);
    }
  };

  const handleDeleteClick = (transaction: Transaction) => {
    // Transações fixas ou parceladas (virtuais): pode excluir individualmente ou em lote
    const isFixedOrInstallment =
      transaction.isFixed ||
      (transaction.installments && transaction.installments > 1) ||
      transaction.parentId ||
      transaction.isVirtual;

    if (isFixedOrInstallment) {
      setScopeTransaction(transaction);
      setScopeAction("delete");
      setScopeDialogOpen(true);
    } else {
      // Transação normal
      setTransactionToDelete(transaction.id);
      setDeleteDialogOpen(true);
    }
  };

  const handleScopeAction = async (scope: ActionScope) => {
    if (!scopeTransaction) return;

    if (scopeAction === "edit") {
      // Para edição, passar o escopo junto com a transação
      setSelectedTransaction({ ...scopeTransaction, editScope: scope } as any);
      setEditDialogOpen(true);
    } else {
      // Para exclusão
      await handleDeleteWithScope(scopeTransaction, scope);
    }

    setScopeDialogOpen(false);
    setScopeTransaction(null);
  };

  const handleDeleteWithScope = async (
    transaction: Transaction,
    scope: ActionScope
  ) => {
    try {
      const response = await fetch(`/api/transactions/${transaction.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete transaction");
      }

      fetchTransactions();
    } catch (error) {
      console.error("Error deleting transaction:", error);
      alert("Erro ao excluir lançamento");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/transactions/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete transaction");
      }

      fetchTransactions();
    } catch (error) {
      console.error("Error deleting transaction:", error);
      alert("Erro ao excluir lançamento");
    }
  };

  const handleMarkAsPaid = async (transaction: Transaction) => {
    try {
      // Para transações virtuais, precisamos criar um override com status PAID
      const response = await fetch(`/api/transactions/${transaction.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: transaction.accountId,
          categoryId: transaction.categoryId,
          type: transaction.type,
          description: transaction.description,
          amount: transaction.amount,
          dueDate: transaction.dueDate,
          status: "PAID",
          notes: transaction.notes,
          isFixed: transaction.isFixed,
          scope: "single", // Sempre marcar apenas esta ocorrência como paga
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update transaction");
      }

      fetchTransactions();
    } catch (error) {
      console.error("Error updating transaction:", error);
      alert("Erro ao atualizar lançamento");
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Carregando...
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <Card className="p-8 text-center">
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Nenhum lançamento encontrado
        </h3>
        <p className="text-muted-foreground">
          Clique em "Novo Lançamento" para começar
        </p>
      </Card>
    );
  }

  return (
    <>
      <div className="flex flex-col xl:flex-row gap-6">
        {/* Summary Cards */}
        <div className="xl:w-72 shrink-0">
          <div className="grid grid-cols-2 xl:grid-cols-1 gap-4 xl:sticky xl:top-4">
            {/* Cards para visualização padrão (todos os tipos) */}
            {cardView === "all" && (
              <>
                {/* Balanço */}
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        totals.balance >= 0 ? "bg-green-600" : "bg-red-600"
                      }`}
                    >
                      <TrendingUp className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <p className="text-xs font-medium text-muted-foreground">
                          Balanço
                        </p>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="w-3 h-3 text-muted-foreground/60 hover:text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent
                              side="right"
                              className="max-w-[200px]"
                            >
                              <p className="text-xs">
                                Diferença entre receitas e despesas (Receitas -
                                Despesas). Positivo = sobrou dinheiro.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <p
                        className={`text-lg font-bold truncate ${
                          totals.balance >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {formatCurrency(totals.balance)}
                      </p>
                    </div>
                  </div>
                </Card>

                {/* Receitas */}
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-600 flex items-center justify-center">
                      <ArrowUpCircle className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <p className="text-xs font-medium text-muted-foreground">
                          Receitas
                        </p>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="w-3 h-3 text-muted-foreground/60 hover:text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent
                              side="right"
                              className="max-w-[200px]"
                            >
                              <p className="text-xs">
                                Total de entradas de dinheiro no período
                                filtrado.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <p className="text-lg font-bold text-green-600 truncate">
                        {formatCurrency(totals.income)}
                      </p>
                    </div>
                  </div>
                </Card>

                {/* Despesas */}
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-red-600 flex items-center justify-center">
                      <ArrowDownCircle className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <p className="text-xs font-medium text-muted-foreground">
                          Despesas
                        </p>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="w-3 h-3 text-muted-foreground/60 hover:text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent
                              side="right"
                              className="max-w-[200px]"
                            >
                              <p className="text-xs">
                                Total de saídas de dinheiro no período filtrado.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <p className="text-lg font-bold text-red-600 truncate">
                        {formatCurrency(totals.expenses)}
                      </p>
                    </div>
                  </div>
                </Card>

                {/* A Pagar */}
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-yellow-500 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <p className="text-xs font-medium text-muted-foreground">
                          A Pagar
                        </p>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="w-3 h-3 text-muted-foreground/60 hover:text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent
                              side="right"
                              className="max-w-[200px]"
                            >
                              <p className="text-xs">
                                Total de despesas pendentes e atrasadas.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <p className="text-lg font-bold text-yellow-600 truncate">
                        {formatCurrency(totals.expensesPending)}
                      </p>
                    </div>
                  </div>
                </Card>
              </>
            )}

            {/* Cards para visualização de receitas */}
            {cardView === "income" && (
              <>
                {/* Receitas Pendentes */}
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-yellow-500 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <p className="text-xs font-medium text-muted-foreground">
                          Pendentes
                        </p>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="w-3 h-3 text-muted-foreground/60 hover:text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent
                              side="right"
                              className="max-w-[200px]"
                            >
                              <p className="text-xs">
                                Receitas ainda não recebidas.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <p className="text-lg font-bold text-yellow-600 truncate">
                        {formatCurrency(totals.incomePending)}
                      </p>
                    </div>
                  </div>
                </Card>

                {/* Receitas Recebidas */}
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-600 flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <p className="text-xs font-medium text-muted-foreground">
                          Recebidas
                        </p>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="w-3 h-3 text-muted-foreground/60 hover:text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent
                              side="right"
                              className="max-w-[200px]"
                            >
                              <p className="text-xs">
                                Receitas já recebidas e confirmadas.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <p className="text-lg font-bold text-green-600 truncate">
                        {formatCurrency(totals.incomeReceived)}
                      </p>
                    </div>
                  </div>
                </Card>

                {/* Total Receitas */}
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-700 flex items-center justify-center">
                      <ArrowUpCircle className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <p className="text-xs font-medium text-muted-foreground">
                          Total
                        </p>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="w-3 h-3 text-muted-foreground/60 hover:text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent
                              side="right"
                              className="max-w-[200px]"
                            >
                              <p className="text-xs">
                                Total de todas as receitas (pendentes +
                                recebidas).
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <p className="text-lg font-bold text-green-700 truncate">
                        {formatCurrency(totals.income)}
                      </p>
                    </div>
                  </div>
                </Card>
              </>
            )}

            {/* Cards para visualização de despesas */}
            {cardView === "expense" && (
              <>
                {/* Despesas Pendentes */}
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-yellow-500 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <p className="text-xs font-medium text-muted-foreground">
                          Pendentes
                        </p>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="w-3 h-3 text-muted-foreground/60 hover:text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent
                              side="right"
                              className="max-w-[200px]"
                            >
                              <p className="text-xs">
                                Despesas ainda não pagas.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <p className="text-lg font-bold text-yellow-600 truncate">
                        {formatCurrency(totals.expensesPending)}
                      </p>
                    </div>
                  </div>
                </Card>

                {/* Despesas Pagas */}
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-600 flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <p className="text-xs font-medium text-muted-foreground">
                          Pagas
                        </p>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="w-3 h-3 text-muted-foreground/60 hover:text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent
                              side="right"
                              className="max-w-[200px]"
                            >
                              <p className="text-xs">
                                Despesas já pagas e confirmadas.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <p className="text-lg font-bold text-green-600 truncate">
                        {formatCurrency(totals.expensesPaid)}
                      </p>
                    </div>
                  </div>
                </Card>

                {/* Total Despesas */}
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-red-600 flex items-center justify-center">
                      <ArrowDownCircle className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <p className="text-xs font-medium text-muted-foreground">
                          Total
                        </p>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="w-3 h-3 text-muted-foreground/60 hover:text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent
                              side="right"
                              className="max-w-[200px]"
                            >
                              <p className="text-xs">
                                Total de todas as despesas (pendentes + pagas).
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <p className="text-lg font-bold text-red-600 truncate">
                        {formatCurrency(totals.expenses)}
                      </p>
                    </div>
                  </div>
                </Card>
              </>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 min-w-0">
          <Card className="px-5">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Conta</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Pagamento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <span>
                            {transaction.description}
                            {transaction.installments &&
                              transaction.installments > 1 &&
                              transaction.currentInstallment && (
                                <span className="text-muted-foreground ml-1">
                                  ({transaction.currentInstallment}/
                                  {transaction.installments})
                                </span>
                              )}
                          </span>
                          {transaction.notes && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <FileText className="w-4 h-4 text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <p className="text-sm">{transaction.notes}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          {transaction.isFixed && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Pin className="w-4 h-4 text-blue-500 cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-sm">
                                    Lançamento fixo (mensal)
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          {/* {transaction.isVirtual && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded cursor-help">
                                    V
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-sm">
                                    Ocorrência virtual (calculada
                                    automaticamente)
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          {transaction.isOverride && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400 rounded cursor-help">
                                    O
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-sm">
                                    Ocorrência modificada (override)
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )} */}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {transaction.type === "INCOME" ? (
                            <>
                              <ArrowUpCircle className="w-4 h-4 text-green-600" />
                              <span className="text-sm">Receita</span>
                            </>
                          ) : (
                            <>
                              <ArrowDownCircle className="w-4 h-4 text-red-600" />
                              <span className="text-sm">Despesa</span>
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{transaction.category.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {transaction.account.name}
                      </TableCell>
                      <TableCell
                        className={`text-right font-semibold ${
                          transaction.type === "INCOME"
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {transaction.type === "INCOME" ? "+" : "-"}{" "}
                        {formatCurrency(transaction.amount)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(new Date(transaction.dueDate))}
                      </TableCell>
                      <TableCell className="text-sm">
                        {transaction.paidDate
                          ? formatDate(new Date(transaction.paidDate))
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={transaction.status} />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {transaction.tags.map((t, idx) => (
                            <Badge
                              key={idx}
                              variant="secondary"
                              className="text-xs"
                            >
                              {t.tag.name}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          {transaction.status !== "PAID" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              title="Marcar como pago"
                              onClick={() => handleMarkAsPaid(transaction)}
                            >
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            title="Editar"
                            onClick={() => handleEdit(transaction)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-destructive"
                            title="Excluir"
                            onClick={() => handleDeleteClick(transaction)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Mostrando {transactions.length} de {transactions.length}{" "}
                lançamentos
              </p>
            </div>
          </Card>
        </div>
      </div>

      <TransactionDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        transaction={selectedTransaction}
        onSuccess={() => {
          fetchTransactions();
          setSelectedTransaction(null);
        }}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este lançamento? Esta ação não pode
              ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (transactionToDelete) {
                  handleDelete(transactionToDelete);
                  setTransactionToDelete(null);
                }
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog para escolher escopo de edição/exclusão */}
      <AlertDialog open={scopeDialogOpen} onOpenChange={setScopeDialogOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {scopeAction === "edit"
                ? "Editar lançamento"
                : "Excluir lançamento"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {scopeTransaction?.isFixed ? (
                <>
                  Este é um lançamento <strong>fixo</strong> (ocorrência{" "}
                  {scopeTransaction?.currentInstallment || 1}). Como você deseja{" "}
                  {scopeAction === "edit" ? "editar" : "excluir"}?
                </>
              ) : (
                <>
                  Este é um lançamento <strong>parcelado</strong> (
                  {scopeTransaction?.currentInstallment || 1}/
                  {scopeTransaction?.installments}). Como você deseja{" "}
                  {scopeAction === "edit" ? "editar" : "excluir"}?
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-2 py-4">
            {/* Opção 1: Somente esta */}
            <Button
              variant="outline"
              className="justify-start h-auto py-3 px-4"
              onClick={() => handleScopeAction("single")}
            >
              <div className="text-left">
                <p className="font-medium">
                  {scopeTransaction?.isFixed
                    ? "Somente esta ocorrência"
                    : "Somente esta parcela"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {scopeAction === "edit" ? "Editar" : "Excluir"} apenas{" "}
                  {scopeTransaction?.isFixed
                    ? "este mês"
                    : `a parcela ${scopeTransaction?.currentInstallment || 1}`}
                </p>
              </div>
            </Button>

            {/* Opção 2: Esta e futuras */}
            <Button
              variant="outline"
              className="justify-start h-auto py-3 px-4"
              onClick={() => handleScopeAction("future")}
            >
              <div className="text-left">
                <p className="font-medium">Esta e todas as próximas</p>
                <p className="text-sm text-muted-foreground">
                  {scopeAction === "edit" ? "Editar" : "Excluir"} a partir{" "}
                  {scopeTransaction?.isFixed
                    ? "deste mês em diante"
                    : `da parcela ${scopeTransaction?.currentInstallment || 1}`}
                </p>
              </div>
            </Button>

            {/* Opção 3: Todas */}
            <Button
              variant="destructive"
              className="justify-start h-auto py-3 px-4"
              onClick={() => handleScopeAction("all")}
            >
              <div className="text-left">
                <p className="font-medium">
                  {scopeTransaction?.isFixed
                    ? "Todas as ocorrências"
                    : "Todas as parcelas"}
                </p>
                <p className="text-sm opacity-80">
                  {scopeAction === "edit" ? "Editar" : "Excluir"}{" "}
                  {scopeTransaction?.isFixed
                    ? "todos os meses (passados e futuros)"
                    : `todas as ${scopeTransaction?.installments} parcelas`}
                </p>
              </div>
            </Button>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
