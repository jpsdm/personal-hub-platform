"use client"

import { useState } from "react"
import { TagsList } from "@/components/finance/tags-list"
import { TagDialog } from "@/components/finance/tag-dialog"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

export default function TagsPage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const handleSuccess = () => {
    setRefreshKey((prev) => prev + 1)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground mb-2">Tags</h2>
          <p className="text-muted-foreground">Crie e gerencie tags para organizar melhor</p>
        </div>
        <Button className="gap-2" onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4" />
          Nova Tag
        </Button>
      </div>

      {/* Tags List */}
      <TagsList key={refreshKey} />

      <TagDialog open={dialogOpen} onOpenChange={setDialogOpen} onSuccess={handleSuccess} />
    </div>
  )
}
