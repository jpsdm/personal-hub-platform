import { prisma } from "@/lib/db";
import { z } from "zod";

// Schema para resumo financeiro
export const getFinancialSummarySchema = z.object({
  startDate: z
    .string()
    .optional()
    .describe("Data inicial no formato YYYY-MM-DD"),
  endDate: z.string().optional().describe("Data final no formato YYYY-MM-DD"),
});

// Função de execução
export async function executeGetFinancialSummary(
  userId: string,
  params: z.infer<typeof getFinancialSummarySchema>
) {
  const { startDate, endDate } = params;

  const where: Record<string, unknown> = { userId };

  if (startDate || endDate) {
    where.dueDate = {};
    if (startDate) {
      const [year, month, day] = startDate.split("-").map(Number);
      (where.dueDate as Record<string, unknown>).gte = new Date(
        Date.UTC(year, month - 1, day, 0, 0, 0, 0)
      );
    }
    if (endDate) {
      const [year, month, day] = endDate.split("-").map(Number);
      (where.dueDate as Record<string, unknown>).lte = new Date(
        Date.UTC(year, month - 1, day, 23, 59, 59, 999)
      );
    }
  }

  // Buscar todas as transações do período
  const transactions = await prisma.transaction.findMany({
    where,
    select: {
      type: true,
      amount: true,
      status: true,
    },
  });

  const totalIncome = transactions
    .filter((t) => t.type === "INCOME")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter((t) => t.type === "EXPENSE")
    .reduce((sum, t) => sum + t.amount, 0);

  const pendingIncome = transactions
    .filter((t) => t.type === "INCOME" && t.status === "PENDING")
    .reduce((sum, t) => sum + t.amount, 0);

  const pendingExpense = transactions
    .filter((t) => t.type === "EXPENSE" && t.status === "PENDING")
    .reduce((sum, t) => sum + t.amount, 0);

  const paidIncome = transactions
    .filter((t) => t.type === "INCOME" && t.status === "PAID")
    .reduce((sum, t) => sum + t.amount, 0);

  const paidExpense = transactions
    .filter((t) => t.type === "EXPENSE" && t.status === "PAID")
    .reduce((sum, t) => sum + t.amount, 0);

  const overdueExpense = transactions
    .filter((t) => t.type === "EXPENSE" && t.status === "OVERDUE")
    .reduce((sum, t) => sum + t.amount, 0);

  return {
    period: {
      startDate: startDate || "início",
      endDate: endDate || "fim",
    },
    totals: {
      income: totalIncome,
      expense: totalExpense,
      balance: totalIncome - totalExpense,
    },
    pending: {
      income: pendingIncome,
      expense: pendingExpense,
    },
    paid: {
      income: paidIncome,
      expense: paidExpense,
      realizedBalance: paidIncome - paidExpense,
    },
    overdue: {
      expense: overdueExpense,
    },
    transactionCount: transactions.length,
  };
}
