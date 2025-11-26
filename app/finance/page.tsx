"use client";

import type React from "react";

import { DashboardCharts } from "@/components/finance/dashboard-charts";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatCurrency } from "@/lib/finance-utils";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  DollarSign,
  HelpCircle,
  TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";

function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  trendValue,
  colorClass,
  tooltip,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: "up" | "down";
  trendValue?: string;
  colorClass: string;
  tooltip?: string;
}) {
  return (
    <Card className="p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-1.5 mb-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            {tooltip && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/60 hover:text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[250px]">
                  <p>{tooltip}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          <p className="text-3xl font-bold text-foreground mb-2">{value}</p>
          {trend && trendValue && (
            <div className="flex items-center gap-1">
              <TrendingUp
                className={`w-4 h-4 ${
                  trend === "up" ? "text-green-600" : "text-red-600 rotate-180"
                }`}
              />
              <span
                className={`text-sm font-medium ${
                  trend === "up" ? "text-green-600" : "text-red-600"
                }`}
              >
                {trendValue}
              </span>
              <span className="text-sm text-muted-foreground">
                vs mês anterior
              </span>
            </div>
          )}
        </div>
        <div
          className={`w-12 h-12 rounded-lg ${colorClass} flex items-center justify-center`}
        >
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </Card>
  );
}

export default function FinanceDashboard() {
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();
  const [selectedMonth, setSelectedMonth] = useState(
    `${currentYear}-${String(currentMonth).padStart(2, "0")}`
  );
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [selectedMonth]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [year, month] = selectedMonth.split("-");
      const response = await fetch(
        `/api/dashboard?month=${month}&year=${year}`
      );

      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
      } else {
        console.error("Dashboard API error:", response.statusText);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Carregando...
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground mb-4">Erro ao carregar dados</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Dashboard Financeiro
          </h2>
          <p className="text-muted-foreground">Visão geral das suas finanças</p>
        </div>

        <div className="">
          <Label
            htmlFor="month-selector"
            className="text-sm font-medium mb-2 block"
          >
            Período
          </Label>
          <Input
            id="month-selector"
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-[200px]"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Saldo Total"
          value={formatCurrency(dashboardData.totalBalance)}
          icon={DollarSign}
          colorClass="bg-primary"
          tooltip="Soma de todos os saldos das suas contas (bancárias, carteiras, investimentos). Representa quanto você possui atualmente."
          trend={dashboardData.trends?.totalBalance?.trend}
          trendValue={
            dashboardData.trends?.totalBalance?.value
              ? `${
                  dashboardData.trends.totalBalance.trend === "up" ? "+" : "-"
                }${dashboardData.trends.totalBalance.value.toFixed(1)}%`
              : undefined
          }
        />
        <StatCard
          title="Receitas do Mês"
          value={formatCurrency(dashboardData.income)}
          icon={ArrowUpCircle}
          colorClass="bg-green-600"
          tooltip="Total de entradas de dinheiro no mês selecionado (salário, freelance, vendas, etc). Mostra quanto você ganhou."
          trend={dashboardData.trends?.income?.trend}
          trendValue={
            dashboardData.trends?.income?.value
              ? `${
                  dashboardData.trends.income.trend === "up" ? "+" : "-"
                }${dashboardData.trends.income.value.toFixed(1)}%`
              : undefined
          }
        />
        <StatCard
          title="Despesas do Mês"
          value={formatCurrency(dashboardData.expenses)}
          icon={ArrowDownCircle}
          colorClass="bg-red-600"
          tooltip="Total de saídas de dinheiro no mês selecionado (contas, compras, alimentação, etc). Mostra quanto você gastou."
          trend={dashboardData.trends?.expenses?.trend}
          trendValue={
            dashboardData.trends?.expenses?.value
              ? `${
                  dashboardData.trends.expenses.trend === "up" ? "+" : "-"
                }${dashboardData.trends.expenses.value.toFixed(1)}%`
              : undefined
          }
        />
        <StatCard
          title="Balanço"
          value={formatCurrency(dashboardData.balance)}
          icon={TrendingUp}
          colorClass={
            dashboardData.balance >= 0 ? "bg-green-600" : "bg-red-600"
          }
          tooltip="Diferença entre receitas e despesas do mês (Receitas - Despesas). Positivo = sobrou dinheiro. Negativo = gastou mais do que ganhou."
          trend={dashboardData.trends?.balance?.trend}
          trendValue={
            dashboardData.trends?.balance?.value
              ? `${
                  dashboardData.trends.balance.trend === "up" ? "+" : "-"
                }${dashboardData.trends.balance.value.toFixed(1)}%`
              : undefined
          }
        />
      </div>

      {/* Charts */}
      <DashboardCharts
        monthlyData={dashboardData.monthlyData}
        categoryData={dashboardData.categoryData}
      />

      {/* Quick Actions */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Ações Rápidas
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="/finance/transactions?action=new&type=expense"
            className="flex items-center gap-3 p-4 rounded-lg border-2 border-border hover:border-primary hover:bg-accent/50 transition-all"
          >
            <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
              <ArrowDownCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="font-medium text-foreground">Nova Despesa</p>
              <p className="text-sm text-muted-foreground">Registrar gasto</p>
            </div>
          </a>
          <a
            href="/finance/transactions?action=new&type=income"
            className="flex items-center gap-3 p-4 rounded-lg border-2 border-border hover:border-primary hover:bg-accent/50 transition-all"
          >
            <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
              <ArrowUpCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-foreground">Nova Receita</p>
              <p className="text-sm text-muted-foreground">Registrar entrada</p>
            </div>
          </a>
          <a
            href="/finance/accounts"
            className="flex items-center gap-3 p-4 rounded-lg border-2 border-border hover:border-primary hover:bg-accent/50 transition-all"
          >
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground">Gerenciar Contas</p>
              <p className="text-sm text-muted-foreground">Ver saldos</p>
            </div>
          </a>
        </div>
      </Card>
    </div>
  );
}
