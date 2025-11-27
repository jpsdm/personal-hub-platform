"use client";

import { Button } from "@/components/ui/button";
import { CategoriesList, CategoryDialog } from "@/modules/finance";
import { Plus } from "lucide-react";
import { useState } from "react";

export default function CategoriesPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSuccess = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Categorias
          </h2>
          <p className="text-muted-foreground">
            Organize suas transações por categoria
          </p>
        </div>
        <Button className="gap-2" onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4" />
          Nova Categoria
        </Button>
      </div>

      {/* Categories List */}
      <CategoriesList key={refreshKey} />

      <CategoryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
