import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// GET /api/workstation/tasks/[taskId] - Get a task
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        column: {
          include: {
            board: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        board: true,
        pomodoroSessions: {
          orderBy: { startedAt: "desc" },
        },
        timeEntries: {
          orderBy: { startedAt: "desc" },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Calculate total time
    const totalTimeSpent = task.pomodoroSessions
      .filter((s) => s.status === "COMPLETED")
      .reduce((sum, session) => sum + session.duration, 0);

    return NextResponse.json({
      ...task,
      totalTimeSpent,
    });
  } catch (error) {
    console.error("Error fetching task:", error);
    return NextResponse.json(
      { error: "Failed to fetch task" },
      { status: 500 }
    );
  }
}

// PATCH /api/workstation/tasks/[taskId] - Update a task
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    const body = await request.json();
    const { columnId, title, description, priority, dueDate, order } = body;

    const task = await prisma.task.update({
      where: { id: taskId },
      data: {
        ...(columnId && { columnId }),
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(priority && { priority }),
        ...(dueDate !== undefined && {
          dueDate: dueDate ? new Date(dueDate) : null,
        }),
        ...(order !== undefined && { order }),
      },
      include: {
        column: true,
      },
    });

    return NextResponse.json(task);
  } catch (error) {
    console.error("Error updating task:", error);
    return NextResponse.json(
      { error: "Failed to update task" },
      { status: 500 }
    );
  }
}

// DELETE /api/workstation/tasks/[taskId] - Delete a task
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;

    await prisma.task.delete({
      where: { id: taskId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting task:", error);
    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 }
    );
  }
}
