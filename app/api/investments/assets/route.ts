import { prisma } from "@/lib/db";
import { detectAssetType } from "@/modules/finance/lib/market-api";
import { NextRequest, NextResponse } from "next/server";

// GET /api/investments/assets - List/search assets
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const type = searchParams.get("type");

    const where: any = {};

    if (search) {
      where.OR = [
        { symbol: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
      ];
    }

    if (type) {
      where.type = type;
    }

    const assets = await prisma.asset.findMany({
      where,
      orderBy: { symbol: "asc" },
      take: 50,
    });

    return NextResponse.json(assets);
  } catch (error) {
    console.error("Error fetching assets:", error);
    return NextResponse.json(
      { error: "Failed to fetch assets" },
      { status: 500 }
    );
  }
}

// POST /api/investments/assets - Create or find asset
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbol, name, type, exchange, sector, currency } = body;

    if (!symbol) {
      return NextResponse.json(
        { error: "symbol is required" },
        { status: 400 }
      );
    }

    const upperSymbol = symbol.toUpperCase();

    // Try to find existing asset
    let asset = await prisma.asset.findUnique({
      where: { symbol: upperSymbol },
    });

    if (!asset) {
      // Create new asset
      const detectedType = type || detectAssetType(upperSymbol);

      asset = await prisma.asset.create({
        data: {
          symbol: upperSymbol,
          name: name || upperSymbol,
          type: detectedType,
          exchange: exchange || (detectedType === "CRYPTO" ? "BINANCE" : "B3"),
          sector,
          currency: currency || "BRL",
        },
      });
    }

    return NextResponse.json(asset, { status: 201 });
  } catch (error) {
    console.error("Error creating asset:", error);
    return NextResponse.json(
      { error: "Failed to create asset" },
      { status: 500 }
    );
  }
}
