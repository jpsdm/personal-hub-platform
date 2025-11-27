"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  formatDuration,
  getPriorityBadgeVariant,
} from "@/modules/workstation/lib/utils";
import type { KanbanColumn, Task } from "@/modules/workstation/types";
import { PRIORITY_LABELS } from "@/modules/workstation/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Calendar,
  Clock,
  ExternalLink,
  Pencil,
  Play,
  Square,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { EditorJSRenderer, parseDescription } from "./editor-js";

interface TaskPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  column?: KanbanColumn | null;
  onEdit: () => void;
  onDelete: () => void;
  onStartPomodoro: (taskId: string) => void;
}

export function TaskPreviewDialog({
  open,
  onOpenChange,
  task,
  column,
  onEdit,
  onDelete,
  onStartPomodoro,
}: TaskPreviewDialogProps) {
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

  if (!task) return null;

  const descriptionData = parseDescription(task.description);
  const isPomodoroRunningForThisTask =
    pomodoroState.isRunning && pomodoroState.linkedTaskId === task.id;
  console.log(task.pomodoroSessions);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="min-w-5xl h-[85vh] flex flex-col p-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Link
                  href={`/workstation/task/${task.id}`}
                  className="font-mono hover:text-primary hover:underline flex items-center gap-1"
                  onClick={() => onOpenChange(false)}
                >
                  {task.code}
                  <ExternalLink className="w-3 h-3" />
                </Link>
                {column && (
                  <>
                    <span>•</span>
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: column.color }}
                      />
                      <span>{column.name}</span>
                    </div>
                  </>
                )}
              </div>
              <DialogTitle className="text-xl font-semibold">
                {task.title}
              </DialogTitle>
            </div>
            <Badge
              variant={getPriorityBadgeVariant(task.priority)}
              className="shrink-0"
            >
              {PRIORITY_LABELS[task.priority]}
            </Badge>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 mt-4">
            <Button
              variant={isPomodoroRunningForThisTask ? "destructive" : "default"}
              size="sm"
              onClick={() => onStartPomodoro(task.id)}
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
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Pencil className="w-4 h-4 mr-2" />
              Editar
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir
            </Button>
          </div>
        </DialogHeader>

        <Separator className="shrink-0" />

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="px-6 py-4 space-y-6">
              {/* Meta info */}
              <div className="flex flex-wrap gap-4 text-sm">
                {task.dueDate && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>
                      Entrega:{" "}
                      <span className="text-foreground font-medium">
                        {format(new Date(task.dueDate), "PPP", {
                          locale: ptBR,
                        })}
                      </span>
                    </span>
                  </div>
                )}
                {task.totalTimeSpent !== undefined &&
                  task.totalTimeSpent > 0 && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>
                        Tempo dedicado:{" "}
                        <span className="text-foreground font-medium">
                          {formatDuration(task.totalTimeSpent)}
                        </span>
                      </span>
                    </div>
                  )}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span>
                    Criado:{" "}
                    <span className="text-foreground">
                      {format(new Date(task.createdAt), "dd/MM/yyyy", {
                        locale: ptBR,
                      })}
                    </span>
                  </span>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Descrição
                </h3>
                {descriptionData ? (
                  <div className="bg-muted/30 rounded-lg p-4">
                    <EditorJSRenderer data={descriptionData} />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    Nenhuma descrição adicionada
                  </p>
                )}
              </div>

              {/* Pomodoro Sessions */}
              {task.pomodoroSessions && task.pomodoroSessions.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Sessões de Trabalho
                  </h3>
                  <div className="space-y-2">
                    {task.pomodoroSessions
                      .filter((s) => s.status === "COMPLETED")
                      .slice(0, 5)
                      .map((session) => (
                        <div
                          key={session.id}
                          className="flex items-center justify-between p-2 bg-muted/30 rounded"
                        >
                          <span className="text-sm">
                            {format(
                              new Date(session.startedAt),
                              "dd/MM HH:mm",
                              {
                                locale: ptBR,
                              }
                            )}
                          </span>
                          <span className="text-sm font-mono">
                            {formatDuration(session.duration)}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
