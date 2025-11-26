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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Edit,
  Shield,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { CategoryDialog } from "./category-dialog";

interface Category {
  id: string;
  name: string;
  type: string;
  isDefault: boolean;
}

function CategoryCard({
  category,
  type,
  onEdit,
  onDelete,
}: {
  category: Category;
  type: "income" | "expense";
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3 flex-1">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              type === "income"
                ? "bg-green-100 dark:bg-green-900/20"
                : "bg-red-100 dark:bg-red-900/20"
            }`}
          >
            {type === "income" ? (
              <ArrowUpCircle className="w-5 h-5 text-green-600" />
            ) : (
              <ArrowDownCircle className="w-5 h-5 text-red-600" />
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-foreground">{category.name}</h3>
              {category.isDefault && (
                <Badge variant="outline" className="text-xs">
                  <Shield className="w-3 h-3 mr-1" />
                  Padrão
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={onEdit}
            disabled={category.isDefault}
            title={
              category.isDefault
                ? "Categorias padrão não podem ser editadas"
                : "Editar"
            }
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-destructive"
            disabled={category.isDefault}
            onClick={onDelete}
            title={
              category.isDefault
                ? "Categorias padrão não podem ser excluídas"
                : "Excluir"
            }
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

export function CategoriesList() {
  const [categories, setCategories] = useState<{
    income: Category[];
    expense: Category[];
  }>({
    income: [],
    expense: [],
  });
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/categories");
      if (response.ok) {
        const data = await response.json();
        const income = data.filter((c: Category) => c.type === "INCOME");
        const expense = data.filter((c: Category) => c.type === "EXPENSE");
        setCategories({ income, expense });
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (category: Category) => {
    setSelectedCategory(category);
    setEditDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/categories/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete category");
      }

      fetchCategories();
    } catch (error: any) {
      console.error("Error deleting category:", error);
      alert(error.message || "Erro ao excluir categoria");
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Carregando...
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8">
        {/* Income Categories */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <ArrowUpCircle className="w-5 h-5 text-green-600" />
            <h3 className="text-xl font-semibold text-foreground">
              Categorias de Receitas
            </h3>
            <Badge variant="secondary">{categories.income.length}</Badge>
          </div>
          {categories.income.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">
                Nenhuma categoria de receita cadastrada
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.income.map((category) => (
                <CategoryCard
                  key={category.id}
                  category={category}
                  type="income"
                  onEdit={() => handleEdit(category)}
                  onDelete={() => {
                    setCategoryToDelete(category.id);
                    setDeleteDialogOpen(true);
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Expense Categories */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <ArrowDownCircle className="w-5 h-5 text-red-600" />
            <h3 className="text-xl font-semibold text-foreground">
              Categorias de Despesas
            </h3>
            <Badge variant="secondary">{categories.expense.length}</Badge>
          </div>
          {categories.expense.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">
                Nenhuma categoria de despesa cadastrada
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.expense.map((category) => (
                <CategoryCard
                  key={category.id}
                  category={category}
                  type="expense"
                  onEdit={() => handleEdit(category)}
                  onDelete={() => {
                    setCategoryToDelete(category.id);
                    setDeleteDialogOpen(true);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <CategoryDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        category={selectedCategory}
        onSuccess={() => {
          fetchCategories();
          setSelectedCategory(null);
        }}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta categoria? Esta ação não pode
              ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (categoryToDelete) {
                  handleDelete(categoryToDelete);
                  setCategoryToDelete(null);
                }
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
