import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// POST /api/workstation/columns/reorder - Reorder columns
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { columnIds } = body;

    if (!columnIds || !Array.isArray(columnIds)) {
      return NextResponse.json(
        { error: "columnIds array is required" },
        { status: 400 }
      );
    }

    // Update each column's order
    await prisma.$transaction(
      columnIds.map((id, index) =>
        prisma.kanbanColumn.update({
          where: { id },
          data: { order: index },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error reordering columns:", error);
    return NextResponse.json(
      { error: "Failed to reorder columns" },
      { status: 500 }
    );
  }
}
