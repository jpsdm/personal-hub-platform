import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// PATCH /api/workstation/pomodoro/[sessionId] - Update a pomodoro session
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const body = await request.json();
    const { action, duration, taskId } = body;

    const session = await prisma.pomodoroSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    let updateData: Record<string, unknown> = {};

    switch (action) {
      case "pause":
        if (session.status !== "RUNNING") {
          return NextResponse.json(
            { error: "Session is not running" },
            { status: 400 }
          );
        }
        updateData = {
          status: "PAUSED",
          pausedAt: new Date(),
        };
        break;

      case "resume":
        if (session.status !== "PAUSED") {
          return NextResponse.json(
            { error: "Session is not paused" },
            { status: 400 }
          );
        }
        // Calculate paused time
        const pausedDuration = session.pausedAt
          ? Math.floor(
              (Date.now() - new Date(session.pausedAt).getTime()) / 1000
            )
          : 0;
        updateData = {
          status: "RUNNING",
          pausedAt: null,
          pausedTime: session.pausedTime + pausedDuration,
        };
        break;

      case "stop":
        if (session.status !== "RUNNING" && session.status !== "PAUSED") {
          return NextResponse.json(
            { error: "Session is not active" },
            { status: 400 }
          );
        }

        // Calculate final duration
        let finalDuration = duration;
        if (!finalDuration) {
          const startTime = new Date(session.startedAt).getTime();
          let pausedTime = session.pausedTime;

          // If currently paused, add the current pause duration
          if (session.status === "PAUSED" && session.pausedAt) {
            pausedTime += Math.floor(
              (Date.now() - new Date(session.pausedAt).getTime()) / 1000
            );
          }

          finalDuration =
            Math.floor((Date.now() - startTime) / 1000) - pausedTime;
        }

        updateData = {
          status: "COMPLETED",
          endedAt: new Date(),
          duration: Math.max(0, finalDuration),
          pausedAt: null,
        };

        // Create time entry if linked to a task
        if (session.taskId) {
          await prisma.timeEntry.create({
            data: {
              userId: session.userId,
              taskId: session.taskId,
              description: `Pomodoro session`,
              startedAt: session.startedAt,
              endedAt: new Date(),
              duration: Math.max(0, finalDuration),
            },
          });
        }
        break;

      case "cancel":
        updateData = {
          status: "CANCELLED",
          endedAt: new Date(),
          pausedAt: null,
        };
        break;

      case "link-task":
        if (!taskId) {
          return NextResponse.json(
            { error: "taskId is required" },
            { status: 400 }
          );
        }
        updateData = { taskId };
        break;

      case "unlink-task":
        updateData = { taskId: null };
        break;

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const updatedSession = await prisma.pomodoroSession.update({
      where: { id: sessionId },
      data: updateData,
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

    return NextResponse.json(updatedSession);
  } catch (error) {
    console.error("Error updating pomodoro session:", error);
    return NextResponse.json(
      { error: "Failed to update session" },
      { status: 500 }
    );
  }
}

// DELETE /api/workstation/pomodoro/[sessionId] - Delete a session
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    await prisma.pomodoroSession.delete({
      where: { id: sessionId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting pomodoro session:", error);
    return NextResponse.json(
      { error: "Failed to delete session" },
      { status: 500 }
    );
  }
}
