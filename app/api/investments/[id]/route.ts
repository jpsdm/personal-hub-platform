import { prisma } from "@/lib/db";
import { calculateAveragePrice } from "@/modules/finance/lib/market-api";
import { NextRequest, NextResponse } from "next/server";

// GET /api/investments/[id] - Get investment details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const investment = await prisma.investment.findUnique({
      where: { id },
      include: {
        asset: true,
        portfolio: true,
        transactions: {
          orderBy: { date: "desc" },
        },
      },
    });

    if (!investment) {
      return NextResponse.json(
        { error: "Investment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(investment);
  } catch (error) {
    console.error("Error fetching investment:", error);
    return NextResponse.json(
      { error: "Failed to fetch investment" },
      { status: 500 }
    );
  }
}

// PUT /api/investments/[id] - Update investment (notes only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { notes } = body;

    const investment = await prisma.investment.update({
      where: { id },
      data: { notes },
      include: {
        asset: true,
      },
    });

    return NextResponse.json(investment);
  } catch (error) {
    console.error("Error updating investment:", error);
    return NextResponse.json(
      { error: "Failed to update investment" },
      { status: 500 }
    );
  }
}

// DELETE /api/investments/[id] - Delete investment and all transactions
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.investment.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting investment:", error);
    return NextResponse.json(
      { error: "Failed to delete investment" },
      { status: 500 }
    );
  }
}

// POST /api/investments/[id]/transaction - Add transaction to investment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { type, quantity, price, fees = 0, date, notes } = body;

    if (!type || !quantity || !price) {
      return NextResponse.json(
        { error: "type, quantity, and price are required" },
        { status: 400 }
      );
    }

    const investment = await prisma.investment.findUnique({
      where: { id },
    });

    if (!investment) {
      return NextResponse.json(
        { error: "Investment not found" },
        { status: 404 }
      );
    }

    const totalValue = quantity * price;
    const transactionDate = date ? new Date(date) : new Date();

    // Create transaction
    const transaction = await prisma.investmentTransaction.create({
      data: {
        investmentId: id,
        type,
        quantity,
        price,
        totalValue,
        fees,
        date: transactionDate,
        notes,
      },
    });

    // Update investment based on transaction type
    let updatedInvestment;

    if (type === "BUY") {
      const newAveragePrice = calculateAveragePrice(
        investment.quantity,
        investment.averagePrice,
        quantity,
        price
      );

      updatedInvestment = await prisma.investment.update({
        where: { id },
        data: {
          quantity: investment.quantity + quantity,
          averagePrice: newAveragePrice,
          totalInvested: investment.totalInvested + totalValue,
        },
        include: { asset: true },
      });
    } else if (type === "SELL") {
      const newQuantity = investment.quantity - quantity;

      if (newQuantity < 0) {
        // Rollback transaction
        await prisma.investmentTransaction.delete({
          where: { id: transaction.id },
        });

        return NextResponse.json(
          { error: "Cannot sell more than you own" },
          { status: 400 }
        );
      }

      // Calculate realized profit/loss
      const costBasis = quantity * investment.averagePrice;
      const saleValue = totalValue;
      const realizedPL = saleValue - costBasis;

      updatedInvestment = await prisma.investment.update({
        where: { id },
        data: {
          quantity: newQuantity,
          // Keep average price the same for remaining shares
          totalInvested: investment.totalInvested - costBasis,
        },
        include: { asset: true },
      });
    } else if (type === "DIVIDEND") {
      // Dividends don't change quantity or average price
      updatedInvestment = await prisma.investment.findUnique({
        where: { id },
        include: { asset: true },
      });
    } else if (type === "SPLIT" || type === "BONUS") {
      // For splits/bonuses, quantity increases but average price decreases proportionally
      const newQuantity = investment.quantity + quantity;
      const newAveragePrice = investment.totalInvested / newQuantity;

      updatedInvestment = await prisma.investment.update({
        where: { id },
        data: {
          quantity: newQuantity,
          averagePrice: newAveragePrice,
        },
        include: { asset: true },
      });
    }

    return NextResponse.json(
      {
        transaction,
        investment: updatedInvestment,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating transaction:", error);
    return NextResponse.json(
      { error: "Failed to create transaction" },
      { status: 500 }
    );
  }
}
