import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// POST /api/workstation/tasks/move - Move a task to a different column/position
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskId, targetColumnId, targetOrder } = body;

    if (!taskId || !targetColumnId || targetOrder === undefined) {
      return NextResponse.json(
        { error: "taskId, targetColumnId, and targetOrder are required" },
        { status: 400 }
      );
    }

    // Get current task
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { columnId: true, order: true },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const sourceColumnId = task.columnId;
    const sourceOrder = task.order;

    await prisma.$transaction(async (tx) => {
      // If moving within the same column
      if (sourceColumnId === targetColumnId) {
        if (sourceOrder < targetOrder) {
          // Moving down: decrease order of tasks between old and new position
          await tx.task.updateMany({
            where: {
              columnId: targetColumnId,
              order: {
                gt: sourceOrder,
                lte: targetOrder,
              },
            },
            data: {
              order: { decrement: 1 },
            },
          });
        } else if (sourceOrder > targetOrder) {
          // Moving up: increase order of tasks between new and old position
          await tx.task.updateMany({
            where: {
              columnId: targetColumnId,
              order: {
                gte: targetOrder,
                lt: sourceOrder,
              },
            },
            data: {
              order: { increment: 1 },
            },
          });
        }
      } else {
        // Moving to different column

        // Decrease order of tasks after the moved task in source column
        await tx.task.updateMany({
          where: {
            columnId: sourceColumnId,
            order: { gt: sourceOrder },
          },
          data: {
            order: { decrement: 1 },
          },
        });

        // Increase order of tasks at and after target position in target column
        await tx.task.updateMany({
          where: {
            columnId: targetColumnId,
            order: { gte: targetOrder },
          },
          data: {
            order: { increment: 1 },
          },
        });
      }

      // Update the task
      await tx.task.update({
        where: { id: taskId },
        data: {
          columnId: targetColumnId,
          order: targetOrder,
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error moving task:", error);
    return NextResponse.json({ error: "Failed to move task" }, { status: 500 });
  }
}
