import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// POST /api/workstation/columns - Create a new column
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { boardId, name, color, order } = body;

    if (!boardId || !name) {
      return NextResponse.json(
        { error: "boardId and name are required" },
        { status: 400 }
      );
    }

    // Get the max order for the board if not provided
    let columnOrder = order;
    if (columnOrder === undefined) {
      const maxOrder = await prisma.kanbanColumn.findFirst({
        where: { boardId },
        orderBy: { order: "desc" },
        select: { order: true },
      });
      columnOrder = (maxOrder?.order ?? -1) + 1;
    }

    const column = await prisma.kanbanColumn.create({
      data: {
        boardId,
        name,
        color: color || "#6B7280",
        order: columnOrder,
      },
    });

    return NextResponse.json(column);
  } catch (error) {
    console.error("Error creating column:", error);
    return NextResponse.json(
      { error: "Failed to create column" },
      { status: 500 }
    );
  }
}
