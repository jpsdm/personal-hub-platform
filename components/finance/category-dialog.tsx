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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type React from "react";
import { useEffect, useState } from "react";

interface CategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  category?: any;
}

export function CategoryDialog({
  open,
  onOpenChange,
  onSuccess,
  category,
}: CategoryDialogProps) {
  const isEditMode = !!category;
  const isDefaultCategory = category?.isDefault === true;
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState("expense");

  useEffect(() => {
    if (category) {
      setType(category.type.toLowerCase());
    }
  }, [category]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Bloquear edição de categorias padrão
    if (isDefaultCategory) {
      alert("Categorias padrão não podem ser editadas");
      return;
    }

    setLoading(true);

    const formData = new FormData(e.target as HTMLFormElement);
    const data = {
      name: formData.get("name"),
      type: formData.get("type")?.toString().toUpperCase(),
      color: formData.get("color"),
      icon: formData.get("icon") || "",
    };

    try {
      const url = isEditMode
        ? `/api/categories/${category.id}`
        : "/api/categories";
      const method = isEditMode ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(
          `Failed to ${isEditMode ? "update" : "create"} category`
        );
      }

      await response.json();

      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Error saving category:", error);
      alert("Erro ao salvar categoria. Por favor, tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Editar" : "Nova"} Categoria</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {isDefaultCategory && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                ⚠️ Esta é uma categoria padrão do sistema e não pode ser
                editada.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Nome da Categoria</Label>
            <Input
              id="name"
              name="name"
              placeholder="Ex: Alimentação"
              defaultValue={category?.name}
              required
              disabled={isDefaultCategory}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Tipo</Label>
            <Select
              name="type"
              value={type}
              onValueChange={setType}
              disabled={isDefaultCategory}
            >
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="income">Receita</SelectItem>
                <SelectItem value="expense">Despesa</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="color">Cor</Label>
            <div className="flex gap-2">
              <Input
                id="color"
                name="color"
                type="color"
                defaultValue={category?.color || "#3b82f6"}
                className="w-20 h-10"
                disabled={isDefaultCategory}
              />
              <Input
                name="colorHex"
                placeholder="#3b82f6"
                defaultValue={category?.color || "#3b82f6"}
                className="flex-1"
                pattern="^#[0-9A-Fa-f]{6}$"
                disabled={isDefaultCategory}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {isDefaultCategory ? "Fechar" : "Cancelar"}
            </Button>
            {!isDefaultCategory && (
              <Button type="submit" disabled={loading}>
                {loading
                  ? "Salvando..."
                  : isEditMode
                  ? "Atualizar"
                  : "Salvar Categoria"}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
