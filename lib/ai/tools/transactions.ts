import { prisma } from "@/lib/db";
import { z } from "zod";

// Schema para parâmetros de transações
export const getTransactionsSchema = z.object({
  type: z
    .enum(["INCOME", "EXPENSE"])
    .optional()
    .describe("Tipo da transação: INCOME (receita) ou EXPENSE (despesa)"),
  status: z
    .enum(["PENDING", "PAID", "OVERDUE"])
    .optional()
    .describe(
      "Status da transação: PENDING (pendente), PAID (pago), OVERDUE (atrasado)"
    ),
  startDate: z
    .string()
    .optional()
    .describe("Data inicial no formato YYYY-MM-DD"),
  endDate: z
    .string()
    .optional()
    .describe(
      "Data final no formato YYYY-MM-DD (o horário 23:59:59 é adicionado automaticamente)"
    ),
  categoryId: z.string().optional().describe("ID da categoria"),
  accountId: z.string().optional().describe("ID da conta"),
  isFixed: z
    .boolean()
    .optional()
    .describe("Se true, filtra apenas transações fixas"),
  limit: z
    .number()
    .optional()
    .default(50)
    .describe("Limite de resultados por página (máximo 100)"),
  offset: z
    .number()
    .optional()
    .default(0)
    .describe("Número de resultados para pular (para paginação)"),
  groupInstallments: z
    .boolean()
    .optional()
    .default(true)
    .describe(
      "Se true, agrupa parcelas em uma única entrada mostrando o total. Se false, mostra cada parcela individualmente. Use true para visões gerais e false quando o usuário pedir detalhes de cada parcela."
    ),
});

export const getTransactionsByCategorySchema = z.object({
  type: z.enum(["INCOME", "EXPENSE"]).optional().describe("Tipo da transação"),
  startDate: z
    .string()
    .optional()
    .describe("Data inicial no formato YYYY-MM-DD"),
  endDate: z.string().optional().describe("Data final no formato YYYY-MM-DD"),
});

export const getTransactionsByMonthSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE"]).optional().describe("Tipo da transação"),
  year: z.number().optional().describe("Ano para filtrar (ex: 2025)"),
});

// Schema para criar transação
export const createTransactionSchema = z.object({
  type: z
    .enum(["INCOME", "EXPENSE"])
    .describe("Tipo da transação: INCOME (receita) ou EXPENSE (despesa)"),
  description: z
    .string()
    .describe(
      "Descrição da transação (ex: 'Salário', 'Almoço', 'Conta de luz')"
    ),
  amount: z
    .number()
    .positive()
    .describe("Valor da transação (sempre positivo)"),
  categoryName: z
    .string()
    .optional()
    .describe(
      "Nome da categoria (ex: 'Alimentação', 'Transporte', 'Salário'). Se não fornecido, será usado 'Outros'"
    ),
  accountName: z
    .string()
    .optional()
    .describe(
      "Nome da conta/carteira (ex: 'Nubank', 'Banco Inter'). Se não fornecido, usa a conta padrão"
    ),
  dueDate: z
    .string()
    .optional()
    .describe(
      "Data de vencimento no formato YYYY-MM-DD. Se não fornecido, usa a data atual"
    ),
  isPaid: z
    .boolean()
    .optional()
    .default(false)
    .describe("Se a transação já foi paga/recebida"),
  notes: z
    .string()
    .optional()
    .describe("Observações adicionais sobre a transação"),
  tagNames: z
    .array(z.string())
    .optional()
    .describe("Lista de nomes de tags para associar à transação"),
});

export const createMultipleTransactionsSchema = z.object({
  transactions: z
    .array(createTransactionSchema)
    .min(1)
    .max(10)
    .describe("Lista de transações para criar (máximo 10 por vez)"),
});

export const getInstallmentsSchema = z.object({
  type: z
    .enum(["INCOME", "EXPENSE"])
    .optional()
    .describe("Tipo da transação: INCOME (receita) ou EXPENSE (despesa)"),
  status: z
    .enum(["PENDING", "PAID", "OVERDUE"])
    .optional()
    .describe(
      "Status da transação: PENDING (pendente), PAID (pago), OVERDUE (atrasado)"
    ),
  categoryId: z.string().optional().describe("ID da categoria"),
});

// Funções de execução
export async function executeGetTransactions(
  userId: string,
  params: z.infer<typeof getTransactionsSchema>
) {
  const {
    type,
    status,
    startDate,
    endDate,
    categoryId,
    accountId,
    limit,
    offset,
    groupInstallments,
    isFixed,
  } = params;

  // Para o modelo virtual, precisamos buscar:
  // 1. Transações únicas (não fixas, sem parcelas) no período
  // 2. Transações raiz (fixas ou parceladas) que geram ocorrências no período
  // 3. Overrides para o período

  const where: Record<string, unknown> = {
    userId,
    isOverride: false, // Não buscar overrides diretamente, eles são incluídos via expansão
  };

  if (type) where.type = type;
  if (categoryId) where.categoryId = categoryId;
  if (accountId) where.accountId = accountId;
  if (isFixed !== undefined) where.isFixed = isFixed;

  // Filtro de data: buscar transações que podem gerar ocorrências no período
  if (startDate || endDate) {
    let rangeStart: Date;
    let rangeEnd: Date;

    if (startDate) {
      const [year, month, day] = startDate.split("-").map(Number);
      rangeStart = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    } else {
      rangeStart = new Date(Date.UTC(2000, 0, 1, 0, 0, 0, 0));
    }

    if (endDate) {
      const [year, month, day] = endDate.split("-").map(Number);
      rangeEnd = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
    } else {
      rangeEnd = new Date(Date.UTC(2100, 11, 31, 23, 59, 59, 999));
    }

    where.OR = [
      // 1. Transação única dentro do range
      {
        isFixed: false,
        installments: null,
        dueDate: {
          gte: rangeStart,
          lte: rangeEnd,
        },
      },
      // 2. Transação fixa que começou antes ou durante o range
      {
        isFixed: true,
        OR: [{ startDate: { lte: rangeEnd } }, { dueDate: { lte: rangeEnd } }],
      },
      // 3. Transação parcelada que abrange o range
      {
        installments: { gt: 1 },
        AND: [
          {
            OR: [
              { startDate: { lte: rangeEnd } },
              { dueDate: { lte: rangeEnd } },
            ],
          },
          { OR: [{ endDate: { gte: rangeStart } }, { endDate: null }] },
        ],
      },
    ];
  }

  // Contar o total
  const totalCount = await prisma.transaction.count({ where });

  const transactions = await prisma.transaction.findMany({
    where,
    include: {
      category: { select: { name: true, color: true } },
      account: { select: { name: true } },
      tags: { include: { tag: { select: { name: true } } } },
    },
    orderBy: { dueDate: "desc" },
    take: Math.min(limit || 50, 100),
    skip: offset || 0,
  });

  let processedTransactions = transactions;

  // Se groupInstallments é true, agrupar parcelas
  if (groupInstallments) {
    const grouped = new Map<
      string,
      {
        id: string;
        description: string;
        amount: number;
        type: string;
        status: string;
        dueDate: string;
        paidDate: string | null;
        category: string;
        categoryColor: string;
        account: string;
        tags: string[];
        notes: string | null;
        isFixed: boolean;
        installments: number | null;
        currentInstallment: number | null;
        parentTransactionId: string | null;
        totalInstallments?: number;
        totalAmount?: number;
        paidInstallments?: number;
        pendingInstallments?: number;
        startDate?: string;
        endDate?: string;
      }
    >();

    for (const t of transactions) {
      // Transações parceladas: mostrar como grupo
      if (t.installments && t.installments > 1) {
        if (!grouped.has(t.id)) {
          // Buscar overrides para contar parcelas pagas
          const overrides = await prisma.transaction.findMany({
            where: {
              parentTransactionId: t.id,
              isOverride: true,
            },
            select: { status: true },
          });

          const paidFromOverrides = overrides.filter(
            (o) => o.status === "PAID"
          ).length;
          const paidInstallments =
            paidFromOverrides + (t.status === "PAID" ? 1 : 0);
          const cancelledCount = (t.cancelledOccurrences || []).length;
          const effectiveInstallments = t.installments - cancelledCount;

          grouped.set(t.id, {
            id: t.id,
            description: t.description,
            amount: t.amount,
            type: t.type,
            status:
              paidInstallments === effectiveInstallments
                ? "PAID"
                : paidInstallments > 0
                ? "PARTIAL"
                : "PENDING",
            dueDate: (t.startDate || t.dueDate).toISOString().split("T")[0],
            paidDate: t.paidDate?.toISOString().split("T")[0] || null,
            category: t.category.name,
            categoryColor: t.category.color,
            account: t.account.name,
            tags: t.tags.map((tt) => tt.tag.name),
            notes: t.notes,
            isFixed: t.isFixed,
            installments: t.installments,
            currentInstallment: null,
            parentTransactionId: null,
            totalInstallments: t.installments,
            totalAmount: t.amount * t.installments,
            paidInstallments,
            pendingInstallments: effectiveInstallments - paidInstallments,
            startDate: (t.startDate || t.dueDate).toISOString().split("T")[0],
            endDate: t.endDate?.toISOString().split("T")[0] ?? undefined,
          });
        }
      } else {
        // Transação normal ou fixa
        grouped.set(t.id, {
          id: t.id,
          description: t.description,
          amount: t.amount,
          type: t.type,
          status: t.status,
          dueDate: t.dueDate.toISOString().split("T")[0],
          paidDate: t.paidDate?.toISOString().split("T")[0] || null,
          category: t.category.name,
          categoryColor: t.category.color,
          account: t.account.name,
          tags: t.tags.map((tt) => tt.tag.name),
          notes: t.notes,
          isFixed: t.isFixed,
          installments: t.installments,
          currentInstallment: null,
          parentTransactionId: null,
        });
      }
    }

    processedTransactions = Array.from(grouped.values()) as any;
  }

  // Filtrar por status após processamento
  if (status) {
    processedTransactions = processedTransactions.filter((t: any) => {
      const txStatus = typeof t.status === "string" ? t.status : t.status;
      return (
        txStatus === status || (status === "PENDING" && txStatus === "PARTIAL")
      );
    });
  }

  const hasMore = totalCount > (offset || 0) + transactions.length;
  const nextOffset = hasMore ? (offset || 0) + transactions.length : null;

  return {
    transactions: processedTransactions.map((t: any) => {
      const result: any = {
        id: t.id,
        description: t.description,
        amount: t.amount,
        type: t.type,
        status: t.status,
        dueDate: t.dueDate?.toISOString
          ? t.dueDate.toISOString().split("T")[0]
          : t.dueDate,
        paidDate: t.paidDate?.toISOString
          ? t.paidDate.toISOString().split("T")[0]
          : t.paidDate,
        category: typeof t.category === "object" ? t.category.name : t.category,
        categoryColor:
          typeof t.category === "object"
            ? t.category.color
            : t.categoryColor || "#000000",
        account: typeof t.account === "object" ? t.account.name : t.account,
        tags: Array.isArray(t.tags)
          ? t.tags.map((tt: any) =>
              typeof tt === "string" ? tt : tt.tag?.name || tt.name
            )
          : [],
        notes: t.notes,
        isFixed: t.isFixed,
        installments: t.installments,
      };

      if (t.totalInstallments) {
        result.totalInstallments = t.totalInstallments;
        result.totalAmount = t.totalAmount;
        result.paidInstallments = t.paidInstallments || 0;
        result.pendingInstallments = t.pendingInstallments || 0;
        result.startDate = t.startDate;
        result.endDate = t.endDate;
        result.grouped = true;
      }

      return result;
    }),
    pagination: {
      total: totalCount,
      showing: processedTransactions.length,
      offset: offset || 0,
      hasMore,
      nextOffset,
      message: hasMore
        ? `Mostrando ${
            processedTransactions.length
          } de ${totalCount} transações. Há mais ${
            totalCount - (offset || 0) - processedTransactions.length
          } resultados disponíveis.`
        : `Mostrando todas as ${totalCount} transações encontradas.`,
    },
  };
}

export async function executeGetTransactionsByCategory(
  userId: string,
  params: z.infer<typeof getTransactionsByCategorySchema>
) {
  const { type, startDate, endDate } = params;

  const where: Record<string, unknown> = { userId };

  if (type) where.type = type;

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
      category: { select: { id: true, name: true, color: true } },
    },
  });

  const grouped = transactions.reduce(
    (acc, t) => {
      const key = t.category.id;
      if (!acc[key]) {
        acc[key] = {
          category: t.category.name,
          color: t.category.color,
          total: 0,
          count: 0,
          type: t.type,
        };
      }
      acc[key].total += t.amount;
      acc[key].count += 1;
      return acc;
    },
    {} as Record<
      string,
      {
        category: string;
        color: string;
        total: number;
        count: number;
        type: string;
      }
    >
  );

  return Object.values(grouped).sort((a, b) => b.total - a.total);
}

export async function executeGetTransactionsByMonth(
  userId: string,
  params: z.infer<typeof getTransactionsByMonthSchema>
) {
  const { type, year } = params;

  const where: Record<string, unknown> = { userId };

  if (type) where.type = type;

  if (year) {
    where.dueDate = {
      gte: new Date(`${year}-01-01`),
      lte: new Date(`${year}-12-31`),
    };
  }

  const transactions = await prisma.transaction.findMany({
    where,
    select: {
      amount: true,
      type: true,
      dueDate: true,
    },
  });

  const grouped = transactions.reduce((acc, t) => {
    const month = t.dueDate.toISOString().slice(0, 7); // YYYY-MM
    if (!acc[month]) {
      acc[month] = { month, income: 0, expense: 0 };
    }
    if (t.type === "INCOME") {
      acc[month].income += t.amount;
    } else {
      acc[month].expense += t.amount;
    }
    return acc;
  }, {} as Record<string, { month: string; income: number; expense: number }>);

  return Object.values(grouped).sort((a, b) => a.month.localeCompare(b.month));
}

// Função auxiliar para buscar ou criar categoria
async function findOrCreateCategory(
  userId: string,
  categoryName: string,
  type: "INCOME" | "EXPENSE"
) {
  // Buscar categoria existente (do usuário ou padrão)
  let category = await prisma.category.findFirst({
    where: {
      name: {
        equals: categoryName,
        mode: "insensitive",
      },
      type,
      OR: [{ userId }, { userId: null, isDefault: true }],
    },
  });

  // Se não encontrar, criar nova categoria
  if (!category) {
    const colors = {
      INCOME: ["#22c55e", "#10b981", "#059669", "#14b8a6"],
      EXPENSE: ["#ef4444", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4"],
    };
    const colorList = colors[type];
    const randomColor = colorList[Math.floor(Math.random() * colorList.length)];

    category = await prisma.category.create({
      data: {
        name: categoryName,
        type,
        color: randomColor,
        userId,
        isDefault: false,
      },
    });
  }

  return category;
}

// Função auxiliar para buscar ou criar tag
async function findOrCreateTag(userId: string, tagName: string) {
  let tag = await prisma.tag.findFirst({
    where: {
      name: {
        equals: tagName,
        mode: "insensitive",
      },
      userId,
    },
  });

  if (!tag) {
    tag = await prisma.tag.create({
      data: {
        name: tagName,
        userId,
      },
    });
  }

  return tag;
}

// Criar uma transação
export async function executeCreateTransaction(
  userId: string,
  params: z.infer<typeof createTransactionSchema>
) {
  const {
    type,
    description,
    amount,
    categoryName,
    accountName,
    dueDate,
    isPaid,
    notes,
    tagNames,
  } = params;

  // Buscar conta
  let account;
  if (accountName) {
    account = await prisma.account.findFirst({
      where: {
        name: {
          equals: accountName,
          mode: "insensitive",
        },
        userId,
      },
    });

    if (!account) {
      return {
        success: false,
        error: `Conta "${accountName}" não encontrada. Use uma das contas existentes ou deixe em branco para usar a conta padrão.`,
      };
    }
  } else {
    // Buscar conta padrão
    account = await prisma.account.findFirst({
      where: { userId, isDefault: true },
    });

    if (!account) {
      // Se não tem padrão, pegar a primeira conta do usuário
      account = await prisma.account.findFirst({
        where: { userId },
      });
    }

    if (!account) {
      return {
        success: false,
        error:
          "Você precisa ter pelo menos uma conta cadastrada para criar transações.",
      };
    }
  }

  // Buscar ou criar categoria
  const category = await findOrCreateCategory(
    userId,
    categoryName || "Outros",
    type
  );

  // Preparar data de vencimento
  const transactionDueDate = dueDate ? new Date(dueDate) : new Date();

  // Criar transação
  const transaction = await prisma.transaction.create({
    data: {
      userId,
      accountId: account.id,
      categoryId: category.id,
      type,
      description,
      amount,
      dueDate: transactionDueDate,
      paidDate: isPaid ? transactionDueDate : null,
      status: isPaid ? "PAID" : "PENDING",
      notes: notes || null,
      isRecurring: false,
      isFixed: false,
    },
    include: {
      category: { select: { name: true, color: true } },
      account: { select: { name: true } },
    },
  });

  // Associar tags se fornecidas
  if (tagNames && tagNames.length > 0) {
    for (const tagName of tagNames) {
      const tag = await findOrCreateTag(userId, tagName);
      await prisma.transactionOnTags.create({
        data: {
          transactionId: transaction.id,
          tagId: tag.id,
        },
      });
    }
  }

  return {
    success: true,
    transaction: {
      id: transaction.id,
      description: transaction.description,
      amount: transaction.amount,
      type: transaction.type,
      status: transaction.status,
      dueDate: transaction.dueDate.toISOString().split("T")[0],
      paidDate: transaction.paidDate?.toISOString().split("T")[0] || null,
      category: transaction.category.name,
      categoryColor: transaction.category.color,
      account: transaction.account.name,
      notes: transaction.notes,
      tags: tagNames || [],
    },
  };
}

// Criar múltiplas transações
export async function executeCreateMultipleTransactions(
  userId: string,
  params: z.infer<typeof createMultipleTransactionsSchema>
) {
  const { transactions } = params;

  const results = [];
  const errors = [];

  for (let i = 0; i < transactions.length; i++) {
    try {
      const result = await executeCreateTransaction(userId, transactions[i]);
      if (result.success) {
        results.push(result.transaction);
      } else {
        errors.push({
          index: i + 1,
          description: transactions[i].description,
          error: result.error,
        });
      }
    } catch (error) {
      errors.push({
        index: i + 1,
        description: transactions[i].description,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  }

  return {
    success: errors.length === 0,
    created: results.length,
    total: transactions.length,
    transactions: results,
    errors: errors.length > 0 ? errors : undefined,
  };
}

// Buscar transações parceladas agrupadas (modelo virtual)
export async function executeGetInstallments(
  userId: string,
  params: z.infer<typeof getInstallmentsSchema>
) {
  const { type, status, categoryId } = params;

  // Buscar transações raiz parceladas (com o novo modelo virtual)
  const where: Record<string, unknown> = {
    userId,
    isFixed: false,
    isOverride: false, // Apenas transações raiz, não overrides
    parentTransactionId: null, // Apenas transações raiz
    installments: {
      gt: 1,
    },
  };

  if (type) where.type = type;
  if (categoryId) where.categoryId = categoryId;

  const rootTransactions = await prisma.transaction.findMany({
    where,
    include: {
      category: { select: { name: true, color: true } },
      account: { select: { name: true } },
    },
    orderBy: { dueDate: "desc" },
  });

  const results = [];

  for (const root of rootTransactions) {
    // Buscar overrides para esta série
    const overrides = await prisma.transaction.findMany({
      where: {
        parentTransactionId: root.id,
        isOverride: true,
      },
      select: {
        status: true,
        overrideForDate: true,
      },
    });

    // Calcular parcelas pagas e pendentes
    const totalInstallments = root.installments!;
    const cancelledOccurrences = new Set(root.cancelledOccurrences || []);

    // Contar overrides pagos
    const paidFromOverrides = overrides.filter(
      (o) => o.status === "PAID"
    ).length;

    // Parcelas efetivas (total - canceladas)
    const effectiveInstallments = totalInstallments - cancelledOccurrences.size;

    // Para determinar parcelas pagas, precisamos verificar:
    // 1. Overrides marcados como PAID
    // 2. Se o root está PAID (primeira parcela)
    let paidInstallments = paidFromOverrides;
    if (root.status === "PAID") {
      paidInstallments += 1;
    }

    const pendingInstallments = Math.max(
      0,
      effectiveInstallments - paidInstallments
    );

    // Aplicar filtro de status se fornecido
    if (status) {
      const hasStatus =
        (status === "PAID" && paidInstallments > 0) ||
        (status === "PENDING" && pendingInstallments > 0) ||
        (status === "OVERDUE" && pendingInstallments > 0);

      if (!hasStatus) continue;
    }

    results.push({
      description: root.description,
      category: root.category.name,
      categoryColor: root.category.color,
      totalInstallments,
      paidInstallments,
      pendingInstallments,
      installmentAmount: root.amount,
      totalAmount: root.amount * totalInstallments,
      type: root.type,
      account: root.account.name,
      startDate:
        root.startDate?.toISOString().split("T")[0] ||
        root.dueDate.toISOString().split("T")[0],
      endDate: root.endDate?.toISOString().split("T")[0] || null,
    });
  }

  return {
    installments: results,
    total: results.length,
  };
}
