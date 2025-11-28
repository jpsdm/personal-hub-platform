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
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/modules/finance/lib/utils";
import type { PortfolioWithInvestments } from "@/modules/finance/types";
import {
  Briefcase,
  ChevronRight,
  MoreHorizontal,
  Pencil,
  Plus,
  Star,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { PortfolioDialog } from "./portfolio-dialog";

interface PortfolioSummary {
  totalInvested: number;
  currentValue: number;
  profitLoss: number;
  profitLossPercent: number;
  assetsCount: number;
}

interface PortfolioListProps {
  onSelectPortfolio?: (portfolio: PortfolioWithInvestments) => void;
}

export function PortfolioList({ onSelectPortfolio }: PortfolioListProps) {
  const router = useRouter();
  const [portfolios, setPortfolios] = useState<PortfolioWithInvestments[]>([]);
  const [summaries, setSummaries] = useState<Record<string, PortfolioSummary>>(
    {}
  );
  const [loading, setLoading] = useState(true);
  const [editPortfolio, setEditPortfolio] =
    useState<PortfolioWithInvestments | null>(null);
  const [deletePortfolio, setDeletePortfolio] =
    useState<PortfolioWithInvestments | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchPortfolios = useCallback(async () => {
    try {
      const userId = sessionStorage.getItem("currentUserId");
      if (!userId) return;

      const response = await fetch(
        `/api/investments/portfolios?userId=${userId}`
      );
      if (!response.ok) throw new Error("Failed to fetch portfolios");

      const data: PortfolioWithInvestments[] = await response.json();
      setPortfolios(data);

      // Fetch quotes for all assets to calculate summaries
      const allSymbols = new Set<string>();
      for (const portfolio of data) {
        for (const investment of portfolio.investments) {
          allSymbols.add(investment.asset.symbol);
        }
      }

      if (allSymbols.size > 0) {
        const quotesResponse = await fetch(
          `/api/investments/quotes?symbols=${Array.from(allSymbols).join(",")}`
        );

        if (quotesResponse.ok) {
          const quotes = await quotesResponse.json();

          // Calculate summaries for each portfolio
          const newSummaries: Record<string, PortfolioSummary> = {};

          for (const portfolio of data) {
            let totalInvested = 0;
            let currentValue = 0;

            for (const investment of portfolio.investments) {
              totalInvested += investment.totalInvested;
              const quote = quotes[investment.asset.symbol];
              if (quote) {
                currentValue += investment.quantity * quote.price;
              } else {
                currentValue += investment.totalInvested;
              }
            }

            const profitLoss = currentValue - totalInvested;
            const profitLossPercent =
              totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0;

            newSummaries[portfolio.id] = {
              totalInvested,
              currentValue,
              profitLoss,
              profitLossPercent,
              assetsCount: portfolio.investments.length,
            };
          }

          setSummaries(newSummaries);
        }
      } else {
        // No investments, set empty summaries
        const newSummaries: Record<string, PortfolioSummary> = {};
        for (const portfolio of data) {
          newSummaries[portfolio.id] = {
            totalInvested: 0,
            currentValue: 0,
            profitLoss: 0,
            profitLossPercent: 0,
            assetsCount: 0,
          };
        }
        setSummaries(newSummaries);
      }
    } catch (error) {
      console.error("Error fetching portfolios:", error);
      toast.error("Erro ao carregar carteiras");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPortfolios();
  }, [fetchPortfolios, refreshKey]);

  const handleDelete = async () => {
    if (!deletePortfolio) return;

    try {
      const response = await fetch(
        `/api/investments/portfolios/${deletePortfolio.id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao excluir carteira");
      }

      toast.success("Carteira excluída!");
      setDeletePortfolio(null);
      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      console.error("Error deleting portfolio:", error);
      toast.error(
        error instanceof Error ? error.message : "Erro ao excluir carteira"
      );
    }
  };

  const handlePortfolioClick = (portfolio: PortfolioWithInvestments) => {
    if (onSelectPortfolio) {
      onSelectPortfolio(portfolio);
    } else {
      router.push(`/finance/investments/${portfolio.id}`);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Minhas Carteiras</h2>
          <p className="text-muted-foreground">
            {portfolios.length} carteira{portfolios.length !== 1 ? "s" : ""}
          </p>
        </div>
        <PortfolioDialog
          trigger={
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Nova Carteira
            </Button>
          }
          onSuccess={() => setRefreshKey((prev) => prev + 1)}
        />
      </div>

      {portfolios.length === 0 ? (
        <Card className="p-12 text-center">
          <Briefcase className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhuma carteira</h3>
          <p className="text-muted-foreground mb-4">
            Crie sua primeira carteira para começar a acompanhar seus
            investimentos.
          </p>
          <PortfolioDialog
            trigger={
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Criar Carteira
              </Button>
            }
            onSuccess={() => setRefreshKey((prev) => prev + 1)}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {portfolios.map((portfolio) => {
            const summary = summaries[portfolio.id];
            const isProfit = summary && summary.profitLoss >= 0;

            return (
              <Card
                key={portfolio.id}
                className="p-4 hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => handlePortfolioClick(portfolio)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: portfolio.color + "20" }}
                    >
                      <Briefcase
                        className="w-5 h-5"
                        style={{ color: portfolio.color }}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{portfolio.name}</h3>
                        {portfolio.isDefault && (
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {summary?.assetsCount || 0} ativo
                        {summary?.assetsCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger
                      asChild
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditPortfolio(portfolio);
                        }}
                      >
                        <Pencil className="w-4 h-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletePortfolio(portfolio);
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {summary && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-baseline">
                      <span className="text-sm text-muted-foreground">
                        Valor atual
                      </span>
                      <span className="text-lg font-bold">
                        {formatCurrency(summary.currentValue)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        Lucro/Prejuízo
                      </span>
                      <div className="flex items-center gap-1">
                        {isProfit ? (
                          <TrendingUp className="w-4 h-4 text-green-600" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-600" />
                        )}
                        <span
                          className={`text-sm font-medium ${
                            isProfit ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {formatCurrency(summary.profitLoss)} (
                          {summary.profitLossPercent.toFixed(2)}%)
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-3 pt-3 border-t flex items-center justify-between text-sm text-muted-foreground group-hover:text-primary transition-colors">
                  <span>Ver detalhes</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Dialog */}
      {editPortfolio && (
        <PortfolioDialog
          portfolio={editPortfolio}
          open={!!editPortfolio}
          onOpenChange={(open) => !open && setEditPortfolio(null)}
          onSuccess={() => {
            setEditPortfolio(null);
            setRefreshKey((prev) => prev + 1);
          }}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deletePortfolio}
        onOpenChange={(open) => !open && setDeletePortfolio(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir carteira</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a carteira "{deletePortfolio?.name}
              "?
              {deletePortfolio?.investments &&
                deletePortfolio.investments.length > 0 && (
                  <span className="block mt-2 text-destructive">
                    Esta carteira possui {deletePortfolio.investments.length}{" "}
                    investimento(s). Você precisa removê-los antes de excluir a
                    carteira.
                  </span>
                )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={
                deletePortfolio?.investments &&
                deletePortfolio.investments.length > 0
              }
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
