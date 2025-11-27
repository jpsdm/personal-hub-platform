"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  CreateColumnInput,
  CreateTaskInput,
  KanbanBoard,
  KanbanColumn,
  MoveTaskInput,
  Task,
  UpdateColumnInput,
  UpdateTaskInput,
} from "../types";

interface UseKanbanReturn {
  board: KanbanBoard | null;
  columns: KanbanColumn[];
  tasks: Task[];
  loading: boolean;
  error: string | null;
  fetchBoard: () => Promise<void>;
  createColumn: (input: CreateColumnInput) => Promise<KanbanColumn>;
  updateColumn: (
    columnId: string,
    input: UpdateColumnInput
  ) => Promise<KanbanColumn>;
  deleteColumn: (columnId: string) => Promise<void>;
  reorderColumns: (columnIds: string[]) => Promise<void>;
  createTask: (input: CreateTaskInput) => Promise<Task>;
  updateTask: (taskId: string, input: UpdateTaskInput) => Promise<Task>;
  deleteTask: (taskId: string) => Promise<void>;
  moveTask: (input: MoveTaskInput) => Promise<void>;
}

export function useKanban(
  boardId: string | null,
  userId: string | null
): UseKanbanReturn {
  const [board, setBoard] = useState<KanbanBoard | null>(null);
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBoard = useCallback(async () => {
    if (!boardId || !userId) return;

    try {
      setLoading(true);
      const response = await fetch(
        `/api/workstation/boards/${boardId}?userId=${userId}`
      );
      if (!response.ok) throw new Error("Failed to fetch board");
      const data = await response.json();
      setBoard(data);
      setColumns(data.columns || []);
      setTasks(data.tasks || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [boardId, userId]);

  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

  const createColumn = async (
    input: CreateColumnInput
  ): Promise<KanbanColumn> => {
    const response = await fetch("/api/workstation/columns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (!response.ok) throw new Error("Failed to create column");

    const newColumn = await response.json();
    setColumns((prev) =>
      [...prev, newColumn].sort((a, b) => a.order - b.order)
    );
    return newColumn;
  };

  const updateColumn = async (
    columnId: string,
    input: UpdateColumnInput
  ): Promise<KanbanColumn> => {
    const response = await fetch(`/api/workstation/columns/${columnId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (!response.ok) throw new Error("Failed to update column");

    const updatedColumn = await response.json();
    setColumns((prev) =>
      prev.map((c) => (c.id === columnId ? updatedColumn : c))
    );
    return updatedColumn;
  };

  const deleteColumn = async (columnId: string): Promise<void> => {
    const response = await fetch(`/api/workstation/columns/${columnId}`, {
      method: "DELETE",
    });

    if (!response.ok) throw new Error("Failed to delete column");

    setColumns((prev) => prev.filter((c) => c.id !== columnId));
    setTasks((prev) => prev.filter((t) => t.columnId !== columnId));
  };

  const reorderColumns = async (columnIds: string[]): Promise<void> => {
    const response = await fetch("/api/workstation/columns/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ columnIds }),
    });

    if (!response.ok) throw new Error("Failed to reorder columns");

    // Update local state with new order
    setColumns((prev) => {
      const columnMap = new Map(prev.map((c) => [c.id, c]));
      return columnIds
        .map((id, index) => {
          const column = columnMap.get(id);
          return column ? { ...column, order: index } : null;
        })
        .filter((c): c is KanbanColumn => c !== null);
    });
  };

  const createTask = async (input: CreateTaskInput): Promise<Task> => {
    const response = await fetch("/api/workstation/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...input, userId }),
    });

    if (!response.ok) throw new Error("Failed to create task");

    const newTask = await response.json();
    setTasks((prev) => [...prev, newTask]);
    return newTask;
  };

  const updateTask = async (
    taskId: string,
    input: UpdateTaskInput
  ): Promise<Task> => {
    const response = await fetch(`/api/workstation/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (!response.ok) throw new Error("Failed to update task");

    const updatedTask = await response.json();
    setTasks((prev) => prev.map((t) => (t.id === taskId ? updatedTask : t)));
    return updatedTask;
  };

  const deleteTask = async (taskId: string): Promise<void> => {
    const response = await fetch(`/api/workstation/tasks/${taskId}`, {
      method: "DELETE",
    });

    if (!response.ok) throw new Error("Failed to delete task");

    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  const moveTask = async (input: MoveTaskInput): Promise<void> => {
    // Optimistic update
    setTasks((prev) => {
      const taskIndex = prev.findIndex((t) => t.id === input.taskId);
      if (taskIndex === -1) return prev;

      const newTasks = [...prev];
      const task = { ...newTasks[taskIndex] };
      task.columnId = input.targetColumnId;
      task.order = input.targetOrder;
      newTasks[taskIndex] = task;

      // Reorder tasks in target column
      return newTasks.sort((a, b) => {
        if (a.columnId !== b.columnId) return 0;
        return a.order - b.order;
      });
    });

    const response = await fetch("/api/workstation/tasks/move", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      // Revert on error
      await fetchBoard();
      throw new Error("Failed to move task");
    }
  };

  return {
    board,
    columns,
    tasks,
    loading,
    error,
    fetchBoard,
    createColumn,
    updateColumn,
    deleteColumn,
    reorderColumns,
    createTask,
    updateTask,
    deleteTask,
    moveTask,
  };
}
