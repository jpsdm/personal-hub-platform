"use client";

import {
  AlertDialog,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  ArrowRightLeft,
  Building2,
  Edit,
  Star,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";
import { formatCurrency } from "../lib/utils";
import type { Account, DeleteAccountInfo } from "../types";
import { AccountDialog } from "./account-dialog";

type DeleteStep =
  | "confirm"
  | "choose_action"
  | "confirm_delete_all"
  | "confirm_transfer";

interface AccountWithBalance extends Account {
  currentBalance: number;
}

export function AccountsList() {
  const [accounts, setAccounts] = useState<AccountWithBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] =
    useState<AccountWithBalance | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] =
    useState<AccountWithBalance | null>(null);
  const [deleteInfo, setDeleteInfo] = useState<DeleteAccountInfo | null>(null);
  const [deleteStep, setDeleteStep] = useState<DeleteStep>("confirm");
  const [transferTargetId, setTransferTargetId] = useState<string>("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const response = await fetch("/api/accounts");
      if (response.ok) {
        const data = await response.json();
        setAccounts(data);
      }
    } catch (error) {
      console.error("Error fetching accounts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (account: AccountWithBalance) => {
    setSelectedAccount(account);
    setEditDialogOpen(true);
  };

  const handleDeleteClick = async (account: AccountWithBalance) => {
    setAccountToDelete(account);
    setDeleteStep("confirm");
    setDeleteInfo(null);
    setTransferTargetId("");
    setDeleteDialogOpen(true);
  };

  const handleDeleteCheck = async () => {
    if (!accountToDelete) return;

    setDeleteLoading(true);
    try {
      const response = await fetch(`/api/accounts/${accountToDelete.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        // Excluído com sucesso (sem transações)
        setDeleteDialogOpen(false);
        resetDeleteState();
        fetchAccounts();
        return;
      }

      if (data.hasTransactions) {
        // Tem transações, mostrar opções
        setDeleteInfo(data);
        setDeleteStep("choose_action");
        // Pré-selecionar conta padrão se disponível
        const defaultAccount = data.availableAccounts.find(
          (a: any) => a.isDefault
        );
        if (defaultAccount) {
          setTransferTargetId(defaultAccount.id);
        } else if (data.availableAccounts.length > 0) {
          setTransferTargetId(data.availableAccounts[0].id);
        }
        return;
      }

      if (data.error) {
        console.log("Delete error:", data.error);
        alert(data.error);
        setDeleteDialogOpen(false);
        resetDeleteState();
      }
    } catch (error) {
      console.error("Error checking account:", error);
      alert("Erro ao verificar conta");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDeleteAll = async () => {
    if (!accountToDelete) return;

    setDeleteLoading(true);
    try {
      const response = await fetch(`/api/accounts/${accountToDelete.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_all" }),
      });

      const data = await response.json();

      if (data.success) {
        setDeleteDialogOpen(false);
        resetDeleteState();
        fetchAccounts();
      } else {
        alert(data.error || "Erro ao excluir conta");
      }
    } catch (error) {
      console.error("Error deleting account:", error);
      alert("Erro ao excluir conta");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleTransfer = async () => {
    if (!accountToDelete || !transferTargetId) return;

    setDeleteLoading(true);
    try {
      const response = await fetch(`/api/accounts/${accountToDelete.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "transfer",
          transferToAccountId: transferTargetId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setDeleteDialogOpen(false);
        resetDeleteState();
        fetchAccounts();
      } else {
        alert(data.error || "Erro ao transferir transações");
      }
    } catch (error) {
      console.error("Error transferring transactions:", error);
      alert("Erro ao transferir transações");
    } finally {
      setDeleteLoading(false);
    }
  };

  const resetDeleteState = () => {
    setAccountToDelete(null);
    setDeleteInfo(null);
    setDeleteStep("confirm");
    setTransferTargetId("");
  };

  if (loading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Carregando...
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Building2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Nenhuma conta cadastrada
        </h3>
        <p className="text-muted-foreground">
          Clique em "Nova Conta" para começar
        </p>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Accounts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {accounts.map((account) => {
            const balanceChange =
              account.currentBalance - account.initialBalance;
            const isPositive = balanceChange >= 0;

            return (
              <Card
                key={account.id}
                className="p-6 hover:shadow-lg transition-shadow"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {account.name}
                      </h3>
                      {account.isDefault && (
                        <Badge variant="secondary" className="text-xs mt-1">
                          <Star className="w-3 h-3 mr-1 fill-current" />
                          Padrão
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={() => handleEdit(account)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-destructive"
                      disabled={account.isDefault}
                      title={
                        account.isDefault
                          ? "Conta padrão não pode ser excluída"
                          : "Excluir conta"
                      }
                      onClick={() => handleDeleteClick(account)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Balance */}
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Saldo Atual
                    </p>
                    <p className="text-2xl font-bold text-foreground">
                      {formatCurrency(account.currentBalance)}
                    </p>
                  </div>

                  {/* Balance Change */}
                  <div className="flex items-center gap-2 text-sm">
                    {isPositive ? (
                      <TrendingUp className="w-4 h-4 text-green-600" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-600" />
                    )}
                    <span
                      className={isPositive ? "text-green-600" : "text-red-600"}
                    >
                      {isPositive ? "+" : ""}
                      {formatCurrency(balanceChange)}
                    </span>
                    <span className="text-muted-foreground">
                      desde o início
                    </span>
                  </div>

                  {/* Stats */}
                  <div className="pt-3 border-t border-border flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Saldo inicial</span>
                    <span className="font-medium">
                      {formatCurrency(account.initialBalance)}
                    </span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Edit Dialog */}
      <AccountDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        account={selectedAccount}
        onSuccess={() => {
          fetchAccounts();
          setSelectedAccount(null);
        }}
      />

      {/* Delete Dialog */}
      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) resetDeleteState();
        }}
      >
        <AlertDialogContent className="max-w-md">
          {/* Step 1: Confirmação inicial */}
          {deleteStep === "confirm" && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir conta</AlertDialogTitle>
                <AlertDialogDescription>
                  Deseja excluir a conta{" "}
                  <strong>"{accountToDelete?.name}"</strong>?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <Button
                  onClick={(e) => {
                    e.preventDefault();
                    handleDeleteCheck();
                  }}
                  disabled={deleteLoading}
                >
                  {deleteLoading ? "Verificando..." : "Continuar"}
                </Button>
              </AlertDialogFooter>
            </>
          )}

          {/* Step 2: Escolher ação (tem transações) */}
          {deleteStep === "choose_action" && deleteInfo && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  Conta com transações
                </AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-3">
                    <p>
                      A conta <strong>"{accountToDelete?.name}"</strong> possui{" "}
                      <strong>{deleteInfo.transactionCount}</strong>{" "}
                      transação(ões) vinculada(s).
                    </p>
                    <p>O que você deseja fazer?</p>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>

              <div className="flex flex-col gap-3 py-4">
                {/* Opção 1: Transferir */}
                <Button
                  variant="outline"
                  className="justify-start h-auto py-3 px-4"
                  onClick={() => setDeleteStep("confirm_transfer")}
                  disabled={deleteInfo.availableAccounts.length === 0}
                >
                  <ArrowRightLeft className="w-5 h-5 mr-3 text-blue-500" />
                  <div className="text-left">
                    <p className="font-medium">Transferir transações</p>
                    <p className="text-sm text-muted-foreground">
                      Mover todas as transações para outra conta
                    </p>
                  </div>
                </Button>

                {/* Opção 2: Excluir tudo */}
                <Button
                  variant="destructive"
                  className="justify-start h-auto py-3 px-4"
                  onClick={() => setDeleteStep("confirm_delete_all")}
                >
                  <Trash2 className="w-5 h-5 mr-3" />
                  <div className="text-left">
                    <p className="font-medium">Excluir tudo</p>
                    <p className="text-sm opacity-80">
                      Apagar a conta e todas as transações
                    </p>
                  </div>
                </Button>
              </div>

              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
              </AlertDialogFooter>
            </>
          )}

          {/* Step 3a: Confirmar exclusão total */}
          {deleteStep === "confirm_delete_all" && deleteInfo && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="w-5 h-5" />
                  Ação irreversível!
                </AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-3">
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                      <p className="text-sm text-red-800 dark:text-red-200 font-medium">
                        ⚠️ Esta ação não pode ser desfeita!
                      </p>
                    </div>
                    <p>Você está prestes a excluir permanentemente:</p>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li>
                        A conta <strong>"{accountToDelete?.name}"</strong>
                      </li>
                      <li>
                        <strong>{deleteInfo.transactionCount}</strong>{" "}
                        transação(ões)
                      </li>
                    </ul>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel
                  onClick={() => setDeleteStep("choose_action")}
                >
                  Voltar
                </AlertDialogCancel>
                <Button
                  variant="destructive"
                  onClick={(e) => {
                    e.preventDefault();
                    handleDeleteAll();
                  }}
                  disabled={deleteLoading}
                >
                  {deleteLoading ? "Excluindo..." : "Excluir Permanentemente"}
                </Button>
              </AlertDialogFooter>
            </>
          )}

          {/* Step 3b: Confirmar transferência */}
          {deleteStep === "confirm_transfer" && deleteInfo && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Transferir transações</AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-3">
                    <p>
                      Selecione a conta para onde as{" "}
                      <strong>{deleteInfo.transactionCount}</strong> transações
                      serão transferidas:
                    </p>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>

              <div className="py-4">
                <Select
                  value={transferTargetId}
                  onValueChange={setTransferTargetId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma conta..." />
                  </SelectTrigger>
                  <SelectContent>
                    {deleteInfo.availableAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name} {account.isDefault && "(Padrão)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <AlertDialogFooter>
                <AlertDialogCancel
                  onClick={() => setDeleteStep("choose_action")}
                >
                  Voltar
                </AlertDialogCancel>
                <Button
                  onClick={(e) => {
                    e.preventDefault();
                    handleTransfer();
                  }}
                  disabled={deleteLoading || !transferTargetId}
                >
                  {deleteLoading
                    ? "Transferindo..."
                    : "Transferir e Excluir Conta"}
                </Button>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
