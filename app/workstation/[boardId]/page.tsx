"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { KanbanBoardView } from "@/modules/workstation/components/kanban-board";
import { useKanban } from "@/modules/workstation/hooks/use-kanban";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function BoardPage() {
  const router = useRouter();
  const params = useParams();
  const boardId = params.boardId as string;
  const [userId, setUserId] = useState<string | null>(null);

  const {
    board,
    columns,
    tasks,
    loading: kanbanLoading,
    createColumn,
    updateColumn,
    deleteColumn,
    createTask,
    updateTask,
    deleteTask,
    moveTask,
  } = useKanban(boardId, userId);

  useEffect(() => {
    const storedUserId = sessionStorage.getItem("currentUserId");
    if (!storedUserId) {
      router.push("/profiles");
      return;
    }
    setUserId(storedUserId);
  }, [router]);

  // Handlers for columns
  const handleCreateColumn = async (data: { name: string; color: string }) => {
    try {
      const column = await createColumn({ ...data, boardId });
      toast.success("Coluna criada!");
      return column;
    } catch (error) {
      toast.error("Erro ao criar coluna");
      throw error;
    }
  };

  const handleUpdateColumn = async (
    columnId: string,
    data: { name?: string; color?: string }
  ) => {
    try {
      const column = await updateColumn(columnId, data);
      toast.success("Coluna atualizada!");
      return column;
    } catch (error) {
      toast.error("Erro ao atualizar coluna");
      throw error;
    }
  };

  const handleDeleteColumn = async (columnId: string) => {
    try {
      await deleteColumn(columnId);
      toast.success("Coluna excluída!");
    } catch (error) {
      toast.error("Erro ao excluir coluna");
      throw error;
    }
  };

  // Handlers for tasks
  const handleCreateTask = async (data: {
    boardId: string;
    columnId: string;
    title: string;
    description?: string;
    priority?: string;
    dueDate?: Date;
  }) => {
    try {
      const task = await createTask(data as any);
      toast.success("Tarefa criada!");
      // Notify layout to refresh tasks list
      window.dispatchEvent(new CustomEvent("refreshTasks"));
      return task;
    } catch (error) {
      toast.error("Erro ao criar tarefa");
      throw error;
    }
  };

  const handleUpdateTask = async (
    taskId: string,
    data: {
      columnId?: string;
      title?: string;
      description?: string;
      priority?: string;
      dueDate?: Date | null;
      order?: number;
    }
  ) => {
    try {
      const task = await updateTask(taskId, data as any);
      toast.success("Tarefa atualizada!");
      return task;
    } catch (error) {
      toast.error("Erro ao atualizar tarefa");
      throw error;
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(taskId);
      toast.success("Tarefa excluída!");
    } catch (error) {
      toast.error("Erro ao excluir tarefa");
      throw error;
    }
  };

  const handleMoveTask = async (input: {
    taskId: string;
    targetColumnId: string;
    targetOrder: number;
  }) => {
    try {
      await moveTask(input);
    } catch (error) {
      toast.error("Erro ao mover tarefa");
      throw error;
    }
  };

  const handleStartPomodoro = (taskId: string) => {
    // Dispatch event to layout's pomodoro timer
    window.dispatchEvent(
      new CustomEvent("startPomodoro", { detail: { taskId } })
    );
  };

  const handleBack = () => {
    router.push("/workstation");
  };

  if (!userId) {
    return null;
  }

  if (kanbanLoading) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10" />
            <div className="flex items-center gap-3">
              <Skeleton className="w-8 h-8 rounded-lg" />
              <div>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32 mt-1" />
              </div>
            </div>
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="flex gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="shrink-0 w-72">
              <Skeleton className="h-8 w-full mb-3" />
              <Skeleton className="h-64 w-full rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!board) {
    // Board not found, redirect to workstation
    router.push("/workstation");
    return null;
  }

  return (
    <KanbanBoardView
      board={board}
      columns={columns}
      tasks={tasks}
      onBack={handleBack}
      onCreateColumn={handleCreateColumn}
      onUpdateColumn={handleUpdateColumn}
      onDeleteColumn={handleDeleteColumn}
      onCreateTask={handleCreateTask}
      onUpdateTask={handleUpdateTask}
      onDeleteTask={handleDeleteTask}
      onMoveTask={handleMoveTask}
      onStartPomodoro={handleStartPomodoro}
    />
  );
}
