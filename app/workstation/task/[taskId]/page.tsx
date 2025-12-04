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
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  EditorJSRenderer,
  parseDescription,
} from "@/modules/workstation/components/editor-js";
import { TaskDialog } from "@/modules/workstation/components/task-dialog";
import {
  formatDuration,
  getPriorityBadgeVariant,
} from "@/modules/workstation/lib/utils";
import type {
  CreateTaskInput,
  UpdateTaskInput,
} from "@/modules/workstation/types";
import { PRIORITY_LABELS, PomodoroSession } from "@/modules/workstation/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Pencil,
  Play,
  Square,
  Trash2,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface TaskWithDetails {
  id: string;
  code: string;
  title: string;
  description?: string | null;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  order: number;
  dueDate?: Date | string | null;
  boardId: string;
  columnId: string;
  userId: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  totalTimeSpent?: number;
  column?: {
    id: string;
    name: string;
    color: string;
    board?: {
      id: string;
      name: string;
    };
  };
  pomodoroSessions?: PomodoroSession[];
}

export default function TaskExpandedViewPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.taskId as string;

  const [task, setTask] = useState<TaskWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pomodoroBlockedDialogOpen, setPomodoroBlockedDialogOpen] =
    useState(false);
  const [pomodoroState, setPomodoroState] = useState<{
    isRunning: boolean;
    linkedTaskId: string | null;
  }>({ isRunning: false, linkedTaskId: null });

  // Listen for pomodoro state changes
  useEffect(() => {
    const handlePomodoroStateChange = (event: Event) => {
      const customEvent = event as CustomEvent<{
        isRunning: boolean;
        linkedTaskId: string | null;
      }>;
      setPomodoroState(customEvent.detail);
    };

    window.addEventListener("pomodoroStateChange", handlePomodoroStateChange);

    // Request current state on mount
    window.dispatchEvent(new CustomEvent("requestPomodoroState"));

    return () => {
      window.removeEventListener(
        "pomodoroStateChange",
        handlePomodoroStateChange
      );
    };
  }, []);

  const isPomodoroRunningForThisTask =
    pomodoroState.isRunning && pomodoroState.linkedTaskId === taskId;

  const fetchTask = useCallback(async () => {
    try {
      const res = await fetch(`/api/workstation/tasks/${taskId}`);
      if (!res.ok) {
        if (res.status === 404) {
          toast.error("Tarefa não encontrada");
          router.push("/workstation");
          return;
        }
        throw new Error("Failed to fetch task");
      }
      const data = await res.json();
      setTask(data);
    } catch (error) {
      console.error("Error fetching task:", error);
      toast.error("Erro ao carregar tarefa");
    } finally {
      setLoading(false);
    }
  }, [taskId, router]);

  useEffect(() => {
    fetchTask();
  }, [fetchTask]);

  const handleUpdateTask = async (data: CreateTaskInput | UpdateTaskInput) => {
    if (!task) return;

    try {
      const res = await fetch(`/api/workstation/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error("Failed to update task");

      await fetchTask();
      setEditDialogOpen(false);
      toast.success("Tarefa atualizada!");
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error("Erro ao atualizar tarefa");
    }
  };

  const handleDeleteTask = async () => {
    if (!task) return;

    // Check if pomodoro is running for this task
    if (isPomodoroRunningForThisTask) {
      setPomodoroBlockedDialogOpen(true);
      setDeleteDialogOpen(false);
      return;
    }

    try {
      const res = await fetch(`/api/workstation/tasks/${task.id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete task");

      toast.success("Tarefa excluída!");
      router.push("/workstation");
    } catch (error) {
      console.error("Error deleting task:", error);
      toast.error("Erro ao excluir tarefa");
    }
  };

  const tryDeleteTask = () => {
    if (isPomodoroRunningForThisTask) {
      setPomodoroBlockedDialogOpen(true);
    } else {
      setDeleteDialogOpen(true);
    }
  };

  const handleStartPomodoro = () => {
    if (!task) return;
    // Dispatch event to layout's pomodoro timer
    window.dispatchEvent(
      new CustomEvent("startPomodoro", { detail: { taskId: task.id } })
    );
  };

  const descriptionData = task ? parseDescription(task.description) : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header skeleton */}
        <div className="border-b bg-card">
          <div className="container mx-auto py-6 px-4">
            <Skeleton className="h-8 w-32 mb-4" />
            <Skeleton className="h-6 w-24 mb-2" />
            <Skeleton className="h-10 w-96" />
          </div>
        </div>
        {/* Content skeleton */}
        <div className="container mx-auto py-8 px-4">
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-32 w-full" />
                </CardContent>
              </Card>
            </div>
            <div className="space-y-4">
              <Card>
                <CardContent className="p-4">
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!task) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto py-4 px-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>

          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-mono text-primary font-medium">
                  {task.code}
                </span>
                {task.column && (
                  <>
                    <span>•</span>
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: task.column.color }}
                      />
                      <span>{task.column.name}</span>
                    </div>
                  </>
                )}
                {task.column?.board && (
                  <>
                    <span>•</span>
                    <span>{task.column.board.name}</span>
                  </>
                )}
              </div>
              <h1 className="text-2xl font-bold">{task.title}</h1>
            </div>

            <div className="flex items-center gap-2">
              <Badge
                variant={getPriorityBadgeVariant(task.priority)}
                className="shrink-0"
              >
                {PRIORITY_LABELS[task.priority]}
              </Badge>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 mt-4">
            <Button
              variant={isPomodoroRunningForThisTask ? "destructive" : "default"}
              size="sm"
              onClick={handleStartPomodoro}
            >
              {isPomodoroRunningForThisTask ? (
                <>
                  <Square className="w-4 h-4 mr-2" />
                  Finalizar Pomodoro
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Iniciar Pomodoro
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditDialogOpen(true)}
            >
              <Pencil className="w-4 h-4 mr-2" />
              Editar
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={tryDeleteTask}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto py-8 px-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Descrição</CardTitle>
              </CardHeader>
              <CardContent>
                {descriptionData ? (
                  <EditorJSRenderer data={descriptionData} />
                ) : (
                  <p className="text-muted-foreground italic">
                    Nenhuma descrição adicionada
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Pomodoro Sessions */}
            {task.pomodoroSessions && task.pomodoroSessions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Sessões de Trabalho</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {task.pomodoroSessions
                      .filter((s) => s.status === "COMPLETED")
                      .map((session) => (
                        <div
                          key={session.id}
                          className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span>
                              {format(
                                new Date(session.startedAt),
                                "dd/MM/yyyy 'às' HH:mm",
                                { locale: ptBR }
                              )}
                            </span>
                          </div>
                          <span className="font-mono font-medium">
                            {formatDuration(session.duration)}
                          </span>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Details Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Detalhes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {task.dueDate && (
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Data de Entrega
                      </p>
                      <p className="font-medium">
                        {format(new Date(task.dueDate), "PPP", {
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                  </div>
                )}

                <Separator />

                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Tempo Dedicado
                    </p>
                    <p className="font-medium font-mono">
                      {task.totalTimeSpent
                        ? formatDuration(task.totalTimeSpent)
                        : "0h 0m"}
                    </p>
                  </div>
                </div>

                <Separator />

                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Criado em
                  </p>
                  <p>
                    {format(new Date(task.createdAt), "PPP 'às' HH:mm", {
                      locale: ptBR,
                    })}
                  </p>
                </div>

                {task.updatedAt && task.updatedAt !== task.createdAt && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Última atualização
                    </p>
                    <p>
                      {format(new Date(task.updatedAt), "PPP 'às' HH:mm", {
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Estatísticas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-muted/30 rounded-lg">
                    <p className="text-2xl font-bold">
                      {task.pomodoroSessions?.filter(
                        (s) => s.status === "COMPLETED"
                      ).length || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">Pomodoros</p>
                  </div>
                  <div className="text-center p-3 bg-muted/30 rounded-lg">
                    <p className="text-2xl font-bold font-mono">
                      {task.totalTimeSpent
                        ? Math.round(task.totalTimeSpent / 3600)
                        : 0}
                      h
                    </p>
                    <p className="text-sm text-muted-foreground">Horas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Task Edit Dialog */}
      {task.column && (
        <TaskDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          task={{
            id: task.id,
            code: task.code,
            title: task.title,
            description: task.description,
            priority: task.priority,
            order: task.order,
            dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
            boardId: task.boardId,
            columnId: task.columnId,
            userId: task.userId,
            createdAt: new Date(task.createdAt),
            updatedAt: new Date(task.updatedAt),
            totalTimeSpent: task.totalTimeSpent,
          }}
          columnId={task.column.id}
          onSave={handleUpdateTask}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tarefa</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a tarefa "{task.title}"? Esta ação
              não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTask}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Pomodoro Running Block Dialog */}
      <AlertDialog
        open={pomodoroBlockedDialogOpen}
        onOpenChange={setPomodoroBlockedDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pomodoro em andamento</AlertDialogTitle>
            <AlertDialogDescription>
              Esta tarefa possui um Pomodoro em andamento. Finalize o Pomodoro
              antes de excluir a tarefa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => {
                setPomodoroBlockedDialogOpen(false);
                handleStartPomodoro();
              }}
            >
              Finalizar Pomodoro
            </AlertDialogAction>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
