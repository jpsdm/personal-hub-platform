"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type React from "react";
import { useState } from "react";

interface TagDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  tag?: any;
}

export function TagDialog({
  open,
  onOpenChange,
  onSuccess,
  tag,
}: TagDialogProps) {
  const isEditMode = !!tag;
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.target as HTMLFormElement);
    const data = {
      name: formData.get("name"),
      color: formData.get("color"),
    };

    try {
      const url = isEditMode ? `/api/tags/${tag.id}` : "/api/tags";
      const method = isEditMode ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${isEditMode ? "update" : "create"} tag`);
      }

      await response.json();

      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Error saving tag:", error);
      alert("Erro ao salvar tag. Por favor, tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Editar" : "Nova"} Tag</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Tag</Label>
            <Input
              id="name"
              name="name"
              placeholder="Ex: Urgente"
              defaultValue={tag?.name}
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading
                ? "Salvando..."
                : isEditMode
                ? "Atualizar"
                : "Salvar Tag"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
