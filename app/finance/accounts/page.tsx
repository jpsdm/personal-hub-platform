"use client"

import { useState } from "react"
import { AccountsList } from "@/components/finance/accounts-list"
import { AccountDialog } from "@/components/finance/account-dialog"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

export default function AccountsPage() {
  const [refreshKey, setRefreshKey] = useState(0)

  const handleSuccess = () => {
    setRefreshKey((prev) => prev + 1)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground mb-2">Contas Bancárias</h2>
          <p className="text-muted-foreground">Gerencie suas contas e saldos</p>
        </div>
        <AccountDialog
          trigger={
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Nova Conta
            </Button>
          }
          onSuccess={handleSuccess}
        />
      </div>

      {/* Accounts List */}
      <AccountsList key={refreshKey} />
    </div>
  )
}
