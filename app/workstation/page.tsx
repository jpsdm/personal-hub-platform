"use client";

import { BoardsList } from "@/modules/workstation/components/boards-list";
import { KanbanBoardView } from "@/modules/workstation/components/kanban-board";
import { useBoards } from "@/modules/workstation/hooks/use-boards";
import { useKanban } from "@/modules/workstation/hooks/use-kanban";
import type { KanbanBoard } from "@/modules/workstation/types";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function WorkstationPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedBoard, setSelectedBoard] = useState<KanbanBoard | null>(null);

  // Initialize hooks
  const {
    boards,
    loading: boardsLoading,
    createBoard,
    updateBoard,
    deleteBoard,
  } = useBoards(userId);

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
    fetchBoard,
  } = useKanban(selectedBoard?.id || null, userId);

  useEffect(() => {
    const storedUserId = sessionStorage.getItem("currentUserId");
    if (!storedUserId) {
      router.push("/profiles");
      return;
    }
    setUserId(storedUserId);
  }, [router]);

  // Handlers for boards
  const handleCreateBoard = async (data: {
    name: string;
    description?: string;
    color?: string;
  }) => {
    try {
      await createBoard(data);
      toast.success("Quadro criado com sucesso!");
    } catch (error) {
      toast.error("Erro ao criar quadro");
      throw error;
    }
  };

  const handleUpdateBoard = async (
    boardId: string,
    data: { name?: string; description?: string; color?: string }
  ) => {
    try {
      await updateBoard(boardId, data);
      toast.success("Quadro atualizado!");
    } catch (error) {
      toast.error("Erro ao atualizar quadro");
      throw error;
    }
  };

  const handleDeleteBoard = async (boardId: string) => {
    try {
      await deleteBoard(boardId);
      toast.success("Quadro excluído!");
    } catch (error) {
      toast.error("Erro ao excluir quadro");
      throw error;
    }
  };

  // Handlers for columns
  const handleCreateColumn = async (data: { name: string; color: string }) => {
    if (!selectedBoard) throw new Error("No board selected");
    try {
      const column = await createColumn({ ...data, boardId: selectedBoard.id });
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

  if (!userId) {
    return null;
  }

  // Show board view if a board is selected
  if (selectedBoard && board) {
    return (
      <KanbanBoardView
        board={board}
        columns={columns}
        tasks={tasks}
        onBack={() => setSelectedBoard(null)}
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

  // Show boards list
  return (
    <BoardsList
      boards={boards}
      loading={boardsLoading || (selectedBoard !== null && kanbanLoading)}
      onCreateBoard={handleCreateBoard}
      onUpdateBoard={handleUpdateBoard}
      onDeleteBoard={handleDeleteBoard}
      onSelectBoard={setSelectedBoard}
    />
  );
}
