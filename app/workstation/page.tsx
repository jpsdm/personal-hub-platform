"use client";

import { BoardsList } from "@/modules/workstation/components/boards-list";
import { useBoards } from "@/modules/workstation/hooks/use-boards";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function WorkstationPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);

  // Initialize hooks
  const {
    boards,
    loading: boardsLoading,
    createBoard,
    updateBoard,
    deleteBoard,
  } = useBoards(userId);

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

  if (!userId) {
    return null;
  }

  // Show boards list
  return (
    <BoardsList
      boards={boards}
      loading={boardsLoading}
      onCreateBoard={handleCreateBoard}
      onUpdateBoard={handleUpdateBoard}
      onDeleteBoard={handleDeleteBoard}
    />
  );
}
