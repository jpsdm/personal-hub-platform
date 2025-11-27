import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/user-session";
import { NextRequest, NextResponse } from "next/server";

// GET /api/workstation/boards/[boardId] - Get a board with columns and tasks
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const { boardId } = await params;
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    const board = await prisma.kanbanBoard.findFirst({
      where: {
        id: boardId,
        userId,
      },
      include: {
        columns: {
          orderBy: { order: "asc" },
        },
        tasks: {
          include: {
            pomodoroSessions: {
              where: { status: "COMPLETED" },
              select: {
                id: true,
                duration: true,
                startedAt: true,
                status: true,
              },
              orderBy: { startedAt: "desc" },
            },
          },
          orderBy: { order: "asc" },
        },
      },
    });

    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    // Add total time spent to each task
    const tasksWithTime = board.tasks.map((task) => ({
      ...task,
      totalTimeSpent: task.pomodoroSessions.reduce(
        (sum, session) => sum + session.duration,
        0
      ),
    }));

    return NextResponse.json({
      ...board,
      tasks: tasksWithTime,
    });
  } catch (error) {
    console.error("Error fetching board:", error);
    return NextResponse.json(
      { error: "Failed to fetch board" },
      { status: 500 }
    );
  }
}

// PATCH /api/workstation/boards/[boardId] - Update a board
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const { boardId } = await params;
    const body = await request.json();
    const { name, description, color } = body;

    const board = await prisma.kanbanBoard.update({
      where: { id: boardId },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(color && { color }),
      },
      include: {
        columns: {
          orderBy: { order: "asc" },
        },
      },
    });

    return NextResponse.json(board);
  } catch (error) {
    console.error("Error updating board:", error);
    return NextResponse.json(
      { error: "Failed to update board" },
      { status: 500 }
    );
  }
}

// DELETE /api/workstation/boards/[boardId] - Delete a board
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const { boardId } = await params;

    await prisma.kanbanBoard.delete({
      where: { id: boardId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting board:", error);
    return NextResponse.json(
      { error: "Failed to delete board" },
      { status: 500 }
    );
  }
}
