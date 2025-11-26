import { prisma } from "@/lib/db";
import { z } from "zod";

// Schema para parâmetros de tags
export const getTagsSchema = z.object({});

export const getTransactionsByTagSchema = z.object({
  tagId: z.string().optional().describe("ID da tag específica"),
  tagName: z.string().optional().describe("Nome da tag para filtrar"),
  startDate: z
    .string()
    .optional()
    .describe("Data inicial no formato YYYY-MM-DD"),
  endDate: z.string().optional().describe("Data final no formato YYYY-MM-DD"),
});

// Funções de execução
export async function executeGetTags(userId: string) {
  const tags = await prisma.tag.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      _count: {
        select: { transactions: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return tags.map((t) => ({
    id: t.id,
    name: t.name,
    transactionCount: t._count.transactions,
  }));
}

export async function executeGetTransactionsByTag(
  userId: string,
  params: z.infer<typeof getTransactionsByTagSchema>
) {
  const { tagId, tagName, startDate, endDate } = params;

  // Se tiver tagName, buscar o ID
  let resolvedTagId = tagId;
  if (!resolvedTagId && tagName) {
    const tag = await prisma.tag.findFirst({
      where: {
        userId,
        name: { contains: tagName, mode: "insensitive" },
      },
    });
    resolvedTagId = tag?.id;
  }

  if (!resolvedTagId) {
    return { error: "Tag não encontrada", transactions: [] };
  }

  const where: Record<string, unknown> = {
    userId,
    tags: {
      some: { tagId: resolvedTagId },
    },
  };

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

  const transactions = await prisma.transaction.findMany({
    where,
    include: {
      category: { select: { name: true } },
      account: { select: { name: true } },
      tags: { include: { tag: { select: { name: true } } } },
    },
    orderBy: { dueDate: "desc" },
    take: 50,
  });

  const tag = await prisma.tag.findUnique({
    where: { id: resolvedTagId },
    select: { name: true },
  });

  const totalAmount = transactions.reduce((sum, t) => {
    return t.type === "EXPENSE" ? sum - t.amount : sum + t.amount;
  }, 0);

  return {
    tagName: tag?.name,
    transactionCount: transactions.length,
    totalAmount,
    transactions: transactions.map((t) => ({
      id: t.id,
      description: t.description,
      amount: t.amount,
      type: t.type,
      status: t.status,
      dueDate: t.dueDate.toISOString().split("T")[0],
      category: t.category.name,
      account: t.account.name,
    })),
  };
}
