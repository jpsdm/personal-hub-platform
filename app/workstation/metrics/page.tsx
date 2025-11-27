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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDuration } from "@/modules/workstation/lib/utils";
import {
  BarChart3,
  Calendar,
  Clock,
  Flame,
  Settings,
  Target,
  Timer,
  Trash2,
  Trophy,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface PomodoroStats {
  summary: {
    totalFocusTime: number;
    totalSessions: number;
    successfulDays: number;
    currentStreak: number;
    longestStreak: number;
    totalPomodorosAllTime: number;
    averageSessionsPerDay: number;
  };
  dailyFocusData: { date: string; hours: number; sessions: number }[];
  byBoard: {
    id: string;
    name: string;
    color: string;
    totalTime: number;
    sessions: number;
  }[];
  byTask: {
    id: string;
    code: string;
    title: string;
    totalTime: number;
    sessions: number;
  }[];
}

interface Board {
  id: string;
  name: string;
  color: string;
}

export default function PomodoroMetricsPage() {
  const router = useRouter();
  const [stats, setStats] = useState<PomodoroStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"week" | "month" | "year">("week");
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<string>("all");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [clearAllDialogOpen, setClearAllDialogOpen] = useState(false);
  const [clearBoardDialogOpen, setClearBoardDialogOpen] = useState(false);
  const [boardToClear, setBoardToClear] = useState<Board | null>(null);
  const [clearing, setClearing] = useState(false);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ period });
      if (selectedBoard !== "all") {
        params.append("boardId", selectedBoard);
      }

      const response = await fetch(`/api/workstation/pomodoro/stats?${params}`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  }, [period, selectedBoard]);

  const fetchBoards = useCallback(async () => {
    try {
      const userId = sessionStorage.getItem("currentUserId");
      if (!userId) return;

      const response = await fetch(`/api/workstation/boards?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setBoards(data);
      }
    } catch (error) {
      console.error("Error fetching boards:", error);
    }
  }, []);

  const handleClearAll = async () => {
    setClearing(true);
    try {
      const response = await fetch("/api/workstation/pomodoro/clear", {
        method: "DELETE",
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`${data.deletedCount} registros removidos com sucesso!`);
        setClearAllDialogOpen(false);
        setSettingsOpen(false);
        fetchStats();
      } else {
        toast.error("Erro ao limpar registros");
      }
    } catch (error) {
      console.error("Error clearing sessions:", error);
      toast.error("Erro ao limpar registros");
    } finally {
      setClearing(false);
    }
  };

  const handleClearByBoard = async () => {
    if (!boardToClear) return;

    setClearing(true);
    try {
      const response = await fetch(
        `/api/workstation/pomodoro/clear?boardId=${boardToClear.id}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        const data = await response.json();
        toast.success(
          `${data.deletedCount} registros do quadro "${boardToClear.name}" removidos!`
        );
        setClearBoardDialogOpen(false);
        setBoardToClear(null);
        setSettingsOpen(false);
        fetchStats();
      } else {
        toast.error("Erro ao limpar registros");
      }
    } catch (error) {
      console.error("Error clearing sessions:", error);
      toast.error("Erro ao limpar registros");
    } finally {
      setClearing(false);
    }
  };

  useEffect(() => {
    const userId = sessionStorage.getItem("currentUserId");
    if (!userId) {
      router.push("/profiles");
      return;
    }

    fetchBoards();
  }, [router, fetchBoards]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Calculate max hours for chart scaling
  const maxHours = stats?.dailyFocusData
    ? Math.max(...stats.dailyFocusData.map((d) => d.hours), 1)
    : 1;

  // Get period label
  const getPeriodLabel = () => {
    switch (period) {
      case "week":
        return "Última Semana";
      case "month":
        return "Último Mês";
      case "year":
        return "Último Ano";
    }
  };

  // Format date for chart
  const formatChartDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (period === "year") {
      return date.toLocaleDateString("pt-BR", { month: "short" });
    }
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    });
  };

  if (loading && !stats) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Métricas do Pomodoro</h1>
          <p className="text-muted-foreground">
            Acompanhe seu progresso e produtividade
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedBoard} onValueChange={setSelectedBoard}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Todos os quadros" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os quadros</SelectItem>
              {boards.map((board) => (
                <SelectItem key={board.id} value={board.id}>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: board.color }}
                    />
                    {board.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={period}
            onValueChange={(v) => setPeriod(v as "week" | "month" | "year")}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Semana</SelectItem>
              <SelectItem value="month">Mês</SelectItem>
              <SelectItem value="year">Ano</SelectItem>
            </SelectContent>
          </Select>

          {/* Settings Dialog */}
          <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon">
                <Settings className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Configurações de Métricas</DialogTitle>
                <DialogDescription>
                  Gerencie os registros de sessões do Pomodoro
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Clear All */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Limpar todos os registros</h4>
                    <p className="text-sm text-muted-foreground">
                      Remove todas as sessões de Pomodoro
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setClearAllDialogOpen(true)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Limpar Tudo
                  </Button>
                </div>

                <Separator />

                {/* Clear by Board */}
                <div className="space-y-3">
                  <h4 className="font-medium">Limpar por Quadro</h4>
                  <p className="text-sm text-muted-foreground">
                    Remove sessões de um quadro específico
                  </p>

                  {boards.length > 0 ? (
                    <div className="space-y-2">
                      {boards.map((board) => (
                        <div
                          key={board.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: board.color }}
                            />
                            <span className="text-sm">{board.name}</span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              setBoardToClear(board);
                              setClearBoardDialogOpen(true);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      Nenhum quadro encontrado
                    </p>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Clear All Confirmation Dialog */}
      <AlertDialog open={clearAllDialogOpen} onOpenChange={setClearAllDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Limpar todos os registros</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>TODAS</strong> as sessões
              de Pomodoro? Esta ação não pode ser desfeita e você perderá todo
              o histórico de métricas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={clearing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearAll}
              disabled={clearing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {clearing ? "Limpando..." : "Sim, limpar tudo"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear by Board Confirmation Dialog */}
      <AlertDialog
        open={clearBoardDialogOpen}
        onOpenChange={(open) => {
          setClearBoardDialogOpen(open);
          if (!open) setBoardToClear(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Limpar registros do quadro</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir todas as sessões de Pomodoro do
              quadro <strong>&quot;{boardToClear?.name}&quot;</strong>? Esta
              ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={clearing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearByBoard}
              disabled={clearing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {clearing ? "Limpando..." : "Sim, limpar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tempo Focado
            </CardTitle>
            <Clock className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatDuration(stats?.summary.totalFocusTime || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.summary.totalSessions || 0} sessões no período
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Dias de Sucesso
            </CardTitle>
            <Target className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.summary.successfulDays || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              ~{stats?.summary.averageSessionsPerDay || 0} pomodoros/dia
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Sequência Atual
            </CardTitle>
            <Flame className="w-4 h-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              {stats?.summary.currentStreak || 0}
              <span className="text-sm font-normal text-muted-foreground">
                dias
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Recorde: {stats?.summary.longestStreak || 0} dias
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Pomodoros
            </CardTitle>
            <Trophy className="w-4 h-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.summary.totalPomodorosAllTime || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Desde o início</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Horas Focadas - {getPeriodLabel()}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            {stats?.dailyFocusData && stats.dailyFocusData.length > 0 ? (
              <div className="flex items-end justify-between h-full gap-1">
                {stats.dailyFocusData.map((day, index) => {
                  const heightPercent = (day.hours / maxHours) * 100;
                  return (
                    <div
                      key={day.date}
                      className="flex-1 flex flex-col items-center justify-end h-full group"
                    >
                      <div className="relative w-full flex justify-center">
                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                          <div className="bg-popover text-popover-foreground text-xs rounded-md px-2 py-1 shadow-md whitespace-nowrap">
                            <div className="font-medium">
                              {day.hours.toFixed(1)}h
                            </div>
                            <div className="text-muted-foreground">
                              {day.sessions} sessões
                            </div>
                          </div>
                        </div>
                        {/* Bar */}
                        <div
                          className={`w-full max-w-8 rounded-t transition-all ${
                            day.hours > 0
                              ? "bg-primary hover:bg-primary/80"
                              : "bg-muted"
                          }`}
                          style={{
                            height: `${Math.max(
                              heightPercent,
                              day.hours > 0 ? 5 : 2
                            )}%`,
                          }}
                        />
                      </div>
                      {/* Date label */}
                      {(period === "week" ||
                        index % Math.ceil(stats.dailyFocusData.length / 10) ===
                          0) && (
                        <div className="text-xs text-muted-foreground mt-2 whitespace-nowrap">
                          {formatChartDate(day.date)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                Nenhum dado disponível para o período selecionado
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Board and Task breakdown */}
      <Tabs defaultValue="boards" className="space-y-4">
        <TabsList>
          <TabsTrigger value="boards" className="gap-2">
            <Calendar className="w-4 h-4" />
            Por Quadro
          </TabsTrigger>
          <TabsTrigger value="tasks" className="gap-2">
            <Timer className="w-4 h-4" />
            Por Atividade
          </TabsTrigger>
        </TabsList>

        <TabsContent value="boards" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tempo por Quadro</CardTitle>
            </CardHeader>
            <CardContent>
              {stats?.byBoard && stats.byBoard.length > 0 ? (
                <div className="space-y-4">
                  {stats.byBoard.map((board) => {
                    const percentage =
                      stats.summary.totalFocusTime > 0
                        ? (board.totalTime / stats.summary.totalFocusTime) * 100
                        : 0;
                    return (
                      <div key={board.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: board.color }}
                            />
                            <span className="font-medium">{board.name}</span>
                            <Badge variant="secondary" className="text-xs">
                              {board.sessions} sessões
                            </Badge>
                          </div>
                          <span className="text-sm font-mono">
                            {formatDuration(board.totalTime)}
                          </span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  Nenhum dado disponível para o período selecionado
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tempo por Atividade</CardTitle>
            </CardHeader>
            <CardContent>
              {stats?.byTask && stats.byTask.length > 0 ? (
                <div className="space-y-4">
                  {stats.byTask.slice(0, 10).map((task) => {
                    const percentage =
                      stats.summary.totalFocusTime > 0
                        ? (task.totalTime / stats.summary.totalFocusTime) * 100
                        : 0;
                    return (
                      <div key={task.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs font-mono text-muted-foreground shrink-0">
                              {task.code}
                            </span>
                            <span className="font-medium truncate">
                              {task.title}
                            </span>
                            <Badge
                              variant="secondary"
                              className="text-xs shrink-0"
                            >
                              {task.sessions} sessões
                            </Badge>
                          </div>
                          <span className="text-sm font-mono shrink-0 ml-2">
                            {formatDuration(task.totalTime)}
                          </span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    );
                  })}
                  {stats.byTask.length > 10 && (
                    <p className="text-sm text-muted-foreground text-center pt-2">
                      E mais {stats.byTask.length - 10} atividades...
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  Nenhum dado disponível para o período selecionado
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
