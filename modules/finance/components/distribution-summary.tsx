"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  PiggyBank,
  Receipt,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { formatCurrency } from "../lib/utils";

interface DistributionData {
  totalIncome: number;
  fixedExpenses: number;
  variableExpenses: number;
  investmentTarget: number;
  fixedLimit: number;
  variableLimit: number;
}

interface DistributionSummaryProps {
  data: DistributionData | null;
  isLoading?: boolean;
  installmentsAsFixed: boolean;
  onInstallmentsToggle: (value: boolean) => void;
}

function ProgressCard({
  title,
  icon: Icon,
  current,
  limit,
  percentage,
  description,
  colorClass,
}: {
  title: string;
  icon: React.ElementType;
  current: number;
  limit: number;
  percentage: number;
  description: string;
  colorClass: string;
}) {
  const progressValue = Math.min((current / limit) * 100, 100);
  const isOverLimit = current > limit;
  const remaining = limit - current;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn("p-2 rounded-lg", colorClass)}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">{title}</CardTitle>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold">{percentage}%</span>
            <p className="text-xs text-muted-foreground">do orçamento</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Gasto</span>
            <span
              className={cn("font-medium", isOverLimit && "text-destructive")}
            >
              {formatCurrency(current)}
            </span>
          </div>
          <Progress
            value={progressValue}
            className={cn(
              "h-3",
              isOverLimit && "[&>div]:bg-destructive bg-destructive/20"
            )}
          />
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Limite</span>
            <span className="font-medium">{formatCurrency(limit)}</span>
          </div>
        </div>

        <div
          className={cn(
            "flex items-center gap-2 p-2 rounded-lg text-sm",
            isOverLimit
              ? "bg-destructive/10 text-destructive"
              : "bg-primary/10 text-primary"
          )}
        >
          {isOverLimit ? (
            <>
              <AlertTriangle className="w-4 h-4" />
              <span>
                Limite excedido em {formatCurrency(Math.abs(remaining))}
              </span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>Disponível: {formatCurrency(remaining)}</span>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function InvestmentCard({
  investmentTarget,
  totalIncome,
}: {
  investmentTarget: number;
  totalIncome: number;
}) {
  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/20 text-primary">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">
                Investimentos
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Meta de 20% da sua renda
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold">20%</span>
            <p className="text-xs text-muted-foreground">recomendado</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between p-4 bg-background/50 rounded-lg">
          <div className="flex items-center gap-3">
            <PiggyBank className="w-8 h-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">
                Valor recomendado para investir
              </p>
              <p className="text-2xl font-bold text-primary">
                {formatCurrency(investmentTarget)}
              </p>
            </div>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground text-center">
          Baseado na sua renda mensal de {formatCurrency(totalIncome)}
        </p>
      </CardContent>
    </Card>
  );
}

function IncomeCard({ totalIncome }: { totalIncome: number }) {
  return (
    <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
      <CardContent>
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-full bg-green-500/20">
            <Wallet className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Renda Total do Mês</p>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(totalIncome)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function DistributionSummary({
  data,
  isLoading,
  installmentsAsFixed,
  onInstallmentsToggle,
}: DistributionSummaryProps) {
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">
          Nenhum dado disponível para o período selecionado.
        </p>
      </Card>
    );
  }

  const fixedPercentage =
    data.totalIncome > 0
      ? Math.round((data.fixedExpenses / data.totalIncome) * 100)
      : 0;

  const variablePercentage =
    data.totalIncome > 0
      ? Math.round((data.variableExpenses / data.totalIncome) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Income Card */}
      <IncomeCard totalIncome={data.totalIncome} />

      {/* Toggle for installments */}
      <Card>
        <CardContent className="">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-muted-foreground" />
              <div>
                <Label
                  htmlFor="installments-toggle"
                  className="text-sm font-medium cursor-pointer"
                >
                  Compras parceladas como custo fixo
                </Label>
                <p className="text-xs text-muted-foreground">
                  {installmentsAsFixed
                    ? "Parcelas são contabilizadas como despesas fixas"
                    : "Parcelas são contabilizadas como despesas variáveis"}
                </p>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>
                      Ative esta opção se você considera compras parceladas como
                      compromissos fixos mensais. Desative se prefere tratá-las
                      como gastos variáveis.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Switch
              id="installments-toggle"
              checked={installmentsAsFixed}
              onCheckedChange={onInstallmentsToggle}
            />
          </div>
        </CardContent>
      </Card>

      {/* Progress Cards Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        <ProgressCard
          title="Despesas Fixas"
          icon={Receipt}
          current={data.fixedExpenses}
          limit={data.fixedLimit}
          percentage={fixedPercentage}
          description="Limite recomendado: 50%"
          colorClass="bg-blue-500/20 text-blue-600 dark:text-blue-400"
        />
        <ProgressCard
          title="Despesas Variáveis"
          icon={Wallet}
          current={data.variableExpenses}
          limit={data.variableLimit}
          percentage={variablePercentage}
          description="Limite recomendado: 30%"
          colorClass="bg-orange-500/20 text-orange-600 dark:text-orange-400"
        />
      </div>

      {/* Investment Card */}
      <InvestmentCard
        investmentTarget={data.investmentTarget}
        totalIncome={data.totalIncome}
      />

      {/* Summary Info */}
      <Card>
        <CardContent>
          <div className="text-center space-y-2">
            <h3 className="font-semibold">Regra 50/30/20</h3>
            <p className="text-sm text-muted-foreground">
              A regra 50/30/20 sugere que você destine{" "}
              <span className="font-medium text-blue-600 dark:text-blue-400">
                50% da sua renda para despesas fixas
              </span>{" "}
              (moradia, contas, transporte),{" "}
              <span className="font-medium text-orange-600 dark:text-orange-400">
                30% para despesas variáveis
              </span>{" "}
              (lazer, compras, alimentação fora) e{" "}
              <span className="font-medium text-primary">
                20% para investimentos e poupança
              </span>
              .
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
