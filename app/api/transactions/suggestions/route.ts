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
    const query = searchParams.get("query");
    const type = searchParams.get("type"); // INCOME ou EXPENSE

    if (!query || query.length < 2) {
      return NextResponse.json([]);
    }

    // Buscar transações únicas por descrição que contenham o termo buscado
    // Agrupa por descrição e pega a mais recente de cada
    const suggestions = await prisma.transaction.findMany({
      where: {
        userId,
        description: {
          contains: query,
          mode: "insensitive",
        },
        isOverride: false,
        ...(type ? { type } : {}),
      },
      select: {
        id: true,
        description: true,
        categoryId: true,
        accountId: true,
        amount: true,
        type: true,
        category: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50, // Pegar mais para depois filtrar duplicados
    });

    // Remover duplicados por descrição (mantendo o mais recente)
    const uniqueSuggestions = suggestions.reduce(
      (acc, curr) => {
        const key = curr.description.toLowerCase();
        if (!acc.map.has(key)) {
          acc.map.set(key, true);
          acc.result.push({
            id: curr.id,
            description: curr.description,
            categoryId: curr.categoryId,
            accountId: curr.accountId,
            amount: curr.amount,
            type: curr.type,
            category: curr.category,
          });
        }
        return acc;
      },
      { map: new Map<string, boolean>(), result: [] as any[] }
    ).result;

    // Limitar a 10 sugestões
    return NextResponse.json(uniqueSuggestions.slice(0, 10));
  } catch (error) {
    console.error("Error fetching transaction suggestions:", error);
    return NextResponse.json(
      { error: "Failed to fetch suggestions" },
      { status: 500 }
    );
  }
}
