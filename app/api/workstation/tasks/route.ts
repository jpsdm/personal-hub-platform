import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/user-session";
import { getBoardPrefix } from "@/modules/workstation/lib/utils";
import { NextRequest, NextResponse } from "next/server";

// GET /api/workstation/tasks - List tasks (with optional filters)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = await getCurrentUserId();

    const boardId = searchParams.get("boardId");
    const columnId = searchParams.get("columnId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    const tasks = await prisma.task.findMany({
      where: {
        userId,
        ...(boardId && { boardId }),
        ...(columnId && { columnId }),
      },
      include: {
        column: true,
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
    });

    // Add total time spent to each task
    const tasksWithTime = tasks.map((task) => ({
      ...task,
      totalTimeSpent: task.pomodoroSessions.reduce(
        (sum, session) => sum + session.duration,
        0
      ),
    }));

    return NextResponse.json(tasksWithTime);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}

// POST /api/workstation/tasks - Create a new task
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { boardId, columnId, title, description, priority, dueDate } = body;

    const userId = await getCurrentUserId();

    if (!userId || !boardId || !columnId || !title) {
      return NextResponse.json(
        { error: "userId, boardId, columnId, and title are required" },
        { status: 400 }
      );
    }

    // Get board info for code prefix
    const board = await prisma.kanbanBoard.findUnique({
      where: { id: boardId },
      select: { name: true },
    });

    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    // Get next task number for this board
    const taskCount = await prisma.task.count({
      where: { boardId },
    });

    const prefix = getBoardPrefix(board.name);
    const code = `${prefix}-${(taskCount + 1).toString().padStart(3, "0")}`;

    // Get max order in column
    const maxOrder = await prisma.task.findFirst({
      where: { columnId },
      orderBy: { order: "desc" },
      select: { order: true },
    });

    const task = await prisma.task.create({
      data: {
        userId,
        boardId,
        columnId,
        code,
        title,
        description,
        priority: priority || "MEDIUM",
        dueDate: dueDate ? new Date(dueDate) : null,
        order: (maxOrder?.order ?? -1) + 1,
      },
      include: {
        column: true,
      },
    });

    return NextResponse.json(task);
  } catch (error) {
    console.error("Error creating task:", error);
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    );
  }
}
