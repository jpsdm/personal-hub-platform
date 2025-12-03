import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/user-session";
import {
  calculateTransactionStatus,
  expandTransactions,
  type TransactionWithRelations,
  type VirtualOccurrence,
} from "@/modules/finance";
import { NextResponse } from "next/server";

// Função auxiliar para obter o último dia de um mês
function getLastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

// Função para criar uma data a partir de string ISO preservando o dia correto
function parseDate(dateString: string): Date {
  const datePart = dateString.split("T")[0];
  const [year, month, day] = datePart.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

// Função para calcular a data final das parcelas
function calculateEndDate(
  startDate: Date,
  installments: number,
  dayOfMonth: number
): Date {
  const startYear = startDate.getUTCFullYear();
  const startMonth = startDate.getUTCMonth();

  // Calcular mês final (parcela 1 é o mês inicial, então subtraímos 1)
  const totalMonthsToAdd = installments - 1;
  const endYear = startYear + Math.floor((startMonth + totalMonthsToAdd) / 12);
  const endMonth = (startMonth + totalMonthsToAdd) % 12;

  const lastDay = getLastDayOfMonth(endYear, endMonth);
  const actualDay = Math.min(dayOfMonth, lastDay);

  return new Date(Date.UTC(endYear, endMonth, actualDay, 12, 0, 0));
}

export async function GET(request: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");
    const year = searchParams.get("year");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const categoryId = searchParams.get("categoryId");
    const accountId = searchParams.get("accountId");
    const tagId = searchParams.get("tagId");
    const includeVirtual = searchParams.get("includeVirtual") !== "false"; // Default true
    const includeOverdue = searchParams.get("includeOverdue") === "true"; // Default false
    const cashFlowMode = searchParams.get("cashFlowMode") !== "false"; // Default true (Financeiro Real)

    // Determinar se há filtro de data
    const hasDateFilter = !!(startDate || endDate) || !!(month && year);

    // Calcular range de datas para busca (se houver filtro de data)
    let rangeStart: Date | null = null;
    let rangeEnd: Date | null = null;

    if (startDate || endDate) {
      // Se só tem startDate, usar data muito distante no futuro como fim
      // Se só tem endDate, usar data muito distante no passado como início
      if (startDate) {
        const [startYear, startMonth, startDay] = startDate
          .split("-")
          .map(Number);
        rangeStart = new Date(
          Date.UTC(startYear, startMonth - 1, startDay, 0, 0, 0, 0)
        );
      } else {
        rangeStart = new Date(Date.UTC(2000, 0, 1, 0, 0, 0, 0));
      }

      if (endDate) {
        const [endYear, endMonth, endDay] = endDate.split("-").map(Number);
        // Usar 23:59:59.999 UTC para incluir transações do dia inteiro
        rangeEnd = new Date(
          Date.UTC(endYear, endMonth - 1, endDay, 23, 59, 59, 999)
        );
      } else {
        rangeEnd = new Date(Date.UTC(2100, 11, 31, 23, 59, 59, 999));
      }
    } else if (month && year) {
      const m = Number.parseInt(month) - 1;
      const y = Number.parseInt(year);
      rangeStart = new Date(Date.UTC(y, m, 1));
      rangeEnd = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59));
    }

    // Construir whereClause baseado em se há filtro de data ou não
    const whereClause: any = {
      userId,
      isOverride: false,
    };

    // Se há filtro de data, aplicar lógica de range
    if (hasDateFilter && rangeStart && rangeEnd) {
      whereClause.OR = [
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
          OR: [
            { startDate: { lte: rangeEnd } },
            { dueDate: { lte: rangeEnd } },
          ],
        },
        // 3. Transação parcelada que abrange o range
        {
          installments: { gt: 1 },
          OR: [
            {
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
          ],
        },
      ];
    }
    // Se não há filtro de data, buscar todas as transações (sem expandir virtuais)

    // Aplicar filtros adicionais
    if (type) {
      whereClause.type = type;
    }
    if (categoryId) {
      whereClause.categoryId = categoryId;
    }
    if (accountId) {
      whereClause.accountId = accountId;
    }
    if (tagId) {
      whereClause.tags = {
        some: {
          tagId: tagId,
        },
      };
    }

    // Buscar transações raiz
    const rootTransactions = await prisma.transaction.findMany({
      where: whereClause,
      include: {
        account: true,
        category: true,
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    let results: VirtualOccurrence[];

    // Se há filtro de data, buscar overrides e expandir transações virtuais
    if (hasDateFilter && rangeStart && rangeEnd) {
      // Buscar overrides para o range
      const overridesWhere: any = {
        userId,
        isOverride: true,
        overrideForDate: {
          gte: rangeStart,
          lte: rangeEnd,
        },
      };

      // Aplicar mesmos filtros aos overrides
      if (type) overridesWhere.type = type;
      if (categoryId) overridesWhere.categoryId = categoryId;
      if (accountId) overridesWhere.accountId = accountId;
      if (tagId) {
        overridesWhere.tags = { some: { tagId } };
      }

      const overrides = await prisma.transaction.findMany({
        where: overridesWhere,
        include: {
          account: true,
          category: true,
          tags: {
            include: {
              tag: true,
            },
          },
        },
      });

      // Combinar e expandir
      const allTransactions = [
        ...rootTransactions,
        ...overrides,
      ] as TransactionWithRelations[];

      if (includeVirtual) {
        results = expandTransactions(allTransactions, rangeStart, rangeEnd);
      } else {
        results = rootTransactions.map((tx) => {
          const dueDate = new Date(tx.dueDate);
          // Recalcular status para garantir que transações atrasadas sejam marcadas corretamente
          const calculatedStatus = calculateTransactionStatus(
            tx.paidDate ? new Date(tx.paidDate) : null,
            dueDate
          );

          return {
            id: tx.id,
            realId: tx.id,
            parentId: tx.id,
            userId: tx.userId,
            accountId: tx.accountId,
            categoryId: tx.categoryId,
            type: tx.type,
            description: tx.description,
            amount: tx.amount,
            dueDate: dueDate,
            paidDate: tx.paidDate,
            status: calculatedStatus,
            notes: tx.notes,
            isFixed: tx.isFixed,
            installments: tx.installments,
            currentInstallment: null,
            isVirtual: false,
            isOverride: false,
            account: tx.account,
            category: tx.category,
            tags: tx.tags,
          };
        }) as VirtualOccurrence[];
      }
    } else {
      // Sem filtro de data: retornar transações raiz sem expandir virtuais
      // Para transações fixas/parceladas, retorna apenas o registro raiz
      results = rootTransactions.map((tx) => {
        const dueDate = new Date(tx.dueDate);
        // Recalcular status para garantir que transações atrasadas sejam marcadas corretamente
        const calculatedStatus = calculateTransactionStatus(
          tx.paidDate ? new Date(tx.paidDate) : null,
          dueDate
        );

        return {
          id: tx.id,
          realId: tx.id,
          parentId: tx.id,
          userId: tx.userId,
          accountId: tx.accountId,
          categoryId: tx.categoryId,
          type: tx.type,
          description: tx.description,
          amount: tx.amount,
          dueDate: dueDate,
          paidDate: tx.paidDate,
          status: calculatedStatus,
          notes: tx.notes,
          isFixed: tx.isFixed,
          installments: tx.installments,
          currentInstallment: tx.installments ? 1 : null,
          isVirtual: false,
          isOverride: false,
          account: tx.account,
          category: tx.category,
          tags: tx.tags,
        };
      }) as VirtualOccurrence[];
    }

    // Aplicar filtro de status após expansão (pois status pode vir de override)
    if (status) {
      results = results.filter((tx) => tx.status === status);
    }

    // Modo Financeiro Real: Filtrar e buscar transações pelo paidDate
    if (cashFlowMode && hasDateFilter && rangeStart && rangeEnd) {
      // No modo financeiro real:
      // - Transações PAGAS: aparecem no período do paidDate
      // - Transações PENDENTES/OVERDUE: aparecem no período do dueDate
      
      // Filtrar resultados existentes
      results = results.filter((tx) => {
        if (tx.status === "PAID" && tx.paidDate) {
          // Transação paga: verificar se paidDate está no range
          const paidDate = new Date(tx.paidDate);
          return paidDate >= rangeStart && paidDate <= rangeEnd;
        } else {
          // Transação pendente/atrasada: verificar se dueDate está no range
          const dueDate = new Date(tx.dueDate);
          return dueDate >= rangeStart && dueDate <= rangeEnd;
        }
      });

      // Buscar transações pagas no período atual mas com dueDate em meses anteriores
      // (transações que "pertenciam" a outros meses mas foram pagas neste)
      const paidInRangeWhere: any = {
        userId,
        isOverride: false,
        status: "PAID",
        paidDate: {
          gte: rangeStart,
          lte: rangeEnd,
        },
        // dueDate fora do range (para não duplicar)
        dueDate: {
          lt: rangeStart,
        },
      };

      // Aplicar os mesmos filtros
      if (type) paidInRangeWhere.type = type;
      if (categoryId) paidInRangeWhere.categoryId = categoryId;
      if (accountId) paidInRangeWhere.accountId = accountId;
      if (tagId) {
        paidInRangeWhere.tags = { some: { tagId } };
      }

      const paidInRange = await prisma.transaction.findMany({
        where: paidInRangeWhere,
        include: {
          account: true,
          category: true,
          tags: {
            include: {
              tag: true,
            },
          },
        },
      });

      // Buscar também overrides pagos no período com dueDate em meses anteriores
      const paidOverridesWhere: any = {
        userId,
        isOverride: true,
        status: "PAID",
        paidDate: {
          gte: rangeStart,
          lte: rangeEnd,
        },
        overrideForDate: {
          lt: rangeStart,
        },
      };

      if (type) paidOverridesWhere.type = type;
      if (categoryId) paidOverridesWhere.categoryId = categoryId;
      if (accountId) paidOverridesWhere.accountId = accountId;
      if (tagId) {
        paidOverridesWhere.tags = { some: { tagId } };
      }

      const paidOverrides = await prisma.transaction.findMany({
        where: paidOverridesWhere,
        include: {
          account: true,
          category: true,
          tags: {
            include: {
              tag: true,
            },
          },
        },
      });

      // Converter e adicionar aos resultados
      const additionalPaid: VirtualOccurrence[] = [
        ...paidInRange.map((tx) => ({
          id: tx.id,
          realId: tx.id,
          parentId: tx.id,
          userId: tx.userId,
          accountId: tx.accountId,
          categoryId: tx.categoryId,
          type: tx.type as "INCOME" | "EXPENSE",
          description: tx.description,
          amount: tx.amount,
          dueDate: new Date(tx.dueDate),
          paidDate: tx.paidDate ? new Date(tx.paidDate) : null,
          status: "PAID" as const,
          notes: tx.notes,
          isFixed: tx.isFixed,
          installments: tx.installments,
          currentInstallment: null,
          isVirtual: false,
          isOverride: false,
          account: tx.account,
          category: tx.category,
          tags: tx.tags,
        })),
        ...paidOverrides.map((tx) => ({
          id: tx.id,
          realId: tx.id,
          parentId: tx.parentTransactionId || tx.id,
          userId: tx.userId,
          accountId: tx.accountId,
          categoryId: tx.categoryId,
          type: tx.type as "INCOME" | "EXPENSE",
          description: tx.description,
          amount: tx.amount,
          dueDate: new Date(tx.overrideForDate || tx.dueDate),
          paidDate: tx.paidDate ? new Date(tx.paidDate) : null,
          status: "PAID" as const,
          notes: tx.notes,
          isFixed: false,
          installments: null,
          currentInstallment: null,
          isVirtual: false,
          isOverride: true,
          account: tx.account,
          category: tx.category,
          tags: tx.tags,
        })),
      ];

      // Evitar duplicatas
      const existingIds = new Set(results.map((r) => r.id));
      const newPaid = additionalPaid.filter((tx) => !existingIds.has(tx.id));
      results = [...results, ...newPaid];

      // Aplicar filtro de status novamente se necessário
      if (status) {
        results = results.filter((tx) => tx.status === status);
      }
    }

    // Se includeOverdue está ativo e há filtro de data, buscar transações atrasadas de meses anteriores
    if (includeOverdue && hasDateFilter && rangeStart) {
      // Buscar transações atrasadas que vencem ANTES do rangeStart
      const overdueStartDate = new Date(Date.UTC(2000, 0, 1, 0, 0, 0, 0));
      const overdueEndDate = new Date(rangeStart.getTime() - 1); // Um milissegundo antes do rangeStart

      // Buscar transações raiz (fixas/parceladas) que podem ter ocorrências atrasadas
      const overdueWhereClause: any = {
        userId,
        isOverride: false,
      };

      // Aplicar os mesmos filtros
      if (type) overdueWhereClause.type = type;
      if (categoryId) overdueWhereClause.categoryId = categoryId;
      if (accountId) overdueWhereClause.accountId = accountId;
      if (tagId) {
        overdueWhereClause.tags = { some: { tagId } };
      }

      // Buscar transações que podem ter ocorrências antes do período
      overdueWhereClause.OR = [
        // 1. Transação única antes do range (não paga)
        {
          isFixed: false,
          installments: null,
          status: { not: "PAID" },
          paidDate: null,
          dueDate: {
            lt: rangeStart,
          },
        },
        // 2. Transação fixa que começou antes do range (para gerar ocorrências atrasadas)
        {
          isFixed: true,
          OR: [
            { startDate: { lt: rangeStart } },
            { dueDate: { lt: rangeStart } },
          ],
        },
        // 3. Transação parcelada que pode ter parcelas antes do range
        {
          installments: { gt: 1 },
          OR: [
            { startDate: { lt: rangeStart } },
            { dueDate: { lt: rangeStart } },
          ],
        },
      ];

      const overdueRootTransactions = await prisma.transaction.findMany({
        where: overdueWhereClause,
        include: {
          account: true,
          category: true,
          tags: {
            include: {
              tag: true,
            },
          },
        },
      });

      // Buscar TODOS os overrides (pagos e não pagos) para o período anterior
      // Isso é necessário para que a expansão saiba quais ocorrências já foram pagas
      const allOverdueOverridesWhere: any = {
        userId,
        isOverride: true,
        overrideForDate: {
          lt: rangeStart,
        },
      };

      if (type) allOverdueOverridesWhere.type = type;
      if (categoryId) allOverdueOverridesWhere.categoryId = categoryId;
      if (accountId) allOverdueOverridesWhere.accountId = accountId;
      if (tagId) {
        allOverdueOverridesWhere.tags = { some: { tagId } };
      }

      const allOverdueOverrides = await prisma.transaction.findMany({
        where: allOverdueOverridesWhere,
        include: {
          account: true,
          category: true,
          tags: {
            include: {
              tag: true,
            },
          },
        },
      });

      // Combinar para expansão - incluindo todos os overrides para consideração correta
      const allOverdueTransactions = [
        ...overdueRootTransactions,
        ...allOverdueOverrides,
      ] as TransactionWithRelations[];

      if (allOverdueTransactions.length > 0) {
        const overdueResults = expandTransactions(
          allOverdueTransactions,
          overdueStartDate,
          overdueEndDate
        );

        // Filtrar apenas as que realmente estão atrasadas (OVERDUE)
        // Isso exclui automaticamente as que foram pagas (tem override com PAID)
        const filteredOverdue = overdueResults.filter(
          (tx) => tx.status === "OVERDUE"
        );

        // Evitar duplicatas - verificar IDs já presentes nos results
        const existingIds = new Set(results.map((r) => r.id));
        const newOverdue = filteredOverdue.filter(
          (tx) => !existingIds.has(tx.id)
        );

        // Adicionar aos resultados
        results = [...results, ...newOverdue];
      }
    }

    // Ordenar por data de vencimento (mais recente primeiro)
    results.sort((a, b) => b.dueDate.getTime() - a.dueDate.getTime());

    return NextResponse.json(results);
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
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
    const {
      accountId,
      categoryId,
      type,
      description,
      amount,
      dueDate,
      status,
      tagIds,
      notes,
      isFixed,
      installments,
    } = body;

    const parsedAmount = Number.parseFloat(amount);
    const parsedInstallments = installments
      ? Number.parseInt(installments)
      : null;
    const baseDate = parseDate(dueDate);
    const dayOfMonth = baseDate.getUTCDate();

    // Criar dados base da transação
    const transactionData: any = {
      userId,
      accountId,
      categoryId,
      type,
      description,
      amount: parsedAmount,
      dueDate: baseDate,
      status,
      paidDate: status === "PAID" ? new Date() : null,
      notes: notes || null,
      isFixed: isFixed || false,
      installments: null,
      startDate: null,
      endDate: null,
      dayOfMonth: null,
      isOverride: false,
      cancelledOccurrences: [],
    };

    // Se tem parcelas, configurar como transação parcelada
    if (parsedInstallments && parsedInstallments > 1) {
      transactionData.installments = parsedInstallments;
      transactionData.startDate = baseDate;
      transactionData.dayOfMonth = dayOfMonth;
      transactionData.endDate = calculateEndDate(
        baseDate,
        parsedInstallments,
        dayOfMonth
      );
      transactionData.isFixed = false; // Parcelas não são fixas
      transactionData.isRecurring = true; // Parcelas são recorrentes
    }
    // Se é transação fixa, configurar como tal
    else if (isFixed) {
      transactionData.isFixed = true;
      transactionData.startDate = baseDate;
      transactionData.dayOfMonth = dayOfMonth;
      transactionData.installments = null;
      transactionData.endDate = null; // Fixas não têm fim
    }

    // Criar a transação raiz (APENAS UMA!)
    const transaction = await prisma.transaction.create({
      data: transactionData,
    });

    // Adicionar tags se fornecidas
    if (tagIds && tagIds.length > 0) {
      await prisma.transactionOnTags.createMany({
        data: tagIds.map((tagId: string) => ({
          transactionId: transaction.id,
          tagId,
        })),
      });
    }

    // Buscar transação completa com relacionamentos
    const completeTransaction = await prisma.transaction.findUnique({
      where: { id: transaction.id },
      include: {
        account: true,
        category: true,
        tags: {
          include: { tag: true },
        },
      },
    });

    return NextResponse.json(completeTransaction);
  } catch (error) {
    console.error("Error creating transaction:", error);
    return NextResponse.json(
      { error: "Failed to create transaction" },
      { status: 500 }
    );
  }
}
