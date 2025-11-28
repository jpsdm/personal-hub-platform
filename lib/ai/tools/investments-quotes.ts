import { prisma } from "@/lib/db";
import {
  calculateProfitLoss,
  detectAssetType,
  getQuote,
  getQuotes,
} from "@/modules/finance/lib/market-api";
import { z } from "zod";

// ==========================================
// SCHEMAS
// ==========================================

export const getAssetQuoteSchema = z.object({
  symbol: z
    .string()
    .describe(
      "Símbolo do ativo para consultar cotação. Exemplos: PETR4, VALE3, HGLG11, BTC, ETH, IVVB11"
    ),
});

export const getMultipleQuotesSchema = z.object({
  symbols: z
    .array(z.string())
    .describe(
      "Lista de símbolos para consultar cotações. Máximo 20 ativos por vez."
    ),
});

export const getPortfolioQuotesSchema = z.object({
  portfolioId: z
    .string()
    .optional()
    .describe(
      "ID da carteira. Se não informado, busca cotações de todos os ativos de todas as carteiras."
    ),
});

// ==========================================
// EXECUTION FUNCTIONS
// ==========================================

/**
 * Consulta cotação em tempo real de um ativo específico
 */
export async function executeGetAssetQuote(
  params: z.infer<typeof getAssetQuoteSchema>
) {
  const { symbol } = params;

  try {
    const quote = await getQuote(symbol.toUpperCase());

    if (!quote) {
      return {
        success: false,
        error: `Não foi possível obter cotação para ${symbol}. Verifique se o símbolo está correto.`,
        suggestions: [
          "Para ações brasileiras: PETR4, VALE3, ITUB4, BBDC4",
          "Para FIIs: HGLG11, XPLG11, MXRF11",
          "Para criptomoedas: BTC, ETH, SOL",
          "Para ETFs: IVVB11, BOVA11",
        ],
      };
    }

    const changeDirection = quote.changePercent >= 0 ? "📈" : "📉";
    const changeColor = quote.changePercent >= 0 ? "positivo" : "negativo";

    return {
      success: true,
      symbol: quote.symbol,
      price: quote.price,
      change: quote.change,
      changePercent: quote.changePercent,
      high: quote.high,
      low: quote.low,
      volume: quote.volume,
      previousClose: quote.previousClose,
      updatedAt: quote.updatedAt,
      formatted: {
        price: `R$ ${quote.price.toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
        })}`,
        change: `${
          quote.changePercent >= 0 ? "+" : ""
        }${quote.changePercent.toFixed(2)}%`,
        direction: changeDirection,
        status: changeColor,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Erro ao consultar cotação: ${
        error instanceof Error ? error.message : "Erro desconhecido"
      }`,
    };
  }
}

/**
 * Consulta múltiplas cotações de uma vez
 */
export async function executeGetMultipleQuotes(
  params: z.infer<typeof getMultipleQuotesSchema>
) {
  const { symbols } = params;

  if (symbols.length > 20) {
    return {
      success: false,
      error: "Máximo de 20 ativos por consulta. Divida em múltiplas chamadas.",
    };
  }

  try {
    // Converter para o formato esperado pela API
    const assetsToFetch = symbols.map((s) => ({
      symbol: s.toUpperCase(),
      type: detectAssetType(s),
    }));

    const quotesMap = await getQuotes(assetsToFetch);

    const results = Array.from(quotesMap.entries()).map(([symbol, quote]) => ({
      symbol,
      price: quote.price,
      changePercent: quote.changePercent,
      formatted: {
        price: `R$ ${quote.price.toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
        })}`,
        change: `${
          quote.changePercent >= 0 ? "+" : ""
        }${quote.changePercent.toFixed(2)}%`,
        direction: quote.changePercent >= 0 ? "📈" : "📉",
      },
    }));

    // Identificar quais não retornaram
    const returnedSymbols = new Set(quotesMap.keys());
    const notFound = symbols.filter(
      (s) => !returnedSymbols.has(s.toUpperCase())
    );

    return {
      success: true,
      quotesCount: results.length,
      quotes: results,
      notFound: notFound.length > 0 ? notFound : undefined,
    };
  } catch (error) {
    return {
      success: false,
      error: `Erro ao consultar cotações: ${
        error instanceof Error ? error.message : "Erro desconhecido"
      }`,
    };
  }
}

/**
 * Busca cotações atualizadas de todos os ativos em uma carteira
 * e calcula o valor atual e lucro/prejuízo
 */
export async function executeGetPortfolioQuotes(
  userId: string,
  params: z.infer<typeof getPortfolioQuotesSchema>
) {
  const { portfolioId } = params;

  // Buscar portfolios do usuário
  const portfolioWhere: Record<string, unknown> = { userId };
  if (portfolioId) portfolioWhere.id = portfolioId;

  const portfolios = await prisma.portfolio.findMany({
    where: portfolioWhere,
    include: {
      investments: {
        include: {
          asset: true,
        },
      },
    },
  });

  if (portfolios.length === 0) {
    return {
      success: false,
      error: portfolioId
        ? "Carteira não encontrada"
        : "Nenhuma carteira de investimentos encontrada",
    };
  }

  // Coletar todos os símbolos únicos
  const allSymbols = new Set<string>();
  for (const portfolio of portfolios) {
    for (const inv of portfolio.investments) {
      allSymbols.add(inv.asset.symbol);
    }
  }

  if (allSymbols.size === 0) {
    return {
      success: true,
      message: "Nenhum investimento encontrado nas carteiras",
      portfolios: portfolios.map((p) => ({
        id: p.id,
        name: p.name,
        investments: [],
      })),
    };
  }

  // Buscar cotações - converter símbolos para formato esperado
  const assetsToFetch = Array.from(allSymbols).map((symbol) => ({
    symbol,
    type: detectAssetType(symbol),
  }));
  const quotesMap = await getQuotes(assetsToFetch);

  // Calcular valores para cada portfolio
  const portfolioResults = portfolios.map((portfolio) => {
    let totalInvested = 0;
    let currentValue = 0;

    const investments = portfolio.investments.map((inv) => {
      const quote = quotesMap.get(inv.asset.symbol);
      const currentPrice = quote?.price || inv.averagePrice;
      const positionValue = inv.quantity * currentPrice;
      const { value: profitLoss, percent: profitLossPercent } =
        calculateProfitLoss(inv.quantity, inv.averagePrice, currentPrice);

      totalInvested += inv.totalInvested;
      currentValue += positionValue;

      return {
        symbol: inv.asset.symbol,
        name: inv.asset.name,
        type: inv.asset.type,
        quantity: inv.quantity,
        averagePrice: inv.averagePrice,
        currentPrice,
        totalInvested: inv.totalInvested,
        currentValue: positionValue,
        profitLoss,
        profitLossPercent,
        hasQuote: !!quote,
        quoteChange: quote?.changePercent,
        formatted: {
          averagePrice: `R$ ${inv.averagePrice.toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
          })}`,
          currentPrice: `R$ ${currentPrice.toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
          })}`,
          currentValue: `R$ ${positionValue.toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
          })}`,
          profitLoss: `${
            profitLoss >= 0 ? "+" : ""
          }R$ ${profitLoss.toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
          })}`,
          profitLossPercent: `${
            profitLossPercent >= 0 ? "+" : ""
          }${profitLossPercent.toFixed(2)}%`,
          status: profitLoss >= 0 ? "🟢 lucro" : "🔴 prejuízo",
        },
      };
    });

    const portfolioProfitLoss = currentValue - totalInvested;
    const portfolioProfitLossPercent =
      totalInvested > 0 ? (portfolioProfitLoss / totalInvested) * 100 : 0;

    return {
      id: portfolio.id,
      name: portfolio.name,
      currency: portfolio.currency,
      totalInvested,
      currentValue,
      profitLoss: portfolioProfitLoss,
      profitLossPercent: portfolioProfitLossPercent,
      positionsCount: investments.length,
      investments,
      formatted: {
        totalInvested: `R$ ${totalInvested.toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
        })}`,
        currentValue: `R$ ${currentValue.toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
        })}`,
        profitLoss: `${
          portfolioProfitLoss >= 0 ? "+" : ""
        }R$ ${portfolioProfitLoss.toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
        })}`,
        profitLossPercent: `${
          portfolioProfitLossPercent >= 0 ? "+" : ""
        }${portfolioProfitLossPercent.toFixed(2)}%`,
        status: portfolioProfitLoss >= 0 ? "🟢 lucro" : "🔴 prejuízo",
      },
    };
  });

  // Totais gerais
  const grandTotalInvested = portfolioResults.reduce(
    (sum, p) => sum + p.totalInvested,
    0
  );
  const grandCurrentValue = portfolioResults.reduce(
    (sum, p) => sum + p.currentValue,
    0
  );
  const grandProfitLoss = grandCurrentValue - grandTotalInvested;
  const grandProfitLossPercent =
    grandTotalInvested > 0 ? (grandProfitLoss / grandTotalInvested) * 100 : 0;

  return {
    success: true,
    summary: {
      portfoliosCount: portfolioResults.length,
      totalPositions: portfolioResults.reduce(
        (sum, p) => sum + p.positionsCount,
        0
      ),
      totalInvested: grandTotalInvested,
      currentValue: grandCurrentValue,
      profitLoss: grandProfitLoss,
      profitLossPercent: grandProfitLossPercent,
      formatted: {
        totalInvested: `R$ ${grandTotalInvested.toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
        })}`,
        currentValue: `R$ ${grandCurrentValue.toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
        })}`,
        profitLoss: `${
          grandProfitLoss >= 0 ? "+" : ""
        }R$ ${grandProfitLoss.toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
        })}`,
        profitLossPercent: `${
          grandProfitLossPercent >= 0 ? "+" : ""
        }${grandProfitLossPercent.toFixed(2)}%`,
        status: grandProfitLoss >= 0 ? "🟢 lucro" : "🔴 prejuízo",
      },
    },
    portfolios: portfolioResults,
  };
}
