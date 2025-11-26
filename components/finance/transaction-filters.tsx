"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Filter,
  FolderOpen,
  Hash,
  Tag,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";

interface TransactionFiltersProps {
  onFiltersChange: (filters: any) => void;
}

interface Account {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
  type: string;
  color?: string;
}

interface TagItem {
  id: string;
  name: string;
  color?: string;
}

export function TransactionFilters({
  onFiltersChange,
}: TransactionFiltersProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [categoryId, setCategoryId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [tagId, setTagId] = useState("");

  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [hasActiveFilters, setHasActiveFilters] = useState(false);

  useEffect(() => {
    fetchCategories();
    fetchAccounts();
    fetchTags();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/categories");
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchAccounts = async () => {
    try {
      const response = await fetch("/api/accounts");
      if (response.ok) {
        const data = await response.json();
        setAccounts(data);
      }
    } catch (error) {
      console.error("Error fetching accounts:", error);
    }
  };

  const fetchTags = async () => {
    try {
      const response = await fetch("/api/tags");
      if (response.ok) {
        const data = await response.json();
        setTags(data);
      }
    } catch (error) {
      console.error("Error fetching tags:", error);
    }
  };

  const applyFilters = () => {
    const filters: any = {};

    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    if (type !== "all") filters.type = type;
    if (status !== "all") filters.status = status;
    if (categoryId) filters.categoryId = categoryId;
    if (accountId) filters.accountId = accountId;
    if (tagId) filters.tagId = tagId;

    const hasFilters =
      startDate ||
      endDate ||
      type !== "all" ||
      status !== "all" ||
      categoryId ||
      accountId ||
      tagId;
    setHasActiveFilters(hasFilters);

    onFiltersChange(filters);
  };

  const handleClearFilters = () => {
    setStartDate("");
    setEndDate("");
    setType("all");
    setStatus("all");
    setCategoryId("");
    setAccountId("");
    setTagId("");
    setHasActiveFilters(false);
    onFiltersChange({});
  };

  // Auto-apply filters when any value changes
  useEffect(() => {
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, type, status, categoryId, accountId, tagId]);

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Filtros</h3>
          {hasActiveFilters && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
              Ativos
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="text-muted-foreground hover:text-foreground"
            >
              <XCircle className="w-4 h-4 mr-1" />
              Limpar
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            {showFilters ? "Ocultar" : "Mostrar"}
          </Button>
        </div>
      </div>

      {showFilters && (
        <div className="space-y-6">
          {/* Período */}
          <div>
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              Período
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label
                  htmlFor="startDate"
                  className="text-xs text-muted-foreground"
                >
                  Data Inicial
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="endDate"
                  className="text-xs text-muted-foreground"
                >
                  Data Final
                </Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Tipo e Status */}
          <div>
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Hash className="w-4 h-4 text-muted-foreground" />
              Tipo e Status
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label
                  htmlFor="type"
                  className="text-xs text-muted-foreground flex items-center gap-1"
                >
                  Tipo de Lançamento
                </Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4" />
                        Todos
                      </div>
                    </SelectItem>
                    <SelectItem value="INCOME">
                      <div className="flex items-center gap-2">
                        <ArrowUpCircle className="w-4 h-4 text-green-600" />
                        Receitas
                      </div>
                    </SelectItem>
                    <SelectItem value="EXPENSE">
                      <div className="flex items-center gap-2">
                        <ArrowDownCircle className="w-4 h-4 text-red-600" />
                        Despesas
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="status"
                  className="text-xs text-muted-foreground"
                >
                  Status do Pagamento
                </Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4" />
                        Todos
                      </div>
                    </SelectItem>
                    <SelectItem value="PAID">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        Pago
                      </div>
                    </SelectItem>
                    <SelectItem value="PENDING">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-yellow-600" />
                        Pendente
                      </div>
                    </SelectItem>
                    <SelectItem value="OVERDUE">
                      <div className="flex items-center gap-2">
                        <XCircle className="w-4 h-4 text-red-600" />
                        Atrasado
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Categoria e Conta */}
          <div>
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-muted-foreground" />
              Organização
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Categoria
                </Label>
                <SearchableSelect
                  value={categoryId}
                  onValueChange={setCategoryId}
                  options={categories.map((cat) => ({
                    value: cat.id,
                    label: cat.name,
                    color: cat.color,
                  }))}
                  placeholder="Todas as categorias"
                  emptyText="Nenhuma categoria encontrada"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <CreditCard className="w-3.5 h-3.5" />
                  Conta
                </Label>
                <SearchableSelect
                  value={accountId}
                  onValueChange={setAccountId}
                  options={accounts.map((acc) => ({
                    value: acc.id,
                    label: acc.name,
                  }))}
                  placeholder="Todas as contas"
                  emptyText="Nenhuma conta encontrada"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Tag */}
          <div>
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Tag className="w-4 h-4 text-muted-foreground" />
              Tag
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Filtrar por Tag
                </Label>
                <SearchableSelect
                  value={tagId}
                  onValueChange={setTagId}
                  options={tags.map((tag) => ({
                    value: tag.id,
                    label: tag.name,
                    color: tag.color,
                  }))}
                  placeholder="Todas as tags"
                  emptyText="Nenhuma tag encontrada"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
