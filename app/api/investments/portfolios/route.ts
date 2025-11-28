import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// GET /api/investments/portfolios - List portfolios
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

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

    return NextResponse.json(portfolios);
  } catch (error) {
    console.error("Error fetching portfolios:", error);
    return NextResponse.json(
      { error: "Failed to fetch portfolios" },
      { status: 500 }
    );
  }
}

// POST /api/investments/portfolios - Create portfolio
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, name, description, color, currency, isDefault } = body;

    if (!userId || !name) {
      return NextResponse.json(
        { error: "userId and name are required" },
        { status: 400 }
      );
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await prisma.portfolio.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const portfolio = await prisma.portfolio.create({
      data: {
        userId,
        name,
        description,
        color: color || "#3B82F6",
        currency: currency || "BRL",
        isDefault: isDefault || false,
      },
      include: {
        investments: {
          include: {
            asset: true,
          },
        },
      },
    });

    return NextResponse.json(portfolio, { status: 201 });
  } catch (error) {
    console.error("Error creating portfolio:", error);
    return NextResponse.json(
      { error: "Failed to create portfolio" },
      { status: 500 }
    );
  }
}
