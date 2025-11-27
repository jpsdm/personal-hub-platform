"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { KanbanBoard } from "@/modules/workstation/types";
import { Folder, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

interface BoardsListProps {
  boards: KanbanBoard[];
  loading: boolean;
  onCreateBoard: (data: {
    name: string;
    description?: string;
    color?: string;
  }) => Promise<void>;
  onUpdateBoard: (
    boardId: string,
    data: { name?: string; description?: string; color?: string }
  ) => Promise<void>;
  onDeleteBoard: (boardId: string) => Promise<void>;
  onSelectBoard: (board: KanbanBoard) => void;
}

const BOARD_COLORS = [
  "#3B82F6", // Blue
  "#10B981", // Green
  "#F59E0B", // Yellow
  "#EF4444", // Red
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#06B6D4", // Cyan
  "#F97316", // Orange
];

export function BoardsList({
  boards,
  loading,
  onCreateBoard,
  onUpdateBoard,
  onDeleteBoard,
  onSelectBoard,
}: BoardsListProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editBoard, setEditBoard] = useState<KanbanBoard | null>(null);
  const [deleteBoard, setDeleteBoard] = useState<KanbanBoard | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "#3B82F6",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!formData.name.trim()) return;

    setSubmitting(true);
    try {
      await onCreateBoard(formData);
      setFormData({ name: "", description: "", color: "#3B82F6" });
      setCreateOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!editBoard || !formData.name.trim()) return;

    setSubmitting(true);
    try {
      await onUpdateBoard(editBoard.id, formData);
      setEditBoard(null);
      setFormData({ name: "", description: "", color: "#3B82F6" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteBoard) return;

    setSubmitting(true);
    try {
      await onDeleteBoard(deleteBoard.id);
      setDeleteBoard(null);
    } finally {
      setSubmitting(false);
    }
  };

  const openEditDialog = (board: KanbanBoard) => {
    setFormData({
      name: board.name,
      description: board.description || "",
      color: board.color,
    });
    setEditBoard(board);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Meus Quadros</h2>
          <p className="text-sm text-muted-foreground">
            Organize suas tarefas em quadros Kanban
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Novo Quadro
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Novo Quadro</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  placeholder="Ex: Projeto Website"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrição (opcional)</Label>
                <Textarea
                  id="description"
                  placeholder="Descreva o propósito deste quadro"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Cor</Label>
                <div className="flex gap-2 flex-wrap">
                  {BOARD_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`w-8 h-8 rounded-full transition-transform ${
                        formData.color === color
                          ? "ring-2 ring-offset-2 ring-foreground scale-110"
                          : ""
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() =>
                        setFormData((prev) => ({ ...prev, color }))
                      }
                    />
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreate} disabled={submitting}>
                {submitting ? "Criando..." : "Criar Quadro"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {boards.length === 0 ? (
        <Card className="p-12 text-center">
          <Folder className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Nenhum quadro criado</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Crie seu primeiro quadro para começar a organizar suas tarefas
          </p>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Criar Quadro
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {boards.map((board) => (
            <Card
              key={board.id}
              className="group cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => onSelectBoard(board)}
            >
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: board.color + "20" }}
                  >
                    <Folder
                      className="w-5 h-5"
                      style={{ color: board.color }}
                    />
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditDialog(board);
                        }}
                      >
                        <Pencil className="w-4 h-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteBoard(board);
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <h3 className="font-medium truncate">{board.name}</h3>
                {board.description && (
                  <p className="text-sm text-muted-foreground truncate mt-1">
                    {board.description}
                  </p>
                )}
                <div className="mt-3 text-xs text-muted-foreground">
                  {(board as KanbanBoard & { _count?: { tasks: number } })
                    ._count?.tasks || 0}{" "}
                  tarefas
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog
        open={!!editBoard}
        onOpenChange={(open) => !open && setEditBoard(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Quadro</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Descrição</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex gap-2 flex-wrap">
                {BOARD_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-full transition-transform ${
                      formData.color === color
                        ? "ring-2 ring-offset-2 ring-foreground scale-110"
                        : ""
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData((prev) => ({ ...prev, color }))}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditBoard(null)}>
              Cancelar
            </Button>
            <Button onClick={handleEdit} disabled={submitting}>
              {submitting ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteBoard}
        onOpenChange={(open) => !open && setDeleteBoard(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Quadro</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o quadro &quot;{deleteBoard?.name}
              &quot;? Esta ação não pode ser desfeita e todas as tarefas serão
              perdidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {submitting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
