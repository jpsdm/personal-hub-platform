import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/user-session";
import { NextRequest, NextResponse } from "next/server";

// GET /api/workstation/boards - List all boards for user
export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    const boards = await prisma.kanbanBoard.findMany({
      where: { userId },
      include: {
        columns: {
          orderBy: { order: "asc" },
        },
        _count: {
          select: { tasks: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(boards);
  } catch (error) {
    console.error("Error fetching boards:", error);
    return NextResponse.json(
      { error: "Failed to fetch boards" },
      { status: 500 }
    );
  }
}

// POST /api/workstation/boards - Create a new board
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, color } = body;
    const userId = await getCurrentUserId();

    if (!userId || !name) {
      return NextResponse.json(
        { error: "userId and name are required" },
        { status: 400 }
      );
    }

    // Create board with default columns
    const board = await prisma.kanbanBoard.create({
      data: {
        userId,
        name,
        description,
        color: color || "#3B82F6",
        columns: {
          create: [
            { name: "Backlog", color: "#6B7280", order: 0 },
            { name: "Em Progresso", color: "#3B82F6", order: 1 },
            { name: "Em Teste", color: "#F59E0B", order: 2 },
            { name: "Finalizado", color: "#10B981", order: 3 },
          ],
        },
      },
      include: {
        columns: {
          orderBy: { order: "asc" },
        },
      },
    });

    return NextResponse.json(board);
  } catch (error) {
    console.error("Error creating board:", error);
    return NextResponse.json(
      { error: "Failed to create board" },
      { status: 500 }
    );
  }
}
