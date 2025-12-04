"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DistributionSummary } from "@/modules/finance";
import { PieChart } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  isFixed: boolean;
  installments: number | null;
  currentInstallment?: number;
  status: string;
}

interface DistributionData {
  totalIncome: number;
  fixedExpenses: number;
  variableExpenses: number;
  investmentTarget: number;
  fixedLimit: number;
  variableLimit: number;
}

const STORAGE_KEY = "finance-distribution-installments-as-fixed";

export default function DistributionPage() {
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  const [selectedMonth, setSelectedMonth] = useState(
    `${currentYear}-${String(currentMonth).padStart(2, "0")}`
  );
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<DistributionData | null>(null);
  const [installmentsAsFixed, setInstallmentsAsFixed] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : true;
    }
    return true;
  });

  const calculateDistribution = useCallback(
    (transactions: Transaction[]): DistributionData => {
      let totalIncome = 0;
      let fixedExpenses = 0;
      let variableExpenses = 0;

      for (const transaction of transactions) {
        // Considerar transações pagas, pendentes e atrasadas
        if (transaction.type === "INCOME") {
          totalIncome += transaction.amount;
        } else if (transaction.type === "EXPENSE") {
          const isInstallment =
            transaction.installments !== null && transaction.installments > 1;

          // Determine if this expense is fixed or variable
          const isFixed = installmentsAsFixed
            ? transaction.isFixed || isInstallment
            : transaction.isFixed && !isInstallment;

          if (isFixed) {
            fixedExpenses += transaction.amount;
          } else {
            variableExpenses += transaction.amount;
          }
        }
      }

      // Calculate limits based on the 50/30/20 rule
      const fixedLimit = totalIncome * 0.5;
      const variableLimit = totalIncome * 0.3;
      const investmentTarget = totalIncome * 0.2;

      return {
        totalIncome,
        fixedExpenses,
        variableExpenses,
        investmentTarget,
        fixedLimit,
        variableLimit,
      };
    },
    [installmentsAsFixed]
  );

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [year, month] = selectedMonth.split("-");
      // cashFlowMode=false para buscar por dueDate (vencimento) em vez de paidDate
      const response = await fetch(
        `/api/transactions?month=${month}&year=${year}&cashFlowMode=false`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch transactions");
      }

      const result = await response.json();
      // A API retorna diretamente um array de transações
      const transactions: Transaction[] = Array.isArray(result) ? result : [];

      const distributionData = calculateDistribution(transactions);
      setData(distributionData);
    } catch (error) {
      console.error("Error fetching distribution data:", error);
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [selectedMonth, calculateDistribution]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleInstallmentsToggle = (value: boolean) => {
    setInstallmentsAsFixed(value);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  };

  const handleMonthChange = (value: string) => {
    setSelectedMonth(value);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <PieChart className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-3xl font-bold text-foreground">Distribuição</h2>
          </div>
          <p className="text-muted-foreground">
            Visualize a distribuição dos seus gastos seguindo a regra 50/30/20
          </p>
        </div>
        <div>
          <Label
            htmlFor="month-selector"
            className="text-sm font-medium mb-1 block"
          >
            Período
          </Label>
          <Input
            id="month-selector"
            type="month"
            value={selectedMonth}
            onChange={(e) => handleMonthChange(e.target.value)}
            className="w-[200px]"
          />
        </div>
      </div>

      {/* Distribution Summary */}
      <DistributionSummary
        data={data}
        isLoading={isLoading}
        installmentsAsFixed={installmentsAsFixed}
        onInstallmentsToggle={handleInstallmentsToggle}
      />
    </div>
  );
}
