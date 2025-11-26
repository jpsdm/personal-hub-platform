"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { KanbanColumn } from "@/modules/workstation/types";
import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

interface ColumnDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  column?: KanbanColumn | null;
  boardId: string;
  onSave: (data: { name: string; color: string }) => Promise<void>;
  onDelete?: () => Promise<void>;
}

const COLUMN_COLORS = [
  "#6B7280", // Gray
  "#3B82F6", // Blue
  "#10B981", // Green
  "#F59E0B", // Yellow
  "#EF4444", // Red
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#06B6D4", // Cyan
];

export function ColumnDialog({
  open,
  onOpenChange,
  column,
  onSave,
  onDelete,
}: ColumnDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    color: "#6B7280",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setFormData({
        name: column?.name || "",
        color: column?.color || "#6B7280",
      });
    }
  }, [open, column]);

  const isEditing = !!column;

  const handleSave = async () => {
    if (!formData.name.trim()) return;

    setSubmitting(true);
    try {
      await onSave(formData);
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setSubmitting(true);
    try {
      await onDelete();
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Coluna" : "Nova Coluna"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="column-name">Nome</Label>
            <Input
              id="column-name"
              placeholder="Ex: Em Revisão"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="flex gap-2 flex-wrap">
              {COLUMN_COLORS.map((color) => (
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

        <DialogFooter className="flex gap-2 sm:gap-0">
          {isEditing && onDelete && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={submitting}
              className="mr-auto"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={submitting}>
            {submitting ? "Salvando..." : isEditing ? "Salvar" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
