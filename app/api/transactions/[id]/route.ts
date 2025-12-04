import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/user-session";
import {
  calculateTransactionStatus,
  isVirtualId,
  parseVirtualId,
} from "@/modules/finance";
import type { Params } from "next/dist/server/request/params";
import { NextResponse } from "next/server";

// Função para criar uma data a partir de string ISO preservando o dia correto
function parseDate(dateString: string): Date {
  const datePart = dateString.split("T")[0];
  const [year, month, day] = datePart.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

// Função auxiliar para obter o último dia de um mês
function getLastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

// Função para ajustar o dia de uma data existente para um novo dia preferido
function adjustDayInDate(existingDate: Date, newDay: number): Date {
  const year = existingDate.getUTCFullYear();
  const month = existingDate.getUTCMonth();
  const lastDay = getLastDayOfMonth(year, month);
  const actualDay = Math.min(newDay, lastDay);
  return new Date(Date.UTC(year, month, actualDay, 12, 0, 0));
}

// Função para calcular data de uma ocorrência
function getOccurrenceDate(
  parentTransaction: any,
  year: number,
  month: number
): Date {
  const dayOfMonth =
    parentTransaction.dayOfMonth ||
    new Date(
      parentTransaction.startDate || parentTransaction.dueDate
    ).getUTCDate();
  const lastDay = getLastDayOfMonth(year, month);
  const actualDay = Math.min(dayOfMonth, lastDay);
  return new Date(Date.UTC(year, month, actualDay, 12, 0, 0));
}

export async function PUT(request: Request, context: { params: Params }) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = (await context.params) as { id: string };
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
      scope = "single", // single, future, all
    } = body;

    const transactionId = params.id;
    const parsedAmount = Number.parseFloat(amount);

    // Se dueDate não foi fornecido, vamos usar a data existente (buscada depois)
    let newDate: Date | null = dueDate ? parseDate(dueDate) : null;
    let newDay: number | null = newDate ? newDate.getUTCDate() : null;

    // Verificar se é um ID virtual
    if (isVirtualId(transactionId)) {
      // É uma ocorrência virtual - criar override
      const virtualInfo = parseVirtualId(transactionId);
      if (!virtualInfo) {
        return NextResponse.json(
          { error: "Invalid virtual ID" },
          { status: 400 }
        );
      }

      const { parentId, year, month } = virtualInfo;

      // Buscar transação pai
      const parentTransaction = await prisma.transaction.findFirst({
        where: { id: parentId, userId },
      });

      if (!parentTransaction) {
        return NextResponse.json(
          { error: "Parent transaction not found" },
          { status: 404 }
        );
      }

      // Verificar se já existe um override para esta ocorrência
      const occurrenceDate = getOccurrenceDate(parentTransaction, year, month);
      const existingOverride = await prisma.transaction.findFirst({
        where: {
          parentTransactionId: parentId,
          isOverride: true,
          overrideForDate: occurrenceDate,
        },
      });

      if (existingOverride) {
        // Atualizar override existente
        const updated = await prisma.transaction.update({
          where: { id: existingOverride.id },
          data: {
            accountId,
            categoryId,
            type,
            description,
            amount: parsedAmount,
            dueDate: newDate || occurrenceDate,
            status,
            paidDate: status === "PAID" ? new Date() : null,
            notes: notes || null,
          },
          include: {
            account: true,
            category: true,
            tags: { include: { tag: true } },
          },
        });

        // Atualizar tags
        await prisma.transactionOnTags.deleteMany({
          where: { transactionId: existingOverride.id },
        });

        if (tagIds && tagIds.length > 0) {
          await prisma.transactionOnTags.createMany({
            data: tagIds.map((tagId: string) => ({
              transactionId: existingOverride.id,
              tagId,
            })),
          });
        }

        const result = await prisma.transaction.findUnique({
          where: { id: existingOverride.id },
          include: {
            account: true,
            category: true,
            tags: { include: { tag: true } },
          },
        });

        return NextResponse.json({
          ...result,
          updatedCount: 1,
          scope: "single",
        });
      } else {
        // Criar novo override
        const override = await prisma.transaction.create({
          data: {
            userId,
            accountId,
            categoryId,
            type,
            description,
            amount: parsedAmount,
            dueDate: newDate || occurrenceDate,
            status,
            paidDate: status === "PAID" ? new Date() : null,
            notes: notes || null,
            isFixed: false,
            isOverride: true,
            overrideForDate: occurrenceDate,
            parentTransactionId: parentId,
            cancelledOccurrences: [],
          },
        });

        // Adicionar tags
        if (tagIds && tagIds.length > 0) {
          await prisma.transactionOnTags.createMany({
            data: tagIds.map((tagId: string) => ({
              transactionId: override.id,
              tagId,
            })),
          });
        }

        const result = await prisma.transaction.findUnique({
          where: { id: override.id },
          include: {
            account: true,
            category: true,
            tags: { include: { tag: true } },
          },
        });

        return NextResponse.json({
          ...result,
          updatedCount: 1,
          scope: "single",
        });
      }
    }

    // Não é virtual - verificar se é transação real
    const existingTransaction = await prisma.transaction.findFirst({
      where: { id: transactionId, userId },
    });

    if (!existingTransaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    // Se newDate não foi fornecido, usar a data existente
    if (!newDate) {
      newDate = new Date(existingTransaction.dueDate);
      newDay = newDate.getUTCDate();
    }

    // Dados a serem atualizados
    const updateData: any = {
      accountId,
      categoryId,
      type,
      description,
      amount: parsedAmount,
      status,
      paidDate: status === "PAID" ? new Date() : null,
      notes: notes || null,
    };

    // Determinar quais transações atualizar baseado no escopo
    let transactionIds: string[] = [];

    if (scope === "single") {
      // Apenas esta transação
      transactionIds.push(transactionId);

      // Se é um override ou transação simples, atualizar normalmente
      if (
        existingTransaction.isOverride ||
        (!existingTransaction.isFixed && !existingTransaction.installments)
      ) {
        updateData.dueDate = newDate;
        await prisma.transaction.update({
          where: { id: transactionId },
          data: updateData,
        });
      } else {
        // É transação raiz de série - criar override para esta ocorrência
        const occurrenceDate = new Date(existingTransaction.dueDate);

        // Verificar se já existe override
        const existingOverride = await prisma.transaction.findFirst({
          where: {
            parentTransactionId: transactionId,
            isOverride: true,
            overrideForDate: occurrenceDate,
          },
        });

        if (existingOverride) {
          // Atualizar override existente
          await prisma.transaction.update({
            where: { id: existingOverride.id },
            data: updateData,
          });
          transactionIds[0] = existingOverride.id;
        } else {
          // Criar novo override
          const override = await prisma.transaction.create({
            data: {
              userId,
              accountId,
              categoryId,
              type,
              description,
              amount: parsedAmount,
              dueDate: occurrenceDate,
              status,
              paidDate: status === "PAID" ? new Date() : null,
              notes: notes || null,
              isFixed: false,
              isOverride: true,
              overrideForDate: occurrenceDate,
              parentTransactionId: transactionId,
              cancelledOccurrences: [],
            },
          });
          transactionIds[0] = override.id;
        }
      }
    } else if (scope === "future") {
      // Esta e todas as futuras - precisa criar overrides para passadas e atualizar a raiz
      const parentId =
        existingTransaction.parentTransactionId || existingTransaction.id;
      const currentDate = new Date(existingTransaction.dueDate);

      // Buscar a transação raiz
      const rootTransaction = await prisma.transaction.findUnique({
        where: { id: parentId },
        include: { tags: { include: { tag: true } } },
      });

      if (rootTransaction) {
        // Calcular ocorrências passadas que precisam manter os valores originais
        const startDate = new Date(
          rootTransaction.startDate || rootTransaction.dueDate
        );
        const dayOfMonth = rootTransaction.dayOfMonth || startDate.getUTCDate();

        // Criar overrides para ocorrências passadas que não têm override
        let checkDate = new Date(startDate);
        while (checkDate < currentDate) {
          const occKey = `${checkDate.getUTCFullYear()}-${String(
            checkDate.getUTCMonth() + 1
          ).padStart(2, "0")}`;

          // Verificar se já existe override para esta data
          const existingOverride = await prisma.transaction.findFirst({
            where: {
              parentTransactionId: parentId,
              isOverride: true,
              overrideForDate: checkDate,
            },
          });

          // Verificar se não está cancelada
          const isCancelled = (
            rootTransaction.cancelledOccurrences || []
          ).includes(occKey);

          if (!existingOverride && !isCancelled) {
            // Calcular o status correto baseado na data
            const overrideDate = new Date(checkDate);
            const calculatedStatus = calculateTransactionStatus(
              null,
              overrideDate
            );

            // Criar override com valores originais para preservar histórico
            const preserveOverride = await prisma.transaction.create({
              data: {
                userId: rootTransaction.userId,
                accountId: rootTransaction.accountId,
                categoryId: rootTransaction.categoryId,
                type: rootTransaction.type,
                description: rootTransaction.description,
                amount: rootTransaction.amount,
                dueDate: overrideDate,
                status: calculatedStatus,
                paidDate: null,
                notes: rootTransaction.notes,
                isFixed: false,
                isOverride: true,
                overrideForDate: overrideDate,
                parentTransactionId: parentId,
                cancelledOccurrences: [],
              },
            });

            // Copiar tags
            if (rootTransaction.tags.length > 0) {
              await prisma.transactionOnTags.createMany({
                data: rootTransaction.tags.map((t) => ({
                  transactionId: preserveOverride.id,
                  tagId: t.tag.id,
                })),
              });
            }
          }

          // Próximo mês
          checkDate.setUTCMonth(checkDate.getUTCMonth() + 1);
          // Ajustar dia
          const lastDay = new Date(
            Date.UTC(checkDate.getUTCFullYear(), checkDate.getUTCMonth() + 1, 0)
          ).getUTCDate();
          checkDate.setUTCDate(Math.min(dayOfMonth, lastDay));
        }

        // Agora atualizar a raiz (afetará apenas futuras)
        await prisma.transaction.update({
          where: { id: parentId },
          data: updateData,
        });

        transactionIds.push(parentId);

        // Deletar overrides futuros (serão recriados com novos valores quando necessário)
        await prisma.transactionOnTags.deleteMany({
          where: {
            transaction: {
              parentTransactionId: parentId,
              isOverride: true,
              overrideForDate: { gte: currentDate },
            },
          },
        });

        await prisma.transaction.deleteMany({
          where: {
            parentTransactionId: parentId,
            isOverride: true,
            overrideForDate: { gte: currentDate },
          },
        });
      }
    } else if (scope === "all") {
      // Todas - atualizar a raiz e deletar todos os overrides
      const parentId =
        existingTransaction.parentTransactionId || existingTransaction.id;

      await prisma.transaction.update({
        where: { id: parentId },
        data: updateData,
      });

      transactionIds.push(parentId);

      // Deletar todos os overrides
      await prisma.transactionOnTags.deleteMany({
        where: {
          transaction: {
            parentTransactionId: parentId,
            isOverride: true,
          },
        },
      });

      await prisma.transaction.deleteMany({
        where: {
          parentTransactionId: parentId,
          isOverride: true,
        },
      });
    }

    // Atualizar tags para as transações afetadas
    if (transactionIds.length > 0) {
      await prisma.transactionOnTags.deleteMany({
        where: { transactionId: { in: transactionIds } },
      });

      if (tagIds && tagIds.length > 0) {
        const tagData = transactionIds.flatMap((txId: string) =>
          tagIds.map((tagId: string) => ({
            transactionId: txId,
            tagId,
          }))
        );

        await prisma.transactionOnTags.createMany({ data: tagData });
      }
    }

    // Buscar a transação atualizada para retornar
    const updatedTransaction = await prisma.transaction.findUnique({
      where: { id: transactionIds[0] || transactionId },
      include: {
        account: true,
        category: true,
        tags: { include: { tag: true } },
      },
    });

    return NextResponse.json({
      ...updatedTransaction,
      updatedCount: transactionIds.length,
      scope,
    });
  } catch (error) {
    console.error("Error updating transaction:", error);
    return NextResponse.json(
      { error: "Failed to update transaction" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, context: { params: Params }) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = (await context.params) as { id: string };
    const transactionId = params.id;

    // Tentar ler o body para verificar o escopo
    let scope = "single";
    try {
      const body = await request.json();
      scope = body.scope || "single";
    } catch {
      // Body vazio, usar escopo padrão
    }

    // Verificar se é um ID virtual
    if (isVirtualId(transactionId)) {
      const virtualInfo = parseVirtualId(transactionId);
      if (!virtualInfo) {
        return NextResponse.json(
          { error: "Invalid virtual ID" },
          { status: 400 }
        );
      }

      const { parentId, year, month } = virtualInfo;

      // Buscar transação pai
      const parentTransaction = await prisma.transaction.findFirst({
        where: { id: parentId, userId },
      });

      if (!parentTransaction) {
        return NextResponse.json(
          { error: "Parent transaction not found" },
          { status: 404 }
        );
      }

      // Calcular a chave da ocorrência
      const occurrenceKey = `${year}-${String(month + 1).padStart(2, "0")}`;

      if (scope === "single") {
        // Cancelar apenas esta ocorrência
        // Verificar se existe override para deletar
        const occurrenceDate = getOccurrenceDate(
          parentTransaction,
          year,
          month
        );
        const existingOverride = await prisma.transaction.findFirst({
          where: {
            parentTransactionId: parentId,
            isOverride: true,
            overrideForDate: occurrenceDate,
          },
        });

        if (existingOverride) {
          // Deletar o override
          await prisma.transactionOnTags.deleteMany({
            where: { transactionId: existingOverride.id },
          });
          await prisma.transaction.delete({
            where: { id: existingOverride.id },
          });
        }

        // Adicionar à lista de ocorrências canceladas
        const cancelledOccurrences = [
          ...(parentTransaction.cancelledOccurrences || []),
        ];
        if (!cancelledOccurrences.includes(occurrenceKey)) {
          cancelledOccurrences.push(occurrenceKey);
        }

        await prisma.transaction.update({
          where: { id: parentId },
          data: { cancelledOccurrences },
        });

        return NextResponse.json({
          success: true,
          deletedCount: 1,
          scope: "single",
          message: `Occurrence ${occurrenceKey} cancelled`,
        });
      } else if (scope === "future") {
        // Cancelar esta e todas as futuras
        // Ajustar a data de fim da transação pai
        const occurrenceDate = getOccurrenceDate(
          parentTransaction,
          year,
          month
        );

        // Se é parcelada, ajustar número de parcelas
        if (parentTransaction.installments) {
          // Calcular quantas parcelas restam até esta ocorrência
          const startDate = new Date(
            parentTransaction.startDate || parentTransaction.dueDate
          );
          const startYear = startDate.getUTCFullYear();
          const startMonth = startDate.getUTCMonth();

          // Calcular qual parcela é esta
          const monthsDiff = (year - startYear) * 12 + (month - startMonth);
          const newInstallments = monthsDiff; // Parcelas até a anterior a esta

          if (newInstallments <= 0) {
            // Deletar tudo
            await prisma.transactionOnTags.deleteMany({
              where: { transactionId: parentId },
            });
            await prisma.transaction.deleteMany({
              where: {
                OR: [{ id: parentId }, { parentTransactionId: parentId }],
              },
            });

            return NextResponse.json({
              success: true,
              deletedCount: 1,
              scope: "all",
              message: "Transaction and all occurrences deleted",
            });
          }

          // Recalcular data de fim
          const lastMonth = (startMonth + newInstallments - 1) % 12;
          const lastYear =
            startYear + Math.floor((startMonth + newInstallments - 1) / 12);
          const dayOfMonth =
            parentTransaction.dayOfMonth || startDate.getUTCDate();
          const newEndDate = new Date(
            Date.UTC(
              lastYear,
              lastMonth,
              Math.min(dayOfMonth, getLastDayOfMonth(lastYear, lastMonth)),
              12,
              0,
              0
            )
          );

          await prisma.transaction.update({
            where: { id: parentId },
            data: {
              installments: newInstallments,
              endDate: newEndDate,
            },
          });
        } else if (parentTransaction.isFixed) {
          // Transação fixa - definir data de fim
          const previousMonth = month === 0 ? 11 : month - 1;
          const previousYear = month === 0 ? year - 1 : year;
          const dayOfMonth =
            parentTransaction.dayOfMonth ||
            new Date(
              parentTransaction.startDate || parentTransaction.dueDate
            ).getUTCDate();

          const newEndDate = new Date(
            Date.UTC(
              previousYear,
              previousMonth,
              Math.min(
                dayOfMonth,
                getLastDayOfMonth(previousYear, previousMonth)
              ),
              12,
              0,
              0
            )
          );

          await prisma.transaction.update({
            where: { id: parentId },
            data: {
              isFixed: false, // Não é mais fixa
              endDate: newEndDate,
            },
          });
        }

        // Deletar overrides futuros
        await prisma.transactionOnTags.deleteMany({
          where: {
            transaction: {
              parentTransactionId: parentId,
              isOverride: true,
              overrideForDate: { gte: occurrenceDate },
            },
          },
        });

        const deleted = await prisma.transaction.deleteMany({
          where: {
            parentTransactionId: parentId,
            isOverride: true,
            overrideForDate: { gte: occurrenceDate },
          },
        });

        return NextResponse.json({
          success: true,
          deletedCount: deleted.count + 1,
          scope: "future",
        });
      } else if (scope === "all") {
        // Deletar toda a série
        await prisma.transactionOnTags.deleteMany({
          where: {
            OR: [
              { transactionId: parentId },
              { transaction: { parentTransactionId: parentId } },
            ],
          },
        });

        await prisma.transaction.deleteMany({
          where: { parentTransactionId: parentId },
        });

        await prisma.transaction.delete({
          where: { id: parentId },
        });

        return NextResponse.json({
          success: true,
          scope: "all",
          message: "Transaction series deleted",
        });
      }
    }

    // Não é virtual - verificar se é transação real
    const existingTransaction = await prisma.transaction.findFirst({
      where: { id: transactionId, userId },
    });

    if (!existingTransaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    // Determinar quais transações excluir baseado no escopo
    const transactionIds: string[] = [];

    if (scope === "single") {
      // Se é um override, apenas deletar ele
      if (existingTransaction.isOverride) {
        await prisma.transactionOnTags.deleteMany({
          where: { transactionId: transactionId },
        });
        await prisma.transaction.delete({
          where: { id: transactionId },
        });

        return NextResponse.json({
          success: true,
          deletedCount: 1,
          scope: "single",
        });
      }

      // Se é transação raiz sem filhos, deletar
      transactionIds.push(transactionId);
    } else if (scope === "all") {
      // Deletar toda a série
      const parentId =
        existingTransaction.parentTransactionId || existingTransaction.id;

      await prisma.transactionOnTags.deleteMany({
        where: {
          OR: [
            { transactionId: parentId },
            { transaction: { parentTransactionId: parentId } },
          ],
        },
      });

      await prisma.transaction.deleteMany({
        where: { parentTransactionId: parentId },
      });

      await prisma.transaction.delete({
        where: { id: parentId },
      });

      return NextResponse.json({
        success: true,
        scope: "all",
        message: "Transaction series deleted",
      });
    }

    // Excluir tags associadas
    if (transactionIds.length > 0) {
      await prisma.transactionOnTags.deleteMany({
        where: { transactionId: { in: transactionIds } },
      });

      // Excluir transações
      await prisma.transaction.deleteMany({
        where: { id: { in: transactionIds } },
      });
    }

    return NextResponse.json({
      success: true,
      deletedCount: transactionIds.length,
      scope,
    });
  } catch (error) {
    console.error("Error deleting transaction:", error);
    return NextResponse.json(
      { error: "Failed to delete transaction" },
      { status: 500 }
    );
  }
}
