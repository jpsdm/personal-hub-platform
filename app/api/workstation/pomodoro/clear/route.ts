import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/user-session";
import { NextRequest, NextResponse } from "next/server";

// DELETE /api/workstation/pomodoro/clear - Clear pomodoro sessions and time entries
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = await getCurrentUserId();
    const boardId = searchParams.get("boardId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    let pomodoroDeleteCount: number;
    let timeEntryDeleteCount: number;

    if (boardId) {
      // Delete sessions and time entries for a specific board
      // First, get all task IDs for the board
      const tasks = await prisma.task.findMany({
        where: {
          userId,
          boardId,
        },
        select: {
          id: true,
        },
      });

      const taskIds = tasks.map((t) => t.id);

      // Delete pomodoro sessions linked to those tasks
      const pomodoroResult = await prisma.pomodoroSession.deleteMany({
        where: {
          userId,
          taskId: {
            in: taskIds,
          },
        },
      });

      // Delete time entries linked to those tasks
      const timeEntryResult = await prisma.timeEntry.deleteMany({
        where: {
          userId,
          taskId: {
            in: taskIds,
          },
        },
      });

      pomodoroDeleteCount = pomodoroResult.count;
      timeEntryDeleteCount = timeEntryResult.count;
    } else {
      // Delete all sessions and time entries for the user
      const pomodoroResult = await prisma.pomodoroSession.deleteMany({
        where: {
          userId,
        },
      });

      const timeEntryResult = await prisma.timeEntry.deleteMany({
        where: {
          userId,
        },
      });

      pomodoroDeleteCount = pomodoroResult.count;
      timeEntryDeleteCount = timeEntryResult.count;
    }

    return NextResponse.json({
      success: true,
      deletedCount: pomodoroDeleteCount + timeEntryDeleteCount,
      pomodoroSessions: pomodoroDeleteCount,
      timeEntries: timeEntryDeleteCount,
    });
  } catch (error) {
    console.error("Error clearing pomodoro sessions and time entries:", error);
    return NextResponse.json(
      { error: "Failed to clear sessions" },
      { status: 500 }
    );
  }
}
