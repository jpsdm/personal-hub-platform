import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/user-session";
import { NextRequest, NextResponse } from "next/server";

// GET /api/workstation/pomodoro - List pomodoro sessions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = await getCurrentUserId();
    const taskId = searchParams.get("taskId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    // Get sessions from the last 7 days to ensure we have recent data
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const sessions = await prisma.pomodoroSession.findMany({
      where: {
        userId,
        ...(taskId && { taskId }),
        startedAt: {
          gte: sevenDaysAgo,
        },
      },
      include: {
        task: {
          select: {
            id: true,
            code: true,
            title: true,
          },
        },
      },
      orderBy: { startedAt: "desc" },
    });

    return NextResponse.json(sessions);
  } catch (error) {
    console.error("Error fetching pomodoro sessions:", error);
    return NextResponse.json(
      { error: "Failed to fetch sessions" },
      { status: 500 }
    );
  }
}

// POST /api/workstation/pomodoro - Start a new pomodoro session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userId = await getCurrentUserId();
    const { taskId, type } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    // Check if there's already a running session
    const runningSession = await prisma.pomodoroSession.findFirst({
      where: {
        userId,
        status: { in: ["RUNNING", "PAUSED"] },
      },
    });

    if (runningSession) {
      return NextResponse.json(
        { error: "There is already an active session" },
        { status: 400 }
      );
    }

    const session = await prisma.pomodoroSession.create({
      data: {
        userId,
        taskId: taskId || null,
        type: type || "WORK",
        startedAt: new Date(),
        status: "RUNNING",
      },
      include: {
        task: {
          select: {
            id: true,
            code: true,
            title: true,
          },
        },
      },
    });

    return NextResponse.json(session);
  } catch (error) {
    console.error("Error starting pomodoro session:", error);
    return NextResponse.json(
      { error: "Failed to start session" },
      { status: 500 }
    );
  }
}
