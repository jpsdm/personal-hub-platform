import { prisma } from "@/lib/db";
import { calculateAveragePrice } from "@/modules/finance/lib/market-api";
import { NextRequest, NextResponse } from "next/server";

// GET /api/investments - List investments
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const portfolioId = searchParams.get("portfolioId");

    if (!portfolioId) {
      return NextResponse.json(
        { error: "portfolioId is required" },
        { status: 400 }
      );
    }

    const investments = await prisma.investment.findMany({
      where: { portfolioId },
      include: {
        asset: true,
        transactions: {
          orderBy: { date: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(investments);
  } catch (error) {
    console.error("Error fetching investments:", error);
    return NextResponse.json(
      { error: "Failed to fetch investments" },
      { status: 500 }
    );
  }
}

// POST /api/investments - Add investment (buy)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      portfolioId,
      assetId,
      quantity,
      price,
      fees = 0,
      date,
      notes,
    } = body;

    if (!portfolioId || !assetId || !quantity || !price) {
      return NextResponse.json(
        { error: "portfolioId, assetId, quantity, and price are required" },
        { status: 400 }
      );
    }

    // Check if investment already exists for this asset in portfolio
    let investment = await prisma.investment.findUnique({
      where: {
        portfolioId_assetId: {
          portfolioId,
          assetId,
        },
      },
    });

    const totalValue = quantity * price;
    const transactionDate = date ? new Date(date) : new Date();

    if (investment) {
      // Update existing investment
      const newAveragePrice = calculateAveragePrice(
        investment.quantity,
        investment.averagePrice,
        quantity,
        price
      );

      investment = await prisma.investment.update({
        where: { id: investment.id },
        data: {
          quantity: investment.quantity + quantity,
          averagePrice: newAveragePrice,
          totalInvested: investment.totalInvested + totalValue,
          notes: notes || investment.notes,
        },
        include: {
          asset: true,
        },
      });

      // Create transaction record
      await prisma.investmentTransaction.create({
        data: {
          investmentId: investment.id,
          type: "BUY",
          quantity,
          price,
          totalValue,
          fees,
          date: transactionDate,
          notes,
        },
      });
    } else {
      // Create new investment
      investment = await prisma.investment.create({
        data: {
          portfolioId,
          assetId,
          quantity,
          averagePrice: price,
          totalInvested: totalValue,
          notes,
          transactions: {
            create: {
              type: "BUY",
              quantity,
              price,
              totalValue,
              fees,
              date: transactionDate,
              notes,
            },
          },
        },
        include: {
          asset: true,
          transactions: true,
        },
      });
    }

    return NextResponse.json(investment, { status: 201 });
  } catch (error) {
    console.error("Error creating investment:", error);
    return NextResponse.json(
      { error: "Failed to create investment" },
      { status: 500 }
    );
  }
}
