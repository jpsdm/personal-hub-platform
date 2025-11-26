import { prisma } from "@/lib/db";
import { z } from "zod";

// Schema para parâmetros de contas
export const getAccountsSchema = z.object({});

export const getAccountBalanceSchema = z.object({
  accountId: z.string().optional().describe("ID da conta específica"),
});

// Funções de execução
export async function executeGetAccounts(userId: string) {
  const accounts = await prisma.account.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      initialBalance: true,
      isDefault: true,
    },
    orderBy: { name: "asc" },
  });

  return accounts.map((a) => ({
    id: a.id,
    name: a.name,
    initialBalance: a.initialBalance,
    isDefault: a.isDefault,
  }));
}

export async function executeGetAccountBalance(
  userId: string,
  params: z.infer<typeof getAccountBalanceSchema>
) {
  const { accountId } = params;

  const where: Record<string, unknown> = { userId };
  if (accountId) where.accountId = accountId;

  // Buscar todas as transações pagas
  const transactions = await prisma.transaction.findMany({
    where: {
      ...where,
      status: "PAID",
    },
    select: {
      accountId: true,
      type: true,
      amount: true,
    },
  });

  // Buscar contas
  const accountWhere: Record<string, unknown> = { userId };
  if (accountId) accountWhere.id = accountId;

  const accounts = await prisma.account.findMany({
    where: accountWhere,
    select: {
      id: true,
      name: true,
      initialBalance: true,
    },
  });

  // Calcular saldo de cada conta
  const balances = accounts.map((account) => {
    const accountTransactions = transactions.filter(
      (t) => t.accountId === account.id
    );

    const income = accountTransactions
      .filter((t) => t.type === "INCOME")
      .reduce((sum, t) => sum + t.amount, 0);

    const expense = accountTransactions
      .filter((t) => t.type === "EXPENSE")
      .reduce((sum, t) => sum + t.amount, 0);

    const currentBalance = account.initialBalance + income - expense;

    return {
      accountId: account.id,
      accountName: account.name,
      initialBalance: account.initialBalance,
      totalIncome: income,
      totalExpense: expense,
      currentBalance,
    };
  });

  return balances;
}
