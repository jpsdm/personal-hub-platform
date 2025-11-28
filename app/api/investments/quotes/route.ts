import { getQuote, getQuotes } from "@/modules/finance/lib/market-api";
import { NextRequest, NextResponse } from "next/server";

// GET /api/investments/quotes - Get market quotes
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbols = searchParams.get("symbols");
    const symbol = searchParams.get("symbol");

    // Single symbol
    if (symbol) {
      const quote = await getQuote(symbol);
      if (!quote) {
        return NextResponse.json(
          { error: `Quote not found for ${symbol}` },
          { status: 404 }
        );
      }
      return NextResponse.json(quote);
    }

    // Multiple symbols
    if (symbols) {
      const symbolList = symbols.split(",").map((s) => ({ symbol: s.trim() }));
      const quotes = await getQuotes(symbolList);

      // Convert Map to object
      const quotesObj: Record<string, any> = {};
      for (const [sym, quote] of quotes) {
        quotesObj[sym] = quote;
      }

      return NextResponse.json(quotesObj);
    }

    return NextResponse.json(
      { error: "symbol or symbols parameter is required" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error fetching quotes:", error);
    return NextResponse.json(
      { error: "Failed to fetch quotes" },
      { status: 500 }
    );
  }
}
