import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// PATCH /api/workstation/columns/[columnId] - Update a column
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ columnId: string }> }
) {
  try {
    const { columnId } = await params;
    const body = await request.json();
    const { name, color, order } = body;

    const column = await prisma.kanbanColumn.update({
      where: { id: columnId },
      data: {
        ...(name && { name }),
        ...(color && { color }),
        ...(order !== undefined && { order }),
      },
    });

    return NextResponse.json(column);
  } catch (error) {
    console.error("Error updating column:", error);
    return NextResponse.json(
      { error: "Failed to update column" },
      { status: 500 }
    );
  }
}

// DELETE /api/workstation/columns/[columnId] - Delete a column
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ columnId: string }> }
) {
  try {
    const { columnId } = await params;

    await prisma.kanbanColumn.delete({
      where: { id: columnId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting column:", error);
    return NextResponse.json(
      { error: "Failed to delete column" },
      { status: 500 }
    );
  }
}
