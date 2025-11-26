import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/user-session";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");
    const year = searchParams.get("year");

    const currentMonth = month
      ? Number.parseInt(month)
      : new Date().getMonth() + 1;
    const currentYear = year ? Number.parseInt(year) : new Date().getFullYear();

    const startDate = new Date(currentYear, currentMonth - 1, 1);
    const endDate = new Date(currentYear, currentMonth, 0, 23, 59, 59);

    const transactions = await prisma.transaction
      .findMany({
        where: {
          userId,
          dueDate: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          category: true,
        },
      })
      .catch((error) => {
        console.error("Error fetching transactions:", error);
        return [];
      });

    const income = transactions
      .filter((t) => t.type === "INCOME" && t.status === "PAID")
      .reduce((sum, t) => sum + t.amount, 0);

    const expenses = transactions
      .filter((t) => t.type === "EXPENSE" && t.status === "PAID")
      .reduce((sum, t) => sum + t.amount, 0);

    // Buscar transações do mês anterior para comparação
    const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
    const prevStartDate = new Date(prevYear, prevMonth - 1, 1);
    const prevEndDate = new Date(prevYear, prevMonth, 0, 23, 59, 59);

    const prevTransactions = await prisma.transaction
      .findMany({
        where: {
          userId,
          dueDate: {
            gte: prevStartDate,
            lte: prevEndDate,
          },
        },
      })
      .catch(() => []);

    const prevIncome = prevTransactions
      .filter((t) => t.type === "INCOME" && t.status === "PAID")
      .reduce((sum, t) => sum + t.amount, 0);

    const prevExpenses = prevTransactions
      .filter((t) => t.type === "EXPENSE" && t.status === "PAID")
      .reduce((sum, t) => sum + t.amount, 0);

    const prevBalance = prevIncome - prevExpenses;

    const accounts = await prisma.account
      .findMany({
        where: { userId },
      })
      .catch((error) => {
        console.error("Error fetching accounts:", error);
        return [];
      });

    let totalBalance = 0;
    for (const account of accounts) {
      const accountTransactions = await prisma.transaction
        .findMany({
          where: {
            accountId: account.id,
            status: "PAID",
          },
        })
        .catch(() => []);

      const balance =
        account.initialBalance +
        accountTransactions.reduce((sum, t) => {
          return sum + (t.type === "INCOME" ? t.amount : -t.amount);
        }, 0);

      totalBalance += balance;
    }

    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentYear, currentMonth - 1 - i, 1);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(
        date.getFullYear(),
        date.getMonth() + 1,
        0,
        23,
        59,
        59
      );

      const monthTransactions = await prisma.transaction
        .findMany({
          where: {
            userId,
            status: "PAID",
            dueDate: {
              gte: monthStart,
              lte: monthEnd,
            },
          },
        })
        .catch(() => []);

      const monthIncome = monthTransactions
        .filter((t) => t.type === "INCOME")
        .reduce((sum, t) => sum + t.amount, 0);

      const monthExpenses = monthTransactions
        .filter((t) => t.type === "EXPENSE")
        .reduce((sum, t) => sum + t.amount, 0);

      monthlyData.push({
        month: date.toLocaleDateString("pt-BR", { month: "short" }),
        receitas: monthIncome,
        despesas: monthExpenses,
      });
    }

    const expensesByCategory = transactions
      .filter((t) => t.type === "EXPENSE" && t.status === "PAID")
      .reduce((acc, t) => {
        const categoryName = t.category?.name || "Sem Categoria";
        const data = {
          value: (acc[categoryName]?.value || 0) + t.amount,
          color: t.category?.color || "#8884d8",
        };
        acc[categoryName] = data;
        return acc;
      }, {} as Record<string, any>);

    const categoryData = Object.entries(expensesByCategory).map(
      ([name, value], index) => ({
        name,
        value: value.value,
        fill: value.color,
      })
    );

    // Calcular tendências (variação percentual em relação ao mês anterior)
    const calculateTrend = (current: number, previous: number) => {
      if (previous === 0) {
        return current > 0
          ? { trend: "up" as const, value: 100 }
          : { trend: "neutral" as const, value: 0 };
      }
      const percentChange = ((current - previous) / previous) * 100;
      return {
        trend: percentChange >= 0 ? ("up" as const) : ("down" as const),
        value: Math.abs(percentChange),
      };
    };

    const incomeTrend = calculateTrend(income, prevIncome);
    const expensesTrend = calculateTrend(expenses, prevExpenses);
    const balanceTrend = calculateTrend(income - expenses, prevBalance);

    // Para o saldo total, calcular a variação do mês
    const balanceChange = income - expenses;
    const balanceChangeTrend = {
      trend: balanceChange >= 0 ? ("up" as const) : ("down" as const),
      value:
        totalBalance > 0 ? Math.abs((balanceChange / totalBalance) * 100) : 0,
    };

    const response = {
      totalBalance,
      income,
      expenses,
      balance: income - expenses,
      monthlyData,
      categoryData,
      trends: {
        totalBalance: balanceChangeTrend,
        income: incomeTrend,
        expenses: expensesTrend,
        balance: balanceTrend,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return NextResponse.json({
      totalBalance: 0,
      income: 0,
      expenses: 0,
      balance: 0,
      monthlyData: [],
      categoryData: [],
    });
  }
}
