import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/user-session";
import { NextResponse } from "next/server";

// GET - Buscar configurações do usuário
export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatarColor: true,
        openaiApiKey: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Mascarar a API key para exibição (mostrar apenas últimos 4 caracteres)
    const maskedApiKey = user.openaiApiKey
      ? `sk-...${user.openaiApiKey.slice(-4)}`
      : null;

    return NextResponse.json({
      ...user,
      openaiApiKey: maskedApiKey,
      hasApiKey: !!user.openaiApiKey,
    });
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

// PUT - Atualizar configurações do usuário
export async function PUT(request: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const body = await request.json();
    const { openaiApiKey } = body;

    const updateData: { openaiApiKey?: string | null } = {};

    // Se a apiKey foi fornecida e não é a versão mascarada, atualiza
    if (openaiApiKey !== undefined) {
      if (openaiApiKey === "" || openaiApiKey === null) {
        updateData.openaiApiKey = null;
      } else if (!openaiApiKey.startsWith("sk-...")) {
        // Só atualiza se não for a versão mascarada
        updateData.openaiApiKey = openaiApiKey;
      }
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        avatarColor: true,
        openaiApiKey: true,
      },
    });

    // Mascarar a API key para exibição
    const maskedApiKey = user.openaiApiKey
      ? `sk-...${user.openaiApiKey.slice(-4)}`
      : null;

    return NextResponse.json({
      ...user,
      openaiApiKey: maskedApiKey,
      hasApiKey: !!user.openaiApiKey,
    });
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
