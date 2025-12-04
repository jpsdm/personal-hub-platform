"use client";

import { ThemeToggle } from "@/components/theme-toggle";
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
import { PomodoroTimer } from "@/modules/workstation/components/pomodoro-timer";
import { usePomodoro } from "@/modules/workstation/hooks/use-pomodoro";
import type { Task } from "@/modules/workstation/types";
import { BarChart3, Briefcase, Home, LayoutGrid } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type React from "react";
import { useCallback, useEffect, useState } from "react";

const navigation = [
  { name: "Quadros", href: "/workstation", icon: LayoutGrid },
  { name: "Métricas", href: "/workstation/metrics", icon: BarChart3 },
];

export default function WorkstationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [switchTaskDialog, setSwitchTaskDialog] = useState<{
    open: boolean;
    newTaskId: string | null;
    newTaskTitle: string;
  }>({ open: false, newTaskId: null, newTaskTitle: "" });

  // Initialize pomodoro hook
  const pomodoro = usePomodoro(userId);

  // Function to refetch tasks
  const fetchTasks = useCallback(async () => {
    if (!userId) return;
    try {
      const response = await fetch(`/api/workstation/tasks?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setTasks(data);
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
    }
  }, [userId]);

  // Function to emit pomodoro state change
  const emitPomodoroState = useCallback(
    (isRunning: boolean, linkedTaskId: string | null) => {
      window.dispatchEvent(
        new CustomEvent("pomodoroStateChange", {
          detail: { isRunning, linkedTaskId },
        })
      );
    },
    []
  );

  // Function to actually start pomodoro for a task
  const startPomodoroForTask = useCallback(
    async (taskId: string) => {
      // Refetch tasks to get latest data (in case new task was created)
      await fetchTasks();
      const task = tasks.find((t) => t.id === taskId);
      if (task) {
        pomodoro.linkTask(task);
      }
      try {
        await pomodoro.startSession(taskId);
        // Emit state change immediately after starting
        emitPomodoroState(true, taskId);
      } catch (error) {
        console.error("Error starting pomodoro:", error);
      }
    },
    [tasks, pomodoro, fetchTasks, emitPomodoroState]
  );

  // Handle switching from one task to another
  const handleSwitchTask = async () => {
    if (switchTaskDialog.newTaskId) {
      // Stop current session
      await pomodoro.stopSession();
      emitPomodoroState(false, null);
      // Start new session
      await startPomodoroForTask(switchTaskDialog.newTaskId);
    }
    setSwitchTaskDialog({ open: false, newTaskId: null, newTaskTitle: "" });
  };

  // Listen for task list refresh requests
  useEffect(() => {
    const handleRefreshTasks = () => {
      fetchTasks();
    };

    window.addEventListener("refreshTasks", handleRefreshTasks);
    return () => {
      window.removeEventListener("refreshTasks", handleRefreshTasks);
    };
  }, [fetchTasks]);

  // Listen for start pomodoro events from child components
  useEffect(() => {
    const handleStartPomodoro = async (event: Event) => {
      const customEvent = event as CustomEvent<{ taskId: string }>;
      const { taskId } = customEvent.detail;

      // If pomodoro is running and it's the same task, stop it
      if (pomodoro.isRunning && pomodoro.linkedTask?.id === taskId) {
        await pomodoro.stopSession();
        emitPomodoroState(false, null);
        return;
      }

      // If pomodoro is running for a different task, show confirmation dialog
      if (pomodoro.isRunning && pomodoro.linkedTask?.id !== taskId) {
        // Refetch to get latest task data
        await fetchTasks();
        const updatedTasks = await fetch(
          `/api/workstation/tasks?userId=${userId}`
        ).then((r) => r.json());
        const newTask = updatedTasks.find((t: Task) => t.id === taskId);
        setSwitchTaskDialog({
          open: true,
          newTaskId: taskId,
          newTaskTitle: newTask?.title || "Nova tarefa",
        });
        return;
      }

      // Otherwise, start the pomodoro
      await startPomodoroForTask(taskId);
    };

    window.addEventListener("startPomodoro", handleStartPomodoro);
    return () => {
      window.removeEventListener("startPomodoro", handleStartPomodoro);
    };
  }, [
    tasks,
    pomodoro,
    startPomodoroForTask,
    emitPomodoroState,
    fetchTasks,
    userId,
  ]);

  // Expose pomodoro state to children via custom event
  useEffect(() => {
    const updatePomodoroState = () => {
      window.dispatchEvent(
        new CustomEvent("pomodoroStateChange", {
          detail: {
            isRunning: pomodoro.isRunning,
            linkedTaskId: pomodoro.linkedTask?.id || null,
          },
        })
      );
    };

    // Only emit after pomodoro is initialized
    if (pomodoro.isInitialized) {
      updatePomodoroState();
    }
  }, [pomodoro.isRunning, pomodoro.linkedTask, pomodoro.isInitialized]);

  // Listen for state requests from child components
  useEffect(() => {
    const handleStateRequest = () => {
      if (pomodoro.isInitialized) {
        window.dispatchEvent(
          new CustomEvent("pomodoroStateChange", {
            detail: {
              isRunning: pomodoro.isRunning,
              linkedTaskId: pomodoro.linkedTask?.id || null,
            },
          })
        );
      }
    };

    window.addEventListener("requestPomodoroState", handleStateRequest);
    return () => {
      window.removeEventListener("requestPomodoroState", handleStateRequest);
    };
  }, [pomodoro.isRunning, pomodoro.linkedTask, pomodoro.isInitialized]);

  useEffect(() => {
    // Only run on client side
    if (typeof window === "undefined") return;

    const storedUserId = sessionStorage.getItem("currentUserId");
    if (!storedUserId) {
      router.push("/profiles");
      return;
    }
    setUserId(storedUserId);
    setIsLoading(false);
  }, [router]);

  // Fetch tasks when userId is set
  useEffect(() => {
    if (userId) {
      fetchTasks();
    }
  }, [userId, fetchTasks]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!userId) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-6">
              <Link
                href="/hub"
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <Home className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium text-muted-foreground">
                  Voltar ao HUB
                </span>
              </Link>
              <div className="h-6 w-px bg-border" />
              <div className="flex items-center gap-2">
                <Briefcase className="w-6 h-6 text-primary" />
                <h1 className="text-xl font-bold text-foreground">
                  Workstation
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Secondary Navigation */}
      <nav className="border-b border-border bg-card/50">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-1 overflow-x-auto">
            {navigation.map((item) => {
              const isActive =
                item.href === "/workstation"
                  ? pathname === "/workstation"
                  : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors rounded-lg whitespace-nowrap ${
                    isActive
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  }`}
                >
                  {Icon && <Icon className="w-4 h-4" />}
                  {item.name}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">{children}</main>

      {/* Pomodoro Timer - Always visible */}
      <PomodoroTimer
        isRunning={pomodoro.isRunning}
        isPaused={pomodoro.isPaused}
        elapsedSeconds={pomodoro.elapsedSeconds}
        currentSession={pomodoro.currentSession}
        linkedTask={pomodoro.linkedTask}
        tasks={tasks}
        todaySessions={pomodoro.todaySessions}
        onStart={pomodoro.startSession}
        onPause={pomodoro.pauseSession}
        onResume={pomodoro.resumeSession}
        onStop={pomodoro.stopSession}
        onLinkTask={pomodoro.linkTask}
        onResetToday={pomodoro.resetTodaySessions}
      />

      {/* Switch Task Confirmation Dialog */}
      <AlertDialog
        open={switchTaskDialog.open}
        onOpenChange={(open) =>
          !open &&
          setSwitchTaskDialog({
            open: false,
            newTaskId: null,
            newTaskTitle: "",
          })
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pomodoro em andamento</AlertDialogTitle>
            <AlertDialogDescription>
              Você já tem um Pomodoro em andamento para &quot;
              {pomodoro.linkedTask?.title || "uma tarefa"}&quot;. Deseja
              encerrar o Pomodoro atual e iniciar um novo para &quot;
              {switchTaskDialog.newTaskTitle}&quot;?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleSwitchTask}>
              Trocar Tarefa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
