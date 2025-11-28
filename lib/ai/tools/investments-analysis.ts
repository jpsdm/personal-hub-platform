import { prisma } from "@/lib/db";
import {
  calculateProfitLoss,
  detectAssetType,
  getQuotes,
} from "@/modules/finance/lib/market-api";
import { z } from "zod";
import { executeGetAccountBalance } from "./accounts";

// ==========================================
// SCHEMAS
// ==========================================

export const getInvestmentRecommendationsSchema = z.object({
  analysisType: z
    .enum([
      "capacity", // Capacidade de investimento (saldo disponível - despesas pendentes)
      "diversification", // Análise de diversificação da carteira
      "performance", // Análise de performance (melhores e piores ativos)
      "opportunities", // Oportunidades baseadas no mercado
      "full", // Análise completa
    ])
    .optional()
    .default("full")
    .describe("Tipo de análise a ser realizada"),
  portfolioId: z
    .string()
    .optional()
    .describe("ID da carteira para análise. Se não informado, analisa todas."),
});

export const getInvestmentCapacitySchema = z.object({});

// ==========================================
// EXECUTION FUNCTIONS
// ==========================================

/**
 * Calcula a capacidade de investimento do usuário
 * Considera: saldo disponível - despesas pendentes
 */
export async function executeGetInvestmentCapacity(userId: string) {
  // Buscar saldo das contas
  const accountBalances = await executeGetAccountBalance(userId, {});
  const totalBalance = accountBalances.reduce(
    (sum, acc) => sum + acc.currentBalance,
    0
  );

  // Buscar despesas pendentes
  const today = new Date();
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const pendingExpenses = await prisma.transaction.findMany({
    where: {
      userId,
      type: "EXPENSE",
      status: "PENDING",
      dueDate: {
        lte: endOfMonth,
      },
    },
    select: {
      amount: true,
      description: true,
      dueDate: true,
    },
  });

  const totalPendingExpenses = pendingExpenses.reduce(
    (sum, t) => sum + t.amount,
    0
  );

  // Buscar receitas pendentes
  const pendingIncome = await prisma.transaction.findMany({
    where: {
      userId,
      type: "INCOME",
      status: "PENDING",
      dueDate: {
        lte: endOfMonth,
      },
    },
    select: {
      amount: true,
      description: true,
      dueDate: true,
    },
  });

  const totalPendingIncome = pendingIncome.reduce(
    (sum, t) => sum + t.amount,
    0
  );

  // Calcular capacidade de investimento
  const projectedBalance =
    totalBalance + totalPendingIncome - totalPendingExpenses;

  // Reserva de emergência sugerida (20% do saldo atual)
  const emergencyReserve = totalBalance * 0.2;
  const availableForInvestment = Math.max(
    0,
    projectedBalance - emergencyReserve
  );

  return {
    currentBalance: totalBalance,
    pendingExpenses: {
      total: totalPendingExpenses,
      count: pendingExpenses.length,
      items: pendingExpenses.slice(0, 5).map((e) => ({
        description: e.description,
        amount: e.amount,
        dueDate: e.dueDate.toISOString().split("T")[0],
      })),
    },
    pendingIncome: {
      total: totalPendingIncome,
      count: pendingIncome.length,
    },
    projectedBalance,
    suggestedEmergencyReserve: emergencyReserve,
    availableForInvestment,
    formatted: {
      currentBalance: `R$ ${totalBalance.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
      })}`,
      pendingExpenses: `R$ ${totalPendingExpenses.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
      })}`,
      pendingIncome: `R$ ${totalPendingIncome.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
      })}`,
      projectedBalance: `R$ ${projectedBalance.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
      })}`,
      emergencyReserve: `R$ ${emergencyReserve.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
      })}`,
      availableForInvestment: `R$ ${availableForInvestment.toLocaleString(
        "pt-BR",
        { minimumFractionDigits: 2 }
      )}`,
    },
    recommendation:
      availableForInvestment > 0
        ? `Você tem R$ ${availableForInvestment.toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
          })} disponível para investir, considerando uma reserva de emergência de 20%.`
        : "No momento, é recomendável aguardar até ter um saldo mais confortável antes de realizar novos investimentos.",
  };
}

/**
 * Análise completa de investimentos com recomendações
 */
export async function executeGetInvestmentRecommendations(
  userId: string,
  params: z.infer<typeof getInvestmentRecommendationsSchema>
) {
  const { analysisType, portfolioId } = params;

  const result: Record<string, unknown> = {};

  // Buscar portfolios
  const portfolioWhere: Record<string, unknown> = { userId };
  if (portfolioId) portfolioWhere.id = portfolioId;

  const portfolios = await prisma.portfolio.findMany({
    where: portfolioWhere,
    include: {
      investments: {
        include: {
          asset: true,
          transactions: true,
        },
      },
    },
  });

  if (portfolios.length === 0) {
    return {
      success: false,
      error: "Nenhuma carteira de investimentos encontrada.",
      suggestion:
        "Crie sua primeira carteira em Investimentos para começar a receber análises personalizadas.",
    };
  }

  // Coletar todos os símbolos para cotações
  const allSymbols = new Set<string>();
  for (const portfolio of portfolios) {
    for (const inv of portfolio.investments) {
      allSymbols.add(inv.asset.symbol);
    }
  }

  // Buscar cotações
  const assetsToFetch = Array.from(allSymbols).map((symbol) => ({
    symbol,
    type: detectAssetType(symbol),
  }));
  const quotesMap =
    allSymbols.size > 0 ? await getQuotes(assetsToFetch) : new Map();

  // ==========================================
  // ANÁLISE DE CAPACIDADE
  // ==========================================
  if (analysisType === "capacity" || analysisType === "full") {
    result.investmentCapacity = await executeGetInvestmentCapacity(userId);
  }

  // ==========================================
  // ANÁLISE DE DIVERSIFICAÇÃO
  // ==========================================
  if (analysisType === "diversification" || analysisType === "full") {
    const allInvestments: Array<{
      symbol: string;
      name: string;
      type: string;
      currentValue: number;
      percentage: number;
    }> = [];

    let totalValue = 0;

    for (const portfolio of portfolios) {
      for (const inv of portfolio.investments) {
        const quote = quotesMap.get(inv.asset.symbol);
        const currentPrice = quote?.price || inv.averagePrice;
        const currentValue = inv.quantity * currentPrice;
        totalValue += currentValue;
        allInvestments.push({
          symbol: inv.asset.symbol,
          name: inv.asset.name,
          type: inv.asset.type,
          currentValue,
          percentage: 0, // Será calculado depois
        });
      }
    }

    // Calcular percentuais
    for (const inv of allInvestments) {
      inv.percentage =
        totalValue > 0 ? (inv.currentValue / totalValue) * 100 : 0;
    }

    // Agrupar por tipo
    const byType = allInvestments.reduce((acc, inv) => {
      if (!acc[inv.type]) {
        acc[inv.type] = { value: 0, percentage: 0, count: 0 };
      }
      acc[inv.type].value += inv.currentValue;
      acc[inv.type].count++;
      return acc;
    }, {} as Record<string, { value: number; percentage: number; count: number }>);

    for (const type of Object.keys(byType)) {
      byType[type].percentage =
        totalValue > 0 ? (byType[type].value / totalValue) * 100 : 0;
    }

    // Identificar concentração (ativos com mais de 20%)
    const concentration = allInvestments
      .filter((inv) => inv.percentage > 20)
      .sort((a, b) => b.percentage - a.percentage);

    // Sugestões de diversificação
    const diversificationSuggestions: string[] = [];

    if (concentration.length > 0) {
      diversificationSuggestions.push(
        `⚠️ Concentração detectada: ${concentration
          .map((c) => `${c.symbol} (${c.percentage.toFixed(1)}%)`)
          .join(", ")}. Considere redistribuir para reduzir risco.`
      );
    }

    const types = Object.keys(byType);
    if (types.length < 3) {
      diversificationSuggestions.push(
        `💡 Sua carteira tem apenas ${types.length} tipo(s) de ativo. Considere diversificar entre ações, FIIs e criptomoedas.`
      );
    }

    if (!byType["FIXED_INCOME"] && totalValue > 10000) {
      diversificationSuggestions.push(
        "💡 Considere incluir renda fixa para balancear a carteira e ter mais segurança."
      );
    }

    result.diversification = {
      totalValue,
      assetsCount: allInvestments.length,
      byType,
      topPositions: allInvestments
        .sort((a, b) => b.currentValue - a.currentValue)
        .slice(0, 5),
      concentration,
      suggestions: diversificationSuggestions,
      formatted: {
        totalValue: `R$ ${totalValue.toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
        })}`,
      },
    };
  }

  // ==========================================
  // ANÁLISE DE PERFORMANCE
  // ==========================================
  if (analysisType === "performance" || analysisType === "full") {
    const performanceData: Array<{
      symbol: string;
      name: string;
      type: string;
      profitLoss: number;
      profitLossPercent: number;
      totalInvested: number;
      currentValue: number;
    }> = [];

    for (const portfolio of portfolios) {
      for (const inv of portfolio.investments) {
        const quote = quotesMap.get(inv.asset.symbol);
        const currentPrice = quote?.price || inv.averagePrice;
        const currentValue = inv.quantity * currentPrice;
        const { value: profitLoss, percent: profitLossPercent } =
          calculateProfitLoss(inv.quantity, inv.averagePrice, currentPrice);

        performanceData.push({
          symbol: inv.asset.symbol,
          name: inv.asset.name,
          type: inv.asset.type,
          profitLoss,
          profitLossPercent,
          totalInvested: inv.totalInvested,
          currentValue,
        });
      }
    }

    // Ordenar por performance
    const sortedByPerformance = [...performanceData].sort(
      (a, b) => b.profitLossPercent - a.profitLossPercent
    );

    const bestPerformers = sortedByPerformance
      .filter((p) => p.profitLossPercent > 0)
      .slice(0, 3)
      .map((p) => ({
        ...p,
        formatted: {
          profitLoss: `+R$ ${p.profitLoss.toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
          })}`,
          profitLossPercent: `+${p.profitLossPercent.toFixed(2)}%`,
        },
      }));

    const worstPerformers = sortedByPerformance
      .filter((p) => p.profitLossPercent < 0)
      .slice(-3)
      .reverse()
      .map((p) => ({
        ...p,
        formatted: {
          profitLoss: `R$ ${p.profitLoss.toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
          })}`,
          profitLossPercent: `${p.profitLossPercent.toFixed(2)}%`,
        },
      }));

    // Totais gerais
    const totalInvested = performanceData.reduce(
      (sum, p) => sum + p.totalInvested,
      0
    );
    const totalCurrentValue = performanceData.reduce(
      (sum, p) => sum + p.currentValue,
      0
    );
    const totalProfitLoss = totalCurrentValue - totalInvested;
    const totalProfitLossPercent =
      totalInvested > 0 ? (totalProfitLoss / totalInvested) * 100 : 0;

    result.performance = {
      summary: {
        totalInvested,
        currentValue: totalCurrentValue,
        profitLoss: totalProfitLoss,
        profitLossPercent: totalProfitLossPercent,
        status: totalProfitLoss >= 0 ? "🟢 lucro" : "🔴 prejuízo",
        formatted: {
          totalInvested: `R$ ${totalInvested.toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
          })}`,
          currentValue: `R$ ${totalCurrentValue.toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
          })}`,
          profitLoss: `${
            totalProfitLoss >= 0 ? "+" : ""
          }R$ ${totalProfitLoss.toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
          })}`,
          profitLossPercent: `${
            totalProfitLoss >= 0 ? "+" : ""
          }${totalProfitLossPercent.toFixed(2)}%`,
        },
      },
      bestPerformers,
      worstPerformers,
    };
  }

  // ==========================================
  // OPORTUNIDADES (baseado no mercado)
  // ==========================================
  if (analysisType === "opportunities" || analysisType === "full") {
    // Identificar ativos em queda que podem ser oportunidades
    const opportunities: string[] = [];

    for (const portfolio of portfolios) {
      for (const inv of portfolio.investments) {
        const quote = quotesMap.get(inv.asset.symbol);
        if (quote && quote.changePercent < -3) {
          opportunities.push(
            `📉 ${inv.asset.symbol} caiu ${quote.changePercent.toFixed(
              2
            )}% hoje. Pode ser uma oportunidade de compra se você acredita no ativo.`
          );
        }
      }
    }

    // Verificar se há capacidade de investimento
    const capacity = await executeGetInvestmentCapacity(userId);
    if (capacity.availableForInvestment > 0) {
      opportunities.push(
        `💰 Você tem R$ ${capacity.availableForInvestment.toLocaleString(
          "pt-BR",
          { minimumFractionDigits: 2 }
        )} disponível para investir.`
      );
    }

    result.opportunities = {
      suggestions:
        opportunities.length > 0
          ? opportunities
          : ["Nenhuma oportunidade identificada no momento."],
      disclaimer:
        "⚠️ Estas são apenas observações baseadas em dados. Não são recomendações de investimento. Sempre faça sua própria análise.",
    };
  }

  return {
    success: true,
    analysisType,
    generatedAt: new Date().toISOString(),
    ...result,
  };
}
