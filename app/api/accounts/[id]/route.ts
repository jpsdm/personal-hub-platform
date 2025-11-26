import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/user-session";
import type { Params } from "next/dist/server/request/params";
import { NextResponse } from "next/server";

export async function PUT(request: Request, context: { params: Params }) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = (await context.params) as { id: string };
    const body = await request.json();
    const {
      name,
      initialBalance,
      balanceAdjustment,
      createCorrectionTransaction,
    } = body;

    const existingAccount = await prisma.account.findFirst({
      where: { id: params.id, userId },
    });

    if (!existingAccount) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Atualizar a conta
    const account = await prisma.account.update({
      where: { id: params.id },
      data: {
        name,
        // Se não for criar transação de correção, ajustar o saldo inicial
        initialBalance: createCorrectionTransaction
          ? existingAccount.initialBalance
          : existingAccount.initialBalance + (balanceAdjustment || 0),
      },
    });

    // Se for criar transação de correção e houver ajuste
    if (
      createCorrectionTransaction &&
      balanceAdjustment &&
      balanceAdjustment !== 0
    ) {
      const isIncome = balanceAdjustment > 0;
      const transactionType = isIncome ? "INCOME" : "EXPENSE";

      // Buscar ou criar categoria de "Ajuste de Saldo"
      let adjustmentCategory = await prisma.category.findFirst({
        where: {
          name: "Ajuste de Saldo",
          type: transactionType,
          OR: [{ userId: null, isDefault: true }, { userId }],
        },
      });

      if (!adjustmentCategory) {
        adjustmentCategory = await prisma.category.create({
          data: {
            name: "Ajuste de Saldo",
            type: transactionType,
            color: isIncome ? "#22c55e" : "#ef4444",
            userId,
            isDefault: false,
          },
        });
      }

      // Criar a transação de correção
      await prisma.transaction.create({
        data: {
          userId,
          accountId: params.id,
          categoryId: adjustmentCategory.id,
          type: transactionType,
          description: `Correção de saldo - ${name}`,
          amount: Math.abs(balanceAdjustment),
          dueDate: new Date(),
          paidDate: new Date(),
          status: "PAID",
          notes:
            "Transação criada automaticamente para ajuste de saldo da conta",
        },
      });
    }

    return NextResponse.json(account);
  } catch (error) {
    console.error("Error updating account:", error);
    return NextResponse.json(
      { error: "Failed to update account" },
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

    // Ler body para pegar a ação desejada
    let action = "check"; // check, delete_all, transfer
    let transferToAccountId: string | null = null;

    try {
      const body = await request.json();
      action = body.action || "check";
      transferToAccountId = body.transferToAccountId || null;
    } catch {
      // Se não tiver body, é uma verificação inicial
      action = "check";
    }

    const existingAccount = await prisma.account.findFirst({
      where: { id: params.id, userId },
    });

    if (!existingAccount) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Bloquear exclusão de conta padrão
    if (existingAccount.isDefault) {
      return NextResponse.json(
        { error: "A conta padrão não pode ser excluída" },
        { status: 403 }
      );
    }

    const transactionCount = await prisma.transaction.count({
      where: { accountId: params.id },
    });

    // Se for apenas verificação, retornar informações
    if (action === "check") {
      if (transactionCount > 0) {
        // Buscar outras contas para transferência
        const otherAccounts = await prisma.account.findMany({
          where: { userId, id: { not: params.id } },
          select: { id: true, name: true, isDefault: true },
          orderBy: { isDefault: "desc" },
        });

        return NextResponse.json({
          hasTransactions: true,
          transactionCount,
          availableAccounts: otherAccounts,
        });
      }

      // Sem transações, pode excluir diretamente
      await prisma.account.delete({
        where: { id: params.id },
      });
      return NextResponse.json({ success: true });
    }

    // Ação: Excluir conta e todas as transações
    if (action === "delete_all") {
      await prisma.$transaction(async (tx) => {
        // Primeiro deletar tags das transações
        await tx.transactionOnTags.deleteMany({
          where: { transaction: { accountId: params.id } },
        });

        // Deletar transações
        await tx.transaction.deleteMany({
          where: { accountId: params.id },
        });

        // Deletar conta
        await tx.account.delete({
          where: { id: params.id },
        });
      });

      return NextResponse.json({
        success: true,
        deletedTransactions: transactionCount,
      });
    }

    // Ação: Transferir transações para outra conta
    if (action === "transfer" && transferToAccountId) {
      // Verificar se a conta destino existe e pertence ao usuário
      const targetAccount = await prisma.account.findFirst({
        where: { id: transferToAccountId, userId },
      });

      if (!targetAccount) {
        return NextResponse.json(
          { error: "Conta destino não encontrada" },
          { status: 404 }
        );
      }

      await prisma.$transaction(async (tx) => {
        // Transferir transações para a nova conta
        await tx.transaction.updateMany({
          where: { accountId: params.id },
          data: { accountId: transferToAccountId! },
        });

        // Deletar conta original
        await tx.account.delete({
          where: { id: params.id },
        });
      });

      return NextResponse.json({
        success: true,
        transferredTransactions: transactionCount,
        transferredTo: targetAccount.name,
      });
    }

    return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
  } catch (error) {
    console.error("Error deleting account:", error);
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    );
  }
}
