import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/user-session";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const accounts = await prisma.account.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    const accountsWithBalance = await Promise.all(
      accounts.map(async (account) => {
        const transactions = await prisma.transaction.findMany({
          where: {
            accountId: account.id,
            status: "PAID",
          },
        });

        const currentBalance =
          account.initialBalance +
          transactions.reduce((sum, t) => {
            return sum + (t.type === "INCOME" ? t.amount : -t.amount);
          }, 0);

        return {
          ...account,
          currentBalance,
        };
      })
    );

    return NextResponse.json(accountsWithBalance);
  } catch (error) {
    console.error("Error fetching accounts:", error);
    return NextResponse.json(
      { error: "Failed to fetch accounts" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, initialBalance } = body;

    const account = await prisma.account.create({
      data: {
        name,
        initialBalance: Number.parseFloat(initialBalance) || 0,
        userId,
        isDefault: false,
      },
    });

    return NextResponse.json(account);
  } catch (error) {
    console.error("Error creating account:", error);
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    );
  }
}
