import { prisma } from "@/lib/db";
import { z } from "zod";

// ==========================================
// SCHEMAS
// ==========================================

export const getInvestmentPortfoliosSchema = z.object({});

export const getInvestmentSummarySchema = z.object({
  portfolioId: z
    .string()
    .optional()
    .describe(
      "ID da carteira específica. Se não informado, retorna resumo de todas as carteiras."
    ),
});

export const getInvestmentPositionsSchema = z.object({
  portfolioId: z
    .string()
    .optional()
    .describe(
      "ID da carteira. Se não informado, retorna posições de todas as carteiras."
    ),
  assetType: z
    .enum(["STOCK", "FII", "CRYPTO", "ETF", "FIXED_INCOME", "FUND"])
    .optional()
    .describe("Filtrar por tipo de ativo"),
  symbol: z
    .string()
    .optional()
    .describe("Filtrar por símbolo específico (ex: PETR4, BTC, HGLG11)"),
});

export const getInvestmentTransactionsSchema = z.object({
  portfolioId: z.string().optional().describe("ID da carteira"),
  symbol: z.string().optional().describe("Símbolo do ativo"),
  type: z
    .enum(["BUY", "SELL", "DIVIDEND", "SPLIT", "BONUS"])
    .optional()
    .describe("Tipo de operação"),
  startDate: z.string().optional().describe("Data inicial (YYYY-MM-DD)"),
  endDate: z.string().optional().describe("Data final (YYYY-MM-DD)"),
  limit: z.number().optional().default(50).describe("Limite de resultados"),
});

// ==========================================
// EXECUTION FUNCTIONS
// ==========================================

/**
 * Lista todas as carteiras de investimento do usuário
 */
export async function executeGetInvestmentPortfolios(userId: string) {
  const portfolios = await prisma.portfolio.findMany({
    where: { userId },
    include: {
      investments: {
        include: {
          asset: true,
        },
      },
    },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });

  return portfolios.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    color: p.color,
    currency: p.currency,
    isDefault: p.isDefault,
    assetsCount: p.investments.length,
    assetsList: p.investments.map((inv) => ({
      symbol: inv.asset.symbol,
      name: inv.asset.name,
      type: inv.asset.type,
    })),
  }));
}

/**
 * Retorna resumo financeiro das carteiras (sem cotações em tempo real)
 * Para cotações atualizadas, use getAssetQuote ou getMultipleQuotes
 */
export async function executeGetInvestmentSummary(
  userId: string,
  params: z.infer<typeof getInvestmentSummarySchema>
) {
  const { portfolioId } = params;

  const where: Record<string, unknown> = { userId };
  if (portfolioId) where.id = portfolioId;

  const portfolios = await prisma.portfolio.findMany({
    where,
    include: {
      investments: {
        include: {
          asset: true,
          transactions: {
            orderBy: { date: "desc" },
          },
        },
      },
    },
  });

  const summaries = portfolios.map((portfolio) => {
    let totalInvested = 0;
    let totalDividends = 0;

    const positions = portfolio.investments.map((inv) => {
      totalInvested += inv.totalInvested;

      // Calcular dividendos recebidos
      const dividends = inv.transactions
        .filter((t) => t.type === "DIVIDEND")
        .reduce((sum, t) => sum + t.totalValue, 0);
      totalDividends += dividends;

      // Calcular quantidade de compras e vendas
      const buyCount = inv.transactions.filter((t) => t.type === "BUY").length;
      const sellCount = inv.transactions.filter(
        (t) => t.type === "SELL"
      ).length;

      return {
        symbol: inv.asset.symbol,
        name: inv.asset.name,
        type: inv.asset.type,
        quantity: inv.quantity,
        averagePrice: inv.averagePrice,
        totalInvested: inv.totalInvested,
        dividendsReceived: dividends,
        transactionsCount: {
          buys: buyCount,
          sells: sellCount,
          dividends: inv.transactions.filter((t) => t.type === "DIVIDEND")
            .length,
        },
      };
    });

    // Agrupar por tipo de ativo
    const allocationByType = positions.reduce((acc, pos) => {
      const type = pos.type;
      if (!acc[type]) {
        acc[type] = { count: 0, totalInvested: 0 };
      }
      acc[type].count++;
      acc[type].totalInvested += pos.totalInvested;
      return acc;
    }, {} as Record<string, { count: number; totalInvested: number }>);

    return {
      portfolioId: portfolio.id,
      portfolioName: portfolio.name,
      currency: portfolio.currency,
      totalInvested,
      totalDividends,
      positionsCount: positions.length,
      positions,
      allocationByType,
      note: "Para cotações em tempo real e cálculo de lucro/prejuízo, use getAssetQuote ou getMultipleQuotes",
    };
  });

  return {
    portfoliosCount: summaries.length,
    totalInvestedAllPortfolios: summaries.reduce(
      (sum, s) => sum + s.totalInvested,
      0
    ),
    totalDividendsAllPortfolios: summaries.reduce(
      (sum, s) => sum + s.totalDividends,
      0
    ),
    summaries,
  };
}

/**
 * Lista posições/investimentos com detalhes
 */
export async function executeGetInvestmentPositions(
  userId: string,
  params: z.infer<typeof getInvestmentPositionsSchema>
) {
  const { portfolioId, assetType, symbol } = params;

  // Primeiro buscar portfolios do usuário
  const portfolioWhere: Record<string, unknown> = { userId };
  if (portfolioId) portfolioWhere.id = portfolioId;

  const portfolios = await prisma.portfolio.findMany({
    where: portfolioWhere,
    select: { id: true, name: true },
  });

  const portfolioIds = portfolios.map((p) => p.id);

  // Construir where para investments
  const investmentWhere: Record<string, unknown> = {
    portfolioId: { in: portfolioIds },
  };

  // Filtrar por tipo ou símbolo no asset
  const assetWhere: Record<string, unknown> = {};
  if (assetType) assetWhere.type = assetType;
  if (symbol) assetWhere.symbol = symbol.toUpperCase();

  const investments = await prisma.investment.findMany({
    where: {
      ...investmentWhere,
      asset: Object.keys(assetWhere).length > 0 ? assetWhere : undefined,
    },
    include: {
      asset: true,
      portfolio: {
        select: { id: true, name: true, currency: true },
      },
      transactions: {
        orderBy: { date: "desc" },
        take: 5, // Últimas 5 transações de cada
      },
    },
    orderBy: { totalInvested: "desc" },
  });

  return investments.map((inv) => ({
    id: inv.id,
    portfolio: {
      id: inv.portfolio.id,
      name: inv.portfolio.name,
      currency: inv.portfolio.currency,
    },
    asset: {
      symbol: inv.asset.symbol,
      name: inv.asset.name,
      type: inv.asset.type,
      sector: inv.asset.sector,
      exchange: inv.asset.exchange,
    },
    quantity: inv.quantity,
    averagePrice: inv.averagePrice,
    totalInvested: inv.totalInvested,
    notes: inv.notes,
    recentTransactions: inv.transactions.map((t) => ({
      type: t.type,
      quantity: t.quantity,
      price: t.price,
      totalValue: t.totalValue,
      fees: t.fees,
      date: t.date.toISOString().split("T")[0],
    })),
  }));
}

/**
 * Histórico de transações de investimentos (compras, vendas, dividendos)
 */
export async function executeGetInvestmentTransactions(
  userId: string,
  params: z.infer<typeof getInvestmentTransactionsSchema>
) {
  const { portfolioId, symbol, type, startDate, endDate, limit } = params;

  // Primeiro buscar portfolios do usuário
  const portfolioWhere: Record<string, unknown> = { userId };
  if (portfolioId) portfolioWhere.id = portfolioId;

  const portfolios = await prisma.portfolio.findMany({
    where: portfolioWhere,
    select: { id: true },
  });

  const portfolioIds = portfolios.map((p) => p.id);

  // Buscar investments nesses portfolios
  const investmentWhere: Record<string, unknown> = {
    portfolioId: { in: portfolioIds },
  };

  if (symbol) {
    investmentWhere.asset = { symbol: symbol.toUpperCase() };
  }

  const investments = await prisma.investment.findMany({
    where: investmentWhere,
    select: { id: true, asset: { select: { symbol: true, name: true } } },
  });

  const investmentIds = investments.map((i) => i.id);
  const investmentMap = new Map(investments.map((i) => [i.id, i.asset]));

  // Construir where para transactions
  const transactionWhere: Record<string, unknown> = {
    investmentId: { in: investmentIds },
  };

  if (type) transactionWhere.type = type;

  if (startDate || endDate) {
    transactionWhere.date = {};
    if (startDate)
      (transactionWhere.date as Record<string, Date>).gte = new Date(startDate);
    if (endDate)
      (transactionWhere.date as Record<string, Date>).lte = new Date(endDate);
  }

  const transactions = await prisma.investmentTransaction.findMany({
    where: transactionWhere,
    include: {
      investment: {
        include: {
          asset: true,
          portfolio: { select: { name: true } },
        },
      },
    },
    orderBy: { date: "desc" },
    take: limit,
  });

  // Calcular totais por tipo
  const totals = transactions.reduce(
    (acc, t) => {
      if (t.type === "BUY") {
        acc.totalBought += t.totalValue;
        acc.buyCount++;
      } else if (t.type === "SELL") {
        acc.totalSold += t.totalValue;
        acc.sellCount++;
      } else if (t.type === "DIVIDEND") {
        acc.totalDividends += t.totalValue;
        acc.dividendCount++;
      }
      acc.totalFees += t.fees;
      return acc;
    },
    {
      totalBought: 0,
      totalSold: 0,
      totalDividends: 0,
      totalFees: 0,
      buyCount: 0,
      sellCount: 0,
      dividendCount: 0,
    }
  );

  return {
    transactionsCount: transactions.length,
    totals,
    transactions: transactions.map((t) => ({
      id: t.id,
      type: t.type,
      asset: {
        symbol: t.investment.asset.symbol,
        name: t.investment.asset.name,
      },
      portfolio: t.investment.portfolio.name,
      quantity: t.quantity,
      price: t.price,
      totalValue: t.totalValue,
      fees: t.fees,
      date: t.date.toISOString().split("T")[0],
      notes: t.notes,
    })),
  };
}
