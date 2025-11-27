import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/user-session";
import { NextRequest, NextResponse } from "next/server";

// GET /api/workstation/pomodoro/stats - Get pomodoro statistics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = await getCurrentUserId();
    const period = searchParams.get("period") || "week"; // week, month, year
    const boardId = searchParams.get("boardId");
    const taskId = searchParams.get("taskId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    // Calculate date range based on period
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case "week":
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case "month":
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 1);
        break;
      case "year":
        startDate = new Date(now);
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
    }

    // Build task filter if boardId is provided
    let taskFilter = {};
    if (boardId) {
      taskFilter = {
        task: {
          boardId,
        },
      };
    }
    if (taskId) {
      taskFilter = {
        taskId,
      };
    }

    // Fetch all completed sessions in the period
    const sessions = await prisma.pomodoroSession.findMany({
      where: {
        userId,
        status: "COMPLETED",
        startedAt: {
          gte: startDate,
        },
        ...taskFilter,
      },
      include: {
        task: {
          select: {
            id: true,
            code: true,
            title: true,
            boardId: true,
            board: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
          },
        },
      },
      orderBy: { startedAt: "asc" },
    });

    // Calculate total focus time
    const totalFocusTime = sessions.reduce((acc, s) => acc + s.duration, 0);

    // Group sessions by day for streak calculation and daily stats
    const sessionsByDay: Record<string, typeof sessions> = {};
    sessions.forEach((session) => {
      const dateKey = new Date(session.startedAt).toISOString().split("T")[0];
      if (!sessionsByDay[dateKey]) {
        sessionsByDay[dateKey] = [];
      }
      sessionsByDay[dateKey].push(session);
    });

    // Calculate daily focus hours for chart
    const dailyFocusData: { date: string; hours: number; sessions: number }[] =
      [];
    const currentDate = new Date(startDate);
    while (currentDate <= now) {
      const dateKey = currentDate.toISOString().split("T")[0];
      const daySessions = sessionsByDay[dateKey] || [];
      const totalSeconds = daySessions.reduce((acc, s) => acc + s.duration, 0);
      dailyFocusData.push({
        date: dateKey,
        hours: Math.round((totalSeconds / 3600) * 100) / 100,
        sessions: daySessions.length,
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Calculate successful days (days with at least one completed pomodoro)
    const successfulDays = Object.keys(sessionsByDay).length;

    // Calculate current streak
    let currentStreak = 0;
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000)
      .toISOString()
      .split("T")[0];

    // Check if today or yesterday has sessions to start counting
    if (sessionsByDay[today] || sessionsByDay[yesterday]) {
      let checkDate = new Date(sessionsByDay[today] ? today : yesterday);
      while (true) {
        const dateKey = checkDate.toISOString().split("T")[0];
        if (sessionsByDay[dateKey]) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
    }

    // Calculate longest streak (all time)
    const allTimeSessions = await prisma.pomodoroSession.findMany({
      where: {
        userId,
        status: "COMPLETED",
      },
      select: {
        startedAt: true,
      },
      orderBy: { startedAt: "asc" },
    });

    const allDays = new Set<string>();
    allTimeSessions.forEach((s) => {
      allDays.add(new Date(s.startedAt).toISOString().split("T")[0]);
    });

    const sortedDays = Array.from(allDays).sort();
    let longestStreak = 0;
    let tempStreak = 0;
    let prevDate: Date | null = null;

    sortedDays.forEach((dateStr) => {
      const currentDate = new Date(dateStr);
      if (prevDate) {
        const diffDays = Math.round(
          (currentDate.getTime() - prevDate.getTime()) / 86400000
        );
        if (diffDays === 1) {
          tempStreak++;
        } else {
          tempStreak = 1;
        }
      } else {
        tempStreak = 1;
      }
      longestStreak = Math.max(longestStreak, tempStreak);
      prevDate = currentDate;
    });

    // Group by board
    const byBoard: Record<
      string,
      {
        id: string;
        name: string;
        color: string;
        totalTime: number;
        sessions: number;
      }
    > = {};
    sessions.forEach((session) => {
      if (session.task?.board) {
        const board = session.task.board;
        if (!byBoard[board.id]) {
          byBoard[board.id] = {
            id: board.id,
            name: board.name,
            color: board.color,
            totalTime: 0,
            sessions: 0,
          };
        }
        byBoard[board.id].totalTime += session.duration;
        byBoard[board.id].sessions++;
      }
    });

    // Group by task
    const byTask: Record<
      string,
      {
        id: string;
        code: string;
        title: string;
        totalTime: number;
        sessions: number;
      }
    > = {};
    sessions.forEach((session) => {
      if (session.task) {
        if (!byTask[session.task.id]) {
          byTask[session.task.id] = {
            id: session.task.id,
            code: session.task.code,
            title: session.task.title,
            totalTime: 0,
            sessions: 0,
          };
        }
        byTask[session.task.id].totalTime += session.duration;
        byTask[session.task.id].sessions++;
      }
    });

    // Get total completed pomodoros all time
    const totalPomodorosAllTime = await prisma.pomodoroSession.count({
      where: {
        userId,
        status: "COMPLETED",
      },
    });

    return NextResponse.json({
      summary: {
        totalFocusTime, // in seconds
        totalSessions: sessions.length,
        successfulDays,
        currentStreak,
        longestStreak,
        totalPomodorosAllTime,
        averageSessionsPerDay:
          successfulDays > 0
            ? Math.round((sessions.length / successfulDays) * 10) / 10
            : 0,
      },
      dailyFocusData,
      byBoard: Object.values(byBoard).sort((a, b) => b.totalTime - a.totalTime),
      byTask: Object.values(byTask).sort((a, b) => b.totalTime - a.totalTime),
    });
  } catch (error) {
    console.error("Error fetching pomodoro stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
