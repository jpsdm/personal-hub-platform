import { prisma } from "@/lib/db";
import { Params } from "next/dist/server/request/params";
import { NextResponse } from "next/server";

export async function PUT(request: Request, context: { params: Params }) {
  try {
    const params = (await context.params) as { id: string };

    // Verificar se é categoria padrão
    const existingCategory = await prisma.category.findUnique({
      where: { id: params.id },
    });

    if (!existingCategory) {
      return NextResponse.json(
        { error: "Categoria não encontrada" },
        { status: 404 }
      );
    }

    if (existingCategory.isDefault) {
      return NextResponse.json(
        { error: "Categorias padrão não podem ser editadas" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, type } = body;

    const category = await prisma.category.update({
      where: { id: params.id },
      data: { name, type },
    });

    return NextResponse.json(category);
  } catch (error) {
    console.error("Error updating category:", error);
    return NextResponse.json(
      { error: "Failed to update category" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, context: { params: Params }) {
  try {
    const params = (await context.params) as { id: string };

    // Verificar se é categoria padrão
    const existingCategory = await prisma.category.findUnique({
      where: { id: params.id },
    });

    if (!existingCategory) {
      return NextResponse.json(
        { error: "Categoria não encontrada" },
        { status: 404 }
      );
    }

    if (existingCategory.isDefault) {
      return NextResponse.json(
        { error: "Categorias padrão não podem ser excluídas" },
        { status: 403 }
      );
    }

    // Check if category is used by any transactions
    const transactionCount = await prisma.transaction.count({
      where: { categoryId: params.id },
    });

    if (transactionCount > 0) {
      return NextResponse.json(
        {
          error:
            "Não é possível excluir uma categoria que possui transações vinculadas",
        },
        { status: 400 }
      );
    }

    await prisma.category.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting category:", error);
    return NextResponse.json(
      { error: "Failed to delete category" },
      { status: 500 }
    );
  }
}
