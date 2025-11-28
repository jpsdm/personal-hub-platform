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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ASSET_TYPE_COLORS,
  ASSET_TYPE_LABELS,
  MARKET_REFRESH_INTERVALS,
} from "@/modules/finance/lib/constants";
import { calculateProfitLoss } from "@/modules/finance/lib/market-api";
import { formatCurrency } from "@/modules/finance/lib/utils";
import type {
  InvestmentWithAsset,
  InvestmentWithQuote,
  MarketQuote,
} from "@/modules/finance/types";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { InvestmentDialog } from "./investment-dialog";
import { InvestmentTransactionDialog } from "./investment-transaction-dialog";

interface InvestmentListProps {
  portfolioId: string;
  refreshTrigger?: number;
}

export function InvestmentList({
  portfolioId,
  refreshTrigger,
}: InvestmentListProps) {
  const [investments, setInvestments] = useState<InvestmentWithQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleteInvestment, setDeleteInvestment] =
    useState<InvestmentWithAsset | null>(null);
  const [transactionInvestment, setTransactionInvestment] =
    useState<InvestmentWithQuote | null>(null);
  const [transactionType, setTransactionType] = useState<"BUY" | "SELL">("BUY");
  const [internalRefresh, setInternalRefresh] = useState(0);

  const fetchInvestments = useCallback(
    async (showRefreshing = false) => {
      if (showRefreshing) setRefreshing(true);

      try {
        // Fetch investments
        const investmentsRes = await fetch(
          `/api/investments?portfolioId=${portfolioId}`
        );
        if (!investmentsRes.ok) throw new Error("Failed to fetch investments");

        const investmentsData: InvestmentWithAsset[] =
          await investmentsRes.json();

        if (investmentsData.length === 0) {
          setInvestments([]);
          return;
        }

        // Fetch quotes for all assets
        const symbols = investmentsData
          .map((inv) => inv.asset.symbol)
          .join(",");
        const quotesRes = await fetch(
          `/api/investments/quotes?symbols=${symbols}`
        );
        const quotes: Record<string, MarketQuote> = quotesRes.ok
          ? await quotesRes.json()
          : {};

        // Combine data
        const investmentsWithQuotes: InvestmentWithQuote[] =
          investmentsData.map((inv) => {
            const quote = quotes[inv.asset.symbol] || null;
            const currentPrice = quote?.price || inv.averagePrice;
            const currentValue = inv.quantity * currentPrice;
            const { value: profitLoss, percent: profitLossPercent } =
              calculateProfitLoss(inv.quantity, inv.averagePrice, currentPrice);

            return {
              ...inv,
              quote,
              currentValue,
              profitLoss,
              profitLossPercent,
            };
          });

        setInvestments(investmentsWithQuotes);
      } catch (error) {
        console.error("Error fetching investments:", error);
        toast.error("Erro ao carregar investimentos");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [portfolioId]
  );

  useEffect(() => {
    fetchInvestments();
  }, [fetchInvestments, refreshTrigger, internalRefresh]);

  // Auto-refresh quotes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchInvestments(true);
    }, MARKET_REFRESH_INTERVALS.QUOTES);

    return () => clearInterval(interval);
  }, [fetchInvestments]);

  const handleDelete = async () => {
    if (!deleteInvestment) return;

    try {
      const response = await fetch(`/api/investments/${deleteInvestment.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Erro ao excluir investimento");
      }

      toast.success("Investimento removido!");
      setDeleteInvestment(null);
      setInternalRefresh((prev) => prev + 1);
    } catch (error) {
      console.error("Error deleting investment:", error);
      toast.error("Erro ao excluir investimento");
    }
  };

  // Calculate totals
  const totals = investments.reduce(
    (acc, inv) => ({
      totalInvested: acc.totalInvested + inv.totalInvested,
      currentValue: acc.currentValue + inv.currentValue,
      profitLoss: acc.profitLoss + inv.profitLoss,
    }),
    { totalInvested: 0, currentValue: 0, profitLoss: 0 }
  );
  const totalProfitLossPercent =
    totals.totalInvested > 0
      ? (totals.profitLoss / totals.totalInvested) * 100
      : 0;

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">Ativos</h3>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => fetchInvestments(true)}
            disabled={refreshing}
          >
            <RefreshCw
              className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
        <InvestmentDialog
          portfolioId={portfolioId}
          trigger={
            <Button size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Adicionar
            </Button>
          }
          onSuccess={() => setInternalRefresh((prev) => prev + 1)}
        />
      </div>

      {investments.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground mb-4">
            Nenhum investimento nesta carteira.
          </p>
          <InvestmentDialog
            portfolioId={portfolioId}
            trigger={
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Adicionar Primeiro Investimento
              </Button>
            }
            onSuccess={() => setInternalRefresh((prev) => prev + 1)}
          />
        </Card>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4">
              <p className="text-sm text-muted-foreground mb-1">
                Total Investido
              </p>
              <p className="text-xl font-bold">
                {formatCurrency(totals.totalInvested)}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-muted-foreground mb-1">Valor Atual</p>
              <p className="text-xl font-bold">
                {formatCurrency(totals.currentValue)}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-muted-foreground mb-1">
                Lucro/Prejuízo
              </p>
              <div className="flex items-center gap-2">
                {totals.profitLoss >= 0 ? (
                  <TrendingUp className="w-5 h-5 text-green-600" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-red-600" />
                )}
                <span
                  className={`text-xl font-bold ${
                    totals.profitLoss >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {formatCurrency(totals.profitLoss)}
                </span>
                <span
                  className={`text-sm ${
                    totals.profitLoss >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  ({totalProfitLossPercent >= 0 ? "+" : ""}
                  {totalProfitLossPercent.toFixed(2)}%)
                </span>
              </div>
            </Card>
          </div>

          {/* Investments Table */}
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ativo</TableHead>
                  <TableHead className="text-right">Qtd</TableHead>
                  <TableHead className="text-right">Preço Médio</TableHead>
                  <TableHead className="text-right">Cotação</TableHead>
                  <TableHead className="text-right">Total Investido</TableHead>
                  <TableHead className="text-right">Valor Atual</TableHead>
                  <TableHead className="text-right">Lucro/Prejuízo</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {investments.map((investment) => {
                  const isProfit = investment.profitLoss >= 0;
                  const typeColors =
                    ASSET_TYPE_COLORS[
                      investment.asset.type as keyof typeof ASSET_TYPE_COLORS
                    ];

                  return (
                    <TableRow key={investment.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold">
                                {investment.asset.symbol}
                              </span>
                              <Badge
                                variant="outline"
                                className={`text-xs ${typeColors?.bg} ${typeColors?.text}`}
                              >
                                {
                                  ASSET_TYPE_LABELS[
                                    investment.asset
                                      .type as keyof typeof ASSET_TYPE_LABELS
                                  ]
                                }
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {investment.asset.name}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {investment.quantity.toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(investment.averagePrice)}
                      </TableCell>
                      <TableCell className="text-right">
                        {investment.quote ? (
                          <div>
                            <span className="font-mono font-medium">
                              {formatCurrency(investment.quote.price)}
                            </span>
                            <div
                              className={`text-xs flex items-center justify-end gap-1 ${
                                investment.quote.change >= 0
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              {investment.quote.change >= 0 ? (
                                <ArrowUpCircle className="w-3 h-3" />
                              ) : (
                                <ArrowDownCircle className="w-3 h-3" />
                              )}
                              {investment.quote.changePercent.toFixed(2)}%
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(investment.totalInvested)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        {formatCurrency(investment.currentValue)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div
                          className={`flex items-center justify-end gap-1 ${
                            isProfit ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {isProfit ? (
                            <TrendingUp className="w-4 h-4" />
                          ) : (
                            <TrendingDown className="w-4 h-4" />
                          )}
                          <div className="text-right">
                            <div className="font-mono font-medium">
                              {formatCurrency(investment.profitLoss)}
                            </div>
                            <div className="text-xs">
                              {isProfit ? "+" : ""}
                              {investment.profitLossPercent.toFixed(2)}%
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setTransactionInvestment(investment);
                                setTransactionType("BUY");
                              }}
                            >
                              <ArrowUpCircle className="w-4 h-4 mr-2 text-green-600" />
                              Comprar mais
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setTransactionInvestment(investment);
                                setTransactionType("SELL");
                              }}
                            >
                              <ArrowDownCircle className="w-4 h-4 mr-2 text-red-600" />
                              Vender
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setDeleteInvestment(investment)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Remover
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </>
      )}

      {/* Transaction Dialog */}
      {transactionInvestment && (
        <InvestmentTransactionDialog
          investment={transactionInvestment}
          currentQuote={transactionInvestment.quote}
          defaultType={transactionType}
          open={!!transactionInvestment}
          onOpenChange={(open) => !open && setTransactionInvestment(null)}
          onSuccess={() => {
            setTransactionInvestment(null);
            setInternalRefresh((prev) => prev + 1);
          }}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteInvestment}
        onOpenChange={(open) => !open && setDeleteInvestment(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover investimento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover {deleteInvestment?.asset.symbol} da
              carteira? Todo o histórico de transações será perdido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
