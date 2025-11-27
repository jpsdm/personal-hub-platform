"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { formatDuration, formatTime } from "@/modules/workstation/lib/utils";
import type { PomodoroSession, Task } from "@/modules/workstation/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Clock,
  History,
  Link,
  Pause,
  Play,
  Square,
  Timer,
  Trash2,
  Unlink,
  X,
} from "lucide-react";
import { useState } from "react";

interface PomodoroTimerProps {
  isRunning: boolean;
  isPaused: boolean;
  elapsedSeconds: number;
  currentSession: PomodoroSession | null;
  linkedTask: Task | null;
  tasks: Task[];
  todaySessions: PomodoroSession[];
  onStart: (taskId?: string) => Promise<void>;
  onPause: () => Promise<void>;
  onResume: () => Promise<void>;
  onStop: () => Promise<void>;
  onLinkTask: (task: Task | null) => void;
  onResetToday: () => Promise<void>;
}

export function PomodoroTimer({
  isRunning,
  isPaused,
  elapsedSeconds,
  currentSession,
  linkedTask,
  tasks,
  todaySessions,
  onStart,
  onPause,
  onResume,
  onStop,
  onLinkTask,
  onResetToday,
}: PomodoroTimerProps) {
  const [expanded, setExpanded] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [taskSelectOpen, setTaskSelectOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [isStopping, setIsStopping] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Calculate total time today
  const totalTimeToday = todaySessions.reduce(
    (sum, session) => sum + session.duration,
    0
  );

  const handleStart = async () => {
    await onStart(selectedTaskId || linkedTask?.id);
  };

  const handleStop = async () => {
    setIsStopping(true);
    try {
      await onStop();
    } finally {
      setIsStopping(false);
    }
  };

  const handleResetToday = async () => {
    if (!confirm("Tem certeza que deseja apagar todo o histórico de hoje?")) {
      return;
    }
    setIsResetting(true);
    try {
      await onResetToday();
      setHistoryOpen(false);
    } finally {
      setIsResetting(false);
    }
  };

  const handleLinkTask = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    onLinkTask(task || null);
    setSelectedTaskId(taskId);
    setTaskSelectOpen(false);
  };

  const handleUnlinkTask = () => {
    onLinkTask(null);
    setSelectedTaskId("");
  };

  // Minimized view - floating button
  if (!expanded) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          size="lg"
          className={`rounded-full h-16 w-16 shadow-lg ${
            isRunning && !isPaused
              ? "bg-green-500 hover:bg-green-600 animate-pulse"
              : isPaused
              ? "bg-yellow-500 hover:bg-yellow-600"
              : ""
          }`}
          onClick={() => setExpanded(true)}
        >
          <div className="flex flex-col items-center">
            <Timer className="w-5 h-5" />
            {(isRunning || isPaused) && (
              <span className="text-xs font-mono">
                {formatTime(elapsedSeconds).substring(0, 5)}
              </span>
            )}
          </div>
        </Button>
      </div>
    );
  }

  // Expanded view - floating panel
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Card className="w-80 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b">
          <div className="flex items-center gap-2">
            <Timer className="w-4 h-4 text-primary" />
            <span className="font-medium">Pomodoro</span>
          </div>
          <div className="flex items-center gap-1">
            <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <History className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Histórico de Hoje</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                  <div className="flex items-center justify-between mb-4 p-3 bg-muted rounded-lg">
                    <span className="text-sm text-muted-foreground">
                      Total trabalhado
                    </span>
                    <span className="font-bold text-lg">
                      {formatDuration(totalTimeToday)}
                    </span>
                  </div>
                  {todaySessions.length > 0 && (
                    <div className="flex justify-end mb-3">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={handleResetToday}
                        disabled={isResetting || isRunning}
                      >
                        {isResetting ? (
                          <Spinner className="w-4 h-4 mr-2" />
                        ) : (
                          <Trash2 className="w-4 h-4 mr-2" />
                        )}
                        {isResetting ? "Apagando..." : "Limpar histórico"}
                      </Button>
                    </div>
                  )}
                  <ScrollArea className="h-[300px]">
                    {todaySessions.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>Nenhuma sessão registrada hoje</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {todaySessions.map((session) => (
                          <div
                            key={session.id}
                            className="flex items-center justify-between p-3 border rounded-lg"
                          >
                            <div>
                              <div className="text-sm font-medium">
                                {session.task?.code
                                  ? `${session.task.code} - ${session.task.title}`
                                  : "Sessão livre"}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {format(new Date(session.startedAt), "HH:mm", {
                                  locale: ptBR,
                                })}{" "}
                                -{" "}
                                {session.endedAt
                                  ? format(new Date(session.endedAt), "HH:mm", {
                                      locale: ptBR,
                                    })
                                  : "Em andamento"}
                              </div>
                            </div>
                            <span className="font-mono text-sm">
                              {formatDuration(session.duration)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </DialogContent>
            </Dialog>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setExpanded(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Timer Display */}
        <div className="p-6 text-center">
          <div
            className={`text-5xl font-mono font-bold mb-4 ${
              isRunning && !isPaused
                ? "text-green-500"
                : isPaused
                ? "text-yellow-500"
                : ""
            }`}
          >
            {formatTime(elapsedSeconds)}
          </div>

          {/* Linked Task */}
          {(linkedTask || currentSession?.task) && (
            <div className="flex items-center justify-center gap-2 mb-4 text-sm">
              <span className="font-mono text-muted-foreground">
                {currentSession?.task?.code || linkedTask?.code}
              </span>
              <span className="truncate max-w-[150px]">
                {currentSession?.task?.title || linkedTask?.title}
              </span>
              {!isRunning && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={handleUnlinkTask}
                >
                  <Unlink className="w-3 h-3" />
                </Button>
              )}
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center justify-center gap-2">
            {!isRunning ? (
              <>
                {/* Task selector */}
                {!linkedTask && (
                  <Dialog
                    open={taskSelectOpen}
                    onOpenChange={setTaskSelectOpen}
                  >
                    <DialogTrigger asChild>
                      <Button variant="outline" size="icon">
                        <Link className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Vincular Tarefa</DialogTitle>
                      </DialogHeader>
                      <div className="py-4">
                        <Select
                          value={selectedTaskId}
                          onValueChange={handleLinkTask}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma tarefa..." />
                          </SelectTrigger>
                          <SelectContent>
                            {tasks.map((task) => (
                              <SelectItem key={task.id} value={task.id}>
                                <span className="font-mono text-xs mr-2">
                                  {task.code}
                                </span>
                                {task.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
                <Button
                  size="lg"
                  className="bg-green-500 hover:bg-green-600"
                  onClick={handleStart}
                >
                  <Play className="w-5 h-5 mr-2" />
                  Iniciar
                </Button>
              </>
            ) : (
              <>
                {isPaused ? (
                  <Button
                    size="lg"
                    className="bg-green-500 hover:bg-green-600"
                    onClick={onResume}
                  >
                    <Play className="w-5 h-5 mr-2" />
                    Continuar
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-white"
                    onClick={onPause}
                  >
                    <Pause className="w-5 h-5 mr-2" />
                    Pausar
                  </Button>
                )}
                <Button
                  size="lg"
                  variant="destructive"
                  onClick={handleStop}
                  disabled={isStopping}
                >
                  {isStopping ? (
                    <Spinner className="w-5 h-5 mr-2" />
                  ) : (
                    <Square className="w-5 h-5 mr-2" />
                  )}
                  {isStopping ? "Finalizando..." : "Finalizar"}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Footer - Today's stats */}
        <div className="px-4 py-3 border-t bg-muted/50 text-center text-sm text-muted-foreground">
          Hoje:{" "}
          <span className="font-medium text-foreground">
            {formatDuration(totalTimeToday + (isRunning ? elapsedSeconds : 0))}
          </span>{" "}
          trabalhados
        </div>
      </Card>
    </div>
  );
}
