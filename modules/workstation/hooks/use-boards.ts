"use client";

import { useCallback, useEffect, useState } from "react";
import type { CreateBoardInput, KanbanBoard, UpdateBoardInput } from "../types";

export function useBoards(userId: string | null) {
  const [boards, setBoards] = useState<KanbanBoard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBoards = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/workstation/boards?userId=${userId}`);
      if (!response.ok) throw new Error("Failed to fetch boards");
      const data = await response.json();
      setBoards(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchBoards();
  }, [fetchBoards]);

  const createBoard = async (input: CreateBoardInput): Promise<KanbanBoard> => {
    const response = await fetch("/api/workstation/boards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...input, userId }),
    });

    if (!response.ok) throw new Error("Failed to create board");

    const newBoard = await response.json();
    setBoards((prev) => [...prev, newBoard]);
    return newBoard;
  };

  const updateBoard = async (
    boardId: string,
    input: UpdateBoardInput
  ): Promise<KanbanBoard> => {
    const response = await fetch(`/api/workstation/boards/${boardId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (!response.ok) throw new Error("Failed to update board");

    const updatedBoard = await response.json();
    setBoards((prev) => prev.map((b) => (b.id === boardId ? updatedBoard : b)));
    return updatedBoard;
  };

  const deleteBoard = async (boardId: string): Promise<void> => {
    const response = await fetch(`/api/workstation/boards/${boardId}`, {
      method: "DELETE",
    });

    if (!response.ok) throw new Error("Failed to delete board");

    setBoards((prev) => prev.filter((b) => b.id !== boardId));
  };

  return {
    boards,
    loading,
    error,
    fetchBoards,
    createBoard,
    updateBoard,
    deleteBoard,
  };
}
