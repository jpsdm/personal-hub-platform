import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/user-session";
import { NextResponse } from "next/server";

// DELETE /api/workstation/pomodoro/reset-today - Delete all today's sessions
export async function DELETE() {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    // Get today's date range in local time
    const now = new Date();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0,
      0
    );
    const endOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999
    );

    // Delete all completed sessions from today
    const result = await prisma.pomodoroSession.deleteMany({
      where: {
        userId,
        status: "COMPLETED",
        startedAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    return NextResponse.json({
      success: true,
      deletedCount: result.count,
    });
  } catch (error) {
    console.error("Error resetting today's sessions:", error);
    return NextResponse.json(
      { error: "Failed to reset sessions" },
      { status: 500 }
    );
  }
}
