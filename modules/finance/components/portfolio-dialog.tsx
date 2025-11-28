"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DEFAULT_PORTFOLIO_COLORS } from "@/modules/finance/lib/constants";
import type { Portfolio, PortfolioFormData } from "@/modules/finance/types";
import { useState } from "react";
import { toast } from "sonner";

interface PortfolioDialogProps {
  portfolio?: Portfolio;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
}

export function PortfolioDialog({
  portfolio,
  trigger,
  open: controlledOpen,
  onOpenChange,
  onSuccess,
}: PortfolioDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? onOpenChange! : setInternalOpen;

  const [formData, setFormData] = useState<PortfolioFormData>({
    name: portfolio?.name || "",
    description: portfolio?.description || "",
    color: portfolio?.color || DEFAULT_PORTFOLIO_COLORS[0],
    currency: portfolio?.currency || "BRL",
    isDefault: portfolio?.isDefault || false,
  });

  const isEdit = !!portfolio;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    setLoading(true);

    try {
      const userId = sessionStorage.getItem("currentUserId");
      if (!userId) {
        toast.error("Usuário não encontrado");
        return;
      }

      const url = isEdit
        ? `/api/investments/portfolios/${portfolio.id}`
        : "/api/investments/portfolios";

      const response = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          userId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao salvar carteira");
      }

      toast.success(isEdit ? "Carteira atualizada!" : "Carteira criada!");
      setOpen(false);
      onSuccess?.();

      // Reset form if creating new
      if (!isEdit) {
        setFormData({
          name: "",
          description: "",
          color: DEFAULT_PORTFOLIO_COLORS[0],
          currency: "BRL",
          isDefault: false,
        });
      }
    } catch (error) {
      console.error("Error saving portfolio:", error);
      toast.error(
        error instanceof Error ? error.message : "Erro ao salvar carteira"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen && portfolio) {
      setFormData({
        name: portfolio.name,
        description: portfolio.description || "",
        color: portfolio.color,
        currency: portfolio.currency,
        isDefault: portfolio.isDefault,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEdit ? "Editar Carteira" : "Nova Carteira"}
            </DialogTitle>
            <DialogDescription>
              {isEdit
                ? "Atualize os dados da carteira de investimentos."
                : "Crie uma nova carteira para organizar seus investimentos."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Ex: Ações BR, Cripto, Dividendos..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Descreva o objetivo desta carteira..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex flex-wrap gap-2">
                {DEFAULT_PORTFOLIO_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-full transition-all ${
                      formData.color === color
                        ? "ring-2 ring-offset-2 ring-primary scale-110"
                        : "hover:scale-105"
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData((prev) => ({ ...prev, color }))}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isDefault"
                checked={formData.isDefault}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    isDefault: e.target.checked,
                  }))
                }
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="isDefault" className="text-sm font-normal">
                Definir como carteira padrão
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : isEdit ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
