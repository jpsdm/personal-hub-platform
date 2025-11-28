"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InvestmentList } from "@/modules/finance/components/investment-list";
import { PortfolioCharts } from "@/modules/finance/components/portfolio-charts";
import { PortfolioDialog } from "@/modules/finance/components/portfolio-dialog";
import { calculateProfitLoss } from "@/modules/finance/lib/market-api";
import { formatCurrency } from "@/modules/finance/lib/utils";
import type {
  InvestmentWithQuote,
  MarketQuote,
  PortfolioWithInvestments,
} from "@/modules/finance/types";
import {
  ArrowLeft,
  BarChart3,
  Edit,
  List,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export default function PortfolioDetailPage() {
  const params = useParams();
  const portfolioId = params.id as string;

  const [portfolio, setPortfolio] = useState<PortfolioWithInvestments | null>(
    null
  );
  const [investmentsWithQuotes, setInvestmentsWithQuotes] = useState<
    InvestmentWithQuote[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const fetchPortfolio = useCallback(async () => {
    try {
      const userId = sessionStorage.getItem("currentUserId");
      const response = await fetch(
        `/api/investments/portfolios/${portfolioId}?userId=${userId}`
      );
      if (response.ok) {
        const data = await response.json();
        setPortfolio(data);
        return data;
      }
    } catch (error) {
      console.error("Error fetching portfolio:", error);
    } finally {
      setIsLoading(false);
    }
    return null;
  }, [portfolioId]);

  const fetchQuotes = useCallback(
    async (portfolioData: PortfolioWithInvestments) => {
      if (!portfolioData?.investments?.length) {
        setInvestmentsWithQuotes([]);
        return;
      }

      setIsRefreshing(true);
      try {
        const symbols = portfolioData.investments
          .map((inv) => inv.asset.symbol)
          .join(",");

        const response = await fetch(
          `/api/investments/quotes?symbols=${symbols}`
        );
        const quotes: Record<string, MarketQuote> = response.ok
          ? await response.json()
          : {};

        // Transform to InvestmentWithQuote
        const withQuotes: InvestmentWithQuote[] = portfolioData.investments.map(
          (inv) => {
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
          }
        );

        setInvestmentsWithQuotes(withQuotes);
      } catch (error) {
        console.error("Error fetching quotes:", error);
      } finally {
        setIsRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchPortfolio().then((data) => {
      if (data) {
        fetchQuotes(data);
      }
    });
  }, [fetchPortfolio, fetchQuotes, refreshTrigger]);

  // Auto-refresh quotes every 30 seconds
  useEffect(() => {
    if (!portfolio) return;

    const interval = setInterval(() => {
      fetchQuotes(portfolio);
    }, 30000);

    return () => clearInterval(interval);
  }, [portfolio, fetchQuotes]);

  const handleRefresh = () => {
    if (portfolio) {
      fetchQuotes(portfolio);
    }
  };

  const handleEditSuccess = () => {
    setEditDialogOpen(false);
    setRefreshTrigger((prev) => prev + 1);
  };

  // Calculate portfolio summary
  const calculateSummary = () => {
    if (!investmentsWithQuotes.length) {
      return {
        totalInvested: 0,
        currentValue: 0,
        profitLoss: 0,
        profitLossPercent: 0,
      };
    }

    const totalInvested = investmentsWithQuotes.reduce(
      (sum, inv) => sum + inv.totalInvested,
      0
    );
    const currentValue = investmentsWithQuotes.reduce(
      (sum, inv) => sum + inv.currentValue,
      0
    );
    const profitLoss = currentValue - totalInvested;
    const profitLossPercent =
      totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0;

    return { totalInvested, currentValue, profitLoss, profitLossPercent };
  };

  const summary = calculateSummary();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!portfolio) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <h2 className="text-xl font-semibold mb-2">Carteira não encontrada</h2>
        <p className="text-muted-foreground mb-4">
          A carteira que você está procurando não existe.
        </p>
        <Link href="/finance/investments">
          <Button>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Investimentos
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/finance/investments">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: portfolio.color || "#6366f1" }}
          />
          <div>
            <h1 className="text-2xl font-bold">{portfolio.name}</h1>
            {portfolio.description && (
              <p className="text-muted-foreground">{portfolio.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
          </Button>
          <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Investido
            </CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(summary.totalInvested)}
            </div>
            <p className="text-xs text-muted-foreground">
              {portfolio.investments?.length || 0} ativo
              {(portfolio.investments?.length || 0) !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Atual</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(summary.currentValue)}
            </div>
            <p className="text-xs text-muted-foreground">
              {isRefreshing ? "Atualizando..." : "Atualizado em tempo real"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Lucro/Prejuízo
            </CardTitle>
            {summary.profitLoss >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                summary.profitLoss >= 0 ? "text-green-500" : "text-red-500"
              }`}
            >
              {summary.profitLoss >= 0 ? "+" : ""}
              {formatCurrency(summary.profitLoss)}
            </div>
            <p
              className={`text-xs ${
                summary.profitLoss >= 0 ? "text-green-500" : "text-red-500"
              }`}
            >
              {summary.profitLoss >= 0 ? "+" : ""}
              {summary.profitLossPercent.toFixed(2)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rendimento</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                summary.profitLossPercent >= 0
                  ? "text-green-500"
                  : "text-red-500"
              }`}
            >
              {summary.profitLossPercent >= 0 ? "+" : ""}
              {summary.profitLossPercent.toFixed(2)}%
            </div>
            <p className="text-xs text-muted-foreground">Variação total</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="investments" className="space-y-4">
        <TabsList>
          <TabsTrigger value="investments" className="gap-2">
            <List className="h-4 w-4" />
            Investimentos
          </TabsTrigger>
          <TabsTrigger value="charts" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Gráficos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="investments">
          <InvestmentList
            portfolioId={portfolioId}
            refreshTrigger={refreshTrigger}
          />
        </TabsContent>

        <TabsContent value="charts">
          {investmentsWithQuotes.length > 0 ? (
            <PortfolioCharts investments={investmentsWithQuotes} />
          ) : (
            <Card className="flex flex-col items-center justify-center py-16">
              <BarChart3 className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-xl font-semibold mb-2">
                Sem dados para gráficos
              </h3>
              <p className="text-muted-foreground text-center max-w-md">
                Adicione investimentos para visualizar a distribuição e
                performance da sua carteira.
              </p>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <PortfolioDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        portfolio={portfolio}
        onSuccess={handleEditSuccess}
      />
    </div>
  );
}
